import { pgTable, serial, varchar, text, timestamp, integer, boolean, jsonb, decimal } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Marketing Campaigns
export const marketingCampaigns = pgTable("marketing_campaigns", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull(),
  branchId: integer("branch_id").notNull(),
  campaignName: varchar("campaign_name", { length: 255 }).notNull(),
  campaignType: varchar("campaign_type", { length: 100 }).notNull(), // digital, print, radio, tv, social_media, referral
  description: text("description"),
  targetAudience: text("target_audience"),
  budget: decimal("budget", { precision: 12, scale: 2 }).notNull(),
  actualSpend: decimal("actual_spend", { precision: 12, scale: 2 }).default("0.00"),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  status: varchar("status", { length: 50 }).default("planning"), // planning, active, paused, completed, cancelled
  objectives: jsonb("objectives"), // reach, leads, conversions, brand_awareness
  targetMetrics: jsonb("target_metrics"), // impressions, clicks, conversions, cost_per_lead
  actualMetrics: jsonb("actual_metrics"),
  assignedTo: integer("assigned_to").notNull(),
  createdBy: integer("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Marketing Leads
export const marketingLeads = pgTable("marketing_leads", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull(),
  branchId: integer("branch_id").notNull(),
  campaignId: integer("campaign_id"),
  leadSource: varchar("lead_source", { length: 100 }).notNull(), // website, social_media, referral, walk_in, phone
  firstName: varchar("first_name", { length: 100 }).notNull(),
  lastName: varchar("last_name", { length: 100 }).notNull(),
  email: varchar("email", { length: 255 }),
  phone: varchar("phone", { length: 20 }),
  address: text("address"),
  serviceInterest: varchar("service_interest", { length: 255 }), // lab_tests, radiology, cardiology, health_package
  leadScore: integer("lead_score").default(0), // 0-100 scoring system
  status: varchar("status", { length: 50 }).default("new"), // new, contacted, qualified, converted, lost
  notes: text("notes"),
  assignedTo: integer("assigned_to"),
  convertedToPatient: boolean("converted_to_patient").default(false),
  conversionDate: timestamp("conversion_date"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Internal Messaging System
export const internalMessages = pgTable("internal_messages", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull(),
  branchId: integer("branch_id"),
  messageType: varchar("message_type", { length: 50 }).notNull(), // task, announcement, alert, request, report
  subject: varchar("subject", { length: 255 }).notNull(),
  content: text("content").notNull(),
  priority: varchar("priority", { length: 20 }).default("normal"), // low, normal, high, urgent
  status: varchar("status", { length: 50 }).default("sent"), // sent, read, acknowledged, completed
  senderId: integer("sender_id").notNull(),
  recipientIds: jsonb("recipient_ids").notNull(), // array of user IDs
  readBy: jsonb("read_by"), // array of {userId, readAt}
  acknowledgedBy: jsonb("acknowledged_by"), // array of {userId, acknowledgedAt}
  dueDate: timestamp("due_date"),
  actionRequired: boolean("action_required").default(false),
  actionCompleted: boolean("action_completed").default(false),
  actionCompletedBy: integer("action_completed_by"),
  actionCompletedAt: timestamp("action_completed_at"),
  actionDetails: text("action_details"),
  attachments: jsonb("attachments"), // array of file URLs/paths
  tags: jsonb("tags"), // array of strings for categorization
  parentMessageId: integer("parent_message_id"), // for replies/threads
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Message Actions Tracking
export const messageActions = pgTable("message_actions", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull(),
  messageId: integer("message_id").notNull(),
  userId: integer("user_id").notNull(),
  actionType: varchar("action_type", { length: 50 }).notNull(), // read, acknowledge, complete, reply, forward
  actionData: jsonb("action_data"), // additional action-specific data
  timestamp: timestamp("timestamp").defaultNow(),
  notes: text("notes"),
});

// Marketing Reports
export const marketingReports = pgTable("marketing_reports", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull(),
  branchId: integer("branch_id"),
  reportType: varchar("report_type", { length: 100 }).notNull(), // campaign_performance, lead_analysis, roi_analysis, monthly_summary
  reportTitle: varchar("report_title", { length: 255 }).notNull(),
  reportPeriod: varchar("report_period", { length: 100 }).notNull(), // weekly, monthly, quarterly, yearly, custom
  reportData: jsonb("report_data").notNull(),
  metrics: jsonb("metrics"), // key performance indicators
  insights: text("insights"),
  recommendations: text("recommendations"),
  status: varchar("status", { length: 50 }).default("draft"), // draft, submitted, approved, published
  createdBy: integer("created_by").notNull(),
  reviewedBy: integer("reviewed_by"),
  approvedBy: integer("approved_by"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  submittedAt: timestamp("submitted_at"),
  approvedAt: timestamp("approved_at"),
});

// Task Management System
export const workTasks = pgTable("work_tasks", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull(),
  branchId: integer("branch_id"),
  taskTitle: varchar("task_title", { length: 255 }).notNull(),
  taskDescription: text("task_description"),
  taskType: varchar("task_type", { length: 100 }).notNull(), // marketing, administrative, maintenance, clinical, financial
  priority: varchar("priority", { length: 20 }).default("normal"), // low, normal, high, urgent
  status: varchar("status", { length: 50 }).default("pending"), // pending, in_progress, completed, cancelled, on_hold
  assignedTo: integer("assigned_to").notNull(),
  assignedBy: integer("assigned_by").notNull(),
  dueDate: timestamp("due_date"),
  startDate: timestamp("start_date"),
  completedDate: timestamp("completed_date"),
  estimatedHours: decimal("estimated_hours", { precision: 5, scale: 2 }),
  actualHours: decimal("actual_hours", { precision: 5, scale: 2 }),
  dependencies: jsonb("dependencies"), // array of task IDs that must be completed first
  attachments: jsonb("attachments"),
  comments: jsonb("comments"), // array of {userId, comment, timestamp}
  tags: jsonb("tags"),
  completionNotes: text("completion_notes"),
  verificationRequired: boolean("verification_required").default(false),
  verifiedBy: integer("verified_by"),
  verifiedAt: timestamp("verified_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Create insert schemas
export const insertMarketingCampaignSchema = createInsertSchema(marketingCampaigns);
export const insertMarketingLeadSchema = createInsertSchema(marketingLeads);
export const insertInternalMessageSchema = createInsertSchema(internalMessages);
export const insertMessageActionSchema = createInsertSchema(messageActions);
export const insertMarketingReportSchema = createInsertSchema(marketingReports);
export const insertWorkTaskSchema = createInsertSchema(workTasks);

// Create types
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