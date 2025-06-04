import { Request, Response, NextFunction } from "express";
import { rbacStorage } from "./rbac-storage";
import crypto from "crypto";

// Extend Express Request interface to include RBAC context
declare global {
  namespace Express {
    interface Request {
      permissions?: string[];
      securityContext?: {
        riskScore: number;
        deviceFingerprint: string;
        requiresMfa: boolean;
        sessionValid: boolean;
      };
    }
  }
}

export class RBACMiddleware {
  // Generate device fingerprint for security tracking
  static generateDeviceFingerprint(req: Request): string {
    const components = [
      req.get('user-agent') || '',
      req.get('accept-language') || '',
      req.get('accept-encoding') || '',
      req.ip || ''
    ];
    
    return crypto.createHash('sha256')
      .update(components.join('|'))
      .digest('hex')
      .substring(0, 32);
  }

  // Calculate risk score based on various factors
  static calculateRiskScore(req: Request, user: any): number {
    let riskScore = 0;

    // IP-based risk
    const knownIPs = ['127.0.0.1', '::1']; // Add known safe IPs
    if (!knownIPs.includes(req.ip)) {
      riskScore += 20;
    }

    // Time-based risk (unusual hours)
    const hour = new Date().getHours();
    if (hour < 6 || hour > 22) {
      riskScore += 15;
    }

    // Device fingerprint risk
    const currentFingerprint = this.generateDeviceFingerprint(req);
    // In real implementation, compare with stored fingerprints
    
    // Session duration risk
    if (req.session) {
      const sessionAge = Date.now() - (req.session.cookie.originalMaxAge || 0);
      if (sessionAge > 8 * 60 * 60 * 1000) { // 8 hours
        riskScore += 25;
      }
    }

    // Geographic risk (if location services available)
    // Implementation would require IP geolocation service

    return Math.min(riskScore, 100);
  }

  // Enhanced authentication middleware
  static async authenticateWithRBAC(req: Request, res: Response, next: NextFunction) {
    if (!req.isAuthenticated() || !req.user) {
      await rbacStorage.logSecurityEvent({
        eventType: 'access_denied',
        resource: req.path,
        action: req.method.toLowerCase(),
        result: 'failure',
        details: { reason: 'not_authenticated' },
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        tenantId: 1 // Default tenant, should be determined from request context
      });

      return res.status(401).json({ error: 'Authentication required' });
    }

    try {
      // Update session activity
      if (req.sessionID) {
        await rbacStorage.updateSessionActivity(req.sessionID);
      }

      // Get user's effective permissions
      const permissions = await rbacStorage.getUserEffectivePermissions(req.user.id, req.user.tenantId);
      req.permissions = permissions.map(p => p.permission.name);

      // Calculate security context
      const riskScore = RBACMiddleware.calculateRiskScore(req, req.user);
      const deviceFingerprint = RBACMiddleware.generateDeviceFingerprint(req);

      req.securityContext = {
        riskScore,
        deviceFingerprint,
        requiresMfa: riskScore > 50,
        sessionValid: true
      };

      // Log successful authentication
      await rbacStorage.logSecurityEvent({
        eventType: 'authenticated_access',
        userId: req.user.id,
        resource: req.path,
        action: req.method.toLowerCase(),
        result: 'success',
        details: { 
          permissionCount: req.permissions.length,
          riskScore 
        },
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        sessionId: req.sessionID,
        riskScore,
        tenantId: req.user.tenantId
      });

      next();
    } catch (error) {
      console.error('RBAC Authentication Error:', error);
      
      await rbacStorage.logSecurityEvent({
        eventType: 'authentication_error',
        userId: req.user?.id,
        resource: req.path,
        action: req.method.toLowerCase(),
        result: 'failure',
        details: { error: (error as Error).message },
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        tenantId: req.user?.tenantId || 1
      });

      res.status(500).json({ error: 'Authentication system error' });
    }
  }

