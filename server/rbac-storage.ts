import { db } from "./db";
import { eq, desc, asc, and, or, like, count, inArray, sql } from "drizzle-orm";
import * as rbacSchema from "@shared/rbac-schema";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);

export class RBACStorage {
  // Permission Management
  async getPermissions() {
    return await db.select().from(rbacSchema.permissions)
      .orderBy(asc(rbacSchema.permissions.category), asc(rbacSchema.permissions.name));
  }

  async createPermission(data: rbacSchema.InsertPermission) {
    const [permission] = await db.insert(rbacSchema.permissions)
      .values(data)
      .returning();
    return permission;
  }

  async getPermissionsByCategory(category: string) {
    return await db.select().from(rbacSchema.permissions)
      .where(eq(rbacSchema.permissions.category, category))
      .orderBy(asc(rbacSchema.permissions.name));
  }

  // Role Management
  async getRoles(tenantId: number) {
    return await db.select().from(rbacSchema.roles)
      .where(and(
        eq(rbacSchema.roles.tenantId, tenantId),
        eq(rbacSchema.roles.isActive, true)
      ))
      .orderBy(asc(rbacSchema.roles.level), asc(rbacSchema.roles.name));
  }

  async createRole(data: rbacSchema.InsertRole) {
    const [role] = await db.insert(rbacSchema.roles)
      .values(data)
      .returning();
    return role;
  }

