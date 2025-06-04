import { 
  users, 
  tenants, 
  branches, 
  patients, 
  patientTests, 
  tests, 
  testCategories,
  referralProviders,
  transactions,
  systemAlerts,
  invoices,
  badgeDefinitions,
  staffAchievements,
  performanceMetrics,
  recognitionEvents,
  type User, 
  type InsertUser,
  type Tenant,
  type Branch,
  type Patient,
  type InsertPatient,
  type PatientTest,
  type InsertPatientTest,
  type Transaction,
  type InsertTransaction,
  type SystemAlert,
  type InsertSystemAlert,
  type ReferralProvider,
  type Test,
  type Invoice,
  type InsertInvoice,
  type BadgeDefinition,
  type InsertBadgeDefinition,
  type StaffAchievement,
  type InsertStaffAchievement,
  type PerformanceMetric,
  type InsertPerformanceMetric,
  type RecognitionEvent,
  type InsertRecognitionEvent
} from "@shared/schema";
import { db } from "./db";
import { eq, and, or, desc, sql, between, ilike } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "./db";

const PostgresSessionStore = connectPg(session);

export interface IStorage {
  sessionStore: session.SessionStore;
  
  // User management
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Tenant management
  getTenant(id: number): Promise<Tenant | undefined>;
  getTenantBySlug(slug: string): Promise<Tenant | undefined>;
  
  // Branch management
  getBranchesByTenant(tenantId: number): Promise<Branch[]>;
  getBranch(id: number): Promise<Branch | undefined>;
  updateBranchSync(branchId: number): Promise<void>;
  
  // Patient management
  getPatientsByBranch(branchId: number, limit?: number): Promise<Patient[]>;
  getPatient(id: number): Promise<Patient | undefined>;
  createPatient(patient: InsertPatient): Promise<Patient>;
  generatePatientId(tenantId: number): Promise<string>;
  searchPatients(branchId: number, query: string): Promise<Patient[]>;
  
  // Patient tests management
  getPatientTestsByBranch(branchId: number, limit?: number): Promise<PatientTest[]>;
  getPatientTestsByCategory(branchId: number, category: string, limit?: number): Promise<any[]>;
  getRecentPatientTests(branchId: number, limit?: number): Promise<any[]>;
  createPatientTest(patientTest: InsertPatientTest): Promise<PatientTest>;
  updatePatientTestStatus(id: number, status: string): Promise<void>;
  updatePatientTestResults(id: number, results: string, notes?: string, updatedBy?: number): Promise<void>;
  
  // Financial management
  createTransaction(transaction: InsertTransaction): Promise<Transaction>;
  getTodayRevenue(branchId: number): Promise<number>;
  getPaymentMethodsBreakdown(branchId: number): Promise<any[]>;
  
  // Dashboard metrics
  getDashboardMetrics(branchId: number): Promise<any>;
  
  // System alerts
  getSystemAlerts(tenantId: number, limit?: number): Promise<SystemAlert[]>;
  createSystemAlert(alert: InsertSystemAlert): Promise<SystemAlert>;
  
  // Additional methods for patient intake workflow
  getReferralProviders(tenantId: number): Promise<ReferralProvider[]>;
  createReferralProvider(provider: { name: string; tenantId: number; requiresCommissionSetup: boolean }): Promise<ReferralProvider>;
  getTestCategories(tenantId: number): Promise<TestCategory[]>;
  getTests(tenantId: number): Promise<Test[]>;
  getTest(id: number): Promise<Test | undefined>;
  
  // Invoice management (two-stage billing process)
  createInvoice(invoice: InsertInvoice): Promise<Invoice>;
  getInvoicesByBranch(branchId: number, status?: string): Promise<Invoice[]>;
  getInvoice(id: number): Promise<Invoice | undefined>;
  markInvoiceAsPaid(id: number, paymentData: { paymentMethod: string; paymentDetails: any; paidBy: number }): Promise<void>;
  generateInvoiceNumber(tenantId: number): Promise<string>;
  
