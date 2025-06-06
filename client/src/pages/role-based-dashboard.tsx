import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

import { 
  Users, TestTube, Activity, Package, DollarSign, Shield, 
  FileText, Stethoscope, Pill, Building, Settings, UserCheck,
  TrendingUp, ClipboardList, Calendar, BarChart3, Home,
  AlertTriangle, CheckCircle, Clock, Eye
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

interface ModuleCard {
  title: string;
  description: string;
  icon: any;
  href: string;
  allowedRoles: string[];
  color: string;
  level: 'basic' | 'advanced' | 'admin';
}

// Role-based access control mapping
const ROLE_PERMISSIONS = {
  'admin': ['all'], // Admin has access to everything
  'doctor': ['patients', 'laboratory', 'radiology', 'quality'],
  'nurse': ['patients', 'laboratory'],
  'lab_technician': ['laboratory', 'inventory'],
  'lab_supervisor': ['laboratory', 'inventory', 'quality'],
  'pathologist': ['laboratory', 'quality'],
  'radiologist': ['radiology', 'patients'],
  'pharmacist': ['pharmacy', 'inventory', 'patients'],
  'receptionist': ['patients'],
  'cashier': ['patients', 'finance'],
  'accountant': ['finance', 'inventory'],
  'procurement_officer': ['inventory', 'finance'],
  'branch_manager': ['patients', 'laboratory', 'inventory', 'finance', 'admin'],
};

const MODULE_CARDS: ModuleCard[] = [
  {
    title: "Patient Management",
    description: "Patient intake, registration, and records management",
    icon: Users,
    href: "/patient-management",
    allowedRoles: ['admin', 'doctor', 'nurse', 'receptionist', 'cashier', 'radiologist', 'pharmacist', 'branch_manager'],
    color: "bg-blue-500",
    level: 'basic'
  },
  {
    title: "Laboratory Management",
    description: "Test processing, results, and quality control",
    icon: TestTube,
    href: "/laboratory-management",
    allowedRoles: ['admin', 'doctor', 'nurse', 'lab_technician', 'lab_supervisor', 'pathologist', 'branch_manager'],
    color: "bg-green-500",
    level: 'basic'
  },
  {
    title: "Radiology Department",
    description: "Imaging services and radiological examinations",
    icon: Activity,
    href: "/radiology-management",
    allowedRoles: ['admin', 'doctor', 'radiologist', 'branch_manager'],
    color: "bg-purple-500",
    level: 'basic'
  },
  {
    title: "Pharmacy Operations",
    description: "Medication dispensing and inventory management",
    icon: Pill,
    href: "/pharmacy-management",
    allowedRoles: ['admin', 'pharmacist', 'branch_manager'],
    color: "bg-orange-500",
    level: 'basic'
  },
  {
    title: "Inventory Dashboard",
    description: "Real-time stock tracking and consumption monitoring",
    icon: Package,
    href: "/inventory-dashboard",
    allowedRoles: ['admin', 'lab_technician', 'lab_supervisor', 'pharmacist', 'procurement_officer', 'accountant', 'branch_manager'],
    color: "bg-teal-500",
    level: 'advanced'
  },
  {
    title: "Financial Management",
    description: "Billing, payments, and financial reporting",
    icon: DollarSign,
    href: "/financial-management",
    allowedRoles: ['admin', 'cashier', 'accountant', 'procurement_officer', 'branch_manager'],
    color: "bg-yellow-500",
    level: 'basic'
  },
  {
    title: "Purchase Orders",
    description: "Procurement and supplier management",
    icon: ClipboardList,
    href: "/purchase-orders",
    allowedRoles: ['admin', 'procurement_officer', 'accountant', 'branch_manager'],
    color: "bg-indigo-500",
    level: 'advanced'
  },
  {
    title: "Accounting Dashboard",
    description: "Chart of accounts and financial analytics",
    icon: BarChart3,
    href: "/accounting-dashboard",
    allowedRoles: ['admin', 'accountant', 'branch_manager'],
    color: "bg-red-500",
    level: 'advanced'
  },
  {
    title: "Quality Assurance",
    description: "Quality control and compliance monitoring",
    icon: Shield,
    href: "/quality-assurance",
    allowedRoles: ['admin', 'doctor', 'lab_supervisor', 'pathologist', 'branch_manager'],
    color: "bg-emerald-500",
    level: 'advanced'
  },
  {
    title: "Role Management",
    description: "User roles and permission administration",
    icon: UserCheck,
    href: "/role-management",
    allowedRoles: ['admin', 'branch_manager'],
    color: "bg-gray-500",
    level: 'admin'
  },
  {
    title: "System Administration",
    description: "System configuration and management",
    icon: Settings,
    href: "/administrative-management",
    allowedRoles: ['admin', 'branch_manager'],
    color: "bg-slate-500",
    level: 'admin'
  },
  {
    title: "Security Audit",
    description: "Security monitoring and audit trails",
    icon: Eye,
    href: "/security-audit",
    allowedRoles: ['admin', 'branch_manager'],
    color: "bg-cyan-500",
    level: 'admin'
  }
];

// Helper function to check if user has access to a module
const hasAccess = (userRole: string, allowedRoles: string[]): boolean => {
  return allowedRoles.includes(userRole) || userRole === 'admin';
};

// Helper function to get access level from role
const getAccessLevel = (role: string): 'basic' | 'advanced' | 'admin' => {
  if (role === 'admin' || role === 'branch_manager') return 'admin';
  if (['lab_supervisor', 'pathologist', 'procurement_officer', 'accountant'].includes(role)) return 'advanced';
  return 'basic';
};

// Helper function to get role display name
const getRoleDisplayName = (role: string): string => {
  const roleNames = {
    'admin': 'System Administrator',
    'doctor': 'Doctor',
    'nurse': 'Nurse',
    'lab_technician': 'Laboratory Technician',
    'lab_supervisor': 'Laboratory Supervisor',
    'pathologist': 'Pathologist',
    'radiologist': 'Radiologist',
    'pharmacist': 'Pharmacist',
    'receptionist': 'Receptionist',
    'cashier': 'Cashier',
    'accountant': 'Accountant',
    'procurement_officer': 'Procurement Officer',
    'branch_manager': 'Branch Manager',
  };
  return roleNames[role as keyof typeof roleNames] || role;
};

export default function RoleBasedDashboard() {
  const { user } = useAuth();

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-96">
          <CardHeader>
            <CardTitle>Authentication Required</CardTitle>
            <CardDescription>Please log in to access the system</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const userRole = user.role || 'receptionist';
  const level = getAccessLevel(userRole);
  const roleDisplayName = getRoleDisplayName(userRole);

  // Filter modules based on user role
  const accessibleModules = MODULE_CARDS.filter(module => 
    hasAccess(userRole, module.allowedRoles)
  );

  // Group modules by access level
  const basicModules = accessibleModules.filter(m => m.level === 'basic');
  const advancedModules = accessibleModules.filter(m => m.level === 'advanced');
  const adminModules = accessibleModules.filter(m => m.level === 'admin');

  const getLevelBadgeColor = (userLevel: string) => {
    switch (userLevel) {
      case 'admin': return 'destructive';
      case 'advanced': return 'default';
      case 'basic': return 'secondary';
      default: return 'outline';
    }
  };

  // Calculate department access
  const departmentModules = ['patients', 'laboratory', 'radiology', 'pharmacy', 'finance'];
  const accessibleDepartments = departmentModules.filter(dept => {
    return accessibleModules.some(module => 
      module.href.includes(dept.replace('patients', 'patient')) || 
      module.href.includes(dept)
    );
  });

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-bold">Medical ERP Dashboard</h1>
          <p className="text-muted-foreground mt-2">
            Comprehensive medical diagnostic center management system
          </p>
        </div>
        <div className="text-right">
          <div className="flex items-center gap-2 mb-2">
            <Badge variant={getLevelBadgeColor(level) as any}>
              {level.toUpperCase()} ACCESS
            </Badge>
            <Badge variant="outline">
              {roleDisplayName}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Welcome, {user.firstName || user.username}
          </p>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Accessible Modules</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{accessibleModules.length}</div>
            <p className="text-xs text-muted-foreground">
              out of {MODULE_CARDS.length} total modules
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Access Level</CardTitle>
            <Shield className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold capitalize">{level}</div>
            <p className="text-xs text-muted-foreground">
              Role-based permissions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Department Access</CardTitle>
            <Building className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {accessibleDepartments.length}
            </div>
            <p className="text-xs text-muted-foreground">
              departments available
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Role Status</CardTitle>
            <UserCheck className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Active</div>
            <p className="text-xs text-muted-foreground">
              {roleDisplayName} role assigned
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Basic Access Modules */}
      {basicModules.length > 0 && (
        <div>
          <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
            <CheckCircle className="h-6 w-6 text-green-500" />
            Core Operations
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {basicModules.map((module) => (
              <ModuleCardComponent key={module.href} module={module} />
            ))}
          </div>
        </div>
      )}

      {/* Advanced Access Modules */}
      {advancedModules.length > 0 && (
        <div>
          <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
            <TrendingUp className="h-6 w-6 text-blue-500" />
            Advanced Features
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {advancedModules.map((module) => (
              <ModuleCardComponent key={module.href} module={module} />
            ))}
          </div>
        </div>
      )}

      {/* Admin Access Modules */}
      {adminModules.length > 0 && (
        <div>
          <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
            <Shield className="h-6 w-6 text-red-500" />
            Administrative Functions
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {adminModules.map((module) => (
              <ModuleCardComponent key={module.href} module={module} />
            ))}
          </div>
        </div>
      )}

      {/* No Access Message */}
      {accessibleModules.length === 0 && (
        <Card className="text-center py-12">
          <CardContent>
            <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
            <CardTitle className="mb-2">No Modules Available</CardTitle>
            <CardDescription>
              You don't have permission to access any modules. Please contact your administrator to assign appropriate roles and permissions.
            </CardDescription>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function ModuleCardComponent({ module }: { module: ModuleCard }) {
  const Icon = module.icon;
  
  return (
    <Link href={module.href}>
      <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className={`p-2 rounded-lg ${module.color} text-white w-fit`}>
              <Icon className="h-6 w-6" />
            </div>
            <Badge variant="outline" className="text-xs">
              {module.level.toUpperCase()}
            </Badge>
          </div>
          <CardTitle className="text-lg">{module.title}</CardTitle>
          <CardDescription className="text-sm">
            {module.description}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" className="w-full">
            Access Module
          </Button>
        </CardContent>
      </Card>
    </Link>
  );
}