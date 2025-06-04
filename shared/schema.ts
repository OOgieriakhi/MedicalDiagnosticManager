import { pgTable, text, serial, integer, boolean, timestamp, decimal, json, varchar } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table for authentication and staff management
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email").notNull().unique(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  role: text("role").notNull().default("staff"), // admin, manager, technician, receptionist, staff
  tenantId: integer("tenant_id").notNull(),
  branchId: integer("branch_id"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Tenants for multi-tenant architecture
export const tenants = pgTable("tenants", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  logo: text("logo"),
  primaryColor: text("primary_color").default("#2563EB"),
  secondaryColor: text("secondary_color").default("#059669"),
  contactEmail: text("contact_email"),
  contactPhone: text("contact_phone"),
  address: text("address"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Branches for each tenant
export const branches = pgTable("branches", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  code: text("code").notNull(),
  tenantId: integer("tenant_id").notNull(),
  address: text("address"),
  phone: text("phone"),
  email: text("email"),
  managerId: integer("manager_id"),
  isActive: boolean("is_active").notNull().default(true),
  lastSyncAt: timestamp("last_sync_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Patients
export const patients = pgTable("patients", {
  id: serial("id").primaryKey(),
  patientId: text("patient_id").notNull().unique(), // Generated ID like P-2024-001
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email"),
  phone: text("phone").notNull(),
  dateOfBirth: timestamp("date_of_birth"),
  gender: text("gender"), // male, female, other
  address: text("address"),
  pathway: text("pathway").notNull().default("self"), // self, referral
  referralProviderId: integer("referral_provider_id"),
  tenantId: integer("tenant_id").notNull(),
  branchId: integer("branch_id").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Referral Providers for commission tracking
export const referralProviders = pgTable("referral_providers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(), // doctor, clinic, hospital, agent
  contactPerson: text("contact_person"),
  email: text("email"),
  phone: text("phone"),
  address: text("address"),
  commissionRate: decimal("commission_rate", { precision: 5, scale: 2 }).default("0.00"), // Percentage
  maxRebateLimit: decimal("max_rebate_limit", { precision: 10, scale: 2 }).default("0.00"), // Per test limit
  tenantId: integer("tenant_id").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Test Categories
export const testCategories = pgTable("test_categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  tenantId: integer("tenant_id").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Tests/Procedures
export const tests = pgTable("tests", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  code: text("code").notNull(),
  categoryId: integer("category_id").notNull(),
  description: text("description"),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  duration: integer("duration").default(30), // minutes
  requiresConsultant: boolean("requires_consultant").default(false),
  tenantId: integer("tenant_id").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Patient Tests/Appointments
export const patientTests = pgTable("patient_tests", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").notNull(),
  testId: integer("test_id").notNull(),
  status: text("status").notNull().default("scheduled"), // scheduled, in_progress, completed, cancelled
  scheduledAt: timestamp("scheduled_at").notNull(),
  completedAt: timestamp("completed_at"),
  results: text("results"),
  notes: text("notes"),
  technicianId: integer("technician_id"),
  consultantId: integer("consultant_id"),
  branchId: integer("branch_id").notNull(),
  tenantId: integer("tenant_id").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Consultants (for external analysis)
export const consultants = pgTable("consultants", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  specialization: text("specialization").notNull(), // ECG, X-ray, MRI, etc.
  email: text("email"),
  phone: text("phone"),
  feePerTest: decimal("fee_per_test", { precision: 10, scale: 2 }).notNull(),
  tenantId: integer("tenant_id").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Financial Transactions
export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(), // payment, commission, expense, consultant_fee
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  currency: text("currency").notNull().default("NGN"),
  description: text("description"),
  patientTestId: integer("patient_test_id"),
  referralProviderId: integer("referral_provider_id"),
  consultantId: integer("consultant_id"),
  branchId: integer("branch_id").notNull(),
  tenantId: integer("tenant_id").notNull(),
  createdBy: integer("created_by").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Commission Payments
export const commissionPayments = pgTable("commission_payments", {
  id: serial("id").primaryKey(),
  referralProviderId: integer("referral_provider_id").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  currency: text("currency").notNull().default("NGN"),
  period: text("period").notNull(), // YYYY-MM format
  status: text("status").notNull().default("pending"), // pending, paid, cancelled
  paidAt: timestamp("paid_at"),
  tenantId: integer("tenant_id").notNull(),
  createdBy: integer("created_by").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// System Alerts
export const systemAlerts = pgTable("system_alerts", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  type: text("type").notNull().default("info"), // info, warning, error, success
  isRead: boolean("is_read").notNull().default(false),
  userId: integer("user_id"),
  branchId: integer("branch_id"),
  tenantId: integer("tenant_id").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ one, many }) => ({
  tenant: one(tenants, { fields: [users.tenantId], references: [tenants.id] }),
  branch: one(branches, { fields: [users.branchId], references: [branches.id] }),
}));

export const tenantsRelations = relations(tenants, ({ many }) => ({
  users: many(users),
  branches: many(branches),
  patients: many(patients),
}));

export const branchesRelations = relations(branches, ({ one, many }) => ({
  tenant: one(tenants, { fields: [branches.tenantId], references: [tenants.id] }),
  manager: one(users, { fields: [branches.managerId], references: [users.id] }),
  patients: many(patients),
  patientTests: many(patientTests),
}));

export const patientsRelations = relations(patients, ({ one, many }) => ({
  tenant: one(tenants, { fields: [patients.tenantId], references: [tenants.id] }),
  branch: one(branches, { fields: [patients.branchId], references: [branches.id] }),
  referralProvider: one(referralProviders, { fields: [patients.referralProviderId], references: [referralProviders.id] }),
  patientTests: many(patientTests),
}));

export const referralProvidersRelations = relations(referralProviders, ({ one, many }) => ({
  tenant: one(tenants, { fields: [referralProviders.tenantId], references: [tenants.id] }),
  patients: many(patients),
  commissionPayments: many(commissionPayments),
}));

export const testsRelations = relations(tests, ({ one, many }) => ({
  category: one(testCategories, { fields: [tests.categoryId], references: [testCategories.id] }),
  tenant: one(tenants, { fields: [tests.tenantId], references: [tenants.id] }),
  patientTests: many(patientTests),
}));

export const patientTestsRelations = relations(patientTests, ({ one }) => ({
  patient: one(patients, { fields: [patientTests.patientId], references: [patients.id] }),
  test: one(tests, { fields: [patientTests.testId], references: [tests.id] }),
  technician: one(users, { fields: [patientTests.technicianId], references: [users.id] }),
  consultant: one(consultants, { fields: [patientTests.consultantId], references: [consultants.id] }),
  branch: one(branches, { fields: [patientTests.branchId], references: [branches.id] }),
  tenant: one(tenants, { fields: [patientTests.tenantId], references: [tenants.id] }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTenantSchema = createInsertSchema(tenants).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertBranchSchema = createInsertSchema(branches).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  lastSyncAt: true,
});

export const insertPatientSchema = createInsertSchema(patients).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPatientTestSchema = createInsertSchema(patientTests).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTransactionSchema = createInsertSchema(transactions).omit({
  id: true,
  createdAt: true,
});

export const insertSystemAlertSchema = createInsertSchema(systemAlerts).omit({
  id: true,
  createdAt: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Tenant = typeof tenants.$inferSelect;
export type InsertTenant = z.infer<typeof insertTenantSchema>;

export type Branch = typeof branches.$inferSelect;
export type InsertBranch = z.infer<typeof insertBranchSchema>;

export type Patient = typeof patients.$inferSelect;
export type InsertPatient = z.infer<typeof insertPatientSchema>;

export type ReferralProvider = typeof referralProviders.$inferSelect;

export type Test = typeof tests.$inferSelect;

export type PatientTest = typeof patientTests.$inferSelect;
export type InsertPatientTest = z.infer<typeof insertPatientTestSchema>;

export type Consultant = typeof consultants.$inferSelect;

export type Transaction = typeof transactions.$inferSelect;
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;

export type CommissionPayment = typeof commissionPayments.$inferSelect;

export type SystemAlert = typeof systemAlerts.$inferSelect;
export type InsertSystemAlert = z.infer<typeof insertSystemAlertSchema>;