  // Permission-based authorization middleware
  static requirePermission(permission: string, resource?: string) {
    return async (req: Request, res: Response, next: NextFunction) => {
      if (!req.user || !req.permissions) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      try {
        // Check if user has the required permission
        const hasPermission = req.permissions.includes(permission) ||
          await rbacStorage.checkUserPermission(req.user.id, permission, resource);

        if (!hasPermission) {
          await rbacStorage.logSecurityEvent({
            eventType: 'access_denied',
            userId: req.user.id,
            resource: resource || req.path,
            action: permission,
            result: 'failure',
            details: { 
              requiredPermission: permission,
              userPermissions: req.permissions 
            },
            ipAddress: req.ip,
            userAgent: req.get('user-agent'),
            sessionId: req.sessionID,
            riskScore: req.securityContext?.riskScore,
            tenantId: req.user.tenantId
          });

          return res.status(403).json({ 
            error: 'Insufficient permissions',
            requiredPermission: permission 
          });
        }

        // Check security policies
        const policies = await rbacStorage.getApplicablePolicies(req.user.id, req.user.tenantId);
        const securityViolation = RBACMiddleware.checkSecurityPolicies(req, policies);

        if (securityViolation) {
          await rbacStorage.logSecurityEvent({
            eventType: 'security_policy_violation',
            userId: req.user.id,
            resource: resource || req.path,
            action: permission,
            result: 'failure',
            details: { violation: securityViolation },
            ipAddress: req.ip,
            userAgent: req.get('user-agent'),
            sessionId: req.sessionID,
            riskScore: req.securityContext?.riskScore,
            tenantId: req.user.tenantId
          });

          return res.status(403).json({ 
            error: 'Security policy violation',
            violation: securityViolation 
          });
        }

        // Log successful authorization
        await rbacStorage.logSecurityEvent({
          eventType: 'authorized_access',
          userId: req.user.id,
          resource: resource || req.path,
          action: permission,
          result: 'success',
          details: { permission },
          ipAddress: req.ip,
          userAgent: req.get('user-agent'),
          sessionId: req.sessionID,
          riskScore: req.securityContext?.riskScore,
          tenantId: req.user.tenantId
        });

        next();
      } catch (error) {
        console.error('RBAC Authorization Error:', error);
        
        await rbacStorage.logSecurityEvent({
          eventType: 'authorization_error',
          userId: req.user.id,
          resource: resource || req.path,
          action: permission,
          result: 'failure',
          details: { error: (error as Error).message },
          ipAddress: req.ip,
          userAgent: req.get('user-agent'),
          tenantId: req.user.tenantId
        });

        res.status(500).json({ error: 'Authorization system error' });
      }
    };
  }

  // Role-based authorization middleware
  static requireRole(roleName: string) {
    return async (req: Request, res: Response, next: NextFunction) => {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      try {
        const userRoles = await rbacStorage.getUserRoles(req.user.id, req.user.tenantId);
        const hasRole = userRoles.some(ur => ur.role.name === roleName);

        if (!hasRole) {
          await rbacStorage.logSecurityEvent({
            eventType: 'role_access_denied',
            userId: req.user.id,
            resource: req.path,
            action: req.method.toLowerCase(),
            result: 'failure',
            details: { 
              requiredRole: roleName,
              userRoles: userRoles.map(ur => ur.role.name) 
            },
            ipAddress: req.ip,
            userAgent: req.get('user-agent'),
            sessionId: req.sessionID,
            tenantId: req.user.tenantId
          });

          return res.status(403).json({ 
            error: 'Insufficient role privileges',
            requiredRole: roleName 
          });
        }

        next();
      } catch (error) {
        console.error('Role Authorization Error:', error);
        res.status(500).json({ error: 'Role authorization system error' });
      }
    };
  }

