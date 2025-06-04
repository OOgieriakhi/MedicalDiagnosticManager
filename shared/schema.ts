import { pgTable, text, serial, integer, boolean, timestamp, decimal, json, jsonb, varchar } from "drizzle-orm/pg-core";
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
  nin: text("nin"), // National Identification Number (11 digits)
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
  requiresCommissionSetup: boolean("requires_commission_setup").notNull().default(false), // Flag for managers
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
export const invoices = pgTable("invoices", {
  id: serial("id").primaryKey(),
  invoiceNumber: text("invoice_number").notNull().unique(),
  patientId: integer("patient_id").notNull().references(() => patients.id),
  tenantId: integer("tenant_id").notNull().references(() => tenants.id),
  branchId: integer("branch_id").notNull().references(() => branches.id),
  
  // Test details
  tests: json("tests").notNull(), // Array of {testId, quantity, unitPrice, totalPrice}
  
  // Financial calculations
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull(),
  discountPercentage: decimal("discount_percentage", { precision: 5, scale: 2 }).default("0"),
  discountAmount: decimal("discount_amount", { precision: 10, scale: 2 }).default("0"),
  commissionAmount: decimal("commission_amount", { precision: 10, scale: 2 }).default("0"),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  netAmount: decimal("net_amount", { precision: 10, scale: 2 }).notNull(),
  
  // Payment status and details
  paymentStatus: text("payment_status").notNull().default("unpaid"), // 'unpaid', 'paid'
  paymentMethod: text("payment_method"), // 'cash', 'card', 'bank_transfer', 'insurance'
  paymentDetails: json("payment_details"), // Store payment-specific details
  
  // Staff tracking
  createdBy: integer("created_by").notNull().references(() => users.id),
  paidBy: integer("paid_by").references(() => users.id), // Cashier who collected payment
  
  // Timestamps
  createdAt: timestamp("created_at").defaultNow(),
  paidAt: timestamp("paid_at"),
});

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

