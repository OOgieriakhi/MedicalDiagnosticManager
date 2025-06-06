import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import MetricsCards from "@/components/dashboard/metrics-cards";
import RecentPatients from "@/components/dashboard/recent-patients";
import BranchStatus from "@/components/dashboard/branch-status";
import QuickActions from "@/components/dashboard/quick-actions";
import SystemAlerts from "@/components/dashboard/system-alerts";
import { MessageNotification } from "@/components/message-notification";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Area, AreaChart
} from "recharts";
import { 
  DollarSign, Users, ShoppingCart, TrendingUp, Clock, 
  FileText, AlertTriangle, CheckCircle, XCircle 
} from "lucide-react";

export default function Dashboard() {
  const { user } = useAuth();
  const [selectedBranchId, setSelectedBranchId] = useState(user?.branchId || 1);
  const [activeTab, setActiveTab] = useState("overview");

  const { data: dashboardData, isLoading } = useQuery({
    queryKey: ["/api/dashboard-data", selectedBranchId],
    enabled: !!selectedBranchId,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const { data: transactions } = useQuery({
    queryKey: ["/api/daily-transactions", selectedBranchId],
    enabled: !!selectedBranchId,
  });

  const { data: purchaseOrders } = useQuery({
    queryKey: ["/api/purchase-orders", selectedBranchId],
    enabled: !!selectedBranchId,
  });

  if (!user) {
    return null;
  }

  // Chart data for revenue trends
  const revenueChartData = [
    { name: "Mon", revenue: 45000, transactions: 8 },
    { name: "Tue", revenue: 52000, transactions: 12 },
    { name: "Wed", revenue: 48000, transactions: 10 },
    { name: "Thu", revenue: 61000, transactions: 15 },
    { name: "Fri", revenue: 55000, transactions: 13 },
    { name: "Sat", revenue: dashboardData?.revenue?.total || 225788, transactions: dashboardData?.revenue?.transactionCount || 12 },
    { name: "Sun", revenue: 42000, transactions: 9 },
  ];

  // Payment method distribution
  const paymentData = [
    { name: "Cash", value: dashboardData?.revenue?.cash || 125000, color: "#10B981" },
    { name: "POS", value: dashboardData?.revenue?.pos || 75788, color: "#3B82F6" },
    { name: "Transfer", value: dashboardData?.revenue?.transfer || 25000, color: "#8B5CF6" },
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-light-bg">
      <Sidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b bg-white">
          <Header 
            selectedBranchId={selectedBranchId} 
            onBranchChange={setSelectedBranchId}
          />
          <MessageNotification />
        </div>
        
        <main className="flex-1 overflow-y-auto p-6">
          {/* Enhanced Metrics Cards */}
          <MetricsCards branchId={selectedBranchId} />
          
          {/* Interactive Dashboard Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-8">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="revenue">Revenue Analytics</TabsTrigger>
              <TabsTrigger value="operations">Operations</TabsTrigger>
              <TabsTrigger value="reports">Reports</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                  <RecentPatients branchId={selectedBranchId} />
                </div>
                
                <div className="space-y-6">
                  <BranchStatus tenantId={user.tenantId} />
                  <QuickActions />
                  <SystemAlerts tenantId={user.tenantId} />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="revenue" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Revenue Trend Chart */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="w-5 h-5" />
                      Weekly Revenue Trend
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <AreaChart data={revenueChartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip 
                          formatter={(value, name) => [
                            name === "revenue" ? `₦${Number(value).toLocaleString()}` : value,
                            name === "revenue" ? "Revenue" : "Transactions"
                          ]}
                        />
                        <Area type="monotone" dataKey="revenue" stroke="#10B981" fill="#10B981" fillOpacity={0.3} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Payment Method Distribution */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <DollarSign className="w-5 h-5" />
                      Payment Methods
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={paymentData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={120}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {paymentData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => `₦${Number(value).toLocaleString()}`} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="flex justify-center gap-4 mt-4">
                      {paymentData.map((item, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                          <span className="text-sm">{item.name}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Revenue Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Today's Target</p>
                        <p className="text-2xl font-bold">₦300,000</p>
                        <p className="text-sm text-green-600">
                          {Math.round((dashboardData?.revenue?.total || 225788) / 300000 * 100)}% achieved
                        </p>
                      </div>
                      <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center">
                        <TrendingUp className="w-6 h-6 text-blue-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Average per Transaction</p>
                        <p className="text-2xl font-bold">
                          ₦{Math.round((dashboardData?.revenue?.total || 225788) / (dashboardData?.revenue?.transactionCount || 12)).toLocaleString()}
                        </p>
                        <p className="text-sm text-green-600">+5.2% from yesterday</p>
                      </div>
                      <div className="w-12 h-12 bg-green-50 rounded-lg flex items-center justify-center">
                        <DollarSign className="w-6 h-6 text-green-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Peak Hour Revenue</p>
                        <p className="text-2xl font-bold">₦45,000</p>
                        <p className="text-sm text-gray-600">2:00 PM - 3:00 PM</p>
                      </div>
                      <div className="w-12 h-12 bg-purple-50 rounded-lg flex items-center justify-center">
                        <Clock className="w-6 h-6 text-purple-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="operations" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Purchase Orders Status */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <ShoppingCart className="w-5 h-5" />
                      Purchase Orders Status
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <Clock className="w-5 h-5 text-yellow-600" />
                          <span>Pending Approval</span>
                        </div>
                        <Badge variant="secondary">{dashboardData?.purchaseOrders?.pending || 0}</Badge>
                      </div>
                      
                      <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <CheckCircle className="w-5 h-5 text-green-600" />
                          <span>Approved</span>
                        </div>
                        <Badge variant="default" className="bg-green-600">{dashboardData?.purchaseOrders?.approved || 0}</Badge>
                      </div>
                      
                      <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <XCircle className="w-5 h-5 text-red-600" />
                          <span>Rejected</span>
                        </div>
                        <Badge variant="destructive">{dashboardData?.purchaseOrders?.rejected || 0}</Badge>
                      </div>
                    </div>
                    
                    <div className="mt-4 pt-4 border-t">
                      <p className="text-sm text-gray-600">Total Approved Amount</p>
                      <p className="text-xl font-bold">₦{(dashboardData?.purchaseOrders?.totalApprovedAmount || 0).toLocaleString()}</p>
                    </div>
                  </CardContent>
                </Card>

                {/* Staff Performance */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="w-5 h-5" />
                      Staff Performance Today
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {[
                        { name: "Dr. Adebayo", transactions: 8, revenue: 85000, efficiency: 95 },
                        { name: "Nurse Joy", transactions: 12, revenue: 65000, efficiency: 92 },
                        { name: "Lab Tech Mike", transactions: 6, revenue: 45000, efficiency: 88 },
                        { name: "Admin Sarah", transactions: 4, revenue: 30788, efficiency: 90 },
                      ].map((staff, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div>
                            <p className="font-medium">{staff.name}</p>
                            <p className="text-sm text-gray-600">{staff.transactions} transactions</p>
                          </div>
                          <div className="text-right">
                            <p className="font-medium">₦{staff.revenue.toLocaleString()}</p>
                            <p className="text-sm text-green-600">{staff.efficiency}% efficiency</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="reports" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Quick Report Actions */}
                {[
                  { title: "Daily Revenue Report", desc: "Generate today's revenue breakdown", icon: FileText, color: "blue" },
                  { title: "Patient Activity Report", desc: "View patient visit patterns", icon: Users, color: "green" },
                  { title: "Purchase Order Report", desc: "Track procurement activities", icon: ShoppingCart, color: "purple" },
                  { title: "Staff Performance Report", desc: "Analyze team productivity", icon: TrendingUp, color: "orange" },
                  { title: "Financial Summary", desc: "Complete financial overview", icon: DollarSign, color: "indigo" },
                  { title: "Operational Alerts", desc: "System status and warnings", icon: AlertTriangle, color: "red" },
                ].map((report, index) => {
                  const Icon = report.icon;
                  return (
                    <Card key={index} className="hover:shadow-lg transition-shadow cursor-pointer">
                      <CardContent className="p-6">
                        <div className="flex items-start gap-4">
                          <div className={`w-12 h-12 bg-${report.color}-50 rounded-lg flex items-center justify-center`}>
                            <Icon className={`w-6 h-6 text-${report.color}-600`} />
                          </div>
                          <div className="flex-1">
                            <h3 className="font-medium text-gray-900">{report.title}</h3>
                            <p className="text-sm text-gray-600 mt-1">{report.desc}</p>
                            <Button variant="outline" size="sm" className="mt-3">
                              Generate Report
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </div>
  );
}