  // Check security policies
  static checkSecurityPolicies(req: Request, policies: any[]): string | null {
    for (const policy of policies) {
      const rules = policy.rules;

      switch (policy.policyType) {
        case 'access':
          if (rules.allowedIPs && !rules.allowedIPs.includes(req.ip)) {
            return 'IP address not allowed';
          }
          
          if (rules.timeRestrictions) {
            const hour = new Date().getHours();
            const day = new Date().getDay();
            
            if (rules.timeRestrictions.hours && 
                (hour < rules.timeRestrictions.hours.start || hour > rules.timeRestrictions.hours.end)) {
              return 'Access outside allowed hours';
            }
            
            if (rules.timeRestrictions.days && 
                !rules.timeRestrictions.days.includes(day)) {
              return 'Access not allowed on this day';
            }
          }
          break;

        case 'session':
          if (rules.maxConcurrentSessions && req.securityContext) {
            // Would need to check active session count
          }
          
          if (rules.sessionTimeout && req.session) {
            const sessionAge = Date.now() - (req.session.cookie.originalMaxAge || 0);
            if (sessionAge > rules.sessionTimeout * 1000) {
              return 'Session timeout exceeded';
            }
          }
          break;

        case 'data':
          if (rules.encryptionRequired && !req.secure) {
            return 'Encryption required for this resource';
          }
          break;
      }
    }

    return null; // No violations
  }

  // Multi-factor authentication requirement
  static requireMFA(req: Request, res: Response, next: NextFunction) {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (req.securityContext?.requiresMfa || req.securityContext?.riskScore && req.securityContext.riskScore > 50) {
      // Check if user has completed MFA for this session
      const mfaCompleted = req.session?.mfaCompleted;
      
      if (!mfaCompleted) {
        return res.status(403).json({ 
          error: 'Multi-factor authentication required',
          riskScore: req.securityContext?.riskScore 
        });
      }
    }

    next();
  }

  // Resource-level access control
  static requireResourceAccess(resourceType: string, resourceIdParam: string) {
    return async (req: Request, res: Response, next: NextFunction) => {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      try {
        const resourceId = parseInt(req.params[resourceIdParam]);
        
        if (isNaN(resourceId)) {
          return res.status(400).json({ error: 'Invalid resource ID' });
        }

        // Check data classification
        const classification = await rbacStorage.getDataClassification(resourceType, resourceId);
        
        if (classification) {
          // Apply classification-based access controls
          const userRoles = await rbacStorage.getUserRoles(req.user.id, req.user.tenantId);
          const highestRoleLevel = Math.min(...userRoles.map(ur => ur.role.level));

          // Example classification rules
          const accessLevelRequired = {
            'public': 10,
            'internal': 5,
            'confidential': 3,
            'restricted': 1
          }[classification.classificationLevel] || 10;

          if (highestRoleLevel > accessLevelRequired) {
            await rbacStorage.logSecurityEvent({
              eventType: 'classified_data_access_denied',
              userId: req.user.id,
              resource: `${resourceType}:${resourceId}`,
              action: req.method.toLowerCase(),
              result: 'failure',
              details: { 
                classificationLevel: classification.classificationLevel,
                userRoleLevel: highestRoleLevel,
                requiredLevel: accessLevelRequired
              },
              ipAddress: req.ip,
              userAgent: req.get('user-agent'),
              tenantId: req.user.tenantId
            });

            return res.status(403).json({ 
              error: 'Insufficient clearance for classified data',
              classificationLevel: classification.classificationLevel 
            });
          }

          // Log access to classified data
          if (classification.accessLoggingRequired) {
            await rbacStorage.logSecurityEvent({
              eventType: 'classified_data_access',
              userId: req.user.id,
              resource: `${resourceType}:${resourceId}`,
              action: req.method.toLowerCase(),
              result: 'success',
              details: { classificationLevel: classification.classificationLevel },
              ipAddress: req.ip,
              userAgent: req.get('user-agent'),
              tenantId: req.user.tenantId
            });
          }
        }

        // Check ACL entries
        const hasAccess = await rbacStorage.checkResourceAccess(
          'user',
          req.user.id,
          resourceType,
          resourceId,
          req.method.toLowerCase()
        );

        if (!hasAccess) {
          // Check role-based access
          const userRoles = await rbacStorage.getUserRoles(req.user.id, req.user.tenantId);
          let roleAccess = false;

          for (const userRole of userRoles) {
            roleAccess = await rbacStorage.checkResourceAccess(
              'role',
              userRole.role.id,
              resourceType,
              resourceId,
              req.method.toLowerCase()
            );
            if (roleAccess) break;
          }

          if (!roleAccess) {
            await rbacStorage.logSecurityEvent({
              eventType: 'resource_access_denied',
              userId: req.user.id,
              resource: `${resourceType}:${resourceId}`,
              action: req.method.toLowerCase(),
              result: 'failure',
              details: { resourceType, resourceId },
              ipAddress: req.ip,
              userAgent: req.get('user-agent'),
              tenantId: req.user.tenantId
            });

            return res.status(403).json({ 
              error: 'Access denied to this resource' 
            });
          }
        }

        next();
      } catch (error) {
        console.error('Resource Access Error:', error);
        res.status(500).json({ error: 'Resource access system error' });
      }
    };
  }

