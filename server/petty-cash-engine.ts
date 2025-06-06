import { db } from "./db";
import { 
  pettyCashTransactions, 
  pettyCashApprovals, 
  pettyCashDisbursements,
  pettyCashFunds,
  users,
  chartOfAccounts,
  journalEntries,
  journalEntryLineItems
} from "@shared/schema";
import { eq, and, desc, gte, lte } from "drizzle-orm";

export interface PettyCashApprovalWorkflow {
  level: number;
  approverId: number;
  approverName: string;
  approverRole: string;
  amountLimit: number;
  isRequired: boolean;
}

export interface PettyCashTransactionData {
  id: number;
  transactionNumber: string;
  fundId: number;
  fundName: string;
  type: string;
  amount: number;
  purpose: string;
  category: string;
  requestedBy: number;
  requestedByName: string;
  currentApprover?: number;
  approvalLevel: number;
  status: string;
  priority: string;
  justification?: string;
  disbursementMethod?: string;
  approvalHistory: any[];
  createdAt: string;
}

export interface DisbursementVoucher {
  id: number;
  voucherNumber: string;
  transactionId: number;
  payeeName: string;
  amount: number;
  disbursementMethod: string;
  status: string;
  preparedBy: number;
  approvedBy?: number;
  disbursedBy?: number;
}

export class PettyCashEngine {
  
  /**
   * Create a new petty cash transaction with automatic approval routing
   */
  async createTransaction(tenantId: number, branchId: number, transactionData: {
    fundId: number;
    type: string;
    amount: number;
    purpose: string;
    category: string;
    priority?: string;
    justification?: string;
    requestedBy: number;
    recipient?: string;
    receiptNumber?: string;
  }) {
    // Generate transaction number
    const timestamp = Date.now();
    const transactionNumber = `PC-${new Date().getFullYear()}-${String(timestamp).slice(-6)}`;
    
    // Determine approval level and current approver based on amount
    const approvalWorkflow = await this.getApprovalWorkflow(tenantId, branchId, transactionData.amount);
    const currentApprover = approvalWorkflow.length > 0 ? approvalWorkflow[0].approverId : null;
    
    // Create transaction
    const [transaction] = await db
      .insert(pettyCashTransactions)
      .values({
        fundId: transactionData.fundId,
        tenantId,
        branchId,
        transactionNumber,
        type: transactionData.type,
        amount: transactionData.amount.toString(),
        purpose: transactionData.purpose,
        category: transactionData.category,
        requestedBy: transactionData.requestedBy,
        priority: transactionData.priority || 'normal',
        justification: transactionData.justification,
        approvalLevel: 1,
        currentApprover,
        status: currentApprover ? 'pending' : 'approved', // Auto-approve if no approver needed
        approvalHistory: [],
        description: transactionData.purpose,
        receiptNumber: transactionData.receiptNumber,
        vendorName: transactionData.recipient,
      })
      .returning();

    // Create approval records if needed
    if (approvalWorkflow.length > 0) {
      const approvalRecords = approvalWorkflow.map(workflow => ({
        transactionId: transaction.id,
        approverLevel: workflow.level,
        approverId: workflow.approverId,
        status: 'pending' as const,
      }));

      await db.insert(pettyCashApprovals).values(approvalRecords);
    }

    // If auto-approved (low amount), create disbursement voucher
    if (!currentApprover && transactionData.type === 'expense') {
      await this.createDisbursementVoucher(transaction.id, tenantId, branchId, {
        payeeName: transactionData.recipient || 'Petty Cash Custodian',
        amount: transactionData.amount,
        disbursementMethod: 'cash',
        preparedBy: transactionData.requestedBy,
      });
    }

    return transaction;
  }

