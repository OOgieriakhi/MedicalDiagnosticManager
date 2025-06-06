// Role-Based Access Control (RBAC) utilities for medical ERP system

export interface Permission {
  module: string;
  action: string;
  resource?: string;
}

export interface Role {
  id: number;
  name: string;
  description: string;
  permissions: Permission[];
  level: 'basic' | 'advanced' | 'admin';
}

// Define comprehensive permission sets for medical staff roles
export const PERMISSIONS = {
  // Patient Management
  PATIENT_VIEW: { module: 'patients', action: 'view' },
  PATIENT_CREATE: { module: 'patients', action: 'create' },
  PATIENT_EDIT: { module: 'patients', action: 'edit' },
  PATIENT_DELETE: { module: 'patients', action: 'delete' },
  
  // Laboratory Operations
  LAB_VIEW_TESTS: { module: 'laboratory', action: 'view', resource: 'tests' },
  LAB_CREATE_TESTS: { module: 'laboratory', action: 'create', resource: 'tests' },
  LAB_APPROVE_RESULTS: { module: 'laboratory', action: 'approve', resource: 'results' },
  LAB_RELEASE_REPORTS: { module: 'laboratory', action: 'release', resource: 'reports' },
  
  // Inventory Management
  INVENTORY_VIEW: { module: 'inventory', action: 'view' },
  INVENTORY_MANAGE: { module: 'inventory', action: 'manage' },
  INVENTORY_PURCHASE: { module: 'inventory', action: 'purchase' },
  INVENTORY_AUDIT: { module: 'inventory', action: 'audit' },
  
  // Financial Operations
  FINANCE_VIEW: { module: 'finance', action: 'view' },
  FINANCE_BILLING: { module: 'finance', action: 'billing' },
  FINANCE_PAYMENTS: { module: 'finance', action: 'payments' },
  FINANCE_REPORTS: { module: 'finance', action: 'reports' },
  FINANCE_ACCOUNTING: { module: 'finance', action: 'accounting' },
  
  // Administrative Functions
  ADMIN_USER_MANAGEMENT: { module: 'admin', action: 'manage', resource: 'users' },
  ADMIN_ROLE_MANAGEMENT: { module: 'admin', action: 'manage', resource: 'roles' },
  ADMIN_SYSTEM_CONFIG: { module: 'admin', action: 'configure', resource: 'system' },
  ADMIN_AUDIT_LOGS: { module: 'admin', action: 'view', resource: 'audit_logs' },
  
  // Radiology Department
  RADIOLOGY_VIEW: { module: 'radiology', action: 'view' },
  RADIOLOGY_SCHEDULE: { module: 'radiology', action: 'schedule' },
  RADIOLOGY_RESULTS: { module: 'radiology', action: 'results' },
  
  // Pharmacy Operations
  PHARMACY_VIEW: { module: 'pharmacy', action: 'view' },
  PHARMACY_DISPENSE: { module: 'pharmacy', action: 'dispense' },
  PHARMACY_INVENTORY: { module: 'pharmacy', action: 'inventory' },
  
  // Quality Assurance
  QA_VIEW: { module: 'quality', action: 'view' },
  QA_MANAGE: { module: 'quality', action: 'manage' },
  QA_AUDIT: { module: 'quality', action: 'audit' },
} as const;