  // Audit logging middleware
  static auditTrail(req: Request, res: Response, next: NextFunction) {
    const originalSend = res.send;
    const startTime = Date.now();

    res.send = function(data) {
      const endTime = Date.now();
      const responseTime = endTime - startTime;

      // Log the request/response
      if (req.user) {
        rbacStorage.logSecurityEvent({
          eventType: 'api_access',
          userId: req.user.id,
          resource: req.path,
          action: req.method.toLowerCase(),
          result: res.statusCode < 400 ? 'success' : 'failure',
          details: {
            statusCode: res.statusCode,
            responseTime,
            bodySize: data ? JSON.stringify(data).length : 0
          },
          ipAddress: req.ip,
          userAgent: req.get('user-agent'),
          sessionId: req.sessionID,
          tenantId: req.user.tenantId
        });
      }

      return originalSend.call(this, data);
    };

    next();
  }
}

// Helper functions for common permission patterns
export const rbacHelpers = {
  // Clinical permissions
  canViewPatients: RBACMiddleware.requirePermission('patients:read'),
  canCreatePatients: RBACMiddleware.requirePermission('patients:create'),
  canUpdatePatients: RBACMiddleware.requirePermission('patients:update'),
  canDeletePatients: RBACMiddleware.requirePermission('patients:delete'),
  
  canViewTests: RBACMiddleware.requirePermission('tests:read'),
  canCreateTests: RBACMiddleware.requirePermission('tests:create'),
  canApproveTests: RBACMiddleware.requirePermission('tests:approve'),
  canReleaseResults: RBACMiddleware.requirePermission('tests:release'),

  // Financial permissions
  canViewFinancials: RBACMiddleware.requirePermission('financial:read'),
  canCreateInvoices: RBACMiddleware.requirePermission('invoices:create'),
  canApprovePayments: RBACMiddleware.requirePermission('payments:approve'),
  canViewReports: RBACMiddleware.requirePermission('reports:read'),

  // Administrative permissions
  canManageUsers: RBACMiddleware.requirePermission('users:manage'),
  canManageRoles: RBACMiddleware.requirePermission('roles:manage'),
  canViewAuditLogs: RBACMiddleware.requirePermission('audit:read'),
  canManageSystem: RBACMiddleware.requirePermission('system:manage'),

  // Inventory permissions
  canViewInventory: RBACMiddleware.requirePermission('inventory:read'),
  canUpdateInventory: RBACMiddleware.requirePermission('inventory:update'),
  canApprovePurchases: RBACMiddleware.requirePermission('purchases:approve'),

  // HR permissions
  canManageEmployees: RBACMiddleware.requirePermission('employees:manage'),
  canViewPayroll: RBACMiddleware.requirePermission('payroll:read'),
  canManageSchedules: RBACMiddleware.requirePermission('schedules:manage'),

  // Role-based helpers
  isSystemAdmin: RBACMiddleware.requireRole('System Administrator'),
  isBranchManager: RBACMiddleware.requireRole('Branch Manager'),
  isLabTechnician: RBACMiddleware.requireRole('Laboratory Technician'),
  isRadiologist: RBACMiddleware.requireRole('Radiologist'),
  isAccountant: RBACMiddleware.requireRole('Accountant'),
  isReceptionist: RBACMiddleware.requireRole('Receptionist')
};