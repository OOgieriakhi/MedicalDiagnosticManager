import { db } from "./db";
import { 
  purchaseOrders,
  purchaseOrderItems,
  paymentApprovals,
  pettyCashFunds,
  pettyCashTransactions,
  pettyCashReconciliations,
  auditTrail,
  vendors,
  chartOfAccounts,
  journalEntries,
  journalEntryLineItems
} from "@shared/schema";
import { eq, and, desc } from "drizzle-orm";

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
    // Determine approval workflow based on amount
    const workflow = await this.getApprovalWorkflow(data.tenantId, parseFloat(data.totalAmount));
    
    // Get the first approver in the hierarchy
    const firstApprover = await this.getFirstApprover(data.tenantId, data.branchId, data.requestedBy, parseFloat(data.totalAmount));
    
    const poData = {
      ...data,
      approvalLevel: 1,
      currentApprover: firstApprover?.userId || null,
      status: firstApprover ? 'pending' : 'approved'
    };
    
    const [po] = await db
      .insert(purchaseOrders)
      .values(poData)
      .returning();
    
    // Create approval record if approver exists
    if (firstApprover) {
      await this.createApprovalRecord({
        purchaseOrderId: po.id,
        approverId: firstApprover.userId,
        approvalLevel: 1,
        status: 'pending'
      });
    }
    
    return po;
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

  async updatePurchaseOrderStatus(id: number, status: string, approvedBy?: number) {
    return await db
      .update(purchaseOrders)
      .set({ 
        status, 
        approvedBy,
        approvedAt: status === 'approved' ? new Date() : null 
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
}

export const financialStorage = new FinancialStorage();