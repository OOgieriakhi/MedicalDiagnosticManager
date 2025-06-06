import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Grid } from "@/components/ui/grid";
import { 
  Users, TestTube, Activity, Package, DollarSign, Shield, 
  FileText, Stethoscope, Pill, Building, Settings, UserCheck,
  TrendingUp, ClipboardList, Calendar, BarChart3, Home,
  AlertTriangle, CheckCircle, Clock, Eye
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { usePermissions } from "@/components/PermissionGuard";
import { PERMISSIONS, ROLE_TEMPLATES, getUserRoleInfo } from "@/lib/rbac-utils";

interface ModuleCard {
  title: string;
  description: string;
  icon: any;
  href: string;
  permissions: any[];
  color: string;
  level: 'basic' | 'advanced' | 'admin';
}

const MODULE_CARDS: ModuleCard[] = [
  {
    title: "Patient Management",
    description: "Patient intake, registration, and records management",
    icon: Users,
    href: "/patient-management",
    permissions: [PERMISSIONS.PATIENT_VIEW],
    color: "bg-blue-500",
    level: 'basic'
  },
  {
    title: "Laboratory Management",
    description: "Test processing, results, and quality control",
    icon: TestTube,
    href: "/laboratory-management",
    permissions: [PERMISSIONS.LAB_VIEW_TESTS],
    color: "bg-green-500",
    level: 'basic'
  },
  {
    title: "Radiology Department",
    description: "Imaging services and radiological examinations",
    icon: Activity,
    href: "/radiology-management",
    permissions: [PERMISSIONS.RADIOLOGY_VIEW],
    color: "bg-purple-500",
    level: 'basic'
  },
  {
    title: "Pharmacy Operations",
    description: "Medication dispensing and inventory management",
    icon: Pill,
    href: "/pharmacy-management",
    permissions: [PERMISSIONS.PHARMACY_VIEW],
    color: "bg-orange-500",
    level: 'basic'
  },
  {
    title: "Inventory Dashboard",
    description: "Real-time stock tracking and consumption monitoring",
    icon: Package,
    href: "/inventory-dashboard",
    permissions: [PERMISSIONS.INVENTORY_VIEW],
    color: "bg-teal-500",
    level: 'advanced'
  },
  {
    title: "Financial Management",
    description: "Billing, payments, and financial reporting",
    icon: DollarSign,
    href: "/financial-management",
    permissions: [PERMISSIONS.FINANCE_VIEW],
    color: "bg-yellow-500",
    level: 'basic'
  },
  {
    title: "Purchase Orders",
    description: "Procurement and supplier management",
    icon: ClipboardList,
    href: "/purchase-orders",
    permissions: [PERMISSIONS.INVENTORY_PURCHASE],
    color: "bg-indigo-500",
    level: 'advanced'
  },
  {
    title: "Accounting Dashboard",
    description: "Chart of accounts and financial analytics",
    icon: BarChart3,
    href: "/accounting-dashboard",
    permissions: [PERMISSIONS.FINANCE_ACCOUNTING],
    color: "bg-red-500",
    level: 'advanced'
  },
  {
    title: "Quality Assurance",
    description: "Quality control and compliance monitoring",
    icon: Shield,
    href: "/quality-assurance",
    permissions: [PERMISSIONS.QA_VIEW],
    color: "bg-emerald-500",
    level: 'advanced'
  },
  {
    title: "Role Management",
    description: "User roles and permission administration",
    icon: UserCheck,
    href: "/role-management",
    permissions: [PERMISSIONS.ADMIN_ROLE_MANAGEMENT],
    color: "bg-gray-500",
    level: 'admin'
  },
  {
    title: "System Administration",
    description: "System configuration and management",
    icon: Settings,
    href: "/administrative-management",
    permissions: [PERMISSIONS.ADMIN_SYSTEM_CONFIG],
    color: "bg-slate-500",
    level: 'admin'
  },
  {
    title: "Security Audit",
    description: "Security monitoring and audit trails",
    icon: Eye,
    href: "/security-audit",
    permissions: [PERMISSIONS.ADMIN_AUDIT_LOGS],
    color: "bg-cyan-500",
    level: 'admin'
  }
];

export default function RoleBasedDashboard() {
  const { user } = useAuth();
  const { hasAnyPermission, canAccessModule } = usePermissions();

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

  // Get user role information
  const userPermissions = user.permissions || [];
  const { role, level } = getUserRoleInfo(userPermissions);

  // Filter modules based on user permissions
  const accessibleModules = MODULE_CARDS.filter(module => 
    hasAnyPermission(module.permissions)
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
            {role && (
              <Badge variant="outline">
                {role.name}
              </Badge>
            )}
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
              {userPermissions.length} permissions granted
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
              {['patients', 'laboratory', 'radiology', 'pharmacy', 'finance'].filter(dept => 
                canAccessModule(dept)
              ).length}
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
            <div className="text-2xl font-bold">
              {role ? 'Assigned' : 'Custom'}
            </div>
            <p className="text-xs text-muted-foreground">
              {role?.description || 'Custom role configuration'}
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