  async updateRole(id: number, data: Partial<rbacSchema.InsertRole>) {
    const [role] = await db.update(rbacSchema.roles)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(rbacSchema.roles.id, id))
      .returning();
    return role;
  }

  async getRoleWithPermissions(roleId: number, tenantId: number) {
    const role = await db.select().from(rbacSchema.roles)
      .where(and(
        eq(rbacSchema.roles.id, roleId),
        eq(rbacSchema.roles.tenantId, tenantId)
      ));

    if (!role[0]) return null;

    const permissions = await db.select({
      permission: rbacSchema.permissions,
      conditions: rbacSchema.rolePermissions.conditions
    })
    .from(rbacSchema.rolePermissions)
    .innerJoin(rbacSchema.permissions, eq(rbacSchema.permissions.id, rbacSchema.rolePermissions.permissionId))
    .where(eq(rbacSchema.rolePermissions.roleId, roleId));

    return {
      ...role[0],
      permissions
    };
  }

  // Role-Permission Assignment
  async assignPermissionToRole(data: rbacSchema.InsertRolePermission) {
    const [assignment] = await db.insert(rbacSchema.rolePermissions)
      .values(data)
      .returning();
    
    await this.logSecurityEvent({
      eventType: 'permission_granted',
      userId: data.grantedBy,
      resource: 'role_permission',
      action: 'assign',
      result: 'success',
      details: { roleId: data.roleId, permissionId: data.permissionId },
      tenantId: data.tenantId
    });

    return assignment;
  }

  async removePermissionFromRole(roleId: number, permissionId: number, removedBy: number, tenantId: number) {
    const deleted = await db.delete(rbacSchema.rolePermissions)
      .where(and(
        eq(rbacSchema.rolePermissions.roleId, roleId),
        eq(rbacSchema.rolePermissions.permissionId, permissionId)
      ))
      .returning();

    await this.logSecurityEvent({
      eventType: 'permission_revoked',
      userId: removedBy,
      resource: 'role_permission',
      action: 'remove',
      result: 'success',
      details: { roleId, permissionId },
      tenantId
    });

    return deleted;
  }

  // User-Role Assignment
  async assignRoleToUser(data: rbacSchema.InsertUserRole) {
    const [assignment] = await db.insert(rbacSchema.userRoles)
      .values(data)
      .returning();

    await this.logSecurityEvent({
      eventType: 'role_assigned',
      userId: data.assignedBy,
      targetUserId: data.userId,
      resource: 'user_role',
      action: 'assign',
      result: 'success',
      details: { roleId: data.roleId },
      tenantId: data.tenantId
    });

    return assignment;
  }

  async removeRoleFromUser(userId: number, roleId: number, removedBy: number, tenantId: number) {
    const deleted = await db.delete(rbacSchema.userRoles)
      .where(and(
        eq(rbacSchema.userRoles.userId, userId),
        eq(rbacSchema.userRoles.roleId, roleId)
      ))
      .returning();

    await this.logSecurityEvent({
      eventType: 'role_revoked',
      userId: removedBy,
      targetUserId: userId,
      resource: 'user_role',
      action: 'remove',
      result: 'success',
      details: { roleId },
      tenantId
    });

    return deleted;
  }

  async getUserRoles(userId: number, tenantId: number) {
    return await db.select({
      userRole: rbacSchema.userRoles,
      role: rbacSchema.roles
    })
    .from(rbacSchema.userRoles)
    .innerJoin(rbacSchema.roles, eq(rbacSchema.roles.id, rbacSchema.userRoles.roleId))
    .where(and(
      eq(rbacSchema.userRoles.userId, userId),
      eq(rbacSchema.userRoles.tenantId, tenantId),
      eq(rbacSchema.userRoles.isActive, true)
    ));
  }

  // Permission Checking
  async checkUserPermission(userId: number, permission: string, resource?: string, conditions?: any): Promise<boolean> {
    // Get user roles
    const userRoles = await db.select({
      roleId: rbacSchema.userRoles.roleId
    })
    .from(rbacSchema.userRoles)
    .where(and(
      eq(rbacSchema.userRoles.userId, userId),
      eq(rbacSchema.userRoles.isActive, true)
    ));

    if (userRoles.length === 0) return false;

    const roleIds = userRoles.map(ur => ur.roleId);

    // Check if any role has the required permission
    const hasPermission = await db.select({
      count: count()
    })
    .from(rbacSchema.rolePermissions)
    .innerJoin(rbacSchema.permissions, eq(rbacSchema.permissions.id, rbacSchema.rolePermissions.permissionId))
    .where(and(
      inArray(rbacSchema.rolePermissions.roleId, roleIds),
      eq(rbacSchema.permissions.name, permission)
    ));

    return hasPermission[0].count > 0;
  }

  async getUserEffectivePermissions(userId: number, tenantId: number) {
    return await db.select({
      permission: rbacSchema.permissions,
      role: rbacSchema.roles,
      conditions: rbacSchema.rolePermissions.conditions
    })
    .from(rbacSchema.userRoles)
    .innerJoin(rbacSchema.roles, eq(rbacSchema.roles.id, rbacSchema.userRoles.roleId))
    .innerJoin(rbacSchema.rolePermissions, eq(rbacSchema.rolePermissions.roleId, rbacSchema.roles.id))
    .innerJoin(rbacSchema.permissions, eq(rbacSchema.permissions.id, rbacSchema.rolePermissions.permissionId))
    .where(and(
      eq(rbacSchema.userRoles.userId, userId),
      eq(rbacSchema.userRoles.tenantId, tenantId),
      eq(rbacSchema.userRoles.isActive, true),
      eq(rbacSchema.roles.isActive, true)
    ));
  }

  // Security Policies
  async createSecurityPolicy(data: rbacSchema.InsertSecurityPolicy) {
    const [policy] = await db.insert(rbacSchema.securityPolicies)
      .values(data)
      .returning();

    await this.logSecurityEvent({
      eventType: 'security_policy_created',
      userId: data.createdBy,
      resource: 'security_policy',
      action: 'create',
      result: 'success',
      details: { policyId: policy.id, policyType: data.policyType },
      tenantId: data.tenantId
    });

    return policy;
  }

  async getSecurityPolicies(tenantId: number, policyType?: string) {
    const query = db.select().from(rbacSchema.securityPolicies)
      .where(and(
        eq(rbacSchema.securityPolicies.tenantId, tenantId),
        eq(rbacSchema.securityPolicies.isActive, true),
        policyType ? eq(rbacSchema.securityPolicies.policyType, policyType) : undefined
      ))
      .orderBy(desc(rbacSchema.securityPolicies.createdAt));

    return await query;
  }

  async getApplicablePolicies(userId: number, tenantId: number) {
    const userRoles = await this.getUserRoles(userId, tenantId);
    const roleIds = userRoles.map(ur => ur.role.id);

    return await db.select().from(rbacSchema.securityPolicies)
      .where(and(
        eq(rbacSchema.securityPolicies.tenantId, tenantId),
        eq(rbacSchema.securityPolicies.isActive, true),
        or(
          eq(rbacSchema.securityPolicies.appliesTo, 'all'),
          and(
            eq(rbacSchema.securityPolicies.appliesTo, 'role_based'),
            sql`${rbacSchema.securityPolicies.targetRoles} && ${JSON.stringify(roleIds)}`
          ),
          and(
            eq(rbacSchema.securityPolicies.appliesTo, 'user_specific'),
            sql`${rbacSchema.securityPolicies.targetUsers} && ${JSON.stringify([userId])}`
          )
        )
      ));
  }

  // Session Management
  async createUserSession(data: rbacSchema.InsertUserSession) {
    const [session] = await db.insert(rbacSchema.userSessions)
      .values(data)
      .returning();

    await this.logSecurityEvent({
      eventType: 'login',
      userId: data.userId,
      resource: 'user_session',
      action: 'create',
      result: 'success',
      details: { sessionId: data.id, loginMethod: data.loginMethod },
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
      tenantId: data.tenantId
    });

    return session;
  }

  async updateSessionActivity(sessionId: string) {
    await db.update(rbacSchema.userSessions)
      .set({ lastActivity: new Date() })
      .where(eq(rbacSchema.userSessions.id, sessionId));
  }

  async invalidateSession(sessionId: string, userId?: number, tenantId?: number) {
    const updated = await db.update(rbacSchema.userSessions)
      .set({ isActive: false })
      .where(eq(rbacSchema.userSessions.id, sessionId))
      .returning();

    if (updated[0] && userId && tenantId) {
      await this.logSecurityEvent({
        eventType: 'logout',
        userId,
        resource: 'user_session',
        action: 'invalidate',
        result: 'success',
        details: { sessionId },
        tenantId
      });
    }

    return updated;
  }

  async getActiveUserSessions(userId: number) {
    return await db.select().from(rbacSchema.userSessions)
      .where(and(
        eq(rbacSchema.userSessions.userId, userId),
        eq(rbacSchema.userSessions.isActive, true)
      ))
      .orderBy(desc(rbacSchema.userSessions.lastActivity));
  }

  async invalidateUserSessions(userId: number, exceptSessionId?: string) {
    const whereCondition = exceptSessionId 
      ? and(
          eq(rbacSchema.userSessions.userId, userId),
          eq(rbacSchema.userSessions.isActive, true),
          sql`${rbacSchema.userSessions.id} != ${exceptSessionId}`
        )
      : and(
          eq(rbacSchema.userSessions.userId, userId),
          eq(rbacSchema.userSessions.isActive, true)
        );

    return await db.update(rbacSchema.userSessions)
      .set({ isActive: false })
      .where(whereCondition)
      .returning();
  }

  // MFA Management
  async createMfaDevice(data: rbacSchema.InsertUserMfaDevice) {
    const [device] = await db.insert(rbacSchema.userMfaDevices)
      .values(data)
      .returning();

    await this.logSecurityEvent({
      eventType: 'mfa_device_added',
      userId: data.userId,
      resource: 'mfa_device',
      action: 'create',
      result: 'success',
      details: { deviceType: data.deviceType },
      tenantId: data.tenantId
    });

    return device;
  }

  async getUserMfaDevices(userId: number) {
    return await db.select().from(rbacSchema.userMfaDevices)
      .where(and(
        eq(rbacSchema.userMfaDevices.userId, userId),
        eq(rbacSchema.userMfaDevices.isActive, true)
      ))
      .orderBy(desc(rbacSchema.userMfaDevices.createdAt));
  }

  async verifyMfaDevice(deviceId: number, userId: number) {
    const [device] = await db.update(rbacSchema.userMfaDevices)
      .set({ 
        isVerified: true, 
        lastUsed: new Date(),
        updatedAt: new Date() 
      })
      .where(and(
        eq(rbacSchema.userMfaDevices.id, deviceId),
        eq(rbacSchema.userMfaDevices.userId, userId)
      ))
      .returning();

    if (device) {
      await this.logSecurityEvent({
        eventType: 'mfa_device_verified',
        userId,
        resource: 'mfa_device',
        action: 'verify',
        result: 'success',
        details: { deviceId, deviceType: device.deviceType },
        tenantId: device.tenantId
      });
    }

    return device;
  }

  // Password Management
  async addPasswordToHistory(userId: number, passwordHash: string, tenantId: number) {
    await db.insert(rbacSchema.passwordHistory)
      .values({
        userId,
        passwordHash,
        tenantId
      });

    // Keep only last 12 passwords
    const allPasswords = await db.select()
      .from(rbacSchema.passwordHistory)
      .where(eq(rbacSchema.passwordHistory.userId, userId))
      .orderBy(desc(rbacSchema.passwordHistory.createdAt));

    if (allPasswords.length > 12) {
      const oldPasswords = allPasswords.slice(12);
      const oldIds = oldPasswords.map(p => p.id);
      await db.delete(rbacSchema.passwordHistory)
        .where(inArray(rbacSchema.passwordHistory.id, oldIds));
    }
  }

  async checkPasswordHistory(userId: number, newPasswordHash: string): Promise<boolean> {
    const recentPasswords = await db.select()
      .from(rbacSchema.passwordHistory)
      .where(eq(rbacSchema.passwordHistory.userId, userId))
      .orderBy(desc(rbacSchema.passwordHistory.createdAt))
      .limit(12);

    for (const password of recentPasswords) {
      if (await this.comparePasswords(newPasswordHash, password.passwordHash)) {
        return true; // Password was used recently
      }
    }

    return false; // Password is unique
  }

  private async comparePasswords(supplied: string, stored: string): Promise<boolean> {
    try {
      const [hashed, salt] = stored.split(".");
      const hashedBuf = Buffer.from(hashed, "hex");
      const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
      return timingSafeEqual(hashedBuf, suppliedBuf);
    } catch {
      return false;
    }
  }

  // Audit Trail
  async logSecurityEvent(data: Partial<rbacSchema.InsertSecurityAuditTrail>) {
    await db.insert(rbacSchema.securityAuditTrail)
      .values({
        eventType: data.eventType!,
        userId: data.userId,
        targetUserId: data.targetUserId,
        resource: data.resource,
        action: data.action,
        result: data.result!,
        details: data.details,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
        sessionId: data.sessionId,
        riskScore: data.riskScore,
        location: data.location,
        tenantId: data.tenantId!
      });
  }

  async getSecurityAuditTrail(tenantId: number, filters?: {
    userId?: number;
    eventType?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }) {
    let query = db.select().from(rbacSchema.securityAuditTrail)
      .where(eq(rbacSchema.securityAuditTrail.tenantId, tenantId));

    if (filters?.userId) {
      query = query.where(eq(rbacSchema.securityAuditTrail.userId, filters.userId));
    }

    if (filters?.eventType) {
      query = query.where(eq(rbacSchema.securityAuditTrail.eventType, filters.eventType));
    }

    return await query
      .orderBy(desc(rbacSchema.securityAuditTrail.timestamp))
      .limit(filters?.limit || 100);
  }

  // Access Control Lists
  async createAccessControlEntry(data: rbacSchema.InsertAccessControlList) {
    const [acl] = await db.insert(rbacSchema.accessControlLists)
      .values(data)
      .returning();

    await this.logSecurityEvent({
      eventType: 'acl_created',
      userId: data.grantedBy,
      resource: 'access_control',
      action: 'create',
      result: 'success',
      details: { 
        resourceType: data.resourceType, 
        resourceId: data.resourceId,
        subjectType: data.subjectType,
        subjectId: data.subjectId
      },
      tenantId: data.tenantId
    });

    return acl;
  }

  async checkResourceAccess(
    subjectType: string, 
    subjectId: number, 
    resourceType: string, 
    resourceId: number, 
    permission: string
  ): Promise<boolean> {
    const acls = await db.select().from(rbacSchema.accessControlLists)
      .where(and(
        eq(rbacSchema.accessControlLists.subjectType, subjectType),
        eq(rbacSchema.accessControlLists.subjectId, subjectId),
        eq(rbacSchema.accessControlLists.resourceType, resourceType),
        eq(rbacSchema.accessControlLists.resourceId, resourceId),
        eq(rbacSchema.accessControlLists.isActive, true)
      ));

    for (const acl of acls) {
      const permissions = acl.permissions as string[];
      if (permissions.includes(permission)) {
        return true;
      }
    }

    return false;
  }

  // Data Classification
  async classifyData(data: rbacSchema.InsertDataClassification) {
    const [classification] = await db.insert(rbacSchema.dataClassification)
      .values(data)
      .returning();

    await this.logSecurityEvent({
      eventType: 'data_classified',
      userId: data.classifiedBy,
      resource: 'data_classification',
      action: 'classify',
      result: 'success',
      details: { 
        resourceType: data.resourceType,
        resourceId: data.resourceId,
        classificationLevel: data.classificationLevel
      },
      tenantId: data.tenantId
    });

    return classification;
  }

  async getDataClassification(resourceType: string, resourceId: number) {
    const [classification] = await db.select().from(rbacSchema.dataClassification)
      .where(and(
        eq(rbacSchema.dataClassification.resourceType, resourceType),
        eq(rbacSchema.dataClassification.resourceId, resourceId)
      ));

    return classification;
  }

  // Permission Groups
  async createPermissionGroup(data: rbacSchema.InsertPermissionGroup) {
    const [group] = await db.insert(rbacSchema.permissionGroups)
      .values(data)
      .returning();
    return group;
  }

  async getPermissionGroups(tenantId: number) {
    return await db.select().from(rbacSchema.permissionGroups)
      .where(and(
        eq(rbacSchema.permissionGroups.tenantId, tenantId),
        eq(rbacSchema.permissionGroups.isActive, true)
      ))
      .orderBy(asc(rbacSchema.permissionGroups.category), asc(rbacSchema.permissionGroups.name));
  }

  // Security Analytics
  async getSecurityMetrics(tenantId: number, startDate: Date, endDate: Date) {
    const loginAttempts = await db.select({
      result: rbacSchema.securityAuditTrail.result,
      count: count()
    })
    .from(rbacSchema.securityAuditTrail)
    .where(and(
      eq(rbacSchema.securityAuditTrail.tenantId, tenantId),
      eq(rbacSchema.securityAuditTrail.eventType, 'login'),
      sql`${rbacSchema.securityAuditTrail.timestamp} >= ${startDate}`,
      sql`${rbacSchema.securityAuditTrail.timestamp} <= ${endDate}`
    ))
    .groupBy(rbacSchema.securityAuditTrail.result);

    const activeUsers = await db.select({
      count: count()
    })
    .from(rbacSchema.userSessions)
    .where(and(
      eq(rbacSchema.userSessions.tenantId, tenantId),
      eq(rbacSchema.userSessions.isActive, true),
      sql`${rbacSchema.userSessions.lastActivity} >= ${new Date(Date.now() - 24 * 60 * 60 * 1000)}`
    ));

    const securityEvents = await db.select({
      eventType: rbacSchema.securityAuditTrail.eventType,
      count: count()
    })
    .from(rbacSchema.securityAuditTrail)
    .where(and(
      eq(rbacSchema.securityAuditTrail.tenantId, tenantId),
      sql`${rbacSchema.securityAuditTrail.timestamp} >= ${startDate}`,
      sql`${rbacSchema.securityAuditTrail.timestamp} <= ${endDate}`
    ))
    .groupBy(rbacSchema.securityAuditTrail.eventType);

    return {
      loginAttempts,
      activeUsers: activeUsers[0]?.count || 0,
      securityEvents
    };
  }
}

export const rbacStorage = new RBACStorage();