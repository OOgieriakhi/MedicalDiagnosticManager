import { rbacStorage } from "./rbac-storage";
import * as rbacSchema from "@shared/rbac-schema";

export async function seedRBACSystem() {
  console.log("🔐 Seeding RBAC System...");

  try {
    // 1. Create Core Permissions
    await seedPermissions();
    
    // 2. Create Default Roles
    await seedRoles();
    
    // 3. Assign Permissions to Roles
    await seedRolePermissions();
    
    // 4. Create Security Policies
    await seedSecurityPolicies();
    
    // 5. Create Permission Groups
    await seedPermissionGroups();

    console.log("✅ RBAC System seeded successfully");
  } catch (error) {
    console.error("❌ Error seeding RBAC system:", error);
    throw error;
  }
}

async function seedPermissions() {
  console.log("📝 Creating permissions...");

  const permissions = [
    // Patient Management
    { name: "patients:create", resource: "patients", action: "create", description: "Create new patient records", category: "clinical" },
    { name: "patients:read", resource: "patients", action: "read", description: "View patient information", category: "clinical" },
    { name: "patients:update", resource: "patients", action: "update", description: "Update patient records", category: "clinical" },
    { name: "patients:delete", resource: "patients", action: "delete", description: "Delete patient records", category: "clinical" },
    { name: "patients:search", resource: "patients", action: "search", description: "Search patient database", category: "clinical" },

    // Laboratory Tests
    { name: "tests:create", resource: "tests", action: "create", description: "Create test orders", category: "clinical" },
    { name: "tests:read", resource: "tests", action: "read", description: "View test information", category: "clinical" },
    { name: "tests:update", resource: "tests", action: "update", description: "Update test details", category: "clinical" },
    { name: "tests:process", resource: "tests", action: "process", description: "Process laboratory tests", category: "clinical" },
    { name: "tests:approve", resource: "tests", action: "approve", description: "Approve test results", category: "clinical" },
    { name: "tests:release", resource: "tests", action: "release", description: "Release test results", category: "clinical" },
    { name: "tests:cancel", resource: "tests", action: "cancel", description: "Cancel test orders", category: "clinical" },

    // Radiology
    { name: "radiology:create", resource: "radiology", action: "create", description: "Create radiology orders", category: "clinical" },
    { name: "radiology:read", resource: "radiology", action: "read", description: "View radiology studies", category: "clinical" },
    { name: "radiology:interpret", resource: "radiology", action: "interpret", description: "Interpret radiology studies", category: "clinical" },
    { name: "radiology:approve", resource: "radiology", action: "approve", description: "Approve radiology reports", category: "clinical" },

    // Financial Management
    { name: "financial:read", resource: "financial", action: "read", description: "View financial data", category: "financial" },
    { name: "invoices:create", resource: "invoices", action: "create", description: "Create invoices", category: "financial" },
    { name: "invoices:update", resource: "invoices", action: "update", description: "Update invoices", category: "financial" },
    { name: "payments:process", resource: "payments", action: "process", description: "Process payments", category: "financial" },
    { name: "payments:approve", resource: "payments", action: "approve", description: "Approve payments", category: "financial" },
    { name: "payments:refund", resource: "payments", action: "refund", description: "Process refunds", category: "financial" },

    // Accounting
    { name: "accounting:read", resource: "accounting", action: "read", description: "View accounting records", category: "financial" },
    { name: "accounting:create", resource: "accounting", action: "create", description: "Create accounting entries", category: "financial" },
    { name: "accounting:approve", resource: "accounting", action: "approve", description: "Approve accounting transactions", category: "financial" },
    { name: "reports:financial", resource: "reports", action: "read", description: "Generate financial reports", category: "financial" },

    // Inventory Management
    { name: "inventory:read", resource: "inventory", action: "read", description: "View inventory", category: "operational" },
    { name: "inventory:update", resource: "inventory", action: "update", description: "Update inventory levels", category: "operational" },
    { name: "inventory:transfer", resource: "inventory", action: "transfer", description: "Transfer inventory items", category: "operational" },
    { name: "purchases:create", resource: "purchases", action: "create", description: "Create purchase orders", category: "operational" },
    { name: "purchases:approve", resource: "purchases", action: "approve", description: "Approve purchase orders", category: "operational" },
    { name: "purchases:receive", resource: "purchases", action: "receive", description: "Receive purchased items", category: "operational" },

    // Human Resources
    { name: "employees:read", resource: "employees", action: "read", description: "View employee information", category: "administrative" },
    { name: "employees:create", resource: "employees", action: "create", description: "Create employee records", category: "administrative" },
    { name: "employees:update", resource: "employees", action: "update", description: "Update employee information", category: "administrative" },
    { name: "employees:manage", resource: "employees", action: "manage", description: "Full employee management", category: "administrative" },
    { name: "payroll:read", resource: "payroll", action: "read", description: "View payroll information", category: "administrative" },
    { name: "payroll:process", resource: "payroll", action: "process", description: "Process payroll", category: "administrative" },
    { name: "schedules:read", resource: "schedules", action: "read", description: "View schedules", category: "administrative" },
    { name: "schedules:manage", resource: "schedules", action: "manage", description: "Manage staff schedules", category: "administrative" },

    // System Administration
    { name: "users:read", resource: "users", action: "read", description: "View user accounts", category: "system" },
    { name: "users:create", resource: "users", action: "create", description: "Create user accounts", category: "system" },
    { name: "users:update", resource: "users", action: "update", description: "Update user accounts", category: "system" },
    { name: "users:delete", resource: "users", action: "delete", description: "Delete user accounts", category: "system" },
    { name: "users:manage", resource: "users", action: "manage", description: "Full user management", category: "system" },
    
    { name: "roles:read", resource: "roles", action: "read", description: "View roles", category: "system" },
    { name: "roles:create", resource: "roles", action: "create", description: "Create roles", category: "system" },
    { name: "roles:update", resource: "roles", action: "update", description: "Update roles", category: "system" },
    { name: "roles:delete", resource: "roles", action: "delete", description: "Delete roles", category: "system" },
    { name: "roles:manage", resource: "roles", action: "manage", description: "Full role management", category: "system" },

    { name: "permissions:read", resource: "permissions", action: "read", description: "View permissions", category: "system" },
    { name: "permissions:assign", resource: "permissions", action: "assign", description: "Assign permissions", category: "system" },

    // Security & Audit
    { name: "audit:read", resource: "audit", action: "read", description: "View audit logs", category: "security" },
    { name: "security:manage", resource: "security", action: "manage", description: "Manage security settings", category: "security" },
    { name: "system:configure", resource: "system", action: "configure", description: "Configure system settings", category: "system" },
    { name: "system:manage", resource: "system", action: "manage", description: "Full system management", category: "system" },

    // Reports & Analytics
    { name: "reports:clinical", resource: "reports", action: "read", description: "Generate clinical reports", category: "reporting" },
    { name: "reports:operational", resource: "reports", action: "read", description: "Generate operational reports", category: "reporting" },
    { name: "reports:administrative", resource: "reports", action: "read", description: "Generate administrative reports", category: "reporting" },
    { name: "analytics:read", resource: "analytics", action: "read", description: "View analytics dashboards", category: "reporting" },

    // Branch Management
    { name: "branches:read", resource: "branches", action: "read", description: "View branch information", category: "administrative" },
    { name: "branches:manage", resource: "branches", action: "manage", description: "Manage branch operations", category: "administrative" },

    // Quality Control
    { name: "quality:read", resource: "quality", action: "read", description: "View quality metrics", category: "clinical" },
    { name: "quality:manage", resource: "quality", action: "manage", description: "Manage quality processes", category: "clinical" },

    // Appointments & Scheduling
    { name: "appointments:read", resource: "appointments", action: "read", description: "View appointments", category: "operational" },
    { name: "appointments:create", resource: "appointments", action: "create", description: "Create appointments", category: "operational" },
    { name: "appointments:update", resource: "appointments", action: "update", description: "Update appointments", category: "operational" },
    { name: "appointments:cancel", resource: "appointments", action: "cancel", description: "Cancel appointments", category: "operational" }
  ];

  for (const permission of permissions) {
    try {
      await rbacStorage.createPermission({
        ...permission,
        isSystemPermission: true
      });
    } catch (error: any) {
      if (!error.message.includes('duplicate key')) {
        throw error;
      }
    }
  }

  console.log(`✅ Created ${permissions.length} permissions`);
}

