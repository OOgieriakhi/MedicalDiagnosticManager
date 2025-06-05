import { db } from "./db";
import { 
  chartOfAccounts, 
  journalEntries,
  journalEntryLineItems,
  accountBalances,
  fiscalPeriods,
  budgetVsActual,
  patients,
  patientTests,
  invoices
} from "../shared/schema";
import { eq, and, desc, sql, count, sum, avg, max, min, gte, lte, between } from "drizzle-orm";

export interface FinancialSummary {
  totalAssets: number;
  totalLiabilities: number;
  totalEquity: number;
  totalRevenue: number;
  totalExpenses: number;
  netIncome: number;
  currentRatio: number;
  quickRatio: number;
}

export interface AccountBalance {
  id: number;
  accountCode: string;
  accountName: string;
  accountType: string;
  accountSubtype: string;
  currentBalance: number;
  previousBalance: number;
  variance: number;
  variancePercent: number;
  isActive: boolean;
}

export interface JournalEntryData {
  id: number;
  entryNumber: string;
  entryDate: string;
  description: string;
  totalDebit: number;
  totalCredit: number;
  status: string;
  createdBy: string;
  referenceType: string;
  referenceNumber: string;
  lineItems?: JournalLineItem[];
}

export interface JournalLineItem {
  id: number;
  accountId: number;
  accountCode: string;
  accountName: string;
  description: string;
  debitAmount: number;
  creditAmount: number;
}

export interface CashFlowData {
  month: string;
  inflow: number;
  outflow: number;
  netFlow: number;
}

export class AccountingEngine {

  async getFinancialSummary(tenantId: number, branchId?: number, period?: string) {
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1;

    // Calculate date range based on period
    let startDate: Date, endDate: Date;
    switch (period) {
      case 'previous':
        startDate = new Date(currentYear, currentMonth - 2, 1);
        endDate = new Date(currentYear, currentMonth - 1, 0);
        break;
      case 'ytd':
        startDate = new Date(currentYear, 0, 1);
        endDate = currentDate;
        break;
      default: // current
        startDate = new Date(currentYear, currentMonth - 1, 1);
        endDate = new Date(currentYear, currentMonth, 0);
    }

    // Get account balances by type
    const accountSummary = await db
      .select({
        accountType: chartOfAccounts.accountType,
        totalBalance: sql<number>`COALESCE(SUM(${accountBalances.closingBalance}), 0)`
      })
      .from(chartOfAccounts)
      .leftJoin(accountBalances, eq(chartOfAccounts.id, accountBalances.accountId))
      .where(
        and(
          eq(chartOfAccounts.tenantId, tenantId),
          branchId ? eq(accountBalances.branchId, branchId) : undefined,
          eq(chartOfAccounts.isActive, true)
        )
      )
      .groupBy(chartOfAccounts.accountType);

    // Extract totals by account type
    const totals = accountSummary.reduce((acc, row) => {
      acc[row.accountType] = Number(row.totalBalance);
      return acc;
    }, {} as Record<string, number>);

    const totalAssets = totals.asset || 0;
    const totalLiabilities = totals.liability || 0;
    const totalEquity = totals.equity || 0;
    const totalRevenue = totals.revenue || 0;
    const totalExpenses = totals.expense || 0;

    // Calculate ratios
    const netIncome = totalRevenue - totalExpenses;
    const currentRatio = totalLiabilities > 0 ? totalAssets / totalLiabilities : 0;
    const quickRatio = totalLiabilities > 0 ? (totalAssets * 0.8) / totalLiabilities : 0;

    return {
      totalAssets,
      totalLiabilities,
      totalEquity,
      totalRevenue,
      totalExpenses,
      netIncome,
      currentRatio,
      quickRatio
    };
  }

