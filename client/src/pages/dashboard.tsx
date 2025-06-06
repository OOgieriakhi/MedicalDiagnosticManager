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
  const revenueData = [
    { month: "Jan", revenue: 165000, target: 200000 },
    { month: "Feb", revenue: 180000, target: 200000 },
    { month: "Mar", revenue: 195000, target: 200000 },
    { month: "Apr", revenue: 220000, target: 200000 },
    { month: "May", revenue: 235000, target: 250000 },
    { month: "Jun", revenue: dashboardData?.revenue?.total || 78000, target: 300000 },
  ];

  // Payment method distribution
  const paymentData = [
    { name: "Cash", value: dashboardData?.revenue?.cash || 25000, color: "#22c55e" },
    { name: "POS", value: dashboardData?.revenue?.pos || 35000, color: "#3b82f6" },
    { name: "Transfer", value: dashboardData?.revenue?.transfer || 18000, color: "#8b5cf6" },
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-light-bg">
      <Sidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header 
          selectedBranchId={selectedBranchId} 
          onBranchChange={setSelectedBranchId}
        />
        
        <main className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            {/* Welcome Section */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  Welcome back, {user.username}
                </h1>
                <p className="text-gray-600">
                  Here's what's happening at your diagnostic center today
                </p>
              </div>
              <Button variant="outline" onClick={() => window.location.reload()}>
                <TrendingUp className="w-4 h-4 mr-2" />
                Refresh Data
              </Button>
            </div>

            {/* Metrics Cards */}
            <MetricsCards data={dashboardData} isLoading={isLoading} />

            {/* Main Dashboard Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="revenue">Revenue Analytics</TabsTrigger>
                <TabsTrigger value="operations">Operations</TabsTrigger>
                <TabsTrigger value="reports">Reports</TabsTrigger>
              </TabsList>

              {/* Overview Tab */}
              <TabsContent value="overview" className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Today's Revenue Summary */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <DollarSign className="w-5 h-5" />
                        Today's Revenue Summary
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">Total Revenue</span>
                          <span className="text-2xl font-bold">
                            ₦{(dashboardData?.revenue?.total || 0).toLocaleString()}
                          </span>
                        </div>
                        
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>Cash: ₦{(dashboardData?.revenue?.cash || 0).toLocaleString()}</span>
                            <span>POS: ₦{(dashboardData?.revenue?.pos || 0).toLocaleString()}</span>
                            <span>Transfer: ₦{(dashboardData?.revenue?.transfer || 0).toLocaleString()}</span>
                          </div>
                        </div>

                        <div className="mt-4">
                          <div className="flex justify-between text-sm mb-2">
                            <span>Daily Target Progress</span>
                            <span>{Math.round(((dashboardData?.revenue?.total || 0) / 300000) * 100)}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-blue-600 h-2 rounded-full" 
                              style={{ width: `${Math.min(((dashboardData?.revenue?.total || 0) / 300000) * 100, 100)}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Quick Stats */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Users className="w-5 h-5" />
                        Quick Statistics
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-blue-600">
                            {transactions?.length || 0}
                          </div>
                          <div className="text-sm text-gray-600">Today's Transactions</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-green-600">
                            {dashboardData?.purchaseOrders?.pending || 0}
                          </div>
                          <div className="text-sm text-gray-600">Pending Orders</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-purple-600">
                            {dashboardData?.purchaseOrders?.approved || 0}
                          </div>
                          <div className="text-sm text-gray-600">Approved Orders</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-orange-600">
                            ₦{((dashboardData?.purchaseOrders?.totalApprovedAmount || 0) / 1000).toFixed(0)}K
                          </div>
                          <div className="text-sm text-gray-600">Approved Amount</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Recent Activities Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <RecentPatients />
                  <SystemAlerts />
                </div>
              </TabsContent>

              {/* Revenue Analytics Tab */}
              <TabsContent value="revenue" className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Revenue Trend Chart */}
                  <Card>
                    <CardHeader>
                      <CardTitle>6-Month Revenue Trend</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <AreaChart data={revenueData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="month" />
                          <YAxis />
                          <Tooltip formatter={(value) => [`₦${Number(value).toLocaleString()}`, 'Revenue']} />
                          <Area type="monotone" dataKey="revenue" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} />
                          <Area type="monotone" dataKey="target" stroke="#ef4444" fill="transparent" strokeDasharray="5 5" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  {/* Payment Method Distribution */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Payment Method Distribution</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                          <Pie
                            data={paymentData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({name, value}) => `${name}: ₦${value.toLocaleString()}`}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {paymentData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value) => [`₦${Number(value).toLocaleString()}`, 'Amount']} />
                        </PieChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* Operations Tab */}
              <TabsContent value="operations" className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <QuickActions />
                  <BranchStatus />
                </div>
              </TabsContent>

              {/* Reports Tab */}
              <TabsContent value="reports" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Available Reports</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      <Button variant="outline" className="h-20 flex flex-col">
                        <FileText className="w-6 h-6 mb-2" />
                        Daily Revenue Report
                      </Button>
                      <Button variant="outline" className="h-20 flex flex-col">
                        <Users className="w-6 h-6 mb-2" />
                        Patient Analytics
                      </Button>
                      <Button variant="outline" className="h-20 flex flex-col">
                        <ShoppingCart className="w-6 h-6 mb-2" />
                        Purchase Orders
                      </Button>
                      <Button variant="outline" className="h-20 flex flex-col">
                        <TrendingUp className="w-6 h-6 mb-2" />
                        Performance Metrics
                      </Button>
                      <Button variant="outline" className="h-20 flex flex-col">
                        <Clock className="w-6 h-6 mb-2" />
                        Time Analysis
                      </Button>
                      <Button variant="outline" className="h-20 flex flex-col">
                        <AlertTriangle className="w-6 h-6 mb-2" />
                        System Alerts
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>

      <MessageNotification />
    </div>
  );
}