async function seedRoles() {
  console.log("👥 Creating roles...");

  const roles = [
    {
      name: "System Administrator",
      description: "Full system access and administration",
      level: 1,
      isSystemRole: true,
      tenantId: 1,
      createdBy: 1
    },
    {
      name: "Branch Manager",
      description: "Manages branch operations and staff",
      level: 2,
      isSystemRole: true,
      tenantId: 1,
      createdBy: 1
    },
    {
      name: "Medical Director",
      description: "Clinical oversight and medical decisions",
      level: 2,
      isSystemRole: true,
      tenantId: 1,
      createdBy: 1
    },
    {
      name: "Laboratory Manager",
      description: "Manages laboratory operations",
      level: 3,
      isSystemRole: true,
      tenantId: 1,
      createdBy: 1
    },
    {
      name: "Senior Laboratory Technician",
      description: "Experienced lab technician with supervisory duties",
      level: 4,
      isSystemRole: true,
      tenantId: 1,
      createdBy: 1
    },
    {
      name: "Laboratory Technician",
      description: "Performs laboratory tests and procedures",
      level: 5,
      isSystemRole: true,
      tenantId: 1,
      createdBy: 1
    },
    {
      name: "Radiologist",
      description: "Interprets radiology studies",
      level: 3,
      isSystemRole: true,
      tenantId: 1,
      createdBy: 1
    },
    {
      name: "Radiology Technician",
      description: "Performs radiology procedures",
      level: 5,
      isSystemRole: true,
      tenantId: 1,
      createdBy: 1
    },
    {
      name: "Financial Manager",
      description: "Manages financial operations",
      level: 3,
      isSystemRole: true,
      tenantId: 1,
      createdBy: 1
    },
    {
      name: "Accountant",
      description: "Handles accounting and financial records",
      level: 4,
      isSystemRole: true,
      tenantId: 1,
      createdBy: 1
    },
    {
      name: "Cashier",
      description: "Processes payments and handles cash transactions",
      level: 6,
      isSystemRole: true,
      tenantId: 1,
      createdBy: 1
    },
    {
      name: "HR Manager",
      description: "Manages human resources",
      level: 3,
      isSystemRole: true,
      tenantId: 1,
      createdBy: 1
    },
    {
      name: "Inventory Manager",
      description: "Manages inventory and supplies",
      level: 4,
      isSystemRole: true,
      tenantId: 1,
      createdBy: 1
    },
    {
      name: "Procurement Officer",
      description: "Handles purchasing and vendor relations",
      level: 4,
      isSystemRole: true,
      tenantId: 1,
      createdBy: 1
    },
    {
      name: "Receptionist",
      description: "Handles patient registration and reception",
      level: 6,
      isSystemRole: true,
      tenantId: 1,
      createdBy: 1
    },
    {
      name: "Data Entry Operator",
      description: "Handles data entry and basic administrative tasks",
      level: 7,
      isSystemRole: true,
      tenantId: 1,
      createdBy: 1
    },
    {
      name: "Quality Control Officer",
      description: "Manages quality assurance processes",
      level: 4,
      isSystemRole: true,
      tenantId: 1,
      createdBy: 1
    },
    {
      name: "IT Support",
      description: "Provides technical support",
      level: 5,
      isSystemRole: true,
      tenantId: 1,
      createdBy: 1
    },
    {
      name: "Security Officer",
      description: "Handles security and access control",
      level: 6,
      isSystemRole: true,
      tenantId: 1,
      createdBy: 1
    },
    {
      name: "Auditor",
      description: "Performs internal audits and compliance checks",
      level: 3,
      isSystemRole: true,
      tenantId: 1,
      createdBy: 1
    }
  ];

  for (const role of roles) {
    try {
      await rbacStorage.createRole(role);
    } catch (error: any) {
      if (!error.message.includes('duplicate key')) {
        throw error;
      }
    }
  }

  console.log(`✅ Created ${roles.length} roles`);
}

