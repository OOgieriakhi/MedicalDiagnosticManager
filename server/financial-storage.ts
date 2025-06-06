import { db } from "./db";
import { 
  purchaseOrders,
  purchaseOrderItems,
  paymentApprovals,
  pettyCashFunds,
  pettyCashTransactions,
  pettyCashApprovals,
  pettyCashDisbursements,
  pettyCashReconciliations,
  auditTrail,
  vendors,
  chartOfAccounts,
  journalEntries,
  journalEntryLineItems
} from "@shared/schema";
import { eq, and, desc, sql } from "drizzle-orm";

export class FinancialStorage {
  // Purchase Orders Methods
  async getPurchaseOrders(tenantId: number, branchId?: number) {
    let conditions = [eq(purchaseOrders.tenantId, tenantId)];
    
    if (branchId) {
      conditions.push(eq(purchaseOrders.branchId, branchId));
    }
    
    return await db
      .select()
      .from(purchaseOrders)
      .where(and(...conditions))
      .orderBy(desc(purchaseOrders.createdAt));
  }

  async createPurchaseOrder(data: any) {
    // Generate PO number
    const poNumber = await this.generatePONumber(data.tenantId);
    
    const poData = {
      tenantId: data.tenantId || 1,
      branchId: data.branchId || 1,
      poNumber,
      vendorName: data.vendorName || '',
      vendorEmail: data.vendorEmail || null,
      vendorPhone: data.vendorPhone || null,
      vendorAddress: data.vendorAddress || null,
      requestedBy: data.requestedBy || 1,
      status: 'pending',
      priority: data.priority || 'normal',
      subtotal: parseFloat(data.subtotal) || 0,
      taxAmount: parseFloat(data.taxAmount) || 0,
      discountAmount: parseFloat(data.discountAmount) || 0,
      totalAmount: parseFloat(data.totalAmount) || 0,
      currency: data.currency || 'NGN',
      items: JSON.stringify(data.items || []),
      notes: data.notes || null,
      urgencyLevel: data.urgencyLevel || 'normal',
      approvalLevel: 1,
      workflowStage: 'unit_manager_review'
    };
    
    const result = await db.execute(sql`
      INSERT INTO purchase_orders (
        tenant_id, branch_id, po_number, vendor_name, vendor_email, vendor_phone, vendor_address,
        requested_by, status, priority, subtotal, tax_amount, discount_amount, total_amount, 
        currency, items, notes, urgency_level, approval_level, workflow_stage,
        created_at, updated_at
      ) VALUES (
        ${poData.tenantId}, ${poData.branchId}, ${poData.poNumber}, ${poData.vendorName}, 
        ${poData.vendorEmail}, ${poData.vendorPhone}, ${poData.vendorAddress},
        ${poData.requestedBy}, ${poData.status}, ${poData.priority}, ${poData.subtotal}, 
        ${poData.taxAmount}, ${poData.discountAmount}, ${poData.totalAmount}, 
        ${poData.currency}, ${poData.items}, ${poData.notes}, ${poData.urgencyLevel}, 
        ${poData.approvalLevel}, ${poData.workflowStage}, NOW(), NOW()
      ) RETURNING *
    `);
    
    return result.rows[0];
  }

  async generatePONumber(tenantId: number) {
    const year = new Date().getFullYear();
    
    try {
      const result = await db.execute(sql`
        SELECT COUNT(*) as count FROM purchase_orders 
        WHERE tenant_id = ${tenantId}
      `);
      
      const count = (parseInt(String(result.rows[0]?.count || '0')) + 1).toString().padStart(3, '0');
      return `PO-${year}-${count}`;
    } catch (error) {
      console.error('Error generating PO number:', error);
      // Fallback to timestamp-based number
      const timestamp = Date.now().toString().slice(-4);
      return `PO-${year}-${timestamp}`;
    }
  }

  async getUnitManager(tenantId: number, branchId: number, requestedBy: number) {
    // Return a default manager for now - simplified workflow
    try {
      const result = await db.execute(sql`
        SELECT id as user_id, username
        FROM users 
        WHERE tenant_id = ${tenantId} 
          AND role IN ('manager', 'admin')
          AND is_active = true
        LIMIT 1
      `);
      
      return result.rows[0] ? { userId: result.rows[0].user_id, username: result.rows[0].username } : null;
    } catch (error) {
      console.error('Error getting unit manager:', error);
      return null;
    }
  }