  /**
   * Get approval workflow based on amount and organization hierarchy
   */
  async getApprovalWorkflow(tenantId: number, branchId: number, amount: number): Promise<PettyCashApprovalWorkflow[]> {
    const workflow: PettyCashApprovalWorkflow[] = [];

    // Get relevant approvers based on amount thresholds
    const approvers = await db
      .select({
        id: users.id,
        username: users.username,
        firstName: users.firstName,
        lastName: users.lastName,
        role: users.role,
        branchId: users.branchId,
      })
      .from(users)
      .where(
        and(
          eq(users.tenantId, tenantId),
          eq(users.branchId, branchId)
        )
      );

    // Define approval thresholds and hierarchy
    if (amount > 10000) { // Above $10,000 requires CEO approval
      const ceo = approvers.find(u => u.role === 'ceo' || u.role === 'director');
      if (ceo) {
        workflow.push({
          level: 2,
          approverId: ceo.id,
          approverName: `${ceo.firstName} ${ceo.lastName}`,
          approverRole: ceo.role,
          amountLimit: 50000,
          isRequired: true,
        });
      }
    }

    if (amount > 5000) { // Above $5,000 requires Finance Manager approval
      const financeManager = approvers.find(u => 
        u.role === 'finance_manager' || u.role === 'accountant' || u.role === 'admin'
      );
      if (financeManager) {
        workflow.push({
          level: 1,
          approverId: financeManager.id,
          approverName: `${financeManager.firstName} ${financeManager.lastName}`,
          approverRole: financeManager.role,
          amountLimit: 10000,
          isRequired: true,
        });
      }
    }

    if (amount > 1000) { // Above $1,000 requires Branch Manager approval
      const branchManager = approvers.find(u => 
        u.role === 'branch_manager' || u.role === 'manager'
      );
      if (branchManager) {
        workflow.push({
          level: 1,
          approverId: branchManager.id,
          approverName: `${branchManager.firstName} ${branchManager.lastName}`,
          approverRole: branchManager.role,
          amountLimit: 5000,
          isRequired: true,
        });
      }
    }

    return workflow.sort((a, b) => a.level - b.level);
  }

  /**
   * Approve a petty cash transaction
   */
  async approveTransaction(transactionId: number, approverId: number, comments?: string) {
    // Get transaction details
    const transaction = await db
      .select()
      .from(pettyCashTransactions)
      .where(eq(pettyCashTransactions.id, transactionId))
      .limit(1);

    if (!transaction.length) {
      throw new Error('Transaction not found');
    }

    const [txn] = transaction;

    // Update approval record
    await db
      .update(pettyCashApprovals)
      .set({
        status: 'approved',
        comments,
        approvedAt: new Date(),
      })
      .where(
        and(
          eq(pettyCashApprovals.transactionId, transactionId),
          eq(pettyCashApprovals.approverId, approverId)
        )
      );

    // Update approval history
    const currentHistory = Array.isArray(txn.approvalHistory) ? txn.approvalHistory : [];
    const newHistoryEntry = {
      level: txn.approvalLevel,
      approverId,
      action: 'approved',
      comments,
      timestamp: new Date().toISOString(),
    };

    // Check if there are more approvals needed
    const pendingApprovals = await db
      .select()
      .from(pettyCashApprovals)
      .where(
        and(
          eq(pettyCashApprovals.transactionId, transactionId),
          eq(pettyCashApprovals.status, 'pending')
        )
      );

    const nextApproval = pendingApprovals.find(a => a.approverLevel > txn.approvalLevel);
    
    if (nextApproval) {
      // Move to next approval level
      await db
        .update(pettyCashTransactions)
        .set({
          approvalLevel: nextApproval.approverLevel,
          currentApprover: nextApproval.approverId,
          approvalHistory: [...currentHistory, newHistoryEntry],
        })
        .where(eq(pettyCashTransactions.id, transactionId));
    } else {
      // All approvals complete
      await db
        .update(pettyCashTransactions)
        .set({
          status: 'approved',
          approvedBy: approverId,
          approvedAt: new Date(),
          currentApprover: null,
          approvalHistory: [...currentHistory, newHistoryEntry],
        })
        .where(eq(pettyCashTransactions.id, transactionId));

      // Create disbursement voucher for approved expense
      if (txn.type === 'expense') {
        await this.createDisbursementVoucher(transactionId, txn.tenantId, txn.branchId, {
          payeeName: txn.vendorName || 'Petty Cash Custodian',
          amount: parseFloat(txn.amount),
          disbursementMethod: 'cash',
          preparedBy: approverId,
        });
      }
    }

    return true;
  }

  /**
   * Reject a petty cash transaction
   */
  async rejectTransaction(transactionId: number, approverId: number, comments: string) {
    // Update approval record
    await db
      .update(pettyCashApprovals)
      .set({
        status: 'rejected',
        comments,
        rejectedAt: new Date(),
      })
      .where(
        and(
          eq(pettyCashApprovals.transactionId, transactionId),
          eq(pettyCashApprovals.approverId, approverId)
        )
      );

    // Update transaction status
    const transaction = await db
      .select()
      .from(pettyCashTransactions)
      .where(eq(pettyCashTransactions.id, transactionId))
      .limit(1);

    if (transaction.length) {
      const [txn] = transaction;
      const currentHistory = Array.isArray(txn.approvalHistory) ? txn.approvalHistory : [];
      const newHistoryEntry = {
        level: txn.approvalLevel,
        approverId,
        action: 'rejected',
        comments,
        timestamp: new Date().toISOString(),
      };

      await db
        .update(pettyCashTransactions)
        .set({
          status: 'rejected',
          rejectedAt: new Date(),
          currentApprover: null,
          approvalHistory: [...currentHistory, newHistoryEntry],
        })
        .where(eq(pettyCashTransactions.id, transactionId));
    }

    return true;
  }

