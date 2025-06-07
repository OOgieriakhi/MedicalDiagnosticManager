import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/use-auth";
import { Link } from "wouter";
import { 
  Building2, 
  Users, 
  DollarSign, 
  FileText, 
  Clock, 
  CheckCircle, 
  AlertTriangle, 
  TrendingUp, 
  BarChart3, 
  Settings, 
  Shield, 
  Package,
  Calendar,
  MessageSquare,
  PieChart,
  Calculator,
  CreditCard,
  Banknote,
  Receipt,
  ClipboardList,
  Eye,
  Lock,
  Activity,
  Target,
  Workflow
} from "lucide-react";

interface ManagerMetrics {
  pendingApprovals: number;
  approvedToday: number;
  totalStaff: number;
  monthlyRevenue: string;
  dailyPatients: number;
  operationalEfficiency: number;
  pendingTasks: number;
  criticalAlerts: number;
}

interface ManagementModule {
  title: string;
  description: string;
  icon: any;
  href: string;
  category: 'financial' | 'operational' | 'staff' | 'reporting' | 'security';
  priority: 'high' | 'medium' | 'low';
  requiresApproval?: boolean;
  pendingItems?: number;
  ceoOnly?: boolean;
  allowedRoles: string[];
  managerOverride?: boolean; // Manager can access regardless of role restrictions
}