  async getAccountBalances(tenantId: number, branchId?: number, accountType?: string, searchTerm?: string) {
    let whereConditions = [
      eq(chartOfAccounts.tenantId, tenantId),
      eq(chartOfAccounts.isActive, true)
    ];

    if (accountType && accountType !== 'all') {
      whereConditions.push(eq(chartOfAccounts.accountType, accountType));
    }

    if (searchTerm) {
      whereConditions.push(
        sql`(${chartOfAccounts.accountName} ILIKE ${'%' + searchTerm + '%'} OR ${chartOfAccounts.accountCode} ILIKE ${'%' + searchTerm + '%'})`
      );
    }

    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1;
    const previousMonth = currentMonth === 1 ? 12 : currentMonth - 1;
    const previousYear = currentMonth === 1 ? currentYear - 1 : currentYear;

    const accounts = await db
      .select({
        id: chartOfAccounts.id,
        accountCode: chartOfAccounts.accountCode,
        accountName: chartOfAccounts.accountName,
        accountType: chartOfAccounts.accountType,
        accountSubtype: chartOfAccounts.accountSubtype,
        currentBalance: sql<number>`COALESCE(current_balance.closing_balance, 0)`,
        previousBalance: sql<number>`COALESCE(previous_balance.closing_balance, 0)`
      })
      .from(chartOfAccounts)
      .leftJoin(
        sql`(SELECT account_id, closing_balance FROM ${accountBalances} WHERE fiscal_year = ${currentYear} AND fiscal_month = ${currentMonth}) current_balance`,
        eq(chartOfAccounts.id, sql`current_balance.account_id`)
      )
      .leftJoin(
        sql`(SELECT account_id, closing_balance FROM ${accountBalances} WHERE fiscal_year = ${previousYear} AND fiscal_month = ${previousMonth}) previous_balance`,
        eq(chartOfAccounts.id, sql`previous_balance.account_id`)
      )
      .where(and(...whereConditions))
      .orderBy(chartOfAccounts.accountCode);

    return accounts.map(account => {
      const currentBalance = Number(account.currentBalance);
      const previousBalance = Number(account.previousBalance);
      const variance = currentBalance - previousBalance;
      const variancePercent = previousBalance !== 0 ? (variance / Math.abs(previousBalance)) * 100 : 0;

      return {
        id: account.id,
        accountCode: account.accountCode,
        accountName: account.accountName,
        accountType: account.accountType,
        accountSubtype: account.accountSubtype,
        currentBalance,
        previousBalance,
        variance,
        variancePercent,
        isActive: true
      };
    });
  }

  async getJournalEntries(tenantId: number, branchId?: number, limit: number = 50, status?: string) {
    let whereConditions = [eq(journalEntries.tenantId, tenantId)];

    if (branchId) {
      whereConditions.push(eq(journalEntries.branchId, branchId));
    }

    if (status && status !== 'all') {
      whereConditions.push(eq(journalEntries.status, status));
    }

    const entries = await db
      .select({
        id: journalEntries.id,
        entryNumber: journalEntries.entryNumber,
        entryDate: journalEntries.entryDate,
        description: journalEntries.description,
        totalDebit: journalEntries.totalDebit,
        totalCredit: journalEntries.totalCredit,
        status: journalEntries.status,
        referenceType: journalEntries.referenceType,
        referenceNumber: journalEntries.referenceNumber,
        createdBy: sql<string>`users.username`
      })
      .from(journalEntries)
      .leftJoin(sql`users`, eq(journalEntries.createdBy, sql`users.id`))
      .where(and(...whereConditions))
      .orderBy(desc(journalEntries.entryDate))
      .limit(limit);

    return entries.map(entry => ({
      id: entry.id,
      entryNumber: entry.entryNumber,
      entryDate: entry.entryDate.toISOString(),
      description: entry.description,
      totalDebit: Number(entry.totalDebit),
      totalCredit: Number(entry.totalCredit),
      status: entry.status,
      createdBy: entry.createdBy || 'Unknown',
      referenceType: entry.referenceType || '',
      referenceNumber: entry.referenceNumber || ''
    }));
  }