  async getApprovalWorkflow(tenantId: number, amount: number) {
    const result = await db.execute(sql`
      SELECT * FROM approval_workflows 
      WHERE tenant_id = ${tenantId} 
        AND type = 'purchase_order' 
        AND is_active = true
        AND min_amount <= ${amount}
        AND (max_amount >= ${amount} OR max_amount IS NULL)
      ORDER BY approval_levels ASC
      LIMIT 1
    `);
    return result.rows[0];
  }

  async getFirstApprover(tenantId: number, branchId: number, requestedBy: number, amount: number) {
    // Get requester's manager
    const hierarchy = await db.execute(sql`
      SELECT manager_id FROM approval_hierarchy 
      WHERE tenant_id = ${tenantId} 
        AND branch_id = ${branchId} 
        AND user_id = ${requestedBy}
        AND is_active = true
    `);
    
    if (!hierarchy.rows[0]?.manager_id) return null;
    
    // Find manager who can approve this amount
    const approver = await db.execute(sql`
      SELECT user_id FROM approval_hierarchy 
      WHERE tenant_id = ${tenantId} 
        AND branch_id = ${branchId} 
        AND user_id = ${hierarchy.rows[0].manager_id}
        AND is_active = true
        AND (max_approval_amount >= ${amount} OR max_approval_amount IS NULL)
      LIMIT 1
    `);
    
    return approver.rows[0] ? { userId: approver.rows[0].user_id } : null;
  }

  async createApprovalRecord(data: any) {
    const result = await db.execute(sql`
      INSERT INTO purchase_order_approvals 
      (purchase_order_id, approver_id, approval_level, status, created_at)
      VALUES (${data.purchaseOrderId}, ${data.approverId}, ${data.approvalLevel}, ${data.status}, NOW())
      RETURNING *
    `);
    return result.rows[0];
  }

  async approvePurchaseOrder(id: number, approverId: number, comments?: string) {
    // Get current PO
    const po = await db.execute(sql`
      SELECT * FROM purchase_orders WHERE id = ${id}
    `);
    
    if (!po.rows[0]) throw new Error('Purchase order not found');
    
    const currentStage = po.rows[0].workflow_stage;
    let nextStage = '';
    let nextUser = null;
    
    // Implement the specific workflow: Unit Manager → Accountant → Approving Authority → Manager Execution → Confirmation
    switch (currentStage) {
      case 'unit_manager_review':
        // Unit Manager approves, goes to Accountant
        nextStage = 'accountant_review';
        nextUser = await this.getAccountant(po.rows[0].tenant_id, po.rows[0].branch_id);
        break;
        
      case 'accountant_review':
        // Accountant approves, goes to Approving Authority
        nextStage = 'approving_authority_review';
        nextUser = await this.getApprovingAuthority(po.rows[0].tenant_id, po.rows[0].branch_id, parseFloat(po.rows[0].total_amount));
        break;
        
      case 'approving_authority_review':
        // Approving Authority approves, goes back to Manager for execution
        nextStage = 'manager_execution';
        nextUser = await this.getUnitManager(po.rows[0].tenant_id, po.rows[0].branch_id, po.rows[0].requested_by);
        break;
        
      case 'manager_execution':
        // Manager executes purchase, goes to delivery/receiving
        nextStage = 'delivery_pending';
        await db.execute(sql`
          UPDATE purchase_orders 
          SET status = 'approved', workflow_stage = ${nextStage}, execution_confirmed_by = ${approverId}
          WHERE id = ${id}
        `);
        return { success: true, message: 'Purchase order approved for execution' };
        
      default:
        throw new Error('Invalid workflow stage');
    }
    
    // Update PO to next stage
    await db.execute(sql`
      UPDATE purchase_orders 
      SET workflow_stage = ${nextStage}, current_stage_user = ${nextUser?.userId || null}
      WHERE id = ${id}
    `);
    
    // Record approval
    await db.execute(sql`
      INSERT INTO purchase_order_approvals 
      (purchase_order_id, approver_id, approval_level, status, approved_at, comments, created_at)
      VALUES (${id}, ${approverId}, 1, 'approved', NOW(), ${comments || ''}, NOW())
    `);
    
    return { success: true, nextStage, nextUser: nextUser?.username };
  }