  // Badge system methods
  getBadgeDefinitions(tenantId: number): Promise<BadgeDefinition[]>;
  createBadgeDefinition(badge: InsertBadgeDefinition): Promise<BadgeDefinition>;
  getStaffAchievements(userId: number): Promise<StaffAchievement[]>;
  createStaffAchievement(achievement: InsertStaffAchievement): Promise<StaffAchievement>;
  updateStaffAchievement(id: number, progress: number, isCompleted?: boolean): Promise<void>;
  recordPerformanceMetric(metric: InsertPerformanceMetric): Promise<PerformanceMetric>;
  getPerformanceMetrics(userId: number, metricType?: string, period?: string): Promise<PerformanceMetric[]>;
  createRecognitionEvent(event: InsertRecognitionEvent): Promise<RecognitionEvent>;
  getRecognitionEvents(branchId: number, recipientId?: number): Promise<RecognitionEvent[]>;
  approveRecognitionEvent(id: number, approvedBy: number): Promise<void>;
  getStaffBadgeSummary(userId: number): Promise<any>;
  getLeaderboard(branchId: number, period?: string): Promise<any[]>;
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.SessionStore;

  constructor() {
    this.sessionStore = new PostgresSessionStore({ 
      pool, 
      createTableIfMissing: true 
    });
  }

  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async getTenant(id: number): Promise<Tenant | undefined> {
    const [tenant] = await db.select().from(tenants).where(eq(tenants.id, id));
    return tenant || undefined;
  }

  async getTenantBySlug(slug: string): Promise<Tenant | undefined> {
    const [tenant] = await db.select().from(tenants).where(eq(tenants.slug, slug));
    return tenant || undefined;
  }

  async getBranchesByTenant(tenantId: number): Promise<Branch[]> {
    return await db.select().from(branches).where(eq(branches.tenantId, tenantId));
  }

  async getBranch(id: number): Promise<Branch | undefined> {
    const [branch] = await db.select().from(branches).where(eq(branches.id, id));
    return branch || undefined;
  }

  async updateBranchSync(branchId: number): Promise<void> {
    await db
      .update(branches)
      .set({ lastSyncAt: new Date() })
      .where(eq(branches.id, branchId));
  }

  async getPatientsByBranch(branchId: number, limit = 50): Promise<Patient[]> {
    return await db
      .select()
      .from(patients)
      .where(eq(patients.branchId, branchId))
      .orderBy(desc(patients.createdAt))
      .limit(limit);
  }

  async getPatient(id: number): Promise<Patient | undefined> {
    const [patient] = await db.select().from(patients).where(eq(patients.id, id));
    return patient || undefined;
  }

  async createPatient(insertPatient: InsertPatient): Promise<Patient> {
    const [patient] = await db
      .insert(patients)
      .values(insertPatient)
      .returning();
    return patient;
  }

  async generatePatientId(tenantId: number): Promise<string> {
    const year = new Date().getFullYear();
    const count = await db
      .select({ count: sql<number>`count(*)` })
      .from(patients)
      .where(
        and(
          eq(patients.tenantId, tenantId),
          sql`EXTRACT(YEAR FROM created_at) = ${year}`
        )
      );
    
    const nextNumber = (count[0]?.count || 0) + 1;
    return `P-${year}-${String(nextNumber).padStart(3, '0')}`;
  }

  async searchPatients(branchId: number, query: string): Promise<Patient[]> {
    const searchTerm = `%${query.toLowerCase()}%`;
    const results = await db.select()
      .from(patients)
      .where(
        and(
          eq(patients.branchId, branchId),
          or(
            sql`LOWER(${patients.firstName}) LIKE ${searchTerm}`,
            sql`LOWER(${patients.lastName}) LIKE ${searchTerm}`,
            sql`LOWER(${patients.phone}) LIKE ${searchTerm}`,
            sql`LOWER(${patients.patientId}) LIKE ${searchTerm}`
          )
        )
      )
      .limit(10);
    return results;
  }