// Define role templates for different staff positions
export const ROLE_TEMPLATES: Record<string, Role> = {
  RECEPTIONIST: {
    id: 1,
    name: 'Receptionist',
    description: 'Front desk operations and patient intake',
    level: 'basic',
    permissions: [
      PERMISSIONS.PATIENT_VIEW,
      PERMISSIONS.PATIENT_CREATE,
      PERMISSIONS.PATIENT_EDIT,
    ]
  },
  
  NURSE: {
    id: 2,
    name: 'Nurse',
    description: 'Patient care and basic medical operations',
    level: 'basic',
    permissions: [
      PERMISSIONS.PATIENT_VIEW,
      PERMISSIONS.PATIENT_EDIT,
      PERMISSIONS.LAB_VIEW_TESTS,
    ]
  },
  
  LAB_TECHNICIAN: {
    id: 3,
    name: 'Laboratory Technician',
    description: 'Laboratory test processing and sample handling',
    level: 'basic',
    permissions: [
      PERMISSIONS.PATIENT_VIEW,
      PERMISSIONS.LAB_VIEW_TESTS,
      PERMISSIONS.LAB_CREATE_TESTS,
      PERMISSIONS.INVENTORY_VIEW,
    ]
  },
  
  LAB_SUPERVISOR: {
    id: 4,
    name: 'Laboratory Supervisor',
    description: 'Laboratory operations management and quality control',
    level: 'advanced',
    permissions: [
      PERMISSIONS.PATIENT_VIEW,
      PERMISSIONS.LAB_VIEW_TESTS,
      PERMISSIONS.LAB_CREATE_TESTS,
      PERMISSIONS.LAB_APPROVE_RESULTS,
      PERMISSIONS.INVENTORY_VIEW,
      PERMISSIONS.INVENTORY_MANAGE,
      PERMISSIONS.QA_VIEW,
      PERMISSIONS.QA_MANAGE,
    ]
  },
  
  PATHOLOGIST: {
    id: 5,
    name: 'Pathologist',
    description: 'Medical diagnosis and result validation',
    level: 'advanced',
    permissions: [
      PERMISSIONS.PATIENT_VIEW,
      PERMISSIONS.LAB_VIEW_TESTS,
      PERMISSIONS.LAB_APPROVE_RESULTS,
      PERMISSIONS.LAB_RELEASE_REPORTS,
      PERMISSIONS.QA_VIEW,
    ]
  },
  
  RADIOLOGIST: {
    id: 6,
    name: 'Radiologist',
    description: 'Radiology operations and imaging interpretation',
    level: 'advanced',
    permissions: [
      PERMISSIONS.PATIENT_VIEW,
      PERMISSIONS.RADIOLOGY_VIEW,
      PERMISSIONS.RADIOLOGY_SCHEDULE,
      PERMISSIONS.RADIOLOGY_RESULTS,
    ]
  },
  
  PHARMACIST: {
    id: 7,
    name: 'Pharmacist',
    description: 'Pharmacy operations and medication management',
    level: 'advanced',
    permissions: [
      PERMISSIONS.PATIENT_VIEW,
      PERMISSIONS.PHARMACY_VIEW,
      PERMISSIONS.PHARMACY_DISPENSE,
      PERMISSIONS.PHARMACY_INVENTORY,
      PERMISSIONS.INVENTORY_VIEW,
    ]
  },
  
  CASHIER: {
    id: 8,
    name: 'Cashier',
    description: 'Financial transactions and payment processing',
    level: 'basic',
    permissions: [
      PERMISSIONS.PATIENT_VIEW,
      PERMISSIONS.FINANCE_VIEW,
      PERMISSIONS.FINANCE_BILLING,
      PERMISSIONS.FINANCE_PAYMENTS,
    ]
  },
  
  ACCOUNTANT: {
    id: 9,
    name: 'Accountant',
    description: 'Financial management and accounting operations',
    level: 'advanced',
    permissions: [
      PERMISSIONS.FINANCE_VIEW,
      PERMISSIONS.FINANCE_BILLING,
      PERMISSIONS.FINANCE_PAYMENTS,
      PERMISSIONS.FINANCE_REPORTS,
      PERMISSIONS.FINANCE_ACCOUNTING,
      PERMISSIONS.INVENTORY_VIEW,
      PERMISSIONS.INVENTORY_AUDIT,
    ]
  },
  
  PROCUREMENT_OFFICER: {
    id: 10,
    name: 'Procurement Officer',
    description: 'Inventory management and purchasing operations',
    level: 'advanced',
    permissions: [
      PERMISSIONS.INVENTORY_VIEW,
      PERMISSIONS.INVENTORY_MANAGE,
      PERMISSIONS.INVENTORY_PURCHASE,
      PERMISSIONS.INVENTORY_AUDIT,
      PERMISSIONS.FINANCE_VIEW,
    ]
  },
  
  BRANCH_MANAGER: {
    id: 11,
    name: 'Branch Manager',
    description: 'Branch operations management and oversight',
    level: 'admin',
    permissions: [
      PERMISSIONS.PATIENT_VIEW,
      PERMISSIONS.PATIENT_CREATE,
      PERMISSIONS.PATIENT_EDIT,
      PERMISSIONS.LAB_VIEW_TESTS,
      PERMISSIONS.LAB_APPROVE_RESULTS,
      PERMISSIONS.LAB_RELEASE_REPORTS,
      PERMISSIONS.INVENTORY_VIEW,
      PERMISSIONS.INVENTORY_MANAGE,
      PERMISSIONS.INVENTORY_PURCHASE,
      PERMISSIONS.FINANCE_VIEW,
      PERMISSIONS.FINANCE_REPORTS,
      PERMISSIONS.QA_VIEW,
      PERMISSIONS.QA_MANAGE,
      PERMISSIONS.ADMIN_USER_MANAGEMENT,
    ]
  },
  
  SYSTEM_ADMIN: {
    id: 12,
    name: 'System Administrator',
    description: 'Full system access and configuration',
    level: 'admin',
    permissions: Object.values(PERMISSIONS)
  },
};