  async getAccountant(tenantId: number, branchId: number) {
    // Get accountant for the branch
    const result = await db.execute(sql`
      SELECT u.id as user_id, u.username
      FROM users u
      JOIN approval_hierarchy ah ON ah.user_id = u.id
      WHERE ah.tenant_id = ${tenantId} 
        AND ah.branch_id = ${branchId}
        AND ah.role_type = 'accountant'
        AND ah.is_active = true
      LIMIT 1
    `);
    
    return result.rows[0] ? { userId: result.rows[0].user_id, username: result.rows[0].username } : null;
  }

  async getApprovingAuthority(tenantId: number, branchId: number, amount: number) {
    // Get appropriate approving authority based on amount
    const result = await db.execute(sql`
      SELECT u.id as user_id, u.username
      FROM users u
      JOIN approval_hierarchy ah ON ah.user_id = u.id
      WHERE ah.tenant_id = ${tenantId} 
        AND ah.branch_id = ${branchId}
        AND ah.role_type = 'approving_authority'
        AND ah.is_active = true
        AND (ah.max_approval_amount >= ${amount} OR ah.max_approval_amount IS NULL)
      ORDER BY ah.max_approval_amount ASC
      LIMIT 1
    `);
    
    return result.rows[0] ? { userId: result.rows[0].user_id, username: result.rows[0].username } : null;
  }

  async confirmPurchaseReceived(id: number, confirmedBy: number, confirmationType: 'accountant' | 'unit') {
    const field = confirmationType === 'accountant' ? 'accountant_confirmed_by' : 'unit_confirmed_by';
    
    await db.execute(sql`
      UPDATE purchase_orders 
      SET ${sql.raw(field)} = ${confirmedBy}, 
          status = CASE 
            WHEN accountant_confirmed_by IS NOT NULL AND unit_confirmed_by IS NOT NULL 
            THEN 'completed' 
            ELSE 'partially_received' 
          END,
          workflow_stage = CASE 
            WHEN accountant_confirmed_by IS NOT NULL AND unit_confirmed_by IS NOT NULL 
            THEN 'completed' 
            ELSE workflow_stage 
          END
      WHERE id = ${id}
    `);
    
    return { success: true };
  }

  async getNextApprover(tenantId: number, branchId: number, currentApproverId: number, amount: number) {
    // Get current approver's manager
    const hierarchy = await db.execute(sql`
      SELECT manager_id FROM approval_hierarchy 
      WHERE tenant_id = ${tenantId} 
        AND branch_id = ${branchId} 
        AND user_id = ${currentApproverId}
        AND is_active = true
    `);
    
    if (!hierarchy.rows[0]?.manager_id) return null;
    
    // Find manager who can approve this amount
    const approver = await db.execute(sql`
      SELECT user_id FROM approval_hierarchy 
      WHERE tenant_id = ${tenantId} 
        AND branch_id = ${branchId} 
        AND user_id = ${hierarchy.rows[0].manager_id}
        AND is_active = true
        AND (max_approval_amount >= ${amount} OR max_approval_amount IS NULL)
      LIMIT 1
    `);
    
    return approver.rows[0] ? { userId: approver.rows[0].user_id } : null;
  }

  async updatePurchaseOrderStatus(id: number, status: string, approvedBy?: number) {
    return await db
      .update(purchaseOrders)
      .set({ 
        status, 
        approvedBy,
        updatedAt: new Date()
      })
      .where(eq(purchaseOrders.id, id))
      .returning();
  }

  async createPaymentApproval(data: any) {
    return await db
      .insert(paymentApprovals)
      .values(data)
      .returning();
  }

  // Petty Cash Methods
  async getPettyCashFunds(tenantId: number, branchId?: number) {
    let conditions = [eq(pettyCashFunds.tenantId, tenantId)];
    
    if (branchId) {
      conditions.push(eq(pettyCashFunds.branchId, branchId));
    }
    
    return await db
      .select()
      .from(pettyCashFunds)
      .where(and(...conditions));
  }

  async createPettyCashFund(data: any) {
    return await db
      .insert(pettyCashFunds)
      .values(data)
      .returning();
  }

  async getPettyCashTransactions(fundId: number) {
    return await db
      .select()
      .from(pettyCashTransactions)
      .where(eq(pettyCashTransactions.fundId, fundId))
      .orderBy(desc(pettyCashTransactions.createdAt));
  }

  async createPettyCashTransaction(data: any) {
    return await db
      .insert(pettyCashTransactions)
      .values(data)
      .returning();
  }