export default function CenterManagerDashboard() {
  const { user } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Role-based access control
  const hasManagerAccess = user?.role === 'admin' || user?.role === 'branch_manager' || user?.role === 'center_manager';
  const hasAccountantAccess = user?.role === 'accountant' || user?.role === 'accounts_officer';
  
  // Redirect if user doesn't have manager-level access
  if (!hasManagerAccess) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-6 text-center">
            <Shield className="w-12 h-12 text-red-600 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-red-800 mb-2">Access Restricted</h2>
            <p className="text-red-700">
              This dashboard requires manager-level authorization. Your current role ({user?.role}) does not have sufficient privileges.
            </p>
            <p className="text-sm text-red-600 mt-2">
              Please contact your system administrator or center manager for access.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleCeoOnlyClick = (moduleName: string) => {
    alert(`Access Restricted: ${moduleName} requires CEO-level authorization. Please contact the Chief Executive Officer for access.`);
  };

  const handleRestrictedAccess = (moduleName: string, requiredRole: string) => {
    alert(`Access Restricted: ${moduleName} requires ${requiredRole} privileges. Contact your administrator for proper role assignment.`);
  };

  const hasModuleAccess = (module: ManagementModule) => {
    if (module.ceoOnly) return false;
    if (module.managerOverride && hasManagerAccess) return true;
    return module.allowedRoles.includes(user?.role || '');
  };

  // Fetch manager metrics
  const { data: metrics } = useQuery<ManagerMetrics>({
    queryKey: ["/api/manager/metrics"],
    queryFn: async () => {
      // Mock data for demonstration
      return {
        pendingApprovals: 3,
        approvedToday: 12,
        totalStaff: 45,
        monthlyRevenue: "₦15,240,000",
        dailyPatients: 127,
        operationalEfficiency: 94,
        pendingTasks: 8,
        criticalAlerts: 2
      };
    },
  });

  // Management modules configuration
  const managementModules: ManagementModule[] = [
    // Financial Management
    {
      title: "Daily Summary Approvals",
      description: "Review and approve daily income/expense summaries",
      icon: CheckCircle,
      href: "/daily-summary-management",
      category: 'financial',
      priority: 'high',
      requiresApproval: true,
      pendingItems: 3,
      allowedRoles: ['admin', 'center_manager', 'branch_manager'],
      managerOverride: true
    },
    {
      title: "Accounting Dashboard",
      description: "Complete financial accounting tools and reports",
      icon: Calculator,
      href: "/accounting-dashboard",
      category: 'financial',
      priority: 'high',
      allowedRoles: ['admin', 'center_manager', 'branch_manager']
    },
    {
      title: "Income Verification",
      description: "Verify and approve income entries",
      icon: Eye,
      href: "/income-verification",
      category: 'financial',
      priority: 'high',
      pendingItems: 6,
      allowedRoles: ['admin', 'center_manager', 'branch_manager'],
      managerOverride: true
    },
    {
      title: "Purchase Order Approvals",
      description: "Review and approve purchase orders",
      icon: ClipboardList,
      href: "/purchase-order-approvals",
      category: 'financial',
      priority: 'high',
      pendingItems: 4,
      allowedRoles: ['admin', 'center_manager', 'branch_manager'],
      managerOverride: true
    },
    {
      title: "Petty Cash Management",
      description: "Approve petty cash requests and transactions",
      icon: Banknote,
      href: "/petty-cash",
      category: 'financial',
      priority: 'medium',
      pendingItems: 2,
      allowedRoles: ['admin', 'center_manager', 'branch_manager'],
      managerOverride: true
    },
    {
      title: "Bank Reconciliation",
      description: "Monthly bank statement reconciliation",
      icon: CreditCard,
      href: "/bank-reconciliation",
      category: 'financial',
      priority: 'medium',
      allowedRoles: ['admin', 'center_manager', 'branch_manager', 'accountant']
    },
    {
      title: "Cash Flow Analysis",
      description: "Monitor cash flow and liquidity",
      icon: TrendingUp,
      href: "/cash-flow",
      category: 'financial',
      priority: 'medium',
      allowedRoles: ['admin', 'center_manager', 'branch_manager']
    },

    // Operational Management
    {
      title: "Inventory Management",
      description: "Monitor stock levels and approve requisitions",
      icon: Package,
      href: "/inventory-dashboard",
      category: 'operational',
      priority: 'high',
      allowedRoles: ['admin', 'center_manager', 'branch_manager'],
      managerOverride: true
    },
    {
      title: "Patient Management",
      description: "Oversee patient flow and services",
      icon: Users,
      href: "/patient-management",
      category: 'operational',
      priority: 'high',
      allowedRoles: ['admin', 'center_manager', 'branch_manager', 'doctor', 'nurse']
    },
    {
      title: "Laboratory Operations",
      description: "Monitor lab performance and quality",
      icon: Activity,
      href: "/laboratory-management",
      category: 'operational',
      priority: 'high',
      allowedRoles: ['admin', 'center_manager', 'branch_manager', 'lab_tech']
    },
    {
      title: "Radiology Services",
      description: "Oversee radiology department operations",
      icon: Target,
      href: "/radiology-management",
      category: 'operational',
      priority: 'medium',
      allowedRoles: ['admin', 'center_manager', 'branch_manager', 'radiologist']
    },
    {
      title: "Pharmacy Operations",
      description: "Monitor pharmacy inventory and sales",
      icon: Receipt,
      href: "/pharmacy-management",
      category: 'operational',
      priority: 'medium',
      allowedRoles: ['admin', 'center_manager', 'branch_manager', 'pharmacist']
    },
    {
      title: "Quality Assurance",
      description: "Monitor service quality and compliance",
      icon: Shield,
      href: "/quality-assurance",
      category: 'operational',
      priority: 'medium',
      allowedRoles: ['admin', 'center_manager', 'branch_manager'],
      managerOverride: true
    },

    // Staff Management
    {
      title: "Human Resources",
      description: "Staff management and HR processes",
      icon: Users,
      href: "/human-resources",
      category: 'staff',
      priority: 'high',
      allowedRoles: ['admin', 'center_manager', 'branch_manager', 'hr_manager'],
      managerOverride: true
    },
    {
      title: "Role Management",
      description: "Manage user roles and permissions",
      icon: Settings,
      href: "/role-management",
      category: 'staff',
      priority: 'medium',
      allowedRoles: ['admin', 'center_manager', 'branch_manager'],
      managerOverride: true
    },
    {
      title: "Staff Recognition",
      description: "Employee performance and recognition",
      icon: Users,
      href: "/staff-recognition",
      category: 'staff',
      priority: 'low',
      allowedRoles: ['admin', 'center_manager', 'branch_manager', 'hr_manager']
    },

    // Reporting & Analytics
    {
      title: "Revenue Forecasting",
      description: "Predictive revenue analysis and forecasting",
      icon: BarChart3,
      href: "/enhanced-forecasting",
      category: 'reporting',
      priority: 'high'
    },
    {
      title: "Financial Reports",
      description: "Comprehensive financial reporting suite",
      icon: PieChart,
      href: "/comprehensive-financial",
      category: 'reporting',
      priority: 'high'
    },
    {
      title: "Transaction Verification",
      description: "Monitor and verify all transactions",
      icon: Eye,
      href: "/transaction-verification",
      category: 'reporting',
      priority: 'medium'
    },
    {
      title: "Approval Tracking",
      description: "Track all approval processes and workflows",
      icon: Workflow,
      href: "/approval-tracking",
      category: 'reporting',
      priority: 'medium'
    },

    // Security & Compliance (CEO Level Access)
    {
      title: "Security Audit",
      description: "Security monitoring and audit trails (CEO Access Required)",
      icon: Shield,
      href: "#",
      category: 'security',
      priority: 'high',
      requiresApproval: true,
      pendingItems: 0,
      ceoOnly: true
    },
    {
      title: "Access Control",
      description: "Monitor user access and permissions (CEO Access Required)",
      icon: Lock,
      href: "#",
      category: 'security',
      priority: 'medium',
      requiresApproval: true,
      pendingItems: 0,
      ceoOnly: true
    }
  ];

  const filteredModules = selectedCategory === 'all' 
    ? managementModules 
    : managementModules.filter(module => module.category === selectedCategory);

  const getModulesByCategory = (category: string) => {
    return managementModules.filter(module => module.category === category);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'border-red-200 bg-red-50';
      case 'medium': return 'border-yellow-200 bg-yellow-50';
      case 'low': return 'border-green-200 bg-green-50';
      default: return 'border-gray-200 bg-gray-50';
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'high': return <Badge variant="destructive" className="text-xs">High</Badge>;
      case 'medium': return <Badge variant="outline" className="text-xs text-yellow-600">Medium</Badge>;
      case 'low': return <Badge variant="outline" className="text-xs text-green-600">Low</Badge>;
      default: return <Badge variant="outline" className="text-xs">Normal</Badge>;
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Building2 className="w-8 h-8 text-blue-600" />
            Center Manager Dashboard
          </h1>
          <p className="text-gray-600 mt-1">Welcome back, {user?.username}. Comprehensive management oversight and control.</p>
        </div>
        <div className="flex gap-2">
          <Badge variant="outline" className="text-blue-600">
            <Clock className="w-3 h-3 mr-1" />
            Manager Level Access
          </Badge>
        </div>
      </div>

      {/* Key Metrics */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="border-l-4 border-l-red-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Approvals</CardTitle>
              <AlertTriangle className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{metrics.pendingApprovals}</div>
              <p className="text-xs text-muted-foreground">
                Require immediate attention
              </p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-green-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Approved Today</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{metrics.approvedToday}</div>
              <p className="text-xs text-muted-foreground">
                Items processed today
              </p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-blue-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{metrics.monthlyRevenue}</div>
              <p className="text-xs text-muted-foreground">
                Current month performance
              </p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-purple-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Daily Patients</CardTitle>
              <Users className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">{metrics.dailyPatients}</div>
              <p className="text-xs text-muted-foreground">
                Patients served today
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Management Modules */}
      <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="all">All Modules</TabsTrigger>
          <TabsTrigger value="financial">Financial</TabsTrigger>
          <TabsTrigger value="operational">Operations</TabsTrigger>
          <TabsTrigger value="staff">Staff</TabsTrigger>
          <TabsTrigger value="reporting">Reports</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-6">
          {/* High Priority Items */}
          <Card>
            <CardHeader>
              <CardTitle className="text-red-600 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                High Priority Actions Required
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {managementModules
                  .filter(module => module.priority === 'high' && (module.pendingItems || module.requiresApproval))
                  .map((module) => {
                    if (module.ceoOnly) {
                      return (
                        <Card 
                          key={module.title} 
                          className={`cursor-pointer hover:shadow-md transition-shadow ${getPriorityColor(module.priority)} opacity-60 relative`}
                          onClick={() => handleCeoOnlyClick(module.title)}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between">
                              <div className="flex items-center gap-3">
                                <module.icon className="w-5 h-5 text-red-600" />
                                <div>
                                  <h3 className="font-medium">{module.title}</h3>
                                  <p className="text-xs text-gray-600 mt-1">{module.description}</p>
                                </div>
                              </div>
                              <div className="flex flex-col items-end gap-1">
                                <Badge variant="outline" className="text-xs bg-yellow-100 text-yellow-800 border-yellow-300">
                                  <Lock className="w-3 h-3 mr-1" />
                                  CEO Only
                                </Badge>
                                {module.pendingItems && (
                                  <Badge variant="destructive" className="text-xs">
                                    {module.pendingItems}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    }
                    
                    return (
                      <Link key={module.title} href={module.href}>
                        <Card className={`cursor-pointer hover:shadow-md transition-shadow ${getPriorityColor(module.priority)}`}>
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between">
                              <div className="flex items-center gap-3">
                                <module.icon className="w-5 h-5 text-red-600" />
                                <div>
                                  <h3 className="font-medium">{module.title}</h3>
                                  <p className="text-xs text-gray-600 mt-1">{module.description}</p>
                                </div>
                              </div>
                              {module.pendingItems && (
                                <Badge variant="destructive" className="text-xs">
                                  {module.pendingItems}
                                </Badge>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      </Link>
                    );
                  })}
              </div>
            </CardContent>
          </Card>

          {/* All Modules by Category */}
          <div className="space-y-6">
            {['financial', 'operational', 'staff', 'reporting', 'security'].map((category) => (
              <Card key={category}>
                <CardHeader>
                  <CardTitle className="capitalize">{category} Management</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {getModulesByCategory(category).map((module) => (
                      <Link key={module.title} href={module.href}>
                        <Card className="cursor-pointer hover:shadow-md transition-shadow border-l-4 border-l-gray-300">
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between">
                              <div className="flex items-center gap-3">
                                <module.icon className="w-5 h-5 text-gray-600" />
                                <div>
                                  <h3 className="font-medium">{module.title}</h3>
                                  <p className="text-xs text-gray-600 mt-1">{module.description}</p>
                                </div>
                              </div>
                              <div className="flex flex-col items-end gap-1">
                                {getPriorityBadge(module.priority)}
                                {module.pendingItems && (
                                  <Badge variant="outline" className="text-xs">
                                    {module.pendingItems} pending
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </Link>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Category-specific tabs */}
        {['financial', 'operational', 'staff', 'reporting', 'security'].map((category) => (
          <TabsContent key={category} value={category}>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {getModulesByCategory(category).map((module) => {
                if (module.ceoOnly) {
                  return (
                    <Card 
                      key={module.title} 
                      className={`cursor-pointer hover:shadow-md transition-shadow ${getPriorityColor(module.priority)} opacity-60`}
                      onClick={() => handleCeoOnlyClick(module.title)}
                    >
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between mb-4">
                          <module.icon className="w-8 h-8 text-blue-600" />
                          <div className="flex flex-col items-end gap-1">
                            <Badge variant="outline" className="text-xs bg-yellow-100 text-yellow-800 border-yellow-300">
                              <Lock className="w-3 h-3 mr-1" />
                              CEO Only
                            </Badge>
                            {getPriorityBadge(module.priority)}
                            {module.pendingItems && (
                              <Badge variant="destructive" className="text-xs">
                                {module.pendingItems}
                              </Badge>
                            )}
                          </div>
                        </div>
                        <h3 className="font-medium text-lg mb-2">{module.title}</h3>
                        <p className="text-sm text-gray-600">{module.description}</p>
                        <div className="mt-3">
                          <Badge variant="outline" className="text-xs bg-red-100 text-red-800 border-red-300">
                            <Shield className="w-3 h-3 mr-1" />
                            Restricted Access
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  );
                }
                
                return (
                  <Link key={module.title} href={module.href}>
                    <Card className={`cursor-pointer hover:shadow-md transition-shadow ${getPriorityColor(module.priority)}`}>
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between mb-4">
                          <module.icon className="w-8 h-8 text-blue-600" />
                          <div className="flex flex-col items-end gap-1">
                            {getPriorityBadge(module.priority)}
                            {module.pendingItems && (
                              <Badge variant="destructive" className="text-xs">
                                {module.pendingItems}
                              </Badge>
                            )}
                          </div>
                        </div>
                        <h3 className="font-medium text-lg mb-2">{module.title}</h3>
                        <p className="text-sm text-gray-600">{module.description}</p>
                        {module.requiresApproval && (
                          <div className="mt-3">
                            <Badge variant="outline" className="text-xs">
                              <Lock className="w-3 h-3 mr-1" />
                              Approval Required
                            </Badge>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          </TabsContent>
        ))}
      </Tabs>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Manager Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Link href="/daily-summary-management">
              <Button variant="outline" className="w-full justify-start">
                <CheckCircle className="w-4 h-4 mr-2" />
                Approve Summaries
              </Button>
            </Link>
            <Link href="/purchase-order-approvals">
              <Button variant="outline" className="w-full justify-start">
                <ClipboardList className="w-4 h-4 mr-2" />
                Review Orders
              </Button>
            </Link>
            <Link href="/income-verification">
              <Button variant="outline" className="w-full justify-start">
                <Eye className="w-4 h-4 mr-2" />
                Verify Income
              </Button>
            </Link>
            <Link href="/approval-tracking">
              <Button variant="outline" className="w-full justify-start">
                <Workflow className="w-4 h-4 mr-2" />
                Track Approvals
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}