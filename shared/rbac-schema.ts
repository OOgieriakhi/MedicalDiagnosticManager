import { pgTable, serial, text, varchar, timestamp, integer, boolean, json, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Roles Management
export const roles = pgTable("roles", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  level: integer("level").notNull(), // Hierarchy level (1=highest, 10=lowest)
  isSystemRole: boolean("is_system_role").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),
  tenantId: integer("tenant_id").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  createdBy: integer("created_by").notNull()
}, (table) => ({
  uniqueRoleName: unique().on(table.name, table.tenantId)
}));

// Permissions Management
export const permissions = pgTable("permissions", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull().unique(),
  resource: varchar("resource", { length: 100 }).notNull(), // patients, tests, financial, etc.
  action: varchar("action", { length: 50 }).notNull(), // create, read, update, delete, approve, etc.
  description: text("description"),
  category: varchar("category", { length: 50 }).notNull(), // clinical, administrative, financial, etc.
  isSystemPermission: boolean("is_system_permission").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow()
});

// Role-Permission Assignment
export const rolePermissions = pgTable("role_permissions", {
  id: serial("id").primaryKey(),
  roleId: integer("role_id").notNull(),
  permissionId: integer("permission_id").notNull(),
  conditions: json("conditions"), // Additional conditions like branch_id, department_id
  grantedAt: timestamp("granted_at").notNull().defaultNow(),
  grantedBy: integer("granted_by").notNull(),
  tenantId: integer("tenant_id").notNull()
}, (table) => ({
  uniqueRolePermission: unique().on(table.roleId, table.permissionId)
}));

// User-Role Assignment
export const userRoles = pgTable("user_roles", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  roleId: integer("role_id").notNull(),
  assignedAt: timestamp("assigned_at").notNull().defaultNow(),
  assignedBy: integer("assigned_by").notNull(),
  expiresAt: timestamp("expires_at"), // Optional role expiration
  isActive: boolean("is_active").notNull().default(true),
  conditions: json("conditions"), // Branch-specific, department-specific assignments
  tenantId: integer("tenant_id").notNull()
}, (table) => ({
  uniqueUserRole: unique().on(table.userId, table.roleId)
}));

// Security Policies
export const securityPolicies = pgTable("security_policies", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  policyType: varchar("policy_type", { length: 50 }).notNull(), // password, session, access, data
  rules: json("rules").notNull(), // Policy rules in JSON format
  isActive: boolean("is_active").notNull().default(true),
  appliesTo: varchar("applies_to", { length: 50 }).notNull(), // all, role_based, user_specific
  targetRoles: json("target_roles"), // Array of role IDs if role_based
  targetUsers: json("target_users"), // Array of user IDs if user_specific
  enforcementLevel: varchar("enforcement_level", { length: 20 }).notNull().default("strict"), // strict, moderate, advisory
  tenantId: integer("tenant_id").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  createdBy: integer("created_by").notNull()
});

// Access Control Lists (ACL)
export const accessControlLists = pgTable("access_control_lists", {
  id: serial("id").primaryKey(),
  resourceType: varchar("resource_type", { length: 50 }).notNull(), // patient, test_result, financial_record
  resourceId: integer("resource_id").notNull(),
  subjectType: varchar("subject_type", { length: 20 }).notNull(), // user, role, group
  subjectId: integer("subject_id").notNull(),
  permissions: json("permissions").notNull(), // Array of permission names
  conditions: json("conditions"), // Time-based, location-based conditions
  priority: integer("priority").notNull().default(100), // Higher number = higher priority
  isActive: boolean("is_active").notNull().default(true),
  grantedAt: timestamp("granted_at").notNull().defaultNow(),
  grantedBy: integer("granted_by").notNull(),
  expiresAt: timestamp("expires_at"),
  tenantId: integer("tenant_id").notNull()
});

// Audit Trail for Security Events
export const securityAuditTrail = pgTable("security_audit_trail", {
  id: serial("id").primaryKey(),
  eventType: varchar("event_type", { length: 50 }).notNull(), // login, logout, permission_granted, access_denied
  userId: integer("user_id"),
  targetUserId: integer("target_user_id"), // For admin actions on other users
  resource: varchar("resource", { length: 100 }),
  action: varchar("action", { length: 50 }),
  result: varchar("result", { length: 20 }).notNull(), // success, failure, denied
  details: json("details"), // Additional event details
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  sessionId: varchar("session_id", { length: 255 }),
  riskScore: integer("risk_score"), // 0-100 risk assessment
  location: varchar("location", { length: 100 }),
  tenantId: integer("tenant_id").notNull(),
  timestamp: timestamp("timestamp").notNull().defaultNow()
});

// Session Management
export const userSessions = pgTable("user_sessions", {
  id: varchar("id", { length: 255 }).primaryKey(),
  userId: integer("user_id").notNull(),
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  location: varchar("location", { length: 100 }),
  deviceFingerprint: varchar("device_fingerprint", { length: 255 }),
  isActive: boolean("is_active").notNull().default(true),
  lastActivity: timestamp("last_activity").notNull().defaultNow(),
  expiresAt: timestamp("expires_at").notNull(),
  loginMethod: varchar("login_method", { length: 50 }).notNull(), // password, mfa, sso
  riskAssessment: json("risk_assessment"), // Security risk factors
  tenantId: integer("tenant_id").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow()
});