  async getPettyCashApprovals(tenantId: number, branchId?: number) {
    let conditions = [eq(pettyCashTransactions.tenantId, tenantId)];
    
    if (branchId) {
      conditions.push(eq(pettyCashTransactions.branchId, branchId));
    }

    return await db
      .select({
        id: pettyCashApprovals.id,
        transactionId: pettyCashApprovals.transactionId,
        approverLevel: pettyCashApprovals.approverLevel,
        approverId: pettyCashApprovals.approverId,
        status: pettyCashApprovals.status,
        comments: pettyCashApprovals.comments,
        createdAt: pettyCashApprovals.createdAt,
        approvedAt: pettyCashApprovals.approvedAt,
        transactionNumber: pettyCashTransactions.transactionNumber,
        amount: pettyCashTransactions.amount,
        purpose: pettyCashTransactions.purpose,
        priority: pettyCashTransactions.priority,
      })
      .from(pettyCashApprovals)
      .leftJoin(pettyCashTransactions, eq(pettyCashTransactions.id, pettyCashApprovals.transactionId))
      .where(and(...conditions))
      .orderBy(desc(pettyCashApprovals.createdAt));
  }

  async createPettyCashApproval(data: any) {
    return await db
      .insert(pettyCashApprovals)
      .values(data)
      .returning();
  }

  async updatePettyCashApproval(id: number, data: any) {
    return await db
      .update(pettyCashApprovals)
      .set(data)
      .where(eq(pettyCashApprovals.id, id))
      .returning();
  }

  async getPettyCashDisbursements(tenantId: number, branchId?: number) {
    let conditions = [eq(pettyCashDisbursements.tenantId, tenantId)];
    
    if (branchId) {
      conditions.push(eq(pettyCashDisbursements.branchId, branchId));
    }

    return await db
      .select()
      .from(pettyCashDisbursements)
      .where(and(...conditions))
      .orderBy(desc(pettyCashDisbursements.preparedAt));
  }

  async createPettyCashDisbursement(data: any) {
    return await db
      .insert(pettyCashDisbursements)
      .values(data)
      .returning();
  }

  async updatePettyCashDisbursement(id: number, data: any) {
    return await db
      .update(pettyCashDisbursements)
      .set(data)
      .where(eq(pettyCashDisbursements.id, id))
      .returning();
  }

  async updatePettyCashTransactionStatus(id: number, status: string, additionalData?: any) {
    const updateData = { status, ...additionalData };
    
    return await db
      .update(pettyCashTransactions)
      .set(updateData)
      .where(eq(pettyCashTransactions.id, id))
      .returning();
  }

  async updatePettyCashFundBalance(fundId: number, amount: number) {
    const fund = await db
      .select()
      .from(pettyCashFunds)
      .where(eq(pettyCashFunds.id, fundId))
      .limit(1);

    if (fund.length > 0) {
      const newBalance = fund[0].currentBalance + amount;
      
      return await db
        .update(pettyCashFunds)
        .set({ 
          currentBalance: newBalance,
          updatedAt: new Date()
        })
        .where(eq(pettyCashFunds.id, fundId))
        .returning();
    }
  }

  async createPettyCashReconciliation(data: any) {
    return await db
      .insert(pettyCashReconciliations)
      .values(data)
      .returning();
  }

  async getPettyCashReconciliations(fundId: number) {
    return await db
      .select()
      .from(pettyCashReconciliations)
      .where(eq(pettyCashReconciliations.fundId, fundId))
      .orderBy(desc(pettyCashReconciliations.createdAt));
  }

  // Vendor Methods
  async getVendors(tenantId: number) {
    return await db
      .select()
      .from(vendors)
      .where(eq(vendors.tenantId, tenantId));
  }

  async createVendor(data: any) {
    return await db
      .insert(vendors)
      .values(data)
      .returning();
  }

  // Audit Trail
  async createAuditEntry(data: any) {
    return await db
      .insert(auditTrail)
      .values({
        ...data,
        timestamp: new Date()
      })
      .returning();
  }

  // Accounting Methods
  async getChartOfAccounts(tenantId: number) {
    return await db
      .select()
      .from(chartOfAccounts)
      .where(eq(chartOfAccounts.tenantId, tenantId))
      .orderBy(chartOfAccounts.accountCode);
  }

  async createAccount(data: any) {
    return await db
      .insert(chartOfAccounts)
      .values(data)
      .returning();
  }