// Badge definitions - templates for different types of achievements
export const badgeDefinitions = pgTable("badge_definitions", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  icon: text("icon").notNull(), // lucide icon name
  category: text("category").notNull(), // performance, milestone, teamwork, innovation, customer_service
  level: text("level").notNull().default("bronze"), // bronze, silver, gold, platinum
  criteria: jsonb("criteria").notNull(), // Achievement criteria (e.g., {type: "tests_completed", threshold: 100})
  points: integer("points").notNull().default(10),
  isActive: boolean("is_active").notNull().default(true),
  tenantId: integer("tenant_id").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Staff achievements - when staff members earn badges
export const staffAchievements = pgTable("staff_achievements", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  badgeDefinitionId: integer("badge_definition_id").notNull().references(() => badgeDefinitions.id),
  progress: decimal("progress", { precision: 5, scale: 2 }).notNull().default("0.00"), // Progress towards achievement (0-100%)
  isCompleted: boolean("is_completed").notNull().default(false),
  completedAt: timestamp("completed_at"),
  branchId: integer("branch_id").notNull(),
  tenantId: integer("tenant_id").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Performance metrics - track various performance indicators
export const performanceMetrics = pgTable("performance_metrics", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  metricType: text("metric_type").notNull(), // tests_completed, patients_served, invoices_processed, etc.
  value: decimal("value", { precision: 10, scale: 2 }).notNull(),
  period: text("period").notNull().default("daily"), // daily, weekly, monthly, yearly
  date: timestamp("date").notNull(),
  branchId: integer("branch_id").notNull(),
  tenantId: integer("tenant_id").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Staff recognition events - peer nominations, manager recognition
export const recognitionEvents = pgTable("recognition_events", {
  id: serial("id").primaryKey(),
  recipientId: integer("recipient_id").notNull().references(() => users.id),
  nominatorId: integer("nominator_id").notNull().references(() => users.id),
  type: text("type").notNull(), // peer_nomination, manager_recognition, customer_feedback
  title: text("title").notNull(),
  description: text("description").notNull(),
  points: integer("points").notNull().default(5),
  isApproved: boolean("is_approved").notNull().default(false),
  approvedBy: integer("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  branchId: integer("branch_id").notNull(),
  tenantId: integer("tenant_id").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ one, many }) => ({
  tenant: one(tenants, { fields: [users.tenantId], references: [tenants.id] }),
  branch: one(branches, { fields: [users.branchId], references: [branches.id] }),
  staffAchievements: many(staffAchievements),
  performanceMetrics: many(performanceMetrics),
  recognitionEventsReceived: many(recognitionEvents, { relationName: "recipient" }),
  recognitionEventsGiven: many(recognitionEvents, { relationName: "nominator" }),
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
  invoices: many(invoices),
}));

export const invoicesRelations = relations(invoices, ({ one }) => ({
  patient: one(patients, { fields: [invoices.patientId], references: [patients.id] }),
  tenant: one(tenants, { fields: [invoices.tenantId], references: [tenants.id] }),
  branch: one(branches, { fields: [invoices.branchId], references: [branches.id] }),
  createdByUser: one(users, { fields: [invoices.createdBy], references: [users.id] }),
  paidByUser: one(users, { fields: [invoices.paidBy], references: [users.id] }),
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

// Badge system relations
export const badgeDefinitionsRelations = relations(badgeDefinitions, ({ one, many }) => ({
  tenant: one(tenants, { fields: [badgeDefinitions.tenantId], references: [tenants.id] }),
  staffAchievements: many(staffAchievements),
}));

export const staffAchievementsRelations = relations(staffAchievements, ({ one }) => ({
  user: one(users, { fields: [staffAchievements.userId], references: [users.id] }),
  badgeDefinition: one(badgeDefinitions, { fields: [staffAchievements.badgeDefinitionId], references: [badgeDefinitions.id] }),
  branch: one(branches, { fields: [staffAchievements.branchId], references: [branches.id] }),
  tenant: one(tenants, { fields: [staffAchievements.tenantId], references: [tenants.id] }),
}));

export const performanceMetricsRelations = relations(performanceMetrics, ({ one }) => ({
  user: one(users, { fields: [performanceMetrics.userId], references: [users.id] }),
  branch: one(branches, { fields: [performanceMetrics.branchId], references: [branches.id] }),
  tenant: one(tenants, { fields: [performanceMetrics.tenantId], references: [tenants.id] }),
}));

export const recognitionEventsRelations = relations(recognitionEvents, ({ one }) => ({
  recipient: one(users, { fields: [recognitionEvents.recipientId], references: [users.id], relationName: "recipient" }),
  nominator: one(users, { fields: [recognitionEvents.nominatorId], references: [users.id], relationName: "nominator" }),
  approver: one(users, { fields: [recognitionEvents.approvedBy], references: [users.id] }),
  branch: one(branches, { fields: [recognitionEvents.branchId], references: [branches.id] }),
  tenant: one(tenants, { fields: [recognitionEvents.tenantId], references: [tenants.id] }),
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

export const insertInvoiceSchema = createInsertSchema(invoices).omit({
  id: true,
  createdAt: true,
  paidAt: true,
});

export const insertSystemAlertSchema = createInsertSchema(systemAlerts).omit({
  id: true,
  createdAt: true,
});

// Badge system insert schemas
export const insertBadgeDefinitionSchema = createInsertSchema(badgeDefinitions).omit({
  id: true,
  createdAt: true,
});

export const insertStaffAchievementSchema = createInsertSchema(staffAchievements).omit({
  id: true,
  createdAt: true,
  completedAt: true,
});

export const insertPerformanceMetricSchema = createInsertSchema(performanceMetrics).omit({
  id: true,
  createdAt: true,
});

export const insertRecognitionEventSchema = createInsertSchema(recognitionEvents).omit({
  id: true,
  createdAt: true,
  approvedAt: true,
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

export type Invoice = typeof invoices.$inferSelect;
export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;

export type SystemAlert = typeof systemAlerts.$inferSelect;
export type InsertSystemAlert = z.infer<typeof insertSystemAlertSchema>;

// Badge system types
export type BadgeDefinition = typeof badgeDefinitions.$inferSelect;
export type InsertBadgeDefinition = z.infer<typeof insertBadgeDefinitionSchema>;

export type StaffAchievement = typeof staffAchievements.$inferSelect;
export type InsertStaffAchievement = z.infer<typeof insertStaffAchievementSchema>;

export type PerformanceMetric = typeof performanceMetrics.$inferSelect;
export type InsertPerformanceMetric = z.infer<typeof insertPerformanceMetricSchema>;

export type RecognitionEvent = typeof recognitionEvents.$inferSelect;
export type InsertRecognitionEvent = z.infer<typeof insertRecognitionEventSchema>;
