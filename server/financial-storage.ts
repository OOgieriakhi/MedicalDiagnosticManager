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
    const [po] = await db
      .insert(purchaseOrders)
      .values(data)
      .returning();
    
    // Create items if provided
    if (data.items && data.items.length > 0) {
      const items = data.items.map((item: any) => ({
        ...item,
        purchaseOrderId: po.id
      }));
      
      await db.insert(purchaseOrderItems).values(items);
    }
    
    return po;
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