  /**
   * Create disbursement voucher
   */
  async createDisbursementVoucher(
    transactionId: number, 
    tenantId: number, 
    branchId: number, 
    voucherData: {
      payeeName: string;
      amount: number;
      disbursementMethod: string;
      preparedBy: number;
      bankAccount?: string;
      chequeNumber?: string;
      notes?: string;
    }
  ) {
    // Generate voucher number
    const timestamp = Date.now();
    const voucherNumber = `DV-${new Date().getFullYear()}-${String(timestamp).slice(-6)}`;

    const [voucher] = await db
      .insert(pettyCashDisbursements)
      .values({
        transactionId,
        tenantId,
        branchId,
        voucherNumber,
        payeeName: voucherData.payeeName,
        amount: voucherData.amount.toString(),
        disbursementMethod: voucherData.disbursementMethod,
        bankAccount: voucherData.bankAccount,
        chequeNumber: voucherData.chequeNumber,
        preparedBy: voucherData.preparedBy,
        notes: voucherData.notes,
        status: 'prepared',
      })
      .returning();

    return voucher;
  }

  /**
   * Disburse funds (mark as paid)
   */
  async disburseFunds(voucherId: number, disbursedBy: number) {
    // Get voucher details
    const voucher = await db
      .select()
      .from(pettyCashDisbursements)
      .where(eq(pettyCashDisbursements.id, voucherId))
      .limit(1);

    if (!voucher.length) {
      throw new Error('Disbursement voucher not found');
    }

    const [voucherData] = voucher;

    // Update voucher status
    await db
      .update(pettyCashDisbursements)
      .set({
        status: 'disbursed',
        disbursedBy,
        disbursedAt: new Date(),
      })
      .where(eq(pettyCashDisbursements.id, voucherId));

    // Update transaction status
    await db
      .update(pettyCashTransactions)
      .set({
        status: 'disbursed',
        disbursedBy,
        disbursedAt: new Date(),
        disbursementVoucherNumber: voucherData.voucherNumber,
      })
      .where(eq(pettyCashTransactions.id, voucherData.transactionId));

    // Update fund balance
    await this.updateFundBalance(voucherData.transactionId, 'expense', parseFloat(voucherData.amount));

    // Create journal entry for the disbursement
    await this.createJournalEntry(voucherData.transactionId, voucherData.tenantId, voucherData.branchId);

    return true;
  }

  /**
   * Update petty cash fund balance
   */
  async updateFundBalance(transactionId: number, type: string, amount: number) {
    // Get transaction to find fund
    const transaction = await db
      .select()
      .from(pettyCashTransactions)
      .where(eq(pettyCashTransactions.id, transactionId))
      .limit(1);

    if (!transaction.length) return;

    const [txn] = transaction;
    const fund = await db
      .select()
      .from(pettyCashFunds)
      .where(eq(pettyCashFunds.id, txn.fundId))
      .limit(1);

    if (fund.length) {
      const [fundData] = fund;
      const currentBalance = parseFloat(fundData.currentBalance);
      let newBalance = currentBalance;

      if (type === 'expense') {
        newBalance = currentBalance - amount;
      } else if (type === 'replenishment') {
        newBalance = currentBalance + amount;
      }

      await db
        .update(pettyCashFunds)
        .set({
          currentBalance: newBalance.toString(),
          updatedAt: new Date(),
        })
        .where(eq(pettyCashFunds.id, txn.fundId));
    }
  }

