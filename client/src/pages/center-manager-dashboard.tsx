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
}

export default function CenterManagerDashboard() {
  const { user } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

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
      pendingItems: 3
    },
    {
      title: "Accounting Dashboard",
      description: "Complete financial accounting tools and reports",
      icon: Calculator,
      href: "/accounting-dashboard",
      category: 'financial',
      priority: 'high'
    },
    {
      title: "Income Verification",
      description: "Verify and approve income entries",
      icon: Eye,
      href: "/income-verification",
      category: 'financial',
      priority: 'high',
      pendingItems: 6
    },
    {
      title: "Purchase Order Approvals",
      description: "Review and approve purchase orders",
      icon: ClipboardList,
      href: "/purchase-order-approvals",
      category: 'financial',
      priority: 'high',
      pendingItems: 4
    },
    {
      title: "Petty Cash Management",
      description: "Approve petty cash requests and transactions",
      icon: Banknote,
      href: "/petty-cash",
      category: 'financial',
      priority: 'medium',
      pendingItems: 2
    },
    {
      title: "Bank Reconciliation",
      description: "Monthly bank statement reconciliation",
      icon: CreditCard,
      href: "/bank-reconciliation",
      category: 'financial',
      priority: 'medium'
    },
    {
      title: "Cash Flow Analysis",
      description: "Monitor cash flow and liquidity",
      icon: TrendingUp,
      href: "/cash-flow",
      category: 'financial',
      priority: 'medium'
    },

    // Operational Management
    {
      title: "Inventory Management",
      description: "Monitor stock levels and approve requisitions",
      icon: Package,
      href: "/inventory-dashboard",
      category: 'operational',
      priority: 'high'
    },
    {
      title: "Patient Management",
      description: "Oversee patient flow and services",
      icon: Users,
      href: "/patient-management",
      category: 'operational',
      priority: 'high'
    },
    {
      title: "Laboratory Operations",
      description: "Monitor lab performance and quality",
      icon: Activity,
      href: "/laboratory-management",
      category: 'operational',
      priority: 'high'
    },
    {
      title: "Radiology Services",
      description: "Oversee radiology department operations",
      icon: Target,
      href: "/radiology-management",
      category: 'operational',
      priority: 'medium'
    },
    {
      title: "Pharmacy Operations",
      description: "Monitor pharmacy inventory and sales",
      icon: Receipt,
      href: "/pharmacy-management",
      category: 'operational',
      priority: 'medium'
    },
    {
      title: "Quality Assurance",
      description: "Monitor service quality and compliance",
      icon: Shield,
      href: "/quality-assurance",
      category: 'operational',
      priority: 'medium'
    },

    // Staff Management
    {
      title: "Human Resources",
      description: "Staff management and HR processes",
      icon: Users,
      href: "/human-resources",
      category: 'staff',
      priority: 'high'
    },
    {
      title: "Role Management",
      description: "Manage user roles and permissions",
      icon: Settings,
      href: "/role-management",
      category: 'staff',
      priority: 'medium'
    },
    {
      title: "Staff Recognition",
      description: "Employee performance and recognition",
      icon: Users,
      href: "/staff-recognition",
      category: 'staff',
      priority: 'low'
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

    // Security & Compliance
    {
      title: "Security Audit",
      description: "Security monitoring and audit trails",
      icon: Shield,
      href: "/security-audit",
      category: 'security',
      priority: 'high'
    },
    {
      title: "Access Control",
      description: "Monitor user access and permissions",
      icon: Lock,
      href: "/role-management",
      category: 'security',
      priority: 'medium'
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
                  .map((module) => (
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
                  ))}
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
              {getModulesByCategory(category).map((module) => (
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
              ))}
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
            <Link href="/security-audit">
              <Button variant="outline" className="w-full justify-start">
                <Shield className="w-4 h-4 mr-2" />
                Security Check
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}