async function seedRolePermissions() {
  console.log("🔗 Assigning permissions to roles...");

  // Get all permissions and roles
  const permissions = await rbacStorage.getPermissions();
  const roles = await rbacStorage.getRoles(1);

  const permissionMap = new Map(permissions.map(p => [p.name, p.id]));
  const roleMap = new Map(roles.map(r => [r.name, r.id]));

  // Define role-permission mappings
  const rolePermissions = [
    {
      role: "System Administrator",
      permissions: permissions.map(p => p.name) // All permissions
    },
    {
      role: "Branch Manager",
      permissions: [
        "patients:read", "patients:search",
        "tests:read", "radiology:read",
        "financial:read", "reports:financial", "reports:operational", "reports:administrative",
        "employees:read", "employees:manage", "schedules:read", "schedules:manage",
        "inventory:read", "purchases:approve",
        "branches:read", "branches:manage",
        "quality:read", "quality:manage",
        "appointments:read", "appointments:create", "appointments:update", "appointments:cancel",
        "analytics:read"
      ]
    },
    {
      role: "Medical Director",
      permissions: [
        "patients:read", "patients:search",
        "tests:read", "tests:approve", "tests:release",
        "radiology:read", "radiology:approve",
        "quality:read", "quality:manage",
        "reports:clinical", "analytics:read"
      ]
    },
    {
      role: "Laboratory Manager",
      permissions: [
        "patients:read", "patients:search",
        "tests:create", "tests:read", "tests:update", "tests:process", "tests:approve", "tests:cancel",
        "inventory:read", "inventory:update",
        "employees:read", "schedules:read",
        "quality:read", "quality:manage",
        "reports:clinical", "analytics:read"
      ]
    },
    {
      role: "Senior Laboratory Technician",
      permissions: [
        "patients:read", "patients:search",
        "tests:create", "tests:read", "tests:update", "tests:process",
        "inventory:read", "inventory:update",
        "quality:read"
      ]
    },
    {
      role: "Laboratory Technician",
      permissions: [
        "patients:read", "patients:search",
        "tests:read", "tests:process",
        "inventory:read"
      ]
    },
    {
      role: "Radiologist",
      permissions: [
        "patients:read", "patients:search",
        "radiology:read", "radiology:interpret", "radiology:approve",
        "reports:clinical"
      ]
    },
    {
      role: "Radiology Technician",
      permissions: [
        "patients:read", "patients:search",
        "radiology:create", "radiology:read"
      ]
    },
    {
      role: "Financial Manager",
      permissions: [
        "financial:read", "invoices:create", "invoices:update",
        "payments:process", "payments:approve", "payments:refund",
        "accounting:read", "accounting:create", "accounting:approve",
        "reports:financial", "analytics:read"
      ]
    },
    {
      role: "Accountant",
      permissions: [
        "financial:read", "invoices:create", "invoices:update",
        "payments:process", "accounting:read", "accounting:create",
        "reports:financial"
      ]
    },
    {
      role: "Cashier",
      permissions: [
        "patients:read", "payments:process",
        "invoices:create"
      ]
    },
    {
      role: "HR Manager",
      permissions: [
        "employees:read", "employees:create", "employees:update", "employees:manage",
        "payroll:read", "payroll:process",
        "schedules:read", "schedules:manage",
        "reports:administrative"
      ]
    },
    {
      role: "Inventory Manager",
      permissions: [
        "inventory:read", "inventory:update", "inventory:transfer",
        "purchases:create", "purchases:approve", "purchases:receive",
        "reports:operational"
      ]
    },
    {
      role: "Procurement Officer",
      permissions: [
        "inventory:read", "purchases:create", "purchases:receive"
      ]
    },
    {
      role: "Receptionist",
      permissions: [
        "patients:create", "patients:read", "patients:update", "patients:search",
        "appointments:read", "appointments:create", "appointments:update", "appointments:cancel",
        "payments:process"
      ]
    },
    {
      role: "Data Entry Operator",
      permissions: [
        "patients:create", "patients:read", "patients:update"
      ]
    },
    {
      role: "Quality Control Officer",
      permissions: [
        "tests:read", "radiology:read",
        "quality:read", "quality:manage",
        "reports:clinical"
      ]
    },
    {
      role: "IT Support",
      permissions: [
        "users:read", "audit:read"
      ]
    },
    {
      role: "Security Officer",
      permissions: [
        "audit:read", "security:manage"
      ]
    },
    {
      role: "Auditor",
      permissions: [
        "audit:read", "financial:read", "quality:read",
        "reports:financial", "reports:clinical", "reports:operational", "reports:administrative"
      ]
    }
  ];

  for (const rolePermission of rolePermissions) {
    const roleId = roleMap.get(rolePermission.role);
    if (!roleId) continue;

    for (const permissionName of rolePermission.permissions) {
      const permissionId = permissionMap.get(permissionName);
      if (!permissionId) continue;

      try {
        await rbacStorage.assignPermissionToRole({
          roleId,
          permissionId,
          grantedBy: 1,
          tenantId: 1
        });
      } catch (error: any) {
        if (!error.message.includes('duplicate key')) {
          console.warn(`Failed to assign ${permissionName} to ${rolePermission.role}:`, error.message);
        }
      }
    }
  }

  console.log("✅ Assigned permissions to roles");
}