  async createJournalEntry(data: any) {
    return await db
      .insert(journalEntries)
      .values(data)
      .returning();
  }

  async createJournalEntryLineItems(data: any[]) {
    return await db
      .insert(journalEntryLineItems)
      .values(data)
      .returning();
  }

  async getJournalEntries(tenantId: number, limit = 50) {
    return await db
      .select()
      .from(journalEntries)
      .where(eq(journalEntries.tenantId, tenantId))
      .orderBy(desc(journalEntries.entryDate))
      .limit(limit);
  }

  async updateJournalEntryStatus(entryId: number, status: string) {
    return await db
      .update(journalEntries)
      .set({ status })
      .where(eq(journalEntries.id, entryId))
      .returning();
  }

  // Approval details and query management
  async getApprovalDetails(approvalId: number, tenantId: number) {
    // Check petty cash transactions first
    const pettyCashResult = await db.select()
      .from(pettyCashTransactions)
      .where(and(
        eq(pettyCashTransactions.id, approvalId),
        eq(pettyCashTransactions.tenantId, tenantId)
      ))
      .limit(1);

    if (pettyCashResult.length > 0) {
      const approval = pettyCashResult[0];
      const queries = await this.getApprovalQueries(approvalId, 'petty_cash');
      
      return {
        ...approval,
        type: 'petty_cash',
        module: 'Petty Cash',
        queries,
        attachments: [],
        approvalHistory: []
      };
    }

    // Check purchase orders
    const purchaseOrderResult = await db.select()
      .from(purchaseOrders)
      .where(and(
        eq(purchaseOrders.id, approvalId),
        eq(purchaseOrders.tenantId, tenantId)
      ))
      .limit(1);

    if (purchaseOrderResult.length > 0) {
      const approval = purchaseOrderResult[0];
      const queries = await this.getApprovalQueries(approvalId, 'purchase_order');
      
      return {
        ...approval,
        type: 'purchase_order',
        module: 'Purchase Orders',
        queries,
        attachments: [],
        approvalHistory: []
      };
    }

    throw new Error('Approval not found');
  }

  async getApprovalQueries(approvalId: number, approvalType: string) {
    return [];
  }

  async addApprovalQuery(data: any) {
    // Update the purchase order status to 'queried'
    if (data.queryType === 'clarification_request') {
      await db.update(purchaseOrders)
        .set({ 
          status: 'queried',
          updatedAt: new Date()
        })
        .where(eq(purchaseOrders.id, data.approvalId));
    }

    return {
      id: Date.now(),
      ...data,
      createdAt: new Date(),
      status: 'pending_response'
    };
  }

  async getPendingPurchaseOrderApprovals(tenantId: number, branchId: number) {
    const result = await db.select({
      id: purchaseOrders.id,
      transactionNumber: purchaseOrders.poNumber,
      amount: purchaseOrders.totalAmount,
      purpose: purchaseOrders.vendorName,
      category: sql<string>`'Procurement'`,
      priority: purchaseOrders.priority,
      requestedBy: sql<string>`CASE 
        WHEN ${purchaseOrders.requestedBy} = 1 THEN 'oogierhiakhi'
        WHEN ${purchaseOrders.requestedBy} = 2 THEN 'admin'
        WHEN ${purchaseOrders.requestedBy} = 4 THEN 'branch_mgr'
        WHEN ${purchaseOrders.requestedBy} = 5 THEN 'finance_mgr'
        WHEN ${purchaseOrders.requestedBy} = 6 THEN 'ceo_user'
        ELSE 'Unknown User'
      END`,
      createdAt: purchaseOrders.createdAt,
      status: purchaseOrders.status,
      vendorName: purchaseOrders.vendorName,
      notes: purchaseOrders.notes,
      justification: purchaseOrders.notes,
      description: purchaseOrders.notes,
      type: sql<string>`'purchase_order'`,
      module: sql<string>`'Procurement'`
    })
    .from(purchaseOrders)
    .where(and(
      eq(purchaseOrders.tenantId, tenantId),
      eq(purchaseOrders.branchId, branchId),
      eq(purchaseOrders.status, 'pending')
    ))
    .orderBy(desc(purchaseOrders.createdAt));

    return result;
  }

  async getPendingFinancialApprovals(tenantId: number, branchId: number) {
    return [];
  }
}

export const financialStorage = new FinancialStorage();