  async getJournalEntryDetails(entryId: number, tenantId: number) {
    const entry = await db
      .select({
        id: journalEntries.id,
        entryNumber: journalEntries.entryNumber,
        entryDate: journalEntries.entryDate,
        description: journalEntries.description,
        totalDebit: journalEntries.totalDebit,
        totalCredit: journalEntries.totalCredit,
        status: journalEntries.status,
        referenceType: journalEntries.referenceType,
        referenceNumber: journalEntries.referenceNumber,
        createdBy: sql<string>`users.username`
      })
      .from(journalEntries)
      .leftJoin(sql`users`, eq(journalEntries.createdBy, sql`users.id`))
      .where(
        and(
          eq(journalEntries.id, entryId),
          eq(journalEntries.tenantId, tenantId)
        )
      );

    if (entry.length === 0) {
      throw new Error('Journal entry not found');
    }

    const lineItems = await db
      .select({
        id: journalEntryLineItems.id,
        accountId: journalEntryLineItems.accountId,
        accountCode: chartOfAccounts.accountCode,
        accountName: chartOfAccounts.accountName,
        description: journalEntryLineItems.description,
        debitAmount: journalEntryLineItems.debitAmount,
        creditAmount: journalEntryLineItems.creditAmount
      })
      .from(journalEntryLineItems)
      .innerJoin(chartOfAccounts, eq(journalEntryLineItems.accountId, chartOfAccounts.id))
      .where(eq(journalEntryLineItems.journalEntryId, entryId))
      .orderBy(journalEntryLineItems.id);

    const entryData = entry[0];
    return {
      id: entryData.id,
      entryNumber: entryData.entryNumber,
      entryDate: entryData.entryDate.toISOString(),
      description: entryData.description,
      totalDebit: Number(entryData.totalDebit),
      totalCredit: Number(entryData.totalCredit),
      status: entryData.status,
      createdBy: entryData.createdBy || 'Unknown',
      referenceType: entryData.referenceType || '',
      referenceNumber: entryData.referenceNumber || '',
      lineItems: lineItems.map(item => ({
        id: item.id,
        accountId: item.accountId,
        accountCode: item.accountCode,
        accountName: item.accountName,
        description: item.description,
        debitAmount: Number(item.debitAmount || 0),
        creditAmount: Number(item.creditAmount || 0)
      }))
    };
  }

  async getCashFlowData(tenantId: number, branchId?: number, months: number = 12) {
    const currentDate = new Date();
    const startDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - months + 1, 1);

    // Get revenue (cash inflows) from invoices
    const revenueData = await db
      .select({
        month: sql<string>`TO_CHAR(${invoices.invoiceDate}, 'YYYY-MM')`,
        amount: sql<number>`SUM(${invoices.totalAmount})`
      })
      .from(invoices)
      .where(
        and(
          eq(invoices.tenantId, tenantId),
          branchId ? eq(invoices.branchId, branchId) : undefined,
          gte(invoices.invoiceDate, startDate),
          eq(invoices.status, 'paid')
        )
      )
      .groupBy(sql`TO_CHAR(${invoices.invoiceDate}, 'YYYY-MM')`)
      .orderBy(sql`TO_CHAR(${invoices.invoiceDate}, 'YYYY-MM')`);

    // Get expenses (cash outflows) from journal entries
    const expenseData = await db
      .select({
        month: sql<string>`TO_CHAR(${journalEntries.entryDate}, 'YYYY-MM')`,
        amount: sql<number>`SUM(${journalEntryLineItems.debitAmount})`
      })
      .from(journalEntries)
      .innerJoin(journalEntryLineItems, eq(journalEntries.id, journalEntryLineItems.journalEntryId))
      .innerJoin(chartOfAccounts, eq(journalEntryLineItems.accountId, chartOfAccounts.id))
      .where(
        and(
          eq(journalEntries.tenantId, tenantId),
          branchId ? eq(journalEntries.branchId, branchId) : undefined,
          gte(journalEntries.entryDate, startDate),
          eq(journalEntries.status, 'posted'),
          eq(chartOfAccounts.accountType, 'expense')
        )
      )
      .groupBy(sql`TO_CHAR(${journalEntries.entryDate}, 'YYYY-MM')`)
      .orderBy(sql`TO_CHAR(${journalEntries.entryDate}, 'YYYY-MM')`);

    // Create monthly cash flow data
    const monthlyData: { [key: string]: CashFlowData } = {};
    
    // Initialize all months
    for (let i = 0; i < months; i++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
      const monthKey = date.toISOString().substring(0, 7);
      const monthName = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      
      monthlyData[monthKey] = {
        month: monthName,
        inflow: 0,
        outflow: 0,
        netFlow: 0
      };
    }