async function seedSecurityPolicies() {
  console.log("🛡️ Creating security policies...");

  const policies = [
    {
      name: "Password Policy",
      description: "Enforces strong password requirements",
      policyType: "password",
      rules: {
        minLength: 12,
        requireUppercase: true,
        requireLowercase: true,
        requireNumbers: true,
        requireSpecialChars: true,
        historyCount: 12,
        maxAge: 90, // days
        lockoutAttempts: 5,
        lockoutDuration: 30 // minutes
      },
      appliesTo: "all",
      enforcementLevel: "strict",
      tenantId: 1,
      createdBy: 1
    },
    {
      name: "Session Policy",
      description: "Manages user session security",
      policyType: "session",
      rules: {
        maxConcurrentSessions: 3,
        sessionTimeout: 480, // 8 hours in minutes
        idleTimeout: 60, // 1 hour in minutes
        requireMfaForHighRisk: true,
        riskThreshold: 50
      },
      appliesTo: "all",
      enforcementLevel: "strict",
      tenantId: 1,
      createdBy: 1
    },
    {
      name: "Access Control Policy",
      description: "Controls access based on various factors",
      policyType: "access",
      rules: {
        timeRestrictions: {
          hours: { start: 6, end: 22 },
          days: [1, 2, 3, 4, 5, 6] // Monday to Saturday
        },
        locationRestrictions: {
          allowedCountries: ["NG"], // Nigeria
          blockVpn: true
        },
        deviceRestrictions: {
          allowUnknownDevices: false,
          requireRegistration: true
        }
      },
      appliesTo: "role_based",
      targetRoles: [3, 4, 5], // Financial roles
      enforcementLevel: "strict",
      tenantId: 1,
      createdBy: 1
    },
    {
      name: "Data Classification Policy",
      description: "Enforces data protection based on classification",
      policyType: "data",
      rules: {
        encryptionRequired: ["confidential", "restricted"],
        auditRequired: ["internal", "confidential", "restricted"],
        retentionPeriods: {
          public: 365,
          internal: 2555, // 7 years
          confidential: 3650, // 10 years
          restricted: 3650 // 10 years
        },
        accessLogging: true
      },
      appliesTo: "all",
      enforcementLevel: "strict",
      tenantId: 1,
      createdBy: 1
    },
    {
      name: "Administrative Access Policy",
      description: "Additional security for administrative functions",
      policyType: "access",
      rules: {
        requireMfa: true,
        sessionTimeout: 240, // 4 hours
        ipWhitelist: ["127.0.0.1", "::1"], // Add actual admin IPs
        approvalRequired: ["users:delete", "roles:delete", "system:configure"]
      },
      appliesTo: "role_based",
      targetRoles: [1, 2], // System Admin and Branch Manager
      enforcementLevel: "strict",
      tenantId: 1,
      createdBy: 1
    }
  ];

  for (const policy of policies) {
    try {
      await rbacStorage.createSecurityPolicy(policy);
    } catch (error: any) {
      if (!error.message.includes('duplicate key')) {
        console.warn(`Failed to create policy ${policy.name}:`, error.message);
      }
    }
  }

  console.log(`✅ Created ${policies.length} security policies`);
}