  async getPatientTestsByBranch(branchId: number, limit = 50): Promise<any[]> {
    return await db
      .select({
        id: patientTests.id,
        testId: patientTests.testId,
        patientId: patientTests.patientId,
        branchId: patientTests.branchId,
        testName: tests.name,
        testCode: tests.code,
        category: testCategories.name,
        patientName: sql<string>`CONCAT(${patients.firstName}, ' ', ${patients.lastName})`,
        patientIdCode: patients.patientId,
        status: patientTests.status,
        scheduledAt: patientTests.scheduledAt,
        createdAt: patientTests.createdAt,
        completedAt: patientTests.completedAt,
        results: patientTests.results,
        notes: patientTests.notes,
        technicianId: patientTests.technicianId,
        consultantId: patientTests.consultantId,
        description: tests.description,
        duration: tests.duration,
        price: tests.price,
        requiresConsultant: tests.requiresConsultant,
        paymentStatus: invoices.status
      })
      .from(patientTests)
      .innerJoin(tests, eq(patientTests.testId, tests.id))
      .innerJoin(testCategories, eq(tests.categoryId, testCategories.id))
      .innerJoin(patients, eq(patientTests.patientId, patients.id))
      .leftJoin(invoices, eq(patientTests.invoiceId, invoices.id))
      .where(eq(patientTests.branchId, branchId))
      .orderBy(desc(patientTests.scheduledAt))
      .limit(limit);
  }

  async getPatientTestsByCategory(branchId: number, category: string, limit = 50): Promise<any[]> {
    return await db
      .select({
        id: patientTests.id,
        testName: tests.name,
        testCode: tests.code,
        patientName: sql<string>`CONCAT(${patients.firstName}, ' ', ${patients.lastName})`,
        status: patientTests.status,
        scheduledAt: patientTests.scheduledAt,
        createdAt: patientTests.createdAt,
        description: tests.description,
        duration: tests.duration,
        requiresConsultant: tests.requiresConsultant,
        results: patientTests.results,
        notes: patientTests.notes
      })
      .from(patientTests)
      .innerJoin(tests, eq(patientTests.testId, tests.id))
      .innerJoin(testCategories, eq(tests.categoryId, testCategories.id))
      .innerJoin(patients, eq(patientTests.patientId, patients.id))
      .where(
        and(
          eq(patientTests.branchId, branchId),
          ilike(testCategories.name, `%${category}%`)
        )
      )
      .orderBy(desc(patientTests.scheduledAt))
      .limit(limit);
  }

  async getRecentPatientTests(branchId: number, limit = 10): Promise<any[]> {
    return await db
      .select({
        id: patientTests.id,
        patientName: sql<string>`CONCAT(${patients.firstName}, ' ', ${patients.lastName})`,
        patientId: patients.patientId,
        testName: tests.name,
        status: patientTests.status,
        scheduledAt: patientTests.scheduledAt,
        completedAt: patientTests.completedAt,
      })
      .from(patientTests)
      .innerJoin(patients, eq(patientTests.patientId, patients.id))
      .innerJoin(tests, eq(patientTests.testId, tests.id))
      .where(eq(patientTests.branchId, branchId))
      .orderBy(desc(patientTests.scheduledAt))
      .limit(limit);
  }

  async createPatientTest(insertPatientTest: InsertPatientTest): Promise<PatientTest> {
    const [patientTest] = await db
      .insert(patientTests)
      .values(insertPatientTest)
      .returning();
    return patientTest;
  }

  async updatePatientTestStatus(id: number, status: string): Promise<void> {
    await db
      .update(patientTests)
      .set({ 
        status, 
        completedAt: status === 'completed' ? new Date() : null,
        updatedAt: new Date()
      })
      .where(eq(patientTests.id, id));
  }

