import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MessageNotification } from "@/components/message-notification";
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Users, 
  Building, 
  AlertTriangle,
  CheckCircle,
  Clock,
  Target,
  BarChart3,
  PieChart,
  Activity,
  Bell,
  Calendar,
  FileText,
  Settings,
  Eye,
  ArrowUp,
  ArrowDown,
  Zap,
  Shield,
  Briefcase,
  Star,
  Award,
  Globe,
  Heart,
  MessageSquare,
  Download,
  Filter,
  RefreshCw,
  Plus
} from "lucide-react";
import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";

interface DashboardMetrics {
  totalRevenue: string;
  monthlyGrowth: number;
  activePatients: number;
  pendingApprovals: number;
  criticalAlerts: number;
  branchPerformance: any[];
  revenueByService: any[];
  kpiMetrics: any[];
}

interface PendingApproval {
  id: number;
  type: string;
  description: string;
  amount?: string;
  requestedBy: string;
  urgency: 'high' | 'medium' | 'low';
  daysWaiting: number;
}

export default function CEODashboard() {
  const { user } = useAuth();
  const [selectedTimeframe, setSelectedTimeframe] = useState("7d");
  const [notifications, setNotifications] = useState<any[]>([]);

  // CEO Metrics Query
  const { data: metrics, isLoading } = useQuery<DashboardMetrics>({
    queryKey: ["/api/ceo/metrics", selectedTimeframe],
    queryFn: async () => {
      const response = await fetch(`/api/ceo/metrics?timeframe=${selectedTimeframe}`);
      return response.json();
    },
  });

  // Pending Approvals Query
  const { data: pendingApprovals } = useQuery<PendingApproval[]>({
    queryKey: ["/api/ceo/pending-approvals"],
    queryFn: async () => {
      const response = await fetch("/api/ceo/pending-approvals");
      return response.json();
    },
  });

  // Real-time notifications
  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const response = await fetch("/api/ceo/notifications");
        const data = await response.json();
        setNotifications(data);
      } catch (error) {
        console.error("Error fetching notifications:", error);
      }
    };

    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatCurrency = (amount: string | number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
    }).format(Number(amount));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 p-6">
      {/* Header Section */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              Executive Command Center
            </h1>
            <p className="text-lg text-gray-600">
              Strategic insights and operational oversight for Orient Medical
            </p>
          </div>
          
          <div className="flex items-center space-x-4">
            <MessageNotification />
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => window.location.reload()}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            
            <div className="relative">
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                <Bell className="h-4 w-4 mr-2" />
                Alerts
                {notifications.length > 0 && (
                  <Badge variant="destructive" className="ml-2 h-5 w-5 rounded-full p-0 text-xs">
                    {notifications.length}
                  </Badge>
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Quick Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-sm font-medium">Total Revenue</p>
                  <p className="text-3xl font-bold">{formatCurrency(metrics?.totalRevenue || 0)}</p>
                  <div className="flex items-center mt-2">
                    <TrendingUp className="h-4 w-4 mr-1" />
                    <span className="text-sm">+{metrics?.monthlyGrowth || 0}% this month</span>
                  </div>
                </div>
                <DollarSign className="h-12 w-12 text-green-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm font-medium">Active Patients</p>
                  <p className="text-3xl font-bold">{metrics?.activePatients || 0}</p>
                  <div className="flex items-center mt-2">
                    <Users className="h-4 w-4 mr-1" />
                    <span className="text-sm">Across all branches</span>
                  </div>
                </div>
                <Heart className="h-12 w-12 text-blue-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-orange-500 to-orange-600 text-white border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-orange-100 text-sm font-medium">Pending Approvals</p>
                  <p className="text-3xl font-bold">{pendingApprovals?.length || 0}</p>
                  <div className="flex items-center mt-2">
                    <Clock className="h-4 w-4 mr-1" />
                    <span className="text-sm">Require attention</span>
                  </div>
                </div>
                <AlertTriangle className="h-12 w-12 text-orange-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100 text-sm font-medium">System Health</p>
                  <p className="text-3xl font-bold">98.5%</p>
                  <div className="flex items-center mt-2">
                    <Shield className="h-4 w-4 mr-1" />
                    <span className="text-sm">All systems operational</span>
                  </div>
                </div>
                <Activity className="h-12 w-12 text-purple-200" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid grid-cols-6 w-full max-w-4xl mx-auto">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="approvals">Approvals</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="operations">Operations</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
          <TabsTrigger value="strategic">Strategic</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Revenue Analytics */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <TrendingUp className="h-5 w-5 mr-2 text-green-600" />
                  Revenue Analytics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Revenue by Service */}
                  <div>
                    <h4 className="font-medium mb-4">Revenue by Service Line</h4>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Laboratory Services</span>
                        <span className="font-medium">₦43,000</span>
                      </div>
                      <Progress value={65} className="h-2" />
                      
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Radiology Services</span>
                        <span className="font-medium">₦52,000</span>
                      </div>
                      <Progress value={78} className="h-2" />
                      
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Cardiology Services</span>
                        <span className="font-medium">₦10,000</span>
                      </div>
                      <Progress value={15} className="h-2" />
                    </div>
                  </div>

                  {/* Quick Actions */}
                  <div className="flex space-x-2">
                    <Link href="/financial-management">
                      <Button size="sm" variant="outline">
                        <Eye className="h-4 w-4 mr-2" />
                        View Details
                      </Button>
                    </Link>
                    <Button size="sm" variant="outline">
                      <Download className="h-4 w-4 mr-2" />
                      Export
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Branch Performance */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Building className="h-5 w-5 mr-2 text-blue-600" />
                  Branch Performance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                    <div>
                      <p className="font-medium">Main Branch</p>
                      <p className="text-sm text-gray-600">₦105,000 revenue</p>
                    </div>
                    <Badge className="bg-green-100 text-green-800">Top</Badge>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                    <div>
                      <p className="font-medium">Victoria Island</p>
                      <p className="text-sm text-gray-600">₦0 revenue</p>
                    </div>
                    <Badge variant="outline">Planned</Badge>
                  </div>

                  <Link href="/branch-management">
                    <Button size="sm" variant="outline" className="w-full">
                      <Plus className="h-4 w-4 mr-2" />
                      Manage Branches
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* KPI Dashboard */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Patient Satisfaction</p>
                    <p className="text-2xl font-bold">4.8/5</p>
                  </div>
                  <Star className="h-8 w-8 text-yellow-500" />
                </div>
                <Progress value={96} className="mt-3" />
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Staff Efficiency</p>
                    <p className="text-2xl font-bold">92%</p>
                  </div>
                  <Zap className="h-8 w-8 text-blue-500" />
                </div>
                <Progress value={92} className="mt-3" />
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Equipment Uptime</p>
                    <p className="text-2xl font-bold">98.5%</p>
                  </div>
                  <Activity className="h-8 w-8 text-green-500" />
                </div>
                <Progress value={98.5} className="mt-3" />
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Quality Score</p>
                    <p className="text-2xl font-bold">95%</p>
                  </div>
                  <Award className="h-8 w-8 text-purple-500" />
                </div>
                <Progress value={95} className="mt-3" />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Approvals Tab */}
        <TabsContent value="approvals" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center">
                    <Clock className="h-5 w-5 mr-2 text-orange-600" />
                    Pending Approvals
                  </span>
                  <Badge variant="outline">{pendingApprovals?.length || 0} items</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {pendingApprovals?.slice(0, 5).map((approval) => (
                    <div key={approval.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <p className="font-medium">{approval.type}</p>
                          <Badge className={getUrgencyColor(approval.urgency)}>
                            {approval.urgency}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600">{approval.description}</p>
                        <div className="flex items-center text-xs text-gray-500 mt-2">
                          <span>Requested by {approval.requestedBy}</span>
                          <span className="mx-2">•</span>
                          <span>{approval.daysWaiting} days ago</span>
                        </div>
                      </div>
                      <div className="flex space-x-2 ml-4">
                        <Button size="sm" className="bg-green-600 hover:bg-green-700">
                          <CheckCircle className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="outline">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  
                  <Link href="/approvals">
                    <Button variant="outline" className="w-full">
                      View All Approvals
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>

            {/* Approval Categories */}
            <Card>
              <CardHeader>
                <CardTitle>Approval Categories</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                    <div className="flex items-center">
                      <DollarSign className="h-5 w-5 mr-3 text-blue-600" />
                      <span>Purchase Orders</span>
                    </div>
                    <Badge>3</Badge>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                    <div className="flex items-center">
                      <Users className="h-5 w-5 mr-3 text-green-600" />
                      <span>Staff Requests</span>
                    </div>
                    <Badge>2</Badge>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                    <div className="flex items-center">
                      <Settings className="h-5 w-5 mr-3 text-purple-600" />
                      <span>System Changes</span>
                    </div>
                    <Badge>1</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <BarChart3 className="h-5 w-5 mr-2 text-blue-600" />
                  Business Intelligence
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                      <p className="text-2xl font-bold text-blue-600">₦1.05M</p>
                      <p className="text-sm text-gray-600">Revenue YTD</p>
                    </div>
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                      <p className="text-2xl font-bold text-green-600">15%</p>
                      <p className="text-sm text-gray-600">Profit Margin</p>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm">Revenue Target</span>
                      <span className="text-sm font-medium">70% achieved</span>
                    </div>
                    <Progress value={70} />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Target className="h-5 w-5 mr-2 text-green-600" />
                  Strategic Goals
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm">Branch Expansion</span>
                      <span className="text-sm font-medium">25%</span>
                    </div>
                    <Progress value={25} className="h-2" />
                  </div>
                  
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm">Digital Transformation</span>
                      <span className="text-sm font-medium">80%</span>
                    </div>
                    <Progress value={80} className="h-2" />
                  </div>
                  
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm">Staff Training</span>
                      <span className="text-sm font-medium">60%</span>
                    </div>
                    <Progress value={60} className="h-2" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Operations Tab */}
        <TabsContent value="operations" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Link href="/patient-management">
              <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                <CardContent className="p-6 text-center">
                  <Users className="h-12 w-12 mx-auto text-blue-600 mb-4" />
                  <h3 className="font-semibold mb-2">Patient Management</h3>
                  <p className="text-sm text-gray-600">View and manage patient records</p>
                </CardContent>
              </Card>
            </Link>

            <Link href="/test-management">
              <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                <CardContent className="p-6 text-center">
                  <Activity className="h-12 w-12 mx-auto text-green-600 mb-4" />
                  <h3 className="font-semibold mb-2">Test Management</h3>
                  <p className="text-sm text-gray-600">Oversee all diagnostic tests</p>
                </CardContent>
              </Card>
            </Link>

            <Link href="/inventory-management">
              <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                <CardContent className="p-6 text-center">
                  <Briefcase className="h-12 w-12 mx-auto text-purple-600 mb-4" />
                  <h3 className="font-semibold mb-2">Inventory Control</h3>
                  <p className="text-sm text-gray-600">Monitor supplies and equipment</p>
                </CardContent>
              </Card>
            </Link>

            <Link href="/hr-management">
              <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                <CardContent className="p-6 text-center">
                  <Heart className="h-12 w-12 mx-auto text-red-600 mb-4" />
                  <h3 className="font-semibold mb-2">Human Resources</h3>
                  <p className="text-sm text-gray-600">Staff management and payroll</p>
                </CardContent>
              </Card>
            </Link>

            <Link href="/financial-management">
              <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                <CardContent className="p-6 text-center">
                  <DollarSign className="h-12 w-12 mx-auto text-yellow-600 mb-4" />
                  <h3 className="font-semibold mb-2">Financial Control</h3>
                  <p className="text-sm text-gray-600">Revenue and expense tracking</p>
                </CardContent>
              </Card>
            </Link>

            <Link href="/training-simulation">
              <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                <CardContent className="p-6 text-center">
                  <Award className="h-12 w-12 mx-auto text-indigo-600 mb-4" />
                  <h3 className="font-semibold mb-2">Staff Training</h3>
                  <p className="text-sm text-gray-600">Interactive training modules</p>
                </CardContent>
              </Card>
            </Link>
          </div>
        </TabsContent>

        {/* Reports Tab */}
        <TabsContent value="reports" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <FileText className="h-5 w-5 mr-2" />
                  Financial Reports
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <Button variant="outline" className="w-full justify-start">
                    <BarChart3 className="h-4 w-4 mr-2" />
                    Income Statement
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <PieChart className="h-4 w-4 mr-2" />
                    Balance Sheet
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <TrendingUp className="h-4 w-4 mr-2" />
                    Cash Flow
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Activity className="h-5 w-5 mr-2" />
                  Operational Reports
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <Button variant="outline" className="w-full justify-start">
                    <Users className="h-4 w-4 mr-2" />
                    Patient Analytics
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <Building className="h-4 w-4 mr-2" />
                    Branch Performance
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <Target className="h-4 w-4 mr-2" />
                    KPI Dashboard
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Shield className="h-5 w-5 mr-2" />
                  Compliance Reports
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <Button variant="outline" className="w-full justify-start">
                    <FileText className="h-4 w-4 mr-2" />
                    Regulatory Compliance
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <Award className="h-4 w-4 mr-2" />
                    Quality Assurance
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <Globe className="h-4 w-4 mr-2" />
                    Audit Trail
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Strategic Tab */}
        <TabsContent value="strategic" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Globe className="h-5 w-5 mr-2 text-blue-600" />
                  Market Expansion
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <h4 className="font-medium mb-2">Victoria Island Branch</h4>
                    <p className="text-sm text-gray-600 mb-3">
                      Planned opening Q3 2025. Target: High-income demographic.
                    </p>
                    <Progress value={25} className="mb-2" />
                    <p className="text-xs text-gray-500">25% complete</p>
                  </div>
                  
                  <div className="p-4 bg-green-50 rounded-lg">
                    <h4 className="font-medium mb-2">Telemedicine Platform</h4>
                    <p className="text-sm text-gray-600 mb-3">
                      Digital consultation services for remote patients.
                    </p>
                    <Progress value={60} className="mb-2" />
                    <p className="text-xs text-gray-500">60% complete</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Zap className="h-5 w-5 mr-2 text-yellow-600" />
                  Innovation Pipeline
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">AI-Powered Diagnostics</p>
                      <p className="text-sm text-gray-600">Research phase</p>
                    </div>
                    <Badge variant="outline">Exploring</Badge>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">Mobile Laboratory Units</p>
                      <p className="text-sm text-gray-600">Pilot program</p>
                    </div>
                    <Badge className="bg-blue-100 text-blue-800">Testing</Badge>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">Patient Portal App</p>
                      <p className="text-sm text-gray-600">Development</p>
                    </div>
                    <Badge className="bg-green-100 text-green-800">Active</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}