async function seedPermissionGroups() {
  console.log("📦 Creating permission groups...");

  const groups = [
    {
      name: "Clinical Operations",
      description: "Permissions for clinical staff",
      category: "clinical",
      permissions: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16], // Patient and test permissions
      tenantId: 1,
      createdBy: 1
    },
    {
      name: "Financial Operations",
      description: "Permissions for financial staff",
      category: "financial",
      permissions: [17, 18, 19, 20, 21, 22, 23, 24, 25, 26], // Financial permissions
      tenantId: 1,
      createdBy: 1
    },
    {
      name: "Administrative Operations",
      description: "Permissions for administrative staff",
      category: "administrative",
      permissions: [33, 34, 35, 36, 37, 38, 39, 40, 57, 58], // HR and admin permissions
      tenantId: 1,
      createdBy: 1
    },
    {
      name: "System Administration",
      description: "Permissions for system administrators",
      category: "system",
      permissions: [41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54], // System permissions
      tenantId: 1,
      createdBy: 1
    }
  ];

  for (const group of groups) {
    try {
      await rbacStorage.createPermissionGroup(group);
    } catch (error: any) {
      if (!error.message.includes('duplicate key')) {
        console.warn(`Failed to create group ${group.name}:`, error.message);
      }
    }
  }

  console.log(`✅ Created ${groups.length} permission groups`);
}

export async function assignUserRole(userId: number, roleName: string, tenantId: number, assignedBy: number) {
  const roles = await rbacStorage.getRoles(tenantId);
  const role = roles.find(r => r.name === roleName);
  
  if (!role) {
    throw new Error(`Role '${roleName}' not found`);
  }

  return await rbacStorage.assignRoleToUser({
    userId,
    roleId: role.id,
    assignedBy,
    tenantId
  });
}