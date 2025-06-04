import { pgTable, serial, text, integer, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Patient Portal Access - for future online booking and report access
export const patientPortalAccess = pgTable("patient_portal_access", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  lastLoginAt: timestamp("last_login_at"),
  resetToken: text("reset_token"),
  resetTokenExpiry: timestamp("reset_token_expiry"),
  emailVerified: boolean("email_verified").notNull().default(false),
  verificationToken: text("verification_token"),
  tenantId: integer("tenant_id").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Online Appointment Requests - for future patient self-booking
export const onlineAppointmentRequests = pgTable("online_appointment_requests", {
  id: serial("id").primaryKey(),
  patientPortalId: integer("patient_portal_id"),
  guestEmail: text("guest_email"), // For non-registered patients
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  phone: text("phone").notNull(),
  preferredDate: timestamp("preferred_date").notNull(),
  preferredTimeSlot: text("preferred_time_slot").notNull(), // morning, afternoon, evening
  testIds: text("test_ids").notNull(), // JSON array of test IDs
  specialRequests: text("special_requests"),
  status: text("status").notNull().default("pending"), // pending, confirmed, rejected, rescheduled
  branchId: integer("branch_id").notNull(),
  tenantId: integer("tenant_id").notNull(),
  processedBy: integer("processed_by"), // Staff member who processed
  processedAt: timestamp("processed_at"),
  notes: text("notes"), // Staff notes
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Patient Report Access Log - for tracking when patients view their reports
export const patientReportAccess = pgTable("patient_report_access", {
  id: serial("id").primaryKey(),
  patientPortalId: integer("patient_portal_id").notNull(),
  patientTestId: integer("patient_test_id").notNull(),
  accessedAt: timestamp("accessed_at").notNull().defaultNow(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  downloadedPdf: boolean("downloaded_pdf").notNull().default(false),
});

// Insert schemas for patient portal
export const insertPatientPortalAccessSchema = createInsertSchema(patientPortalAccess).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertOnlineAppointmentRequestSchema = createInsertSchema(onlineAppointmentRequests).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPatientReportAccessSchema = createInsertSchema(patientReportAccess).omit({
  id: true,
  accessedAt: true,
});

// Types
export type PatientPortalAccess = typeof patientPortalAccess.$inferSelect;
export type InsertPatientPortalAccess = z.infer<typeof insertPatientPortalAccessSchema>;

export type OnlineAppointmentRequest = typeof onlineAppointmentRequests.$inferSelect;
export type InsertOnlineAppointmentRequest = z.infer<typeof insertOnlineAppointmentRequestSchema>;

export type PatientReportAccess = typeof patientReportAccess.$inferSelect;
export type InsertPatientReportAccess = z.infer<typeof insertPatientReportAccessSchema>;