// Two-Factor Authentication
export const userMfaDevices = pgTable("user_mfa_devices", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  deviceType: varchar("device_type", { length: 20 }).notNull(), // totp, sms, email, backup_codes
  deviceName: varchar("device_name", { length: 100 }),
  secret: varchar("secret", { length: 255 }), // Encrypted secret for TOTP
  isActive: boolean("is_active").notNull().default(true),
  isVerified: boolean("is_verified").notNull().default(false),
  backupCodes: json("backup_codes"), // Encrypted backup codes
  lastUsed: timestamp("last_used"),
  tenantId: integer("tenant_id").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});

// Password History for Policy Enforcement
export const passwordHistory = pgTable("password_history", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  tenantId: integer("tenant_id").notNull()
});

// Permission Groups for easier management
export const permissionGroups = pgTable("permission_groups", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  category: varchar("category", { length: 50 }).notNull(),
  permissions: json("permissions").notNull(), // Array of permission IDs
  isActive: boolean("is_active").notNull().default(true),
  tenantId: integer("tenant_id").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  createdBy: integer("created_by").notNull()
});

// Role Hierarchies for inheritance
export const roleHierarchies = pgTable("role_hierarchies", {
  id: serial("id").primaryKey(),
  parentRoleId: integer("parent_role_id").notNull(),
  childRoleId: integer("child_role_id").notNull(),
  inheritanceType: varchar("inheritance_type", { length: 20 }).notNull().default("full"), // full, partial, override
  conditions: json("conditions"), // Conditions for inheritance
  tenantId: integer("tenant_id").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  createdBy: integer("created_by").notNull()
}, (table) => ({
  uniqueHierarchy: unique().on(table.parentRoleId, table.childRoleId)
}));

// Data Classification for access control
export const dataClassification = pgTable("data_classification", {
  id: serial("id").primaryKey(),
  resourceType: varchar("resource_type", { length: 50 }).notNull(),
  resourceId: integer("resource_id").notNull(),
  classificationLevel: varchar("classification_level", { length: 20 }).notNull(), // public, internal, confidential, restricted
  sensitivity: varchar("sensitivity", { length: 20 }).notNull(), // low, medium, high, critical
  retentionPeriod: integer("retention_period"), // in days
  encryptionRequired: boolean("encryption_required").notNull().default(false),
  accessLoggingRequired: boolean("access_logging_required").notNull().default(true),
  dataOwner: integer("data_owner").notNull(),
  classifiedAt: timestamp("classified_at").notNull().defaultNow(),
  classifiedBy: integer("classified_by").notNull(),
  tenantId: integer("tenant_id").notNull()
});

// Insert Schemas
export const insertRoleSchema = createInsertSchema(roles);
export const insertPermissionSchema = createInsertSchema(permissions);
export const insertRolePermissionSchema = createInsertSchema(rolePermissions);
export const insertUserRoleSchema = createInsertSchema(userRoles);
export const insertSecurityPolicySchema = createInsertSchema(securityPolicies);
export const insertAccessControlListSchema = createInsertSchema(accessControlLists);
export const insertSecurityAuditTrailSchema = createInsertSchema(securityAuditTrail);
export const insertUserSessionSchema = createInsertSchema(userSessions);
export const insertUserMfaDeviceSchema = createInsertSchema(userMfaDevices);
export const insertPasswordHistorySchema = createInsertSchema(passwordHistory);
export const insertPermissionGroupSchema = createInsertSchema(permissionGroups);
export const insertRoleHierarchySchema = createInsertSchema(roleHierarchies);
export const insertDataClassificationSchema = createInsertSchema(dataClassification);

// Type Definitions
export type Role = typeof roles.$inferSelect;
export type InsertRole = z.infer<typeof insertRoleSchema>;
export type Permission = typeof permissions.$inferSelect;
export type InsertPermission = z.infer<typeof insertPermissionSchema>;
export type RolePermission = typeof rolePermissions.$inferSelect;
export type InsertRolePermission = z.infer<typeof insertRolePermissionSchema>;
export type UserRole = typeof userRoles.$inferSelect;
export type InsertUserRole = z.infer<typeof insertUserRoleSchema>;
export type SecurityPolicy = typeof securityPolicies.$inferSelect;
export type InsertSecurityPolicy = z.infer<typeof insertSecurityPolicySchema>;
export type AccessControlList = typeof accessControlLists.$inferSelect;
export type InsertAccessControlList = z.infer<typeof insertAccessControlListSchema>;
export type SecurityAuditTrail = typeof securityAuditTrail.$inferSelect;
export type InsertSecurityAuditTrail = z.infer<typeof insertSecurityAuditTrailSchema>;
export type UserSession = typeof userSessions.$inferSelect;
export type InsertUserSession = z.infer<typeof insertUserSessionSchema>;
export type UserMfaDevice = typeof userMfaDevices.$inferSelect;
export type InsertUserMfaDevice = z.infer<typeof insertUserMfaDeviceSchema>;
export type PasswordHistory = typeof passwordHistory.$inferSelect;
export type InsertPasswordHistory = z.infer<typeof insertPasswordHistorySchema>;
export type PermissionGroup = typeof permissionGroups.$inferSelect;
export type InsertPermissionGroup = z.infer<typeof insertPermissionGroupSchema>;
export type RoleHierarchy = typeof roleHierarchies.$inferSelect;
export type InsertRoleHierarchy = z.infer<typeof insertRoleHierarchySchema>;
export type DataClassification = typeof dataClassification.$inferSelect;
export type InsertDataClassification = z.infer<typeof insertDataClassificationSchema>;