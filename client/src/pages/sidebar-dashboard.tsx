import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  Users, TestTube, Activity, Package, DollarSign, Shield, 
  FileText, Stethoscope, Pill, Building, Settings, UserCheck,
  TrendingUp, ClipboardList, Calendar, BarChart3, Home,
  AlertTriangle, CheckCircle, Clock, Eye, Menu, X,
  ChevronRight, LogOut, Waves, Heart, Calculator, Crown
} from "lucide-react";


interface SidebarModule {
  title: string;
  description: string;
  icon: any;
  href: string;
  allowedRoles: string[];
  level: 'BASIC' | 'ADVANCED' | 'ADMIN';
  category: 'core' | 'operations' | 'management' | 'admin';
}

const SIDEBAR_MODULES: SidebarModule[] = [
  // Core Operations
  {
    title: "Patient Management",
    description: "Patient intake, registration, and records management",
    icon: Users,
    href: "/patient-management",
    allowedRoles: ['admin', 'doctor', 'nurse', 'receptionist', 'cashier', 'radiologist', 'pharmacist', 'branch_manager'],
    level: 'BASIC',
    category: 'core'
  },
  {
    title: "Laboratory Management",
    description: "Test processing, results, and quality control",
    icon: TestTube,
    href: "/laboratory-management",
    allowedRoles: ['admin', 'doctor', 'nurse', 'lab_technician', 'lab_supervisor', 'pathologist', 'branch_manager'],
    level: 'BASIC',
    category: 'core'
  },
  {
    title: "Radiology Department",
    description: "Imaging services and radiological examinations",
    icon: Activity,
    href: "/radiology-management",
    allowedRoles: ['admin', 'doctor', 'radiologist', 'branch_manager'],
    level: 'BASIC',
    category: 'core'
  },
  {
    title: "Ultrasound Department",
    description: "Diagnostic imaging and ultrasound studies management",
    icon: Waves,
    href: "/ultrasound-dashboard",
    allowedRoles: ['admin', 'doctor', 'radiologist', 'ultrasound_technician', 'branch_manager'],
    level: 'BASIC',
    category: 'core'
  },
  {
    title: "Cardiology Department",
    description: "Cardiac diagnostics and monitoring services",
    icon: Heart,
    href: "/cardiology-dashboard",
    allowedRoles: ['admin', 'doctor', 'cardiologist', 'cardiac_technician', 'branch_manager'],
    level: 'BASIC',
    category: 'core'
  },
  {
    title: "Accountant Dashboard",
    description: "Financial accounting and expense management",
    icon: Calculator,
    href: "/accounting-dashboard",
    allowedRoles: ['admin', 'accountant', 'finance_director', 'branch_manager'],
    level: 'BASIC',
    category: 'core'
  },
  {
    title: "CEO Dashboard",
    description: "Executive overview and strategic insights",
    icon: Crown,
    href: "/ceo-dashboard",
    allowedRoles: ['admin', 'ceo', 'branch_manager'],
    level: 'ADVANCED',
    category: 'core'
  },
  {
    title: "Finance Director Dashboard",
    description: "Financial oversight and budget management",
    icon: TrendingUp,
    href: "/finance-director-dashboard",
    allowedRoles: ['admin', 'finance_director', 'ceo', 'branch_manager'],
    level: 'ADVANCED',
    category: 'core'
  },
  // Operations
  {
    title: "Inventory Dashboard",
    description: "Real-time stock tracking and consumption monitoring",
    icon: Package,
    href: "/inventory-dashboard",
    allowedRoles: ['admin', 'lab_technician', 'lab_supervisor', 'pharmacist', 'procurement_officer', 'accountant', 'branch_manager'],
    level: 'ADVANCED',
    category: 'operations'
  },
  {
    title: "Financial Management",
    description: "Billing, payments, and financial reporting",
    icon: DollarSign,
    href: "/financial-management",
    allowedRoles: ['admin', 'cashier', 'accountant', 'procurement_officer', 'branch_manager'],
    level: 'BASIC',
    category: 'operations'
  },
  {
    title: "Purchase Orders",
    description: "Procurement and supplier management",
    icon: ClipboardList,
    href: "/purchase-orders",
    allowedRoles: ['admin', 'procurement_officer', 'accountant', 'branch_manager'],
    level: 'ADVANCED',
    category: 'operations'
  },
  {
    title: "Pharmacy Operations",
    description: "Medication dispensing and inventory management",
    icon: Pill,
    href: "/pharmacy-management",
    allowedRoles: ['admin', 'pharmacist', 'branch_manager'],
    level: 'BASIC',
    category: 'operations'
  },
  // Management
  {
    title: "Quality Control",
    description: "Quality assurance and control measures",
    icon: Shield,
    href: "/quality-control",
    allowedRoles: ['admin', 'lab_supervisor', 'pathologist', 'branch_manager'],
    level: 'ADVANCED',
    category: 'management'
  },
  {
    title: "Staff Recognition",
    description: "Employee achievement and performance tracking",
    icon: UserCheck,
    href: "/staff-recognition",
    allowedRoles: ['admin', 'branch_manager'],
    level: 'ADVANCED',
    category: 'management'
  },
  {
    title: "Center Manager Dashboard",
    description: "Comprehensive management oversight and approval workflows",
    icon: Crown,
    href: "/center-manager-dashboard",
    allowedRoles: ['admin', 'branch_manager'],
    level: 'ADMIN',
    category: 'management'
  },
  {
    title: "Analytics & Reports",
    description: "Business intelligence and reporting tools",
    icon: BarChart3,
    href: "/analytics",
    allowedRoles: ['admin', 'branch_manager', 'accountant'],
    level: 'ADVANCED',
    category: 'management'
  },
  {
    title: "Revenue Reports",
    description: "Comprehensive revenue analysis and ERP reporting",
    icon: TrendingUp,
    href: "/revenue-reports",
    allowedRoles: ['admin', 'branch_manager', 'accountant'],
    level: 'ADVANCED',
    category: 'management'
  },
  // Admin
  {
    title: "System Administration",
    description: "User management and system configuration",
    icon: Settings,
    href: "/admin",
    allowedRoles: ['admin'],
    level: 'ADMIN',
    category: 'admin'
  }
];