// Utility functions for permission checking
export const hasPermission = (userPermissions: Permission[], requiredPermission: Permission): boolean => {
  return userPermissions.some(perm => 
    perm.module === requiredPermission.module && 
    perm.action === requiredPermission.action &&
    (!requiredPermission.resource || perm.resource === requiredPermission.resource)
  );
};

export const hasAnyPermission = (userPermissions: Permission[], requiredPermissions: Permission[]): boolean => {
  return requiredPermissions.some(perm => hasPermission(userPermissions, perm));
};

export const hasAllPermissions = (userPermissions: Permission[], requiredPermissions: Permission[]): boolean => {
  return requiredPermissions.every(perm => hasPermission(userPermissions, perm));
};

export const canAccessModule = (userPermissions: Permission[], module: string): boolean => {
  return userPermissions.some(perm => perm.module === module);
};

export const getAccessibleRoutes = (userPermissions: Permission[]): string[] => {
  const routes: string[] = ['/'];
  
  if (canAccessModule(userPermissions, 'patients')) {
    routes.push('/patient-intake', '/patient-management');
  }
  
  if (canAccessModule(userPermissions, 'laboratory')) {
    routes.push('/laboratory-management', '/test-consumption-management');
  }
  
  if (canAccessModule(userPermissions, 'radiology')) {
    routes.push('/radiology-management', '/ultrasound-unit', '/cardiology-unit');
  }
  
  if (canAccessModule(userPermissions, 'pharmacy')) {
    routes.push('/pharmacy-management');
  }
  
  if (canAccessModule(userPermissions, 'inventory')) {
    routes.push('/inventory-management', '/inventory-dashboard', '/purchase-orders');
  }
  
  if (canAccessModule(userPermissions, 'finance')) {
    routes.push('/financial-management', '/comprehensive-financial', '/cashiers-module', '/accounting-dashboard', '/petty-cash');
  }
  
  if (canAccessModule(userPermissions, 'quality')) {
    routes.push('/quality-assurance', '/reference-ranges');
  }
  
  if (canAccessModule(userPermissions, 'admin')) {
    routes.push('/administrative-management', '/role-management', '/security-audit', '/human-resources');
  }
  
  return routes;
};

// Get user role information from permissions
export const getUserRoleInfo = (userPermissions: Permission[]): { role: Role | null, level: string } => {
  // Find the best matching role based on permissions
  const roles = Object.values(ROLE_TEMPLATES);
  
  for (const role of roles) {
    if (hasAllPermissions(userPermissions, role.permissions)) {
      return { role, level: role.level };
    }
  }
  
  // Determine access level based on permission count and types
  const adminPermissions = userPermissions.filter(p => p.module === 'admin').length;
  const totalPermissions = userPermissions.length;
  
  if (adminPermissions > 0 || totalPermissions > 15) {
    return { role: null, level: 'admin' };
  } else if (totalPermissions > 8) {
    return { role: null, level: 'advanced' };
  } else {
    return { role: null, level: 'basic' };
  }
};