    // Populate revenue data
    revenueData.forEach(row => {
      if (monthlyData[row.month]) {
        monthlyData[row.month].inflow = Number(row.amount);
      }
    });

    // Populate expense data
    expenseData.forEach(row => {
      if (monthlyData[row.month]) {
        monthlyData[row.month].outflow = Number(row.amount);
      }
    });

    // Calculate net flow
    Object.values(monthlyData).forEach(data => {
      data.netFlow = data.inflow - data.outflow;
    });

    return Object.values(monthlyData).reverse(); // Return chronologically
  }

  async createJournalEntry(tenantId: number, branchId: number, entryData: {
    description: string;
    referenceType?: string;
    referenceId?: number;
    referenceNumber?: string;
    lineItems: Array<{
      accountId: number;
      description: string;
      debitAmount?: number;
      creditAmount?: number;
    }>;
    createdBy: number;
  }) {
    // Validate line items balance
    const totalDebits = entryData.lineItems.reduce((sum, item) => sum + (item.debitAmount || 0), 0);
    const totalCredits = entryData.lineItems.reduce((sum, item) => sum + (item.creditAmount || 0), 0);

    if (Math.abs(totalDebits - totalCredits) > 0.01) {
      throw new Error('Journal entry is not balanced. Debits must equal credits.');
    }

    // Generate entry number
    const entryCount = await db
      .select({ count: count() })
      .from(journalEntries)
      .where(eq(journalEntries.tenantId, tenantId));

    const entryNumber = `JE-${new Date().getFullYear()}-${String(entryCount[0].count + 1).padStart(6, '0')}`;

    // Create journal entry
    const [journalEntry] = await db
      .insert(journalEntries)
      .values({
        tenantId,
        branchId,
        entryNumber,
        entryDate: new Date(),
        description: entryData.description,
        referenceType: entryData.referenceType,
        referenceId: entryData.referenceId,
        referenceNumber: entryData.referenceNumber,
        totalDebit: totalDebits.toString(),
        totalCredit: totalCredits.toString(),
        status: 'draft',
        createdBy: entryData.createdBy
      })
      .returning();

    // Create line items
    for (const lineItem of entryData.lineItems) {
      await db.insert(journalEntryLineItems).values({
        journalEntryId: journalEntry.id,
        accountId: lineItem.accountId,
        description: lineItem.description,
        debitAmount: lineItem.debitAmount?.toString() || "0",
        creditAmount: lineItem.creditAmount?.toString() || "0"
      });
    }

    return journalEntry;
  }

  async postJournalEntry(entryId: number, tenantId: number, userId: number) {
    // Update journal entry status
    await db
      .update(journalEntries)
      .set({
        status: 'posted',
        approvedBy: userId,
        postedAt: new Date(),
        updatedAt: new Date()
      })
      .where(
        and(
          eq(journalEntries.id, entryId),
          eq(journalEntries.tenantId, tenantId)
        )
      );

    // Update account balances
    await this.updateAccountBalances(entryId, tenantId);

    return { success: true };
  }

  async updateAccountBalances(entryId: number, tenantId: number) {
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1;

    // Get line items for the journal entry
    const lineItems = await db
      .select({
        accountId: journalEntryLineItems.accountId,
        debitAmount: journalEntryLineItems.debitAmount,
        creditAmount: journalEntryLineItems.creditAmount
      })
      .from(journalEntryLineItems)
      .where(eq(journalEntryLineItems.journalEntryId, entryId));

    // Update balances for each affected account
    for (const item of lineItems) {
      const debitAmount = Number(item.debitAmount || 0);
      const creditAmount = Number(item.creditAmount || 0);

      // Check if balance record exists
      const existingBalance = await db
        .select()
        .from(accountBalances)
        .where(
          and(
            eq(accountBalances.tenantId, tenantId),
            eq(accountBalances.accountId, item.accountId),
            eq(accountBalances.fiscalYear, currentYear),
            eq(accountBalances.fiscalMonth, currentMonth)
          )
        );

      if (existingBalance.length > 0) {
        // Update existing balance
        await db
          .update(accountBalances)
          .set({
            debitMovements: sql`${accountBalances.debitMovements} + ${debitAmount}`,
            creditMovements: sql`${accountBalances.creditMovements} + ${creditAmount}`,
            closingBalance: sql`${accountBalances.openingBalance} + ${accountBalances.debitMovements} - ${accountBalances.creditMovements}`,
            lastUpdated: new Date()
          })
          .where(eq(accountBalances.id, existingBalance[0].id));
      } else {
        // Create new balance record
        await db.insert(accountBalances).values({
          tenantId,
          branchId: 1, // Default branch - should be dynamic
          accountId: item.accountId,
          fiscalYear: currentYear,
          fiscalMonth: currentMonth,
          openingBalance: "0",
          debitMovements: debitAmount.toString(),
          creditMovements: creditAmount.toString(),
          closingBalance: (debitAmount - creditAmount).toString()
        });
      }
    }
  }

  async initializeChartOfAccounts(tenantId: number) {
    const defaultAccounts = [
      // Assets
      { code: '1000', name: 'Cash and Cash Equivalents', type: 'asset', subtype: 'current_asset' },
      { code: '1100', name: 'Accounts Receivable', type: 'asset', subtype: 'current_asset' },
      { code: '1200', name: 'Inventory - Medical Supplies', type: 'asset', subtype: 'current_asset' },
      { code: '1300', name: 'Prepaid Expenses', type: 'asset', subtype: 'current_asset' },
      { code: '1500', name: 'Medical Equipment', type: 'asset', subtype: 'fixed_asset' },
      { code: '1600', name: 'Accumulated Depreciation - Equipment', type: 'asset', subtype: 'fixed_asset' },
      { code: '1700', name: 'Building and Improvements', type: 'asset', subtype: 'fixed_asset' },

      // Liabilities
      { code: '2000', name: 'Accounts Payable', type: 'liability', subtype: 'current_liability' },
      { code: '2100', name: 'Accrued Expenses', type: 'liability', subtype: 'current_liability' },
      { code: '2200', name: 'Short-term Loans', type: 'liability', subtype: 'current_liability' },
      { code: '2500', name: 'Long-term Debt', type: 'liability', subtype: 'long_term_liability' },

      // Equity
      { code: '3000', name: 'Owner\'s Equity', type: 'equity', subtype: 'equity' },
      { code: '3100', name: 'Retained Earnings', type: 'equity', subtype: 'equity' },

      // Revenue
      { code: '4000', name: 'Patient Service Revenue', type: 'revenue', subtype: 'operating_revenue' },
      { code: '4100', name: 'Laboratory Revenue', type: 'revenue', subtype: 'operating_revenue' },
      { code: '4200', name: 'Pharmacy Revenue', type: 'revenue', subtype: 'operating_revenue' },
      { code: '4300', name: 'Insurance Reimbursements', type: 'revenue', subtype: 'operating_revenue' },

      // Expenses
      { code: '5000', name: 'Salaries and Wages', type: 'expense', subtype: 'operating_expense' },
      { code: '5100', name: 'Medical Supplies Expense', type: 'expense', subtype: 'operating_expense' },
      { code: '5200', name: 'Rent Expense', type: 'expense', subtype: 'operating_expense' },
      { code: '5300', name: 'Utilities Expense', type: 'expense', subtype: 'operating_expense' },
      { code: '5400', name: 'Insurance Expense', type: 'expense', subtype: 'operating_expense' },
      { code: '5500', name: 'Depreciation Expense', type: 'expense', subtype: 'operating_expense' },
      { code: '5600', name: 'Professional Services', type: 'expense', subtype: 'operating_expense' },
      { code: '5700', name: 'Marketing and Advertising', type: 'expense', subtype: 'operating_expense' }
    ];

    for (const account of defaultAccounts) {
      const existing = await db
        .select()
        .from(chartOfAccounts)
        .where(
          and(
            eq(chartOfAccounts.tenantId, tenantId),
            eq(chartOfAccounts.accountCode, account.code)
          )
        );

      if (existing.length === 0) {
        await db.insert(chartOfAccounts).values({
          tenantId,
          accountCode: account.code,
          accountName: account.name,
          accountType: account.type,
          accountSubtype: account.subtype,
          description: `Default ${account.name} account`
        });
      }
    }
  }
}

export const accountingEngine = new AccountingEngine();