export default function SidebarDashboard() {
  const { user, logoutMutation } = useAuth();
  const [location] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const getAccessibleModules = () => {
    return SIDEBAR_MODULES.filter(module => 
      module.allowedRoles.includes(user?.role || '') || user?.role === 'admin'
    );
  };

  const getModulesByCategory = (category: string) => {
    return getAccessibleModules().filter(module => module.category === category);
  };

  const getTotalModulesCount = () => {
    return SIDEBAR_MODULES.length;
  };

  const getAccessibleModulesCount = () => {
    return getAccessibleModules().length;
  };

  const getDepartmentAccessCount = () => {
    const categories = Array.from(new Set(getAccessibleModules().map(m => m.category)));
    return categories.length;
  };

  const getLevelBadgeColor = (level: string) => {
    switch(level) {
      case 'BASIC': return 'bg-green-100 text-green-800';
      case 'ADVANCED': return 'bg-blue-100 text-blue-800';
      case 'ADMIN': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch(category) {
      case 'core': return CheckCircle;
      case 'operations': return TrendingUp;
      case 'management': return BarChart3;
      case 'admin': return Shield;
      default: return Home;
    }
  };

  const renderSidebar = () => (
    <div className={`${sidebarOpen ? 'w-80' : 'w-16'} bg-white border-r border-gray-200 transition-all duration-300 flex flex-col`}>
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          {sidebarOpen && (
            <div>
              <h1 className="text-xl font-bold text-gray-900">Medical ERP</h1>
              <p className="text-sm text-gray-600">Diagnostic Center</p>
            </div>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2"
          >
            {sidebarOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Core Operations */}
        <div>
          {sidebarOpen && (
            <div className="flex items-center space-x-2 mb-3">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <h3 className="font-semibold text-gray-900">Core Operations</h3>
            </div>
          )}
          <div className="space-y-2">
            {getModulesByCategory('core').map((module) => (
              <Link key={module.href} href={module.href}>
                <Button
                  variant="ghost"
                  className={`w-full justify-start text-left h-auto p-3 ${
                    location === module.href ? 'bg-blue-50 text-blue-700 border-l-4 border-blue-600' : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <module.icon className={`h-5 w-5 ${sidebarOpen ? 'mr-3' : ''} flex-shrink-0`} />
                  {sidebarOpen && (
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-medium truncate">{module.title}</span>
                        <Badge className={`text-xs ${getLevelBadgeColor(module.level)}`}>
                          {module.level}
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-500 truncate mt-1">{module.description}</p>
                    </div>
                  )}
                </Button>
              </Link>
            ))}
          </div>
        </div>

        {/* Operations */}
        {getModulesByCategory('operations').length > 0 && (
          <div>
            {sidebarOpen && (
              <div className="flex items-center space-x-2 mb-3">
                <TrendingUp className="h-5 w-5 text-blue-600" />
                <h3 className="font-semibold text-gray-900">Operations</h3>
              </div>
            )}
            <div className="space-y-2">
              {getModulesByCategory('operations').map((module) => (
                <Link key={module.href} href={module.href}>
                  <Button
                    variant="ghost"
                    className={`w-full justify-start text-left h-auto p-3 ${
                      location === module.href ? 'bg-blue-50 text-blue-700 border-l-4 border-blue-600' : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <module.icon className={`h-5 w-5 ${sidebarOpen ? 'mr-3' : ''} flex-shrink-0`} />
                    {sidebarOpen && (
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="font-medium truncate">{module.title}</span>
                          <Badge className={`text-xs ${getLevelBadgeColor(module.level)}`}>
                            {module.level}
                          </Badge>
                        </div>
                        <p className="text-xs text-gray-500 truncate mt-1">{module.description}</p>
                      </div>
                    )}
                  </Button>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Management */}
        {getModulesByCategory('management').length > 0 && (
          <div>
            {sidebarOpen && (
              <div className="flex items-center space-x-2 mb-3">
                <BarChart3 className="h-5 w-5 text-purple-600" />
                <h3 className="font-semibold text-gray-900">Management</h3>
              </div>
            )}
            <div className="space-y-2">
              {getModulesByCategory('management').map((module) => (
                <Link key={module.href} href={module.href}>
                  <Button
                    variant="ghost"
                    className={`w-full justify-start text-left h-auto p-3 ${
                      location === module.href ? 'bg-blue-50 text-blue-700 border-l-4 border-blue-600' : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <module.icon className={`h-5 w-5 ${sidebarOpen ? 'mr-3' : ''} flex-shrink-0`} />
                    {sidebarOpen && (
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="font-medium truncate">{module.title}</span>
                          <Badge className={`text-xs ${getLevelBadgeColor(module.level)}`}>
                            {module.level}
                          </Badge>
                        </div>
                        <p className="text-xs text-gray-500 truncate mt-1">{module.description}</p>
                      </div>
                    )}
                  </Button>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Admin */}
        {getModulesByCategory('admin').length > 0 && (
          <div>
            {sidebarOpen && (
              <div className="flex items-center space-x-2 mb-3">
                <Shield className="h-5 w-5 text-red-600" />
                <h3 className="font-semibold text-gray-900">Administration</h3>
              </div>
            )}
            <div className="space-y-2">
              {getModulesByCategory('admin').map((module) => (
                <Link key={module.href} href={module.href}>
                  <Button
                    variant="ghost"
                    className={`w-full justify-start text-left h-auto p-3 ${
                      location === module.href ? 'bg-blue-50 text-blue-700 border-l-4 border-blue-600' : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <module.icon className={`h-5 w-5 ${sidebarOpen ? 'mr-3' : ''} flex-shrink-0`} />
                    {sidebarOpen && (
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="font-medium truncate">{module.title}</span>
                          <Badge className={`text-xs ${getLevelBadgeColor(module.level)}`}>
                            {module.level}
                          </Badge>
                        </div>
                        <p className="text-xs text-gray-500 truncate mt-1">{module.description}</p>
                      </div>
                    )}
                  </Button>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200">
        {sidebarOpen ? (
          <div className="flex items-center space-x-3">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-blue-100 text-blue-700 text-sm">
                {user?.firstName?.[0]}{user?.lastName?.[0]}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-xs text-gray-500 truncate capitalize">{user?.role}</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => logoutMutation.mutate()} className="p-2">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div className="flex flex-col space-y-2">
            <Avatar className="h-8 w-8 mx-auto">
              <AvatarFallback className="bg-blue-100 text-blue-700 text-sm">
                {user?.firstName?.[0]}{user?.lastName?.[0]}
              </AvatarFallback>
            </Avatar>
            <Button variant="ghost" size="sm" onClick={() => logoutMutation.mutate()} className="p-2 mx-auto">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      {renderSidebar()}
      
      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Medical ERP Dashboard</h1>
              <p className="text-gray-600">Comprehensive medical diagnostic center management system</p>
            </div>
            <div className="flex items-center space-x-3">
              <Badge className="bg-red-100 text-red-800">ADMIN ACCESS</Badge>
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">System Administrator</p>
                <p className="text-xs text-gray-500">Welcome, System</p>
              </div>
            </div>
          </div>
        </div>

        {/* Dashboard Content */}
        <div className="p-6 overflow-y-auto">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Accessible Modules</CardTitle>
                <CheckCircle className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{getAccessibleModulesCount()}</div>
                <p className="text-xs text-muted-foreground">
                  out of {getTotalModulesCount()} total modules
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Access Level</CardTitle>
                <Shield className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold capitalize">{user?.role || 'Admin'}</div>
                <p className="text-xs text-muted-foreground">
                  Role-based permissions
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Department Access</CardTitle>
                <Building className="h-4 w-4 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{getDepartmentAccessCount()}</div>
                <p className="text-xs text-muted-foreground">
                  departments available
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Role Status</CardTitle>
                <UserCheck className="h-4 w-4 text-orange-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">Active</div>
                <p className="text-xs text-muted-foreground">
                  System Administrator role assigned
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Module Categories */}
          <div className="space-y-8">
            {/* Core Operations */}
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <CheckCircle className="h-6 w-6 text-green-600" />
                <h2 className="text-xl font-semibold text-gray-900">Core Operations</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {getModulesByCategory('core').map((module) => (
                  <Card key={module.href} className="hover:shadow-lg transition-shadow cursor-pointer">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className={`p-2 rounded-lg bg-${module.level === 'BASIC' ? 'blue' : module.level === 'ADVANCED' ? 'purple' : 'red'}-100`}>
                            <module.icon className={`h-6 w-6 text-${module.level === 'BASIC' ? 'blue' : module.level === 'ADVANCED' ? 'purple' : 'red'}-600`} />
                          </div>
                          <div>
                            <CardTitle className="text-lg">{module.title}</CardTitle>
                            <CardDescription>{module.description}</CardDescription>
                          </div>
                        </div>
                        <Badge className={`${getLevelBadgeColor(module.level)}`}>
                          {module.level}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <Link href={module.href}>
                        <Button className="w-full">
                          Access Module
                          <ChevronRight className="ml-2 h-4 w-4" />
                        </Button>
                      </Link>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Operations */}
            {getModulesByCategory('operations').length > 0 && (
              <div>
                <div className="flex items-center space-x-2 mb-4">
                  <TrendingUp className="h-6 w-6 text-blue-600" />
                  <h2 className="text-xl font-semibold text-gray-900">Operations</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {getModulesByCategory('operations').map((module) => (
                    <Card key={module.href} className="hover:shadow-lg transition-shadow cursor-pointer">
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className={`p-2 rounded-lg bg-${module.level === 'BASIC' ? 'blue' : module.level === 'ADVANCED' ? 'purple' : 'red'}-100`}>
                              <module.icon className={`h-6 w-6 text-${module.level === 'BASIC' ? 'blue' : module.level === 'ADVANCED' ? 'purple' : 'red'}-600`} />
                            </div>
                            <div>
                              <CardTitle className="text-lg">{module.title}</CardTitle>
                              <CardDescription>{module.description}</CardDescription>
                            </div>
                          </div>
                          <Badge className={`${getLevelBadgeColor(module.level)}`}>
                            {module.level}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <Link href={module.href}>
                          <Button className="w-full">
                            Access Module
                            <ChevronRight className="ml-2 h-4 w-4" />
                          </Button>
                        </Link>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Management */}
            {getModulesByCategory('management').length > 0 && (
              <div>
                <div className="flex items-center space-x-2 mb-4">
                  <BarChart3 className="h-6 w-6 text-purple-600" />
                  <h2 className="text-xl font-semibold text-gray-900">Management</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {getModulesByCategory('management').map((module) => (
                    <Card key={module.href} className="hover:shadow-lg transition-shadow cursor-pointer">
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className={`p-2 rounded-lg bg-${module.level === 'BASIC' ? 'blue' : module.level === 'ADVANCED' ? 'purple' : 'red'}-100`}>
                              <module.icon className={`h-6 w-6 text-${module.level === 'BASIC' ? 'blue' : module.level === 'ADVANCED' ? 'purple' : 'red'}-600`} />
                            </div>
                            <div>
                              <CardTitle className="text-lg">{module.title}</CardTitle>
                              <CardDescription>{module.description}</CardDescription>
                            </div>
                          </div>
                          <Badge className={`${getLevelBadgeColor(module.level)}`}>
                            {module.level}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <Link href={module.href}>
                          <Button className="w-full">
                            Access Module
                            <ChevronRight className="ml-2 h-4 w-4" />
                          </Button>
                        </Link>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Administration */}
            {getModulesByCategory('admin').length > 0 && (
              <div>
                <div className="flex items-center space-x-2 mb-4">
                  <Shield className="h-6 w-6 text-red-600" />
                  <h2 className="text-xl font-semibold text-gray-900">Administration</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {getModulesByCategory('admin').map((module) => (
                    <Card key={module.href} className="hover:shadow-lg transition-shadow cursor-pointer">
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className={`p-2 rounded-lg bg-${module.level === 'BASIC' ? 'blue' : module.level === 'ADVANCED' ? 'purple' : 'red'}-100`}>
                              <module.icon className={`h-6 w-6 text-${module.level === 'BASIC' ? 'blue' : module.level === 'ADVANCED' ? 'purple' : 'red'}-600`} />
                            </div>
                            <div>
                              <CardTitle className="text-lg">{module.title}</CardTitle>
                              <CardDescription>{module.description}</CardDescription>
                            </div>
                          </div>
                          <Badge className={`${getLevelBadgeColor(module.level)}`}>
                            {module.level}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <Link href={module.href}>
                          <Button className="w-full">
                            Access Module
                            <ChevronRight className="ml-2 h-4 w-4" />
                          </Button>
                        </Link>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}