  async updatePatientTestResults(id: number, results: string, notes?: string, updatedBy?: number): Promise<void> {
    await db
      .update(patientTests)
      .set({ 
        results,
        notes,
        status: 'completed',
        completedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(patientTests.id, id));
  }

  async createTransaction(insertTransaction: InsertTransaction): Promise<Transaction> {
    const [transaction] = await db
      .insert(transactions)
      .values(insertTransaction)
      .returning();
    return transaction;
  }

  async getTodayRevenue(branchId: number): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const result = await db
      .select({ total: sql<number>`COALESCE(SUM(${transactions.amount}), 0)` })
      .from(transactions)
      .where(
        and(
          eq(transactions.branchId, branchId),
          eq(transactions.type, 'payment'),
          between(transactions.createdAt, today, tomorrow)
        )
      );

    return result[0]?.total || 0;
  }

  async getPaymentMethodsBreakdown(branchId: number): Promise<any[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const result = await db
      .select({
        paymentMethod: invoices.paymentMethod,
        count: sql<number>`COUNT(*)`,
        totalAmount: sql<string>`COALESCE(SUM(CAST(${invoices.totalAmount} AS DECIMAL)), 0)`
      })
      .from(invoices)
      .where(
        and(
          eq(invoices.branchId, branchId),
          eq(invoices.paymentStatus, 'paid'),
          between(invoices.paidAt, today, tomorrow)
        )
      )
      .groupBy(invoices.paymentMethod);

    return result.map(row => ({
      paymentMethod: row.paymentMethod,
      count: row.count,
      totalAmount: parseFloat(row.totalAmount || '0')
    }));
  }

  async getDashboardMetrics(branchId: number): Promise<any> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Today's patients count
    const todayPatientsResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(patientTests)
      .where(
        and(
          eq(patientTests.branchId, branchId),
          between(patientTests.scheduledAt, today, tomorrow)
        )
      );

    // Pending tests count
    const pendingTestsResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(patientTests)
      .where(
        and(
          eq(patientTests.branchId, branchId),
          eq(patientTests.status, 'scheduled')
        )
      );

    // Today's revenue
    const todayRevenue = await this.getTodayRevenue(branchId);

    // Active staff count (users active today)
    const activeStaffResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(users)
      .where(
        and(
          eq(users.branchId, branchId),
          eq(users.isActive, true)
        )
      );