  /**
   * Create journal entry for petty cash transaction
   */
  async createJournalEntry(transactionId: number, tenantId: number, branchId: number) {
    const transaction = await db
      .select()
      .from(pettyCashTransactions)
      .where(eq(pettyCashTransactions.id, transactionId))
      .limit(1);

    if (!transaction.length) return;

    const [txn] = transaction;
    const amount = parseFloat(txn.amount);

    // Generate entry number
    const timestamp = Date.now();
    const entryNumber = `JE-PC-${new Date().getFullYear()}-${String(timestamp).slice(-6)}`;

    // Create journal entry
    const [journalEntry] = await db
      .insert(journalEntries)
      .values({
        tenantId,
        branchId,
        entryNumber,
        entryDate: new Date(),
        description: `Petty cash disbursement: ${txn.purpose}`,
        referenceType: 'petty_cash',
        referenceId: transactionId,
        referenceNumber: txn.transactionNumber,
        totalDebit: amount.toString(),
        totalCredit: amount.toString(),
        status: 'posted',
        createdBy: txn.disbursedBy || txn.requestedBy,
        postedAt: new Date(),
      })
      .returning();

    // Create line items (simplified - expense account debit, cash account credit)
    await db.insert(journalEntryLineItems).values([
      {
        journalEntryId: journalEntry.id,
        accountId: 1, // Expense account (should be dynamic based on category)
        description: txn.purpose,
        debitAmount: amount.toString(),
        creditAmount: '0',
      },
      {
        journalEntryId: journalEntry.id,
        accountId: 2, // Petty Cash account
        description: 'Petty cash disbursement',
        debitAmount: '0',
        creditAmount: amount.toString(),
      },
    ]);

    return journalEntry;
  }

  /**
   * Get pending approvals for a user
   */
  async getPendingApprovals(approverId: number, tenantId: number): Promise<PettyCashTransactionData[]> {
    const pendingTransactions = await db
      .select({
        id: pettyCashTransactions.id,
        transactionNumber: pettyCashTransactions.transactionNumber,
        fundId: pettyCashTransactions.fundId,
        type: pettyCashTransactions.type,
        amount: pettyCashTransactions.amount,
        purpose: pettyCashTransactions.purpose,
        category: pettyCashTransactions.category,
        requestedBy: pettyCashTransactions.requestedBy,
        approvalLevel: pettyCashTransactions.approvalLevel,
        status: pettyCashTransactions.status,
        priority: pettyCashTransactions.priority,
        justification: pettyCashTransactions.justification,
        approvalHistory: pettyCashTransactions.approvalHistory,
        createdAt: pettyCashTransactions.createdAt,
        requesterFirstName: users.firstName,
        requesterLastName: users.lastName,
      })
      .from(pettyCashTransactions)
      .leftJoin(users, eq(users.id, pettyCashTransactions.requestedBy))
      .where(
        and(
          eq(pettyCashTransactions.currentApprover, approverId),
          eq(pettyCashTransactions.status, 'pending')
        )
      )
      .orderBy(desc(pettyCashTransactions.createdAt));

    return pendingTransactions.map(txn => ({
      id: txn.id,
      transactionNumber: txn.transactionNumber,
      fundId: txn.fundId,
      fundName: '', // Will be populated separately if needed
      type: txn.type,
      amount: parseFloat(txn.amount),
      purpose: txn.purpose,
      category: txn.category,
      requestedBy: txn.requestedBy,
      requestedByName: `${txn.requesterFirstName} ${txn.requesterLastName}`,
      approvalLevel: txn.approvalLevel,
      status: txn.status,
      priority: txn.priority,
      justification: txn.justification || undefined,
      approvalHistory: Array.isArray(txn.approvalHistory) ? txn.approvalHistory : [],
      createdAt: txn.createdAt.toISOString(),
    }));
  }

  /**
   * Get disbursement vouchers ready for disbursement
   */
  async getReadyForDisbursement(tenantId: number, branchId: number): Promise<DisbursementVoucher[]> {
    const vouchers = await db
      .select()
      .from(pettyCashDisbursements)
      .where(
        and(
          eq(pettyCashDisbursements.tenantId, tenantId),
          eq(pettyCashDisbursements.branchId, branchId),
          eq(pettyCashDisbursements.status, 'prepared')
        )
      )
      .orderBy(desc(pettyCashDisbursements.preparedAt));

    return vouchers.map(voucher => ({
      id: voucher.id,
      voucherNumber: voucher.voucherNumber,
      transactionId: voucher.transactionId,
      payeeName: voucher.payeeName,
      amount: parseFloat(voucher.amount),
      disbursementMethod: voucher.disbursementMethod,
      status: voucher.status,
      preparedBy: voucher.preparedBy,
      approvedBy: voucher.approvedBy || undefined,
      disbursedBy: voucher.disbursedBy || undefined,
    }));
  }
}

export const pettyCashEngine = new PettyCashEngine();