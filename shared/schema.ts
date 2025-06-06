import { pgTable, text, serial, integer, boolean, timestamp, decimal, json, jsonb, varchar, real } from "drizzle-orm/pg-core";
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
  department: text("department").notNull().default("laboratory"), // laboratory, radiology, ultrasound, cardiology, pharmacy, nursing, physiotherapy
  serviceUnit: text("service_unit").notNull().default("laboratory"),
  maxRebateAmount: decimal("max_rebate_amount", { precision: 10, scale: 2 }).default("0.00"), // Maximum rebate amount for this specific service
  tenantId: integer("tenant_id").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Patient Tests/Appointments
export const patientTests = pgTable("patient_tests", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").notNull(),
  testId: integer("test_id").notNull(),
  status: text("status").notNull().default("scheduled"), // scheduled, payment_verified, specimen_collected, processing, completed, cancelled
  scheduledAt: timestamp("scheduled_at").notNull(),
  completedAt: timestamp("completed_at"),
  results: text("results"),
  parameterResults: text("parameter_results"), // JSON string of parameter ID -> value mappings
  notes: text("notes"),
  technicianId: integer("technician_id"),
  consultantId: integer("consultant_id"),
  branchId: integer("branch_id").notNull(),
  tenantId: integer("tenant_id").notNull(),
  
  // Payment verification workflow
  paymentVerified: boolean("payment_verified").default(false),
  paymentVerifiedBy: integer("payment_verified_by"),
  paymentVerifiedAt: timestamp("payment_verified_at"),
  
  // Specimen collection workflow
  specimenCollected: boolean("specimen_collected").default(false),
  specimenCollectedBy: integer("specimen_collected_by"),
  specimenCollectedAt: timestamp("specimen_collected_at"),
  specimenType: text("specimen_type"), // blood, urine, stool, etc.
  
  // Processing workflow
  processingStarted: boolean("processing_started").default(false),
  processingStartedBy: integer("processing_started_by"),
  processingStartedAt: timestamp("processing_started_at"),
  
  // Turnaround time tracking
  expectedTurnaroundHours: integer("expected_turnaround_hours"), // Expected completion time in hours
  reportReadyAt: timestamp("report_ready_at"),
  reportReleasedAt: timestamp("report_released_at"),
  
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
  paymentMethod: text("payment_method"), // cash, card, transfer, pos
  invoiceId: integer("invoice_id").references(() => invoices.id),
  patientTestId: integer("patient_test_id"),
  referralProviderId: integer("referral_provider_id"),
  consultantId: integer("consultant_id"),
  branchId: integer("branch_id").notNull(),
  tenantId: integer("tenant_id").notNull(),
  createdBy: integer("created_by").notNull(),
  paidBy: integer("paid_by").references(() => users.id),
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
  
  // Referral information (visit-specific, not patient-specific)
  referralProviderId: integer("referral_provider_id").references(() => referralProviders.id),
  referralType: text("referral_type").default("none"), // 'none', 'referral', 'self'
  
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



// Test parameter templates for structured reporting
export const testParameters = pgTable("test_parameters", {
  id: serial("id").primaryKey(),
  testId: integer("test_id").notNull().references(() => tests.id),
  parameterName: text("parameter_name").notNull(),
  parameterCode: text("parameter_code").notNull(),
  unit: text("unit").notNull(),
  normalRangeMin: real("normal_range_min"),
  normalRangeMax: real("normal_range_max"),
  normalRangeText: text("normal_range_text"),
  category: text("category"), // e.g., "hematology", "chemistry", "immunology"
  displayOrder: integer("display_order").default(0),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Test result values for structured reporting
export const testResultValues = pgTable("test_result_values", {
  id: serial("id").primaryKey(),
  patientTestId: integer("patient_test_id").notNull().references(() => patientTests.id),
  parameterId: integer("parameter_id").notNull().references(() => testParameters.id),
  value: text("value").notNull(),
  numericValue: real("numeric_value"),
  status: text("status"), // "normal", "high", "low", "abnormal"
  flag: text("flag"), // "H", "L", "HH", "LL", "N"
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Report templates for customizable drag-and-drop reports
export const reportTemplates = pgTable("report_templates", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  category: text("category").notNull(), // ultrasound, radiology, laboratory, general
  components: jsonb("components").notNull().default('[]'), // Array of report components
  isDefault: boolean("is_default").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),
  createdBy: integer("created_by").notNull(),
  updatedBy: integer("updated_by"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertTestParameterSchema = createInsertSchema(testParameters).omit({
  id: true,
  createdAt: true,
});

export const insertTestResultValueSchema = createInsertSchema(testResultValues).omit({
  id: true,
  createdAt: true,
});

export const insertReportTemplateSchema = createInsertSchema(reportTemplates).omit({
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

export type TestParameter = typeof testParameters.$inferSelect;
export type InsertTestParameter = z.infer<typeof insertTestParameterSchema>;

export type TestResultValue = typeof testResultValues.$inferSelect;
export type InsertTestResultValue = z.infer<typeof insertTestResultValueSchema>;

export type ReportTemplate = typeof reportTemplates.$inferSelect;
export type InsertReportTemplate = z.infer<typeof insertReportTemplateSchema>;

// Purchase Orders system
export const purchaseOrders = pgTable("purchase_orders", {
  id: serial("id").primaryKey(),
  poNumber: text("po_number").notNull().unique(),
  tenantId: integer("tenant_id").notNull(),
  branchId: integer("branch_id").notNull(),
  vendorName: text("vendor_name").notNull(),
  vendorEmail: text("vendor_email"),
  vendorPhone: text("vendor_phone"),
  vendorAddress: text("vendor_address"),
  requestedBy: integer("requested_by").notNull(),
  approvedBy: integer("approved_by"),
  status: text("status").notNull().default("draft"), // draft, pending_approval, approved, rejected, ordered, received, paid
  priority: text("priority").notNull().default("normal"), // low, normal, high, urgent
  expectedDeliveryDate: timestamp("expected_delivery_date"),
  actualDeliveryDate: timestamp("actual_delivery_date"),
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull(),
  taxAmount: decimal("tax_amount", { precision: 10, scale: 2 }).default("0"),
  discountAmount: decimal("discount_amount", { precision: 10, scale: 2 }).default("0"),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  currency: text("currency").notNull().default("NGN"),
  items: jsonb("items"),
  notes: text("notes"),
  terms: text("terms"),
  termsConditions: text("terms_conditions"),
  deliveryDate: timestamp("delivery_date"),
  urgencyLevel: text("urgency_level"),
  rejectionReason: text("rejection_reason"),
  approvalLevel: integer("approval_level"),
  currentApprover: integer("current_approver"),
  workflowStage: text("workflow_stage"),
  currentStageUser: integer("current_stage_user"),
  executionConfirmedBy: integer("execution_confirmed_by"),
  receivedConfirmedBy: integer("received_confirmed_by"),
  accountantConfirmedBy: integer("accountant_confirmed_by"),
  unitConfirmedBy: integer("unit_confirmed_by"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Purchase Order Items
export const purchaseOrderItems = pgTable("purchase_order_items", {
  id: serial("id").primaryKey(),
  poId: integer("po_id").notNull(),
  itemName: text("item_name").notNull(),
  description: text("description"),
  category: text("category").notNull(),
  quantity: integer("quantity").notNull(),
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).notNull(),
  totalPrice: decimal("total_price", { precision: 10, scale: 2 }).notNull(),
  receivedQuantity: integer("received_quantity").default(0),
  specifications: text("specifications"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Payment Approval Workflow
export const paymentApprovals = pgTable("payment_approvals", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull(),
  branchId: integer("branch_id").notNull(),
  paymentType: text("payment_type").notNull(), // po_payment, expense_reimbursement, vendor_payment, petty_cash
  referenceId: integer("reference_id"), // PO ID, expense ID, etc.
  referenceNumber: text("reference_number").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  requestedBy: integer("requested_by").notNull(),
  approverLevel: integer("approver_level").notNull().default(1), // 1, 2, 3 for multi-level approval
  currentApprover: integer("current_approver"),
  status: text("status").notNull().default("pending"), // pending, approved, rejected, paid
  priority: text("priority").notNull().default("normal"),
  justification: text("justification").notNull(),
  supportingDocuments: jsonb("supporting_documents"), // array of document URLs
  approvalHistory: jsonb("approval_history"), // array of approval steps
  dueDate: timestamp("due_date"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  approvedAt: timestamp("approved_at"),
  rejectedAt: timestamp("rejected_at"),
  paidAt: timestamp("paid_at"),
});

// Petty Cash Management
export const pettyCashFunds = pgTable("petty_cash_funds", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull(),
  branchId: integer("branch_id").notNull(),
  fundName: text("fund_name").notNull(),
  custodian: integer("custodian").notNull(), // user who manages this fund
  initialAmount: decimal("initial_amount", { precision: 10, scale: 2 }).notNull(),
  currentBalance: decimal("current_balance", { precision: 10, scale: 2 }).notNull(),
  monthlyLimit: decimal("monthly_limit", { precision: 10, scale: 2 }),
  status: text("status").notNull().default("active"), // active, suspended, closed
  lastReconciledAt: timestamp("last_reconciled_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Petty Cash Transactions
export const pettyCashTransactions = pgTable("petty_cash_transactions", {
  id: serial("id").primaryKey(),
  fundId: integer("fund_id").notNull(),
  tenantId: integer("tenant_id").notNull(),
  branchId: integer("branch_id").notNull(),
  transactionNumber: text("transaction_number").notNull().unique(),
  type: text("type").notNull(), // replenishment, expense, return
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  purpose: text("purpose").notNull(),
  category: text("category").notNull(),
  requestedBy: integer("requested_by").notNull(),
  approvedBy: integer("approved_by"),
  receiptNumber: text("receipt_number"),
  vendorName: text("vendor_name"),
  description: text("description").notNull(),
  status: text("status").notNull().default("pending"), // pending, approved, rejected, paid, disbursed
  priority: text("priority").notNull().default("normal"), // urgent, normal, low
  justification: text("justification"),
  supportingDocuments: jsonb("supporting_documents"), // array of document URLs
  approvalLevel: integer("approval_level").notNull().default(1),
  currentApprover: integer("current_approver"),
  approvalHistory: jsonb("approval_history"), // array of approval steps
  disbursementMethod: text("disbursement_method"), // cash, cheque, bank_transfer
  disbursedBy: integer("disbursed_by"),
  disbursementVoucherNumber: text("disbursement_voucher_number"),
  attachments: jsonb("attachments"), // receipt images/documents
  createdAt: timestamp("created_at").notNull().defaultNow(),
  approvedAt: timestamp("approved_at"),
  rejectedAt: timestamp("rejected_at"),
  paidAt: timestamp("paid_at"),
  disbursedAt: timestamp("disbursed_at"),
});

// Audit Trail for Financial Transactions
export const auditTrail = pgTable("audit_trail", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull(),
  branchId: integer("branch_id"),
  entityType: text("entity_type").notNull(), // purchase_order, payment_approval, petty_cash, etc.
  entityId: integer("entity_id").notNull(),
  action: text("action").notNull(), // created, updated, approved, rejected, paid, etc.
  oldValues: jsonb("old_values"),
  newValues: jsonb("new_values"),
  performedBy: integer("performed_by").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  notes: text("notes"),
});

// Vendors
export const vendors = pgTable("vendors", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull(),
  vendorCode: text("vendor_code").notNull().unique(),
  name: text("name").notNull(),
  contactPerson: text("contact_person"),
  email: text("email"),
  phone: text("phone"),
  address: text("address"),
  taxId: text("tax_id"),
  bankDetails: jsonb("bank_details"),
  paymentTerms: text("payment_terms").default("Net 30"),
  category: text("category"), // medical_supplies, equipment, services, utilities
  status: text("status").notNull().default("active"), // active, inactive, blacklisted
  rating: integer("rating").default(5), // 1-5 stars
  totalTransactions: integer("total_transactions").default(0),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).default("0"),
  lastTransactionAt: timestamp("last_transaction_at"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Goods Receipt table - for tracking delivery confirmations
export const goodsReceipts = pgTable("goods_receipts", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull(),
  branchId: integer("branch_id").notNull(),
  purchaseOrderId: integer("purchase_order_id").references(() => purchaseOrders.id).notNull(),
  receiptNumber: varchar("receipt_number", { length: 50 }).notNull().unique(),
  receivedBy: integer("received_by").references(() => users.id).notNull(),
  receivedDate: timestamp("received_date").notNull(),
  confirmedBy: integer("confirmed_by").references(() => users.id),
  confirmedDate: timestamp("confirmed_date"),
  status: varchar("status", { length: 50 }).notNull().default('pending'), // pending, confirmed, discrepancy
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Goods Receipt Items - detailed line items for what was received
export const goodsReceiptItems = pgTable("goods_receipt_items", {
  id: serial("id").primaryKey(),
  goodsReceiptId: integer("goods_receipt_id").references(() => goodsReceipts.id).notNull(),
  purchaseOrderItemId: integer("purchase_order_item_id").references(() => purchaseOrderItems.id),
  itemDescription: varchar("item_description", { length: 255 }).notNull(),
  orderedQuantity: decimal("ordered_quantity", { precision: 10, scale: 2 }).notNull(),
  receivedQuantity: decimal("received_quantity", { precision: 10, scale: 2 }).notNull(),
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).notNull(),
  condition: varchar("condition", { length: 50 }).notNull().default('good'), // good, damaged, partial
  batchNumber: varchar("batch_number", { length: 100 }),
  expiryDate: timestamp("expiry_date"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Vendor Invoices table - for tracking invoices from vendors
export const vendorInvoices = pgTable("vendor_invoices", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull(),
  branchId: integer("branch_id").notNull(),
  vendorId: integer("vendor_id").references(() => vendors.id).notNull(),
  invoiceNumber: varchar("invoice_number", { length: 100 }).notNull(),
  invoiceDate: timestamp("invoice_date").notNull(),
  dueDate: timestamp("due_date").notNull(),
  totalAmount: decimal("total_amount", { precision: 12, scale: 2 }).notNull(),
  taxAmount: decimal("tax_amount", { precision: 10, scale: 2 }).default('0'),
  discountAmount: decimal("discount_amount", { precision: 10, scale: 2 }).default('0'),
  currency: varchar("currency", { length: 3 }).notNull().default('NGN'),
  status: varchar("status", { length: 50 }).notNull().default('received'), // received, matched, approved, paid
  matchedBy: integer("matched_by").references(() => users.id),
  matchedDate: timestamp("matched_date"),
  approvedBy: integer("approved_by").references(() => users.id),
  approvedDate: timestamp("approved_date"),
  paidBy: integer("paid_by").references(() => users.id),
  paidDate: timestamp("paid_date"),
  paymentReference: varchar("payment_reference", { length: 100 }),
  attachmentUrl: varchar("attachment_url", { length: 500 }),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Invoice Line Items
export const vendorInvoiceItems = pgTable("vendor_invoice_items", {
  id: serial("id").primaryKey(),
  invoiceId: integer("invoice_id").references(() => vendorInvoices.id).notNull(),
  description: varchar("description", { length: 255 }).notNull(),
  quantity: decimal("quantity", { precision: 10, scale: 2 }).notNull(),
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).notNull(),
  lineTotal: decimal("line_total", { precision: 10, scale: 2 }).notNull(),
  taxRate: decimal("tax_rate", { precision: 5, scale: 2 }).default('0'),
  taxAmount: decimal("tax_amount", { precision: 10, scale: 2 }).default('0'),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Three-way matching table - links PO, Goods Receipt, and Invoice
export const threeWayMatching = pgTable("three_way_matching", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull(),
  branchId: integer("branch_id").notNull(),
  purchaseOrderId: integer("purchase_order_id").references(() => purchaseOrders.id).notNull(),
  goodsReceiptId: integer("goods_receipt_id").references(() => goodsReceipts.id),
  invoiceId: integer("invoice_id").references(() => vendorInvoices.id),
  matchingStatus: varchar("matching_status", { length: 50 }).notNull().default('pending'), // pending, matched, discrepancy, approved
  totalVariance: decimal("total_variance", { precision: 12, scale: 2 }).default('0'),
  quantityVariance: decimal("quantity_variance", { precision: 10, scale: 2 }).default('0'),
  priceVariance: decimal("price_variance", { precision: 12, scale: 2 }).default('0'),
  matchedBy: integer("matched_by").references(() => users.id),
  matchedDate: timestamp("matched_date"),
  approvedBy: integer("approved_by").references(() => users.id),
  approvedDate: timestamp("approved_date"),
  discrepancyNotes: text("discrepancy_notes"),
  resolutionNotes: text("resolution_notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Payment Orders table - for authorizing payments based on matched documents
export const paymentOrders = pgTable("payment_orders", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull(),
  branchId: integer("branch_id").notNull(),
  paymentOrderNumber: varchar("payment_order_number", { length: 50 }).notNull().unique(),
  threeWayMatchingId: integer("three_way_matching_id").references(() => threeWayMatching.id).notNull(),
  vendorId: integer("vendor_id").references(() => vendors.id).notNull(),
  totalAmount: decimal("total_amount", { precision: 12, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 3 }).notNull().default('NGN'),
  paymentMethod: varchar("payment_method", { length: 50 }).notNull(), // bank_transfer, cheque, cash
  bankAccount: varchar("bank_account", { length: 100 }),
  priority: varchar("priority", { length: 20 }).notNull().default('normal'), // urgent, high, normal, low
  requestedBy: integer("requested_by").references(() => users.id).notNull(),
  approvedBy: integer("approved_by").references(() => users.id),
  authorizedBy: integer("authorized_by").references(() => users.id),
  executedBy: integer("executed_by").references(() => users.id),
  status: varchar("status", { length: 50 }).notNull().default('pending'), // pending, approved, authorized, executed, cancelled
  dueDate: timestamp("due_date").notNull(),
  approvedDate: timestamp("approved_date"),
  authorizedDate: timestamp("authorized_date"),
  executedDate: timestamp("executed_date"),
  paymentReference: varchar("payment_reference", { length: 100 }),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Bank Accounts
export const bankAccounts = pgTable("bank_accounts", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull(),
  branchId: integer("branch_id").notNull(),
  accountName: text("account_name").notNull(),
  accountNumber: text("account_number").notNull(),
  bankName: text("bank_name").notNull(),
  bankCode: text("bank_code"),
  accountType: text("account_type").notNull().default("current"), // current, savings, fixed_deposit
  currency: text("currency").notNull().default("NGN"),
  currentBalance: decimal("current_balance", { precision: 12, scale: 2 }).notNull().default("0"),
  availableBalance: decimal("available_balance", { precision: 12, scale: 2 }).notNull().default("0"),
  isActive: boolean("is_active").notNull().default(true),
  isMainAccount: boolean("is_main_account").notNull().default(false),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Bank Deposits
export const bankDeposits = pgTable("bank_deposits", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull(),
  branchId: integer("branch_id").notNull(),
  depositNumber: text("deposit_number").notNull().unique(),
  bankAccountId: integer("bank_account_id").notNull().references(() => bankAccounts.id),
  depositAmount: decimal("deposit_amount", { precision: 12, scale: 2 }).notNull(),
  depositDate: timestamp("deposit_date").notNull(),
  depositMethod: text("deposit_method").notNull(), // cash, cheque, bank_transfer, card
  referenceNumber: text("reference_number"), // Bank slip/teller reference
  tellerReference: text("teller_reference"),
  sourceType: text("source_type").notNull(), // daily_cash, invoice_payments, other
  sourceReference: text("source_reference"), // Link to daily transactions or specific invoices
  linkedCashAmount: decimal("linked_cash_amount", { precision: 12, scale: 2 }).default("0"),
  depositedBy: integer("deposited_by").notNull().references(() => users.id),
  verifiedBy: integer("verified_by").references(() => users.id),
  reconcileStatus: text("reconcile_status").notNull().default("pending"), // pending, matched, discrepancy, verified
  proofOfPayment: text("proof_of_payment"), // URL to uploaded document
  bankStatement: text("bank_statement"), // URL to bank statement proof
  discrepancyAmount: decimal("discrepancy_amount", { precision: 12, scale: 2 }).default("0"),
  discrepancyReason: text("discrepancy_reason"),
  notes: text("notes"),
  status: text("status").notNull().default("pending"), // pending, verified, flagged, resolved
  verifiedAt: timestamp("verified_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Daily Transactions - Revenue tracking from billing
export const dailyTransactions = pgTable("daily_transactions", {
  id: serial("id").primaryKey(),
  receiptNumber: text("receipt_number").notNull().unique(),
  patientName: text("patient_name").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  paymentMethod: text("payment_method").notNull(), // cash, pos, transfer
  transactionTime: timestamp("transaction_time").notNull(),
  cashierId: integer("cashier_id").notNull().references(() => users.id),
  tenantId: integer("tenant_id").notNull(),
  branchId: integer("branch_id").notNull(),
  verificationStatus: text("verification_status").notNull().default("pending"), // pending, verified, flagged
  verificationNotes: text("verification_notes"),
  verifiedBy: integer("verified_by").references(() => users.id),
  verifiedAt: timestamp("verified_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Daily Cash Reconciliation - links verified cash to bank deposits
export const cashReconciliation = pgTable("cash_reconciliation", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull(),
  branchId: integer("branch_id").notNull(),
  reconciliationNumber: text("reconciliation_number").notNull().unique(),
  businessDate: timestamp("business_date").notNull(),
  totalCashCollected: decimal("total_cash_collected", { precision: 12, scale: 2 }).notNull(),
  totalCashDeposited: decimal("total_cash_deposited", { precision: 12, scale: 2 }).default("0"),
  totalCashRetained: decimal("total_cash_retained", { precision: 12, scale: 2 }).default("0"),
  retentionReason: text("retention_reason"), // petty_cash, change_fund, float
  varianceAmount: decimal("variance_amount", { precision: 12, scale: 2 }).default("0"),
  varianceReason: text("variance_reason"),
  reconciliationStatus: text("reconciliation_status").notNull().default("pending"), // pending, completed, discrepancy
  reconciledBy: integer("reconciled_by").notNull().references(() => users.id),
  approvedBy: integer("approved_by").references(() => users.id),
  depositIds: jsonb("deposit_ids"), // Array of bank deposit IDs linked to this reconciliation
  transactionIds: jsonb("transaction_ids"), // Array of daily transaction IDs included
  notes: text("notes"),
  approvedAt: timestamp("approved_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Schema validations for new tables
export const insertPurchaseOrderSchema = createInsertSchema(purchaseOrders).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPurchaseOrderItemSchema = createInsertSchema(purchaseOrderItems).omit({
  id: true,
  createdAt: true,
});

export const insertPaymentApprovalSchema = createInsertSchema(paymentApprovals).omit({
  id: true,
  createdAt: true,
  approvedAt: true,
  rejectedAt: true,
  paidAt: true,
});

export const insertPettyCashFundSchema = createInsertSchema(pettyCashFunds).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPettyCashTransactionSchema = createInsertSchema(pettyCashTransactions).omit({
  id: true,
  createdAt: true,
  approvedAt: true,
  rejectedAt: true,
  paidAt: true,
  disbursedAt: true,
});

export const insertAuditTrailSchema = createInsertSchema(auditTrail).omit({
  id: true,
  timestamp: true,
});

export const insertGoodsReceiptSchema = createInsertSchema(goodsReceipts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertGoodsReceiptItemSchema = createInsertSchema(goodsReceiptItems).omit({
  id: true,
  createdAt: true,
});

export const insertVendorInvoiceSchema = createInsertSchema(vendorInvoices).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertVendorInvoiceItemSchema = createInsertSchema(vendorInvoiceItems).omit({
  id: true,
  createdAt: true,
});

export const insertThreeWayMatchingSchema = createInsertSchema(threeWayMatching).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPaymentOrderSchema = createInsertSchema(paymentOrders).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertVendorSchema = createInsertSchema(vendors).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertBankAccountSchema = createInsertSchema(bankAccounts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertBankDepositSchema = createInsertSchema(bankDeposits).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  depositAmount: z.union([z.string(), z.number()]).transform(val => String(val)),
  depositDate: z.union([z.string(), z.date()]).transform(val => 
    typeof val === 'string' ? new Date(val) : val
  ),
  linkedCashAmount: z.union([z.string(), z.number()]).transform(val => String(val)).optional(),
});

export const insertCashReconciliationSchema = createInsertSchema(cashReconciliation).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Type exports for new schemas
export type PurchaseOrder = typeof purchaseOrders.$inferSelect;
export type InsertPurchaseOrder = z.infer<typeof insertPurchaseOrderSchema>;

export type PurchaseOrderItem = typeof purchaseOrderItems.$inferSelect;
export type InsertPurchaseOrderItem = z.infer<typeof insertPurchaseOrderItemSchema>;

export type PaymentApproval = typeof paymentApprovals.$inferSelect;
export type InsertPaymentApproval = z.infer<typeof insertPaymentApprovalSchema>;

export type PettyCashFund = typeof pettyCashFunds.$inferSelect;
export type InsertPettyCashFund = z.infer<typeof insertPettyCashFundSchema>;

export type PettyCashTransaction = typeof pettyCashTransactions.$inferSelect;
export type InsertPettyCashTransaction = z.infer<typeof insertPettyCashTransactionSchema>;

export type AuditTrail = typeof auditTrail.$inferSelect;
export type InsertAuditTrail = z.infer<typeof insertAuditTrailSchema>;

export type Vendor = typeof vendors.$inferSelect;
export type InsertVendor = z.infer<typeof insertVendorSchema>;

export type BankAccount = typeof bankAccounts.$inferSelect;
export type InsertBankAccount = z.infer<typeof insertBankAccountSchema>;

export type BankDeposit = typeof bankDeposits.$inferSelect;
export type InsertBankDeposit = z.infer<typeof insertBankDepositSchema>;

export type CashReconciliation = typeof cashReconciliation.$inferSelect;
export type InsertCashReconciliation = z.infer<typeof insertCashReconciliationSchema>;

// Double Entry Accounting System
// Chart of Accounts
export const chartOfAccounts = pgTable("chart_of_accounts", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull(),
  accountCode: text("account_code").notNull().unique(),
  accountName: text("account_name").notNull(),
  accountType: text("account_type").notNull(), // asset, liability, equity, revenue, expense
  accountSubtype: text("account_subtype").notNull(), // current_asset, fixed_asset, current_liability, etc.
  parentAccountId: integer("parent_account_id"), // for hierarchical accounts
  isActive: boolean("is_active").notNull().default(true),
  description: text("description"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Journal Entries (Double Entry)
export const journalEntries = pgTable("journal_entries", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull(),
  branchId: integer("branch_id").notNull(),
  entryNumber: text("entry_number").notNull().unique(),
  entryDate: timestamp("entry_date").notNull(),
  description: text("description").notNull(),
  referenceType: text("reference_type"), // invoice, purchase_order, petty_cash, expense, etc.
  referenceId: integer("reference_id"),
  referenceNumber: text("reference_number"),
  totalDebit: decimal("total_debit", { precision: 15, scale: 2 }).notNull(),
  totalCredit: decimal("total_credit", { precision: 15, scale: 2 }).notNull(),
  status: text("status").notNull().default("draft"), // draft, posted, reversed
  createdBy: integer("created_by").notNull(),
  approvedBy: integer("approved_by"),
  postedAt: timestamp("posted_at"),
  reversedAt: timestamp("reversed_at"),
  reversalReason: text("reversal_reason"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Journal Entry Line Items
export const journalEntryLineItems = pgTable("journal_entry_line_items", {
  id: serial("id").primaryKey(),
  journalEntryId: integer("journal_entry_id").notNull(),
  accountId: integer("account_id").notNull(),
  description: text("description").notNull(),
  debitAmount: decimal("debit_amount", { precision: 15, scale: 2 }).default("0"),
  creditAmount: decimal("credit_amount", { precision: 15, scale: 2 }).default("0"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Account Balances (Running Balances)
export const accountBalances = pgTable("account_balances", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull(),
  branchId: integer("branch_id").notNull(),
  accountId: integer("account_id").notNull(),
  fiscalYear: integer("fiscal_year").notNull(),
  fiscalMonth: integer("fiscal_month").notNull(),
  openingBalance: decimal("opening_balance", { precision: 15, scale: 2 }).default("0"),
  debitMovements: decimal("debit_movements", { precision: 15, scale: 2 }).default("0"),
  creditMovements: decimal("credit_movements", { precision: 15, scale: 2 }).default("0"),
  closingBalance: decimal("closing_balance", { precision: 15, scale: 2 }).default("0"),
  lastUpdated: timestamp("last_updated").notNull().defaultNow(),
});

// Financial Periods
export const fiscalPeriods = pgTable("fiscal_periods", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull(),
  periodName: text("period_name").notNull(),
  fiscalYear: integer("fiscal_year").notNull(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  status: text("status").notNull().default("open"), // open, closed, locked
  closedBy: integer("closed_by"),
  closedAt: timestamp("closed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Budget vs Actual Tracking
export const budgetVsActual = pgTable("budget_vs_actual", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull(),
  branchId: integer("branch_id").notNull(),
  accountId: integer("account_id").notNull(),
  fiscalYear: integer("fiscal_year").notNull(),
  fiscalMonth: integer("fiscal_month"),
  budgetedAmount: decimal("budgeted_amount", { precision: 15, scale: 2 }).notNull(),
  actualAmount: decimal("actual_amount", { precision: 15, scale: 2 }).default("0"),
  variance: decimal("variance", { precision: 15, scale: 2 }).default("0"),
  variancePercent: decimal("variance_percent", { precision: 5, scale: 2 }).default("0"),
  lastUpdated: timestamp("last_updated").notNull().defaultNow(),
});

// Enhanced Purchase Order System with Approval Workflow
export const purchaseOrderApprovals = pgTable("purchase_order_approvals", {
  id: serial("id").primaryKey(),
  poId: integer("po_id").notNull(),
  approverLevel: integer("approver_level").notNull(), // 1, 2, 3 for multi-level approval
  approverId: integer("approver_id").notNull(),
  status: text("status").notNull().default("pending"), // pending, approved, rejected
  comments: text("comments"),
  approvedAt: timestamp("approved_at"),
  rejectedAt: timestamp("rejected_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Report Template Sharing and Permissions
export const reportTemplateShares = pgTable("report_template_shares", {
  id: serial("id").primaryKey(),
  templateId: integer("template_id").notNull(),
  sharedWithUserId: integer("shared_with_user_id"),
  sharedWithRoleId: integer("shared_with_role_id"),
  permissions: jsonb("permissions").notNull().default('{"read": true, "edit": false, "delete": false}'),
  sharedBy: integer("shared_by").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Comprehensive Inventory Management System
export const inventoryCategories = pgTable("inventory_categories", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  parentCategoryId: integer("parent_category_id"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const inventoryItems = pgTable("inventory_items", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull(),
  itemCode: text("item_code").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  categoryId: integer("category_id").notNull(),
  unitOfMeasure: text("unit_of_measure").notNull(), // pcs, ml, g, kg, etc.
  minimumStock: integer("minimum_stock").notNull().default(0),
  maximumStock: integer("maximum_stock"),
  reorderLevel: integer("reorder_level").notNull().default(0),
  standardCost: decimal("standard_cost", { precision: 10, scale: 2 }).notNull().default("0"),
  sellingPrice: decimal("selling_price", { precision: 10, scale: 2 }),
  isConsumable: boolean("is_consumable").notNull().default(true),
  requiresSerialNumber: boolean("requires_serial_number").notNull().default(false),
  expiryTracking: boolean("expiry_tracking").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const inventoryStock = pgTable("inventory_stock", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull(),
  branchId: integer("branch_id").notNull(),
  itemId: integer("item_id").notNull(),
  availableQuantity: integer("available_quantity").notNull().default(0),
  reservedQuantity: integer("reserved_quantity").notNull().default(0),
  onOrderQuantity: integer("on_order_quantity").notNull().default(0),
  lastStockCheck: timestamp("last_stock_check"),
  averageCost: decimal("average_cost", { precision: 10, scale: 2 }).notNull().default("0"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const inventoryTransactions = pgTable("inventory_transactions", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull(),
  branchId: integer("branch_id").notNull(),
  itemId: integer("item_id").notNull(),
  transactionType: text("transaction_type").notNull(), // receipt, consumption, transfer, adjustment, disposal, return, stock_count
  referenceType: text("reference_type"), // patient_test, quality_control, maintenance, purchase_order, stock_count
  referenceId: integer("reference_id"),
  quantity: integer("quantity").notNull(),
  unitCost: decimal("unit_cost", { precision: 10, scale: 2 }),
  totalCost: decimal("total_cost", { precision: 10, scale: 2 }),
  batchNumber: text("batch_number"),
  lotNumber: text("lot_number"),
  expiryDate: timestamp("expiry_date"),
  supplierName: text("supplier_name"),
  receiptNumber: text("receipt_number"),
  costCenter: text("cost_center"), // laboratory, radiology, pharmacy, ultrasound
  consumptionReason: text("consumption_reason"), // test_procedure, quality_control, waste, expired, damage
  patientId: integer("patient_id"), // for consumption tracking
  testId: integer("test_id"), // specific test that consumed the item
  serialNumbers: jsonb("serial_numbers"),
  notes: text("notes"),
  performedBy: integer("performed_by").notNull(),
  approvedBy: integer("approved_by"),
  transactionDate: timestamp("transaction_date").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const testConsumptionTemplates = pgTable("test_consumption_templates", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull(),
  testId: integer("test_id").notNull(),
  itemId: integer("item_id").notNull(),
  standardQuantity: decimal("standard_quantity", { precision: 8, scale: 2 }).notNull(),
  consumptionType: text("consumption_type").notNull(), // direct, proportional, fixed
  costCenter: text("cost_center").notNull(),
  isCritical: boolean("is_critical").notNull().default(false),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const monthlyStockCounts = pgTable("monthly_stock_counts", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull(),
  branchId: integer("branch_id").notNull(),
  countPeriod: text("count_period").notNull(), // YYYY-MM format
  countDate: timestamp("count_date").notNull(),
  status: text("status").notNull().default("scheduled"), // scheduled, in_progress, completed, verified, discrepancies_found
  countedBy: integer("counted_by").notNull(),
  verifiedBy: integer("verified_by"),
  totalItemsCounted: integer("total_items_counted").default(0),
  totalDiscrepancies: integer("total_discrepancies").default(0),
  totalValueVariance: decimal("total_value_variance", { precision: 12, scale: 2 }).default("0"),
  countMethod: text("count_method").notNull().default("full_count"), // full_count, cycle_count, spot_check
  notes: text("notes"),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  verifiedAt: timestamp("verified_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const stockCountDetails = pgTable("stock_count_details", {
  id: serial("id").primaryKey(),
  stockCountId: integer("stock_count_id").notNull(),
  itemId: integer("item_id").notNull(),
  systemQuantity: integer("system_quantity").notNull(),
  countedQuantity: integer("counted_quantity").notNull(),
  variance: integer("variance").notNull(),
  unitCost: decimal("unit_cost", { precision: 10, scale: 2 }).notNull(),
  valueVariance: decimal("value_variance", { precision: 12, scale: 2 }).notNull(),
  batchNumber: text("batch_number"),
  expiryDate: timestamp("expiry_date"),
  location: text("location"),
  conditionNotes: text("condition_notes"),
  countedBy: integer("counted_by").notNull(),
  countTimestamp: timestamp("count_timestamp").notNull().defaultNow(),
  adjustmentRequired: boolean("adjustment_required").notNull().default(false),
  adjustmentReason: text("adjustment_reason"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Enhanced Double-Entry Accounting System
export const enhancedChartOfAccounts = pgTable("enhanced_chart_of_accounts", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull(),
  accountCode: text("account_code").notNull().unique(),
  accountName: text("account_name").notNull(),
  accountType: text("account_type").notNull(), // asset, liability, equity, revenue, expense
  accountSubType: text("account_sub_type"), // current_asset, fixed_asset, current_liability, etc.
  parentAccountId: integer("parent_account_id"),
  normalBalance: text("normal_balance").notNull(), // debit, credit
  isActive: boolean("is_active").notNull().default(true),
  description: text("description"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const enhancedJournalEntries = pgTable("enhanced_journal_entries", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull(),
  branchId: integer("branch_id").notNull(),
  entryNumber: text("entry_number").notNull().unique(),
  entryDate: timestamp("entry_date").notNull(),
  description: text("description").notNull(),
  referenceType: text("reference_type"), // invoice, payment, adjustment, etc.
  referenceId: integer("reference_id"),
  totalDebit: decimal("total_debit", { precision: 15, scale: 2 }).notNull(),
  totalCredit: decimal("total_credit", { precision: 15, scale: 2 }).notNull(),
  status: text("status").notNull().default("draft"), // draft, posted, reversed
  createdBy: integer("created_by").notNull(),
  approvedBy: integer("approved_by"),
  approvedAt: timestamp("approved_at"),
  reversalReason: text("reversal_reason"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const enhancedJournalEntryLineItems = pgTable("enhanced_journal_entry_line_items", {
  id: serial("id").primaryKey(),
  journalEntryId: integer("journal_entry_id").notNull(),
  accountId: integer("account_id").notNull(),
  debitAmount: decimal("debit_amount", { precision: 15, scale: 2 }).notNull().default("0"),
  creditAmount: decimal("credit_amount", { precision: 15, scale: 2 }).notNull().default("0"),
  description: text("description"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Human Resources Management
export const employees = pgTable("employees", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull(),
  branchId: integer("branch_id").notNull(),
  employeeId: text("employee_id").notNull().unique(),
  userId: integer("user_id"), // Link to users table for login
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  middleName: text("middle_name"),
  email: text("email").notNull().unique(),
  phone: text("phone").notNull(),
  alternatePhone: text("alternate_phone"),
  dateOfBirth: timestamp("date_of_birth"),
  gender: text("gender"), // male, female, other
  maritalStatus: text("marital_status"), // single, married, divorced, widowed
  address: text("address"),
  emergencyContactName: text("emergency_contact_name"),
  emergencyContactPhone: text("emergency_contact_phone"),
  nationalId: text("national_id"),
  bankName: text("bank_name"),
  bankAccountNumber: text("bank_account_number"),
  taxId: text("tax_id"),
  pensionId: text("pension_id"),
  hireDate: timestamp("hire_date").notNull(),
  terminationDate: timestamp("termination_date"),
  employmentStatus: text("employment_status").notNull().default("active"), // active, terminated, suspended
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const departments = pgTable("departments", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull(),
  branchId: integer("branch_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  managerId: integer("manager_id"),
  budgetAllocation: decimal("budget_allocation", { precision: 15, scale: 2 }),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const positions = pgTable("positions", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull(),
  departmentId: integer("department_id").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  minimumSalary: decimal("minimum_salary", { precision: 10, scale: 2 }),
  maximumSalary: decimal("maximum_salary", { precision: 10, scale: 2 }),
  requiredQualifications: text("required_qualifications"),
  responsibilities: text("responsibilities"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const employeePositions = pgTable("employee_positions", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id").notNull(),
  positionId: integer("position_id").notNull(),
  departmentId: integer("department_id").notNull(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date"),
  baseSalary: decimal("base_salary", { precision: 10, scale: 2 }).notNull(),
  allowances: jsonb("allowances"), // housing, transport, medical, etc.
  isCurrent: boolean("is_current").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const payrollPeriods = pgTable("payroll_periods", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull(),
  branchId: integer("branch_id").notNull(),
  periodName: text("period_name").notNull(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  payDate: timestamp("pay_date").notNull(),
  status: text("status").notNull().default("draft"), // draft, processed, paid, closed
  totalGrossPay: decimal("total_gross_pay", { precision: 15, scale: 2 }).notNull().default("0"),
  totalDeductions: decimal("total_deductions", { precision: 15, scale: 2 }).notNull().default("0"),
  totalNetPay: decimal("total_net_pay", { precision: 15, scale: 2 }).notNull().default("0"),
  processedBy: integer("processed_by"),
  processedAt: timestamp("processed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const payrollEntries = pgTable("payroll_entries", {
  id: serial("id").primaryKey(),
  payrollPeriodId: integer("payroll_period_id").notNull(),
  employeeId: integer("employee_id").notNull(),
  baseSalary: decimal("base_salary", { precision: 10, scale: 2 }).notNull(),
  allowances: jsonb("allowances"),
  overtime: decimal("overtime", { precision: 10, scale: 2 }).notNull().default("0"),
  bonuses: decimal("bonuses", { precision: 10, scale: 2 }).notNull().default("0"),
  grossPay: decimal("gross_pay", { precision: 10, scale: 2 }).notNull(),
  taxDeductions: decimal("tax_deductions", { precision: 10, scale: 2 }).notNull().default("0"),
  pensionDeductions: decimal("pension_deductions", { precision: 10, scale: 2 }).notNull().default("0"),
  otherDeductions: jsonb("other_deductions"),
  totalDeductions: decimal("total_deductions", { precision: 10, scale: 2 }).notNull().default("0"),
  netPay: decimal("net_pay", { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// System Security and Audit
export const userSessions = pgTable("user_sessions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  sessionToken: text("session_token").notNull().unique(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  loginAt: timestamp("login_at").notNull().defaultNow(),
  logoutAt: timestamp("logout_at"),
  isActive: boolean("is_active").notNull().default(true),
  expiresAt: timestamp("expires_at").notNull(),
});

export const auditLogs = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull(),
  userId: integer("user_id").notNull(),
  action: text("action").notNull(), // create, read, update, delete, login, logout
  resourceType: text("resource_type").notNull(), // patient, test, invoice, etc.
  resourceId: integer("resource_id"),
  oldValues: jsonb("old_values"),
  newValues: jsonb("new_values"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  details: text("details"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const systemPermissions = pgTable("system_permissions", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description"),
  resource: text("resource").notNull(),
  actions: jsonb("actions").notNull(), // [create, read, update, delete]
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const rolePermissions = pgTable("role_permissions", {
  id: serial("id").primaryKey(),
  roleId: integer("role_id").notNull(),
  permissionId: integer("permission_id").notNull(),
  granted: boolean("granted").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Petty Cash Approval Workflow
export const pettyCashApprovals = pgTable("petty_cash_approvals", {
  id: serial("id").primaryKey(),
  transactionId: integer("transaction_id").notNull(),
  approverLevel: integer("approver_level").notNull(), // 1, 2, 3 for multi-level approval
  approverId: integer("approver_id").notNull(),
  status: text("status").notNull().default("pending"), // pending, approved, rejected
  comments: text("comments"),
  approvedAt: timestamp("approved_at"),
  rejectedAt: timestamp("rejected_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Petty Cash Disbursement Vouchers
export const pettyCashDisbursements = pgTable("petty_cash_disbursements", {
  id: serial("id").primaryKey(),
  transactionId: integer("transaction_id").notNull(),
  tenantId: integer("tenant_id").notNull(),
  branchId: integer("branch_id").notNull(),
  voucherNumber: text("voucher_number").notNull().unique(),
  payeeName: text("payee_name").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  disbursementMethod: text("disbursement_method").notNull(), // cash, cheque, bank_transfer
  bankAccount: text("bank_account"),
  chequeNumber: text("cheque_number"),
  referenceNumber: text("reference_number"),
  preparedBy: integer("prepared_by").notNull(),
  approvedBy: integer("approved_by"),
  disbursedBy: integer("disbursed_by"),
  journalEntryId: integer("journal_entry_id"),
  status: text("status").notNull().default("prepared"), // prepared, approved, disbursed, cancelled
  notes: text("notes"),
  preparedAt: timestamp("prepared_at").notNull().defaultNow(),
  approvedAt: timestamp("approved_at"),
  disbursedAt: timestamp("disbursed_at"),
});

// Petty Cash Reconciliation
export const pettyCashReconciliations = pgTable("petty_cash_reconciliations", {
  id: serial("id").primaryKey(),
  fundId: integer("fund_id").notNull(),
  tenantId: integer("tenant_id").notNull(),
  branchId: integer("branch_id").notNull(),
  reconciliationDate: timestamp("reconciliation_date").notNull(),
  reconciliationNumber: text("reconciliation_number").notNull().unique(),
  expectedBalance: decimal("expected_balance", { precision: 10, scale: 2 }).notNull(),
  actualBalance: decimal("actual_balance", { precision: 10, scale: 2 }).notNull(),
  variance: decimal("variance", { precision: 10, scale: 2 }).notNull(),
  varianceReason: text("variance_reason"),
  reconciledBy: integer("reconciled_by").notNull(),
  approvedBy: integer("approved_by"),
  status: text("status").notNull().default("pending"), // pending, approved, rejected
  journalEntryId: integer("journal_entry_id"), // auto-generated journal entry
  createdAt: timestamp("created_at").notNull().defaultNow(),
  approvedAt: timestamp("approved_at"),
});

// Organization Bank Accounts
export const organizationBankAccounts = pgTable("organization_bank_accounts", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull(),
  accountName: text("account_name").notNull(),
  bankName: text("bank_name").notNull(),
  accountNumber: text("account_number").notNull(),
  accountType: text("account_type").notNull(), // savings, current, domiciliary
  currency: text("currency").notNull().default("NGN"),
  isActive: boolean("is_active").notNull().default(true),
  isDefaultReceiving: boolean("is_default_receiving").notNull().default(false),
  description: text("description"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Predictive Recommendations for AI-powered follow-up insights
export const predictiveRecommendations = pgTable("predictive_recommendations", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull(),
  branchId: integer("branch_id").notNull(),
  patientId: integer("patient_id").notNull(),
  recommendationType: text("recommendation_type").notNull(), // urgent, routine, preventive, monitoring
  category: text("category").notNull(), // cardiovascular, diabetes, oncology, general, nephrology, hepatic
  title: text("title").notNull(),
  description: text("description").notNull(),
  suggestedAction: text("suggested_action").notNull(),
  riskScore: integer("risk_score").notNull(), // 0-100
  confidence: integer("confidence").notNull(), // 0-100
  priority: text("priority").notNull(), // high, medium, low
  timeframe: text("timeframe").notNull(),
  nextDueDate: timestamp("next_due_date").notNull(),
  lastTestDate: timestamp("last_test_date"),
  factors: jsonb("factors").notNull(), // array of risk factors
  basedOnTests: jsonb("based_on_tests").notNull(), // array of test names
  estimatedCost: decimal("estimated_cost", { precision: 10, scale: 2 }),
  status: text("status").notNull().default("active"), // active, scheduled, completed, dismissed
  scheduledBy: integer("scheduled_by"),
  scheduledAt: timestamp("scheduled_at"),
  completedBy: integer("completed_by"),
  completedAt: timestamp("completed_at"),
  dismissedBy: integer("dismissed_by"),
  dismissedAt: timestamp("dismissed_at"),
  dismissalReason: text("dismissal_reason"),
  followUpNotes: text("follow_up_notes"),
  aiModelVersion: text("ai_model_version").notNull().default("1.0"),
  generatedAt: timestamp("generated_at").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Recommendation Analytics and Metrics
export const recommendationAnalytics = pgTable("recommendation_analytics", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull(),
  branchId: integer("branch_id").notNull(),
  date: timestamp("date").notNull(),
  totalRecommendations: integer("total_recommendations").notNull().default(0),
  highPriority: integer("high_priority").notNull().default(0),
  mediumPriority: integer("medium_priority").notNull().default(0),
  lowPriority: integer("low_priority").notNull().default(0),
  scheduledRecommendations: integer("scheduled_recommendations").notNull().default(0),
  completedRecommendations: integer("completed_recommendations").notNull().default(0),
  dismissedRecommendations: integer("dismissed_recommendations").notNull().default(0),
  avgRiskScore: real("avg_risk_score"),
  avgConfidence: real("avg_confidence"),
  categoryBreakdown: jsonb("category_breakdown"),
  successRate: real("success_rate"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Patient Risk Profiles for AI modeling
export const patientRiskProfiles = pgTable("patient_risk_profiles", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull(),
  branchId: integer("branch_id").notNull(),
  patientId: integer("patient_id").notNull(),
  overallRiskScore: integer("overall_risk_score").notNull().default(0),
  cardiovascularRisk: integer("cardiovascular_risk").notNull().default(0),
  diabetesRisk: integer("diabetes_risk").notNull().default(0),
  oncologyRisk: integer("oncology_risk").notNull().default(0),
  nephrologyRisk: integer("nephrology_risk").notNull().default(0),
  hepaticRisk: integer("hepatic_risk").notNull().default(0),
  riskFactors: jsonb("risk_factors").notNull(),
  testHistory: jsonb("test_history"),
  familyHistory: jsonb("family_history"),
  lifestyle: jsonb("lifestyle"),
  medications: jsonb("medications"),
  lastUpdated: timestamp("last_updated").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Waiting Room Queue Management
export const queuePatients = pgTable("queue_patients", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull(),
  branchId: integer("branch_id").notNull(),
  patientId: integer("patient_id").notNull(),
  appointmentId: integer("appointment_id"),
  department: text("department").notNull(),
  doctor: text("doctor").notNull(),
  appointmentType: text("appointment_type").notNull(),
  priority: text("priority").notNull().default("normal"), // urgent, high, normal, low
  status: text("status").notNull().default("waiting"), // waiting, called, in-progress, completed, no-show
  position: integer("position").notNull(),
  estimatedWaitTime: integer("estimated_wait_time").notNull().default(0), // minutes
  actualWaitTime: integer("actual_wait_time").notNull().default(0), // minutes
  checkedInAt: timestamp("checked_in_at").notNull().defaultNow(),
  calledAt: timestamp("called_at"),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  noShowAt: timestamp("no_show_at"),
  notes: text("notes"),
  serviceTime: integer("service_time"), // actual service time in minutes
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Queue Statistics and Analytics
export const queueStats = pgTable("queue_stats", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull(),
  branchId: integer("branch_id").notNull(),
  department: text("department").notNull(),
  date: timestamp("date").notNull(),
  totalPatients: integer("total_patients").notNull().default(0),
  patientsServed: integer("patients_served").notNull().default(0),
  averageWaitTime: integer("average_wait_time").notNull().default(0),
  averageServiceTime: integer("average_service_time").notNull().default(0),
  peakHour: text("peak_hour"),
  noShowCount: integer("no_show_count").notNull().default(0),
  efficiency: real("efficiency").notNull().default(0),
  maxWaitTime: integer("max_wait_time").notNull().default(0),
  minWaitTime: integer("min_wait_time").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Department Queue Configuration
export const queueDepartments = pgTable("queue_departments", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull(),
  branchId: integer("branch_id").notNull(),
  name: text("name").notNull(),
  code: text("code").notNull(),
  maxCapacity: integer("max_capacity").notNull().default(50),
  averageServiceTime: integer("average_service_time").notNull().default(15), // minutes
  isActive: boolean("is_active").notNull().default(true),
  operatingHours: jsonb("operating_hours"), // {start: "08:00", end: "17:00"}
  breakTimes: jsonb("break_times"), // [{start: "12:00", end: "13:00"}]
  status: text("status").notNull().default("active"), // active, busy, closed
  currentLoad: integer("current_load").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Payment Vouchers
export const paymentVouchers = pgTable("payment_vouchers", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull(),
  branchId: integer("branch_id").notNull(),
  voucherNumber: text("voucher_number").notNull().unique(),
  paymentType: text("payment_type").notNull(), // po_payment, expense, petty_cash, salary
  referenceId: integer("reference_id"),
  referenceNumber: text("reference_number"),
  payeeType: text("payee_type").notNull(), // vendor, employee, petty_cash_custodian
  payeeName: text("payee_name").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  paymentMethod: text("payment_method").notNull(), // cash, cheque, bank_transfer, card
  bankAccount: text("bank_account"),
  chequeNumber: text("cheque_number"),
  description: text("description").notNull(),
  preparedBy: integer("prepared_by").notNull(),
  approvedBy: integer("approved_by"),
  paidBy: integer("paid_by"),
  journalEntryId: integer("journal_entry_id"),
  status: text("status").notNull().default("prepared"), // prepared, approved, paid, cancelled
  preparedAt: timestamp("prepared_at").notNull().defaultNow(),
  approvedAt: timestamp("approved_at"),
  paidAt: timestamp("paid_at"),
});

// Schema validations for accounting tables
export const insertChartOfAccountsSchema = createInsertSchema(chartOfAccounts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertJournalEntrySchema = createInsertSchema(journalEntries).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  postedAt: true,
  reversedAt: true,
});

export const insertJournalEntryLineItemSchema = createInsertSchema(journalEntryLineItems).omit({
  id: true,
  createdAt: true,
});

export const insertPurchaseOrderApprovalSchema = createInsertSchema(purchaseOrderApprovals).omit({
  id: true,
  createdAt: true,
  approvedAt: true,
  rejectedAt: true,
});

export const insertPettyCashReconciliationSchema = createInsertSchema(pettyCashReconciliations).omit({
  id: true,
  createdAt: true,
  approvedAt: true,
});

export const insertOrganizationBankAccountSchema = createInsertSchema(organizationBankAccounts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPaymentVoucherSchema = createInsertSchema(paymentVouchers).omit({
  id: true,
  preparedAt: true,
  approvedAt: true,
  paidAt: true,
});

export const insertPettyCashApprovalSchema = createInsertSchema(pettyCashApprovals).omit({
  id: true,
  createdAt: true,
  approvedAt: true,
  rejectedAt: true,
});

export const insertPettyCashDisbursementSchema = createInsertSchema(pettyCashDisbursements).omit({
  id: true,
  preparedAt: true,
  approvedAt: true,
  disbursedAt: true,
});

// Type exports for accounting system
export type ChartOfAccounts = typeof chartOfAccounts.$inferSelect;
export type InsertChartOfAccounts = z.infer<typeof insertChartOfAccountsSchema>;

export type JournalEntry = typeof journalEntries.$inferSelect;
export type InsertJournalEntry = z.infer<typeof insertJournalEntrySchema>;

export type JournalEntryLineItem = typeof journalEntryLineItems.$inferSelect;
export type InsertJournalEntryLineItem = z.infer<typeof insertJournalEntryLineItemSchema>;

export type AccountBalance = typeof accountBalances.$inferSelect;

export type FiscalPeriod = typeof fiscalPeriods.$inferSelect;

export type BudgetVsActual = typeof budgetVsActual.$inferSelect;

export type PurchaseOrderApproval = typeof purchaseOrderApprovals.$inferSelect;
export type InsertPurchaseOrderApproval = z.infer<typeof insertPurchaseOrderApprovalSchema>;

export type PettyCashReconciliation = typeof pettyCashReconciliations.$inferSelect;
export type InsertPettyCashReconciliation = z.infer<typeof insertPettyCashReconciliationSchema>;

export type PettyCashApproval = typeof pettyCashApprovals.$inferSelect;
export type InsertPettyCashApproval = z.infer<typeof insertPettyCashApprovalSchema>;

export type PettyCashDisbursement = typeof pettyCashDisbursements.$inferSelect;
export type InsertPettyCashDisbursement = z.infer<typeof insertPettyCashDisbursementSchema>;

export type OrganizationBankAccount = typeof organizationBankAccounts.$inferSelect;
export type InsertOrganizationBankAccount = z.infer<typeof insertOrganizationBankAccountSchema>;

export type PaymentVoucher = typeof paymentVouchers.$inferSelect;
export type InsertPaymentVoucher = z.infer<typeof insertPaymentVoucherSchema>;

// Marketing and Communications Tables
export const marketingCampaigns = pgTable("marketing_campaigns", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull(),
  branchId: integer("branch_id").notNull(),
  campaignName: text("campaign_name").notNull(),
  campaignType: text("campaign_type").notNull(), // digital, print, radio, tv, social_media, sms, email
  description: text("description"),
  budget: decimal("budget", { precision: 12, scale: 2 }).notNull(),
  actualSpend: decimal("actual_spend", { precision: 12, scale: 2 }).default("0"),
  status: text("status").notNull().default("draft"), // draft, active, paused, completed, cancelled
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  targetAudience: text("target_audience"),
  targetMetrics: jsonb("target_metrics"), // impressions, clicks, conversions, leads
  actualMetrics: jsonb("actual_metrics"),
  createdBy: integer("created_by").notNull(),
  approvedBy: integer("approved_by"),
  approvedAt: timestamp("approved_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const marketingLeads = pgTable("marketing_leads", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull(),
  branchId: integer("branch_id").notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  leadSource: text("lead_source").notNull(), // website, social_media, referral, advertisement, walk_in
  serviceInterest: text("service_interest").notNull(),
  leadScore: integer("lead_score").notNull().default(0),
  status: text("status").notNull().default("new"), // new, contacted, qualified, converted, lost
  notes: text("notes"),
  convertedToPatient: boolean("converted_to_patient").notNull().default(false),
  convertedPatientId: integer("converted_patient_id"),
  assignedTo: integer("assigned_to"),
  followUpDate: timestamp("follow_up_date"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const internalMessages = pgTable("internal_messages", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull(),
  messageType: text("message_type").notNull(), // task, announcement, alert, request, reminder
  subject: text("subject").notNull(),
  content: text("content").notNull(),
  priority: text("priority").notNull().default("normal"), // low, normal, high, urgent
  status: text("status").notNull().default("sent"), // sent, read, acknowledged, completed
  senderId: integer("sender_id").notNull(),
  recipientIds: jsonb("recipient_ids").notNull(), // array of user IDs
  readBy: jsonb("read_by"), // array of {userId, readAt}
  acknowledgedBy: jsonb("acknowledged_by"), // array of {userId, acknowledgedAt}
  actionRequired: boolean("action_required").notNull().default(false),
  actionCompleted: boolean("action_completed").notNull().default(false),
  actionCompletedBy: integer("action_completed_by"),
  actionCompletedAt: timestamp("action_completed_at"),
  actionDetails: text("action_details"),
  dueDate: timestamp("due_date"),
  attachments: jsonb("attachments"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const messageActions = pgTable("message_actions", {
  id: serial("id").primaryKey(),
  messageId: integer("message_id").notNull(),
  userId: integer("user_id").notNull(),
  actionType: text("action_type").notNull(), // read, acknowledge, complete, reply, forward
  actionData: jsonb("action_data"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const marketingReports = pgTable("marketing_reports", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull(),
  reportType: text("report_type").notNull(), // campaign_performance, lead_conversion, monthly_summary
  reportTitle: text("report_title").notNull(),
  reportPeriod: text("report_period").notNull(), // month-year or date range
  reportData: jsonb("report_data").notNull(),
  insights: text("insights"),
  recommendations: text("recommendations"),
  status: text("status").notNull().default("draft"), // draft, submitted, approved, published
  createdBy: integer("created_by").notNull(),
  approvedBy: integer("approved_by"),
  submittedAt: timestamp("submitted_at"),
  approvedAt: timestamp("approved_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const workTasks = pgTable("work_tasks", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull(),
  taskTitle: text("task_title").notNull(),
  taskDescription: text("task_description").notNull(),
  taskType: text("task_type").notNull(), // marketing, administrative, clinical, financial, maintenance
  priority: text("priority").notNull().default("normal"), // low, normal, high, urgent
  status: text("status").notNull().default("pending"), // pending, in_progress, completed, cancelled
  assignedTo: integer("assigned_to").notNull(),
  assignedBy: integer("assigned_by").notNull(),
  dueDate: timestamp("due_date"),
  completedDate: timestamp("completed_date"),
  estimatedHours: decimal("estimated_hours", { precision: 5, scale: 2 }),
  actualHours: decimal("actual_hours", { precision: 5, scale: 2 }),
  completionNotes: text("completion_notes"),
  verifiedBy: integer("verified_by"),
  verifiedAt: timestamp("verified_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Marketing schema validations
export const insertMarketingCampaignSchema = createInsertSchema(marketingCampaigns).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  approvedAt: true,
});

export const insertMarketingLeadSchema = createInsertSchema(marketingLeads).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertInternalMessageSchema = createInsertSchema(internalMessages).omit({
  id: true,
  createdAt: true,
});

export const insertMessageActionSchema = createInsertSchema(messageActions).omit({
  id: true,
  createdAt: true,
});

export const insertMarketingReportSchema = createInsertSchema(marketingReports).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  submittedAt: true,
  approvedAt: true,
});

export const insertWorkTaskSchema = createInsertSchema(workTasks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  completedDate: true,
  verifiedAt: true,
});

// Marketing type exports
export type MarketingCampaign = typeof marketingCampaigns.$inferSelect;
export type InsertMarketingCampaign = z.infer<typeof insertMarketingCampaignSchema>;

export type MarketingLead = typeof marketingLeads.$inferSelect;
export type InsertMarketingLead = z.infer<typeof insertMarketingLeadSchema>;

export type InternalMessage = typeof internalMessages.$inferSelect;
export type InsertInternalMessage = z.infer<typeof insertInternalMessageSchema>;

export type MessageAction = typeof messageActions.$inferSelect;
export type InsertMessageAction = z.infer<typeof insertMessageActionSchema>;

export type MarketingReport = typeof marketingReports.$inferSelect;
export type InsertMarketingReport = z.infer<typeof insertMarketingReportSchema>;

export type WorkTask = typeof workTasks.$inferSelect;
export type InsertWorkTask = z.infer<typeof insertWorkTaskSchema>;

// Referral invoice tables for monthly commission tracking
export const referralInvoices = pgTable("referral_invoices", {
  id: serial("id").primaryKey(),
  invoiceNumber: text("invoice_number").notNull().unique(),
  referralProviderId: integer("referral_provider_id").references(() => referralProviders.id).notNull(),
  periodStart: timestamp("period_start").notNull(),
  periodEnd: timestamp("period_end").notNull(),
  totalPatients: integer("total_patients").notNull(),
  totalServices: integer("total_services").notNull(),
  totalRevenue: text("total_revenue").notNull(),
  totalCommission: text("total_commission").notNull(),
  status: text("status").default("pending").notNull(), // 'pending', 'paid', 'cancelled'
  generatedBy: integer("generated_by").references(() => users.id).notNull(),
  generatedAt: timestamp("generated_at").defaultNow().notNull(),
  paidBy: integer("paid_by").references(() => users.id),
  paidAt: timestamp("paid_at"),
  notes: text("notes"),
  branchId: integer("branch_id").references(() => branches.id).notNull(),
  tenantId: integer("tenant_id").references(() => tenants.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});

export const referralInvoiceItems = pgTable("referral_invoice_items", {
  id: serial("id").primaryKey(),
  referralInvoiceId: integer("referral_invoice_id").references(() => referralInvoices.id).notNull(),
  originalInvoiceId: integer("original_invoice_id").references(() => invoices.id).notNull(),
  patientName: text("patient_name").notNull(),
  serviceName: text("service_name").notNull(),
  serviceAmount: text("service_amount").notNull(),
  commissionRate: text("commission_rate").notNull(),
  commissionAmount: text("commission_amount").notNull(),
  serviceDate: timestamp("service_date").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull()
});

// Referral invoice schema validations
export const insertReferralInvoiceSchema = createInsertSchema(referralInvoices).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  generatedAt: true,
  paidAt: true,
});

export const insertReferralInvoiceItemSchema = createInsertSchema(referralInvoiceItems).omit({
  id: true,
  createdAt: true,
});

// Referral invoice type exports
export type ReferralInvoice = typeof referralInvoices.$inferSelect;
export type InsertReferralInvoice = z.infer<typeof insertReferralInvoiceSchema>;

export type ReferralInvoiceItem = typeof referralInvoiceItems.$inferSelect;
export type InsertReferralInvoiceItem = z.infer<typeof insertReferralInvoiceItemSchema>;

// Export RBAC schemas
export * from "./rbac-schema";