    return {
      todayPatients: todayPatientsResult[0]?.count || 0,
      pendingTests: pendingTestsResult[0]?.count || 0,
      todayRevenue: todayRevenue,
      activeStaff: activeStaffResult[0]?.count || 0
    };
  }

  async getSystemAlerts(tenantId: number, limit = 10): Promise<SystemAlert[]> {
    return await db
      .select()
      .from(systemAlerts)
      .where(eq(systemAlerts.tenantId, tenantId))
      .orderBy(desc(systemAlerts.createdAt))
      .limit(limit);
  }

  async createSystemAlert(insertAlert: InsertSystemAlert): Promise<SystemAlert> {
    const [alert] = await db
      .insert(systemAlerts)
      .values(insertAlert)
      .returning();
    return alert;
  }

  async getReferralProviders(tenantId: number): Promise<ReferralProvider[]> {
    return await db
      .select()
      .from(referralProviders)
      .where(eq(referralProviders.tenantId, tenantId))
      .orderBy(referralProviders.name);
  }

  async createReferralProvider(provider: { name: string; tenantId: number; requiresCommissionSetup: boolean }): Promise<ReferralProvider> {
    const [newProvider] = await db
      .insert(referralProviders)
      .values({
        name: provider.name,
        tenantId: provider.tenantId,
        type: "doctor", // Default type
        commissionRate: "0.00",
        requiresCommissionSetup: provider.requiresCommissionSetup,
        isActive: true
      })
      .returning();
    return newProvider;
  }

  async getTestCategories(tenantId: number): Promise<TestCategory[]> {
    return await db
      .select()
      .from(testCategories)
      .where(eq(testCategories.tenantId, tenantId))
      .orderBy(testCategories.name);
  }

  async getTests(tenantId: number): Promise<Test[]> {
    return await db
      .select()
      .from(tests)
      .where(eq(tests.tenantId, tenantId))
      .orderBy(tests.name);
  }

  async getTest(id: number): Promise<Test | undefined> {
    const [test] = await db
      .select()
      .from(tests)
      .where(eq(tests.id, id));
    return test || undefined;
  }

  // Invoice management methods for two-stage billing
  async createInvoice(insertInvoice: InsertInvoice): Promise<Invoice> {
    const [invoice] = await db
      .insert(invoices)
      .values(insertInvoice)
      .returning();
    return invoice;
  }

  async getInvoicesByBranch(branchId: number, status?: string): Promise<any[]> {
    const baseQuery = db
      .select({
        id: invoices.id,
        invoiceNumber: invoices.invoiceNumber,
        patientId: invoices.patientId,
        patientName: sql`${patients.firstName} || ' ' || ${patients.lastName}`.as('patientName'),
        totalAmount: invoices.totalAmount,
        paymentStatus: invoices.paymentStatus,
        paymentMethod: invoices.paymentMethod,
        createdAt: invoices.createdAt,
        paidAt: invoices.paidAt,
        createdByName: sql`${users.username}`.as('createdByName'),
        tests: invoices.tests
      })
      .from(invoices)
      .leftJoin(patients, eq(invoices.patientId, patients.id))
      .leftJoin(users, eq(invoices.createdBy, users.id));

    if (status) {
      return await baseQuery
        .where(and(eq(invoices.branchId, branchId), eq(invoices.paymentStatus, status)))
        .orderBy(desc(invoices.createdAt));
    } else {
      return await baseQuery
        .where(eq(invoices.branchId, branchId))
        .orderBy(desc(invoices.createdAt));
    }
  }

  async getInvoice(id: number): Promise<Invoice | undefined> {
    const [invoice] = await db.select().from(invoices).where(eq(invoices.id, id));
    return invoice || undefined;
  }

  async markInvoiceAsPaid(id: number, paymentData: { paymentMethod: string; paymentDetails: any; paidBy: number }): Promise<void> {
    await db
      .update(invoices)
      .set({
        paymentStatus: 'paid',
        paymentMethod: paymentData.paymentMethod,
        paymentDetails: paymentData.paymentDetails,
        paidBy: paymentData.paidBy,
        paidAt: new Date()
      })
      .where(eq(invoices.id, id));
  }

  async generateInvoiceNumber(tenantId: number): Promise<string> {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    
    // Get count of invoices created today for this tenant
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
    
    const result = await db
      .select({ count: sql`count(*)` })
      .from(invoices)
      .where(and(
        eq(invoices.tenantId, tenantId),
        between(invoices.createdAt, startOfDay, endOfDay)
      ));
    
    const count = Number(result[0]?.count || 0) + 1;
    const sequence = String(count).padStart(4, '0');
    
    return `INV-${year}${month}-${sequence}`;
  }

  // Simplified badge system implementation
  async getBadgeDefinitions(tenantId: number): Promise<any[]> {
    // Return sample badge definitions for now
    return [
      {
        id: 1,
        name: "Patient Care Excellence",
        description: "Exceptional patient service and care",
        icon: "Award",
        backgroundColor: "#3B82F6",
        category: "service",
        targetValue: 10
      },
      {
        id: 2,
        name: "Team Player",
        description: "Outstanding collaboration and teamwork",
        icon: "Users",
        backgroundColor: "#10B981",
        category: "teamwork",
        targetValue: 5
      },
      {
        id: 3,
        name: "Quality Champion",
        description: "Consistent high-quality work delivery",
        icon: "Star",
        backgroundColor: "#F59E0B",
        category: "performance",
        targetValue: 15
      }
    ];
  }

  async createBadgeDefinition(insertBadge: any): Promise<any> {
    // For now, return a mock created badge
    return {
      id: Math.floor(Math.random() * 1000),
      ...insertBadge,
      createdAt: new Date()
    };
  }

  async getStaffAchievements(userId: number): Promise<any[]> {
    // Return sample achievements
    return [
      {
        id: 1,
        userId,
        badgeDefinitionId: 1,
        progress: "8",
        targetValue: 10,
        isCompleted: false,
        completedAt: null,
        createdAt: new Date(),
        badgeName: "Patient Care Excellence",
        badgeDescription: "Exceptional patient service and care",
        badgeIcon: "Award",
        badgeColor: "#3B82F6"
      },
      {
        id: 2,
        userId,
        badgeDefinitionId: 2,
        progress: "5",
        targetValue: 5,
        isCompleted: true,
        completedAt: new Date(),
        createdAt: new Date(),
        badgeName: "Team Player",
        badgeDescription: "Outstanding collaboration and teamwork",
        badgeIcon: "Users",
        badgeColor: "#10B981"
      }
    ];
  }

  async createStaffAchievement(insertAchievement: any): Promise<any> {
    return {
      id: Math.floor(Math.random() * 1000),
      ...insertAchievement,
      createdAt: new Date()
    };
  }

  async updateStaffAchievement(id: number, progress: number, isCompleted?: boolean): Promise<void> {
    // Mock update - in real implementation this would update the database
    console.log(`Updated achievement ${id} with progress ${progress}, completed: ${isCompleted}`);
  }

  async recordPerformanceMetric(insertMetric: any): Promise<any> {
    return {
      id: Math.floor(Math.random() * 1000),
      ...insertMetric,
      createdAt: new Date()
    };
  }

  async getPerformanceMetrics(userId: number, metricType?: string, period?: string): Promise<any[]> {
    return [
      {
        id: 1,
        userId,
        metricType: "patients_processed",
        value: 25,
        period: "daily",
        createdAt: new Date()
      },
      {
        id: 2,
        userId,
        metricType: "tests_completed",
        value: 18,
        period: "daily",
        createdAt: new Date()
      }
    ];
  }

  async createRecognitionEvent(insertEvent: any): Promise<any> {
    return {
      id: Math.floor(Math.random() * 1000),
      ...insertEvent,
      isApproved: false,
      createdAt: new Date()
    };
  }

  async getRecognitionEvents(branchId: number, recipientId?: number): Promise<any[]> {
    return [
      {
        id: 1,
        recipientId: 1,
        nominatorId: 2,
        branchId,
        eventType: "peer_recognition",
        title: "Excellent Patient Care",
        description: "Provided exceptional care to difficult patient situation",
        isApproved: true,
        approvedBy: 3,
        approvedAt: new Date(),
        createdAt: new Date(),
        recipientName: "John Doe",
        nominatorName: "Jane Smith",
        approverName: "Manager"
      }
    ];
  }

  async approveRecognitionEvent(id: number, approvedBy: number): Promise<void> {
    console.log(`Approved recognition event ${id} by user ${approvedBy}`);
  }

  async getStaffBadgeSummary(userId: number): Promise<any> {
    return {
      totalBadges: 3,
      completedBadges: 1,
      inProgressBadges: 2,
      achievements: []
    };
  }

  async getLeaderboard(branchId: number, period?: string): Promise<any[]> {
    return [
      {
        userId: 1,
        username: "John Doe",
        branchId,
        completedBadges: 3,
        totalPoints: 150,
        recentAchievements: 1
      },
      {
        userId: 2,
        username: "Jane Smith",
        branchId,
        completedBadges: 2,
        totalPoints: 100,
        recentAchievements: 2
      }
    ];
  }
}

export const storage = new DatabaseStorage();
