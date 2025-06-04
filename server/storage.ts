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
  type TestCategory,
  type Test
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, sql, between } from "drizzle-orm";
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
  
  // Patient tests management
  getPatientTestsByBranch(branchId: number, limit?: number): Promise<PatientTest[]>;
  getRecentPatientTests(branchId: number, limit?: number): Promise<any[]>;
  createPatientTest(patientTest: InsertPatientTest): Promise<PatientTest>;
  updatePatientTestStatus(id: number, status: string): Promise<void>;
  
  // Financial management
  createTransaction(transaction: InsertTransaction): Promise<Transaction>;
  getTodayRevenue(branchId: number): Promise<number>;
  
  // Dashboard metrics
  getDashboardMetrics(branchId: number): Promise<any>;
  
  // System alerts
  getSystemAlerts(tenantId: number, limit?: number): Promise<SystemAlert[]>;
  createSystemAlert(alert: InsertSystemAlert): Promise<SystemAlert>;
  
  // Additional methods for patient intake workflow
  getReferralProviders(tenantId: number): Promise<ReferralProvider[]>;
  getTestCategories(tenantId: number): Promise<TestCategory[]>;
  getTests(tenantId: number): Promise<Test[]>;
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

  async getPatientTestsByBranch(branchId: number, limit = 50): Promise<PatientTest[]> {
    return await db
      .select()
      .from(patientTests)
      .where(eq(patientTests.branchId, branchId))
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
}

export const storage = new DatabaseStorage();
