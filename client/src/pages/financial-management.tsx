import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Calendar, 
  Download,
  Receipt,
  Percent,
  Building,
  Users
} from "lucide-react";

export default function FinancialManagement() {
  const { user } = useAuth();
  const [selectedBranch, setSelectedBranch] = useState(user?.branchId?.toString() || "1");
  const [dateRange, setDateRange] = useState("today");

  // Fetch branches
  const { data: branches = [] } = useQuery({
    queryKey: ["/api/branches", user?.tenantId],
    enabled: !!user?.tenantId,
  });

  // Fetch financial metrics
  const { data: metrics } = useQuery({
    queryKey: ["/api/dashboard/metrics", selectedBranch],
    enabled: !!selectedBranch,
  });

  // Mock financial data for demo
  const revenueData = {
    today: { amount: 45000, tests: 12, avg: 3750 },
    week: { amount: 285000, tests: 78, avg: 3654 },
    month: { amount: 1250000, tests: 342, avg: 3655 }
  };

  const commissionData = [
    {
      id: 1,
      provider: "Lagos General Hospital",
      type: "hospital",
      tests: 8,
      revenue: 96000,
      rate: 5.0,
      commission: 4800,
      status: "pending"
    },
    {
      id: 2,
      provider: "Dr. Emeka Okafor Clinic",
      type: "clinic",
      tests: 5,
      revenue: 62000,
      rate: 7.5,
      commission: 4650,
      status: "pending"
    },
    {
      id: 3,
      provider: "Sunrise Medical Center",
      type: "clinic",
      tests: 3,
      revenue: 36000,
      rate: 6.0,
      commission: 2160,
      status: "paid"
    }
  ];

  const consultantFees = [
    {
      id: 1,
      consultant: "Dr. Adebisi Radiologist",
      specialization: "Radiology",
      tests: 15,
      feePerTest: 3000,
      total: 45000,
      status: "pending"
    },
    {
      id: 2,
      consultant: "Dr. Olumide Cardiologist",
      specialization: "Cardiology",
      tests: 8,
      feePerTest: 4000,
      total: 32000,
      status: "pending"
    },
    {
      id: 3,
      consultant: "Dr. Kemi Sonographer",
      specialization: "Ultrasound",
      tests: 12,
      feePerTest: 3500,
      total: 42000,
      status: "paid"
    }
  ];

  const recentTransactions = [
    {
      id: 1,
      type: "payment",
      amount: 12000,
      description: "Chest X-Ray - Kemi Adeyemi",
      patient: "Kemi Adeyemi",
      time: "09:45 AM",
      status: "completed"
    },
    {
      id: 2,
      type: "payment",
      amount: 8000,
      description: "Lipid Profile - Fatima Bello",
      patient: "Fatima Bello",
      time: "08:30 AM",
      status: "completed"
    },
    {
      id: 3,
      type: "commission",
      amount: -600,
      description: "Commission - Lagos General Hospital",
      patient: null,
      time: "08:15 AM",
      status: "pending"
    },
    {
      id: 4,
      type: "consultant_fee",
      amount: -3000,
      description: "Radiology fee - Dr. Adebisi",
      patient: null,
      time: "07:45 AM",
      status: "pending"
    }
  ];

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case "payment":
        return <TrendingUp className="w-4 h-4 text-medical-green" />;
      case "commission":
      case "consultant_fee":
        return <TrendingDown className="w-4 h-4 text-medical-red" />;
      default:
        return <DollarSign className="w-4 h-4 text-slate-gray" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
      case "paid":
        return <Badge className="bg-medical-green">Paid</Badge>;
      case "pending":
        return <Badge variant="secondary">Pending</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Financial Management</h1>
          <p className="text-slate-gray">Revenue tracking, commissions, and financial reporting</p>
        </div>
        
        <div className="flex items-center space-x-4">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={selectedBranch} onValueChange={setSelectedBranch}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {branches.map((branch: any) => (
                <SelectItem key={branch.id} value={branch.id.toString()}>
                  {branch.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button variant="outline">
            <Download className="mr-2 w-4 h-4" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Revenue Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-gray text-sm font-medium">Total Revenue</p>
                <p className="text-3xl font-bold text-gray-900">
                  ₦{revenueData[dateRange as keyof typeof revenueData].amount.toLocaleString()}
                </p>
                <p className="text-medical-green text-sm mt-1">
                  <TrendingUp className="inline w-3 h-3 mr-1" />
                  +12% from last period
                </p>
              </div>
              <div className="w-12 h-12 bg-green-50 rounded-lg flex items-center justify-center">
                <DollarSign className="text-medical-green w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-gray text-sm font-medium">Tests Performed</p>
                <p className="text-3xl font-bold text-gray-900">
                  {revenueData[dateRange as keyof typeof revenueData].tests}
                </p>
                <p className="text-medical-blue text-sm mt-1">
                  <TrendingUp className="inline w-3 h-3 mr-1" />
                  +8% from last period
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center">
                <Receipt className="text-medical-blue w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-gray text-sm font-medium">Average per Test</p>
                <p className="text-3xl font-bold text-gray-900">
                  ₦{revenueData[dateRange as keyof typeof revenueData].avg.toLocaleString()}
                </p>
                <p className="text-slate-gray text-sm mt-1">
                  Consistent pricing
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-50 rounded-lg flex items-center justify-center">
                <TrendingUp className="text-purple-600 w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="transactions" className="space-y-6">
        <TabsList>
          <TabsTrigger value="transactions">Recent Transactions</TabsTrigger>
          <TabsTrigger value="commissions">Commission Tracking</TabsTrigger>
          <TabsTrigger value="consultants">Consultant Fees</TabsTrigger>
          <TabsTrigger value="reports">Financial Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="transactions">
          <Card>
            <CardHeader>
              <CardTitle>Recent Transactions</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-gray uppercase tracking-wider">
                        Transaction
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-gray uppercase tracking-wider">
                        Amount
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-gray uppercase tracking-wider">
                        Time
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-gray uppercase tracking-wider">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {recentTransactions.map((transaction) => (
                      <tr key={transaction.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            {getTransactionIcon(transaction.type)}
                            <div className="ml-3">
                              <div className="text-sm font-medium text-gray-900">
                                {transaction.description}
                              </div>
                              {transaction.patient && (
                                <div className="text-sm text-slate-gray">
                                  Patient: {transaction.patient}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className={`text-sm font-medium ${
                            transaction.amount > 0 ? 'text-medical-green' : 'text-medical-red'
                          }`}>
                            {transaction.amount > 0 ? '+' : ''}₦{Math.abs(transaction.amount).toLocaleString()}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-gray">
                          {transaction.time}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getStatusBadge(transaction.status)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="commissions">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Commission Tracking</CardTitle>
                <Button className="bg-medical-blue hover:bg-blue-700">
                  <Percent className="mr-2 w-4 h-4" />
                  Process Payments
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-gray uppercase tracking-wider">
                        Provider
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-gray uppercase tracking-wider">
                        Tests
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-gray uppercase tracking-wider">
                        Revenue
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-gray uppercase tracking-wider">
                        Rate
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-gray uppercase tracking-wider">
                        Commission
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-gray uppercase tracking-wider">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {commissionData.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                              <Building className="w-5 h-5 text-medical-blue" />
                            </div>
                            <div className="ml-3">
                              <div className="text-sm font-medium text-gray-900">
                                {item.provider}
                              </div>
                              <div className="text-sm text-slate-gray capitalize">
                                {item.type}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {item.tests}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          ₦{item.revenue.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {item.rate}%
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-medical-red">
                          ₦{item.commission.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getStatusBadge(item.status)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="consultants">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Consultant Fees</CardTitle>
                <Button className="bg-medical-green hover:bg-green-700">
                  <Users className="mr-2 w-4 h-4" />
                  Process Monthly Payments
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-gray uppercase tracking-wider">
                        Consultant
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-gray uppercase tracking-wider">
                        Tests Reviewed
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-gray uppercase tracking-wider">
                        Fee per Test
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-gray uppercase tracking-wider">
                        Total Amount
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-gray uppercase tracking-wider">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {consultantFees.map((consultant) => (
                      <tr key={consultant.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
                              <Users className="w-5 h-5 text-medical-green" />
                            </div>
                            <div className="ml-3">
                              <div className="text-sm font-medium text-gray-900">
                                {consultant.consultant}
                              </div>
                              <div className="text-sm text-slate-gray">
                                {consultant.specialization}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {consultant.tests}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          ₦{consultant.feePerTest.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-medical-red">
                          ₦{consultant.total.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getStatusBadge(consultant.status)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Financial Reports</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button variant="outline" className="w-full justify-start">
                  <Calendar className="mr-2 w-4 h-4" />
                  Daily Revenue Report
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Receipt className="mr-2 w-4 h-4" />
                  Monthly Financial Summary
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Percent className="mr-2 w-4 h-4" />
                  Commission Analysis
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Users className="mr-2 w-4 h-4" />
                  Consultant Fee Report
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Quick Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                  <span className="text-sm font-medium">Outstanding Commissions</span>
                  <span className="text-lg font-bold text-medical-red">₦11,610</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                  <span className="text-sm font-medium">Pending Consultant Fees</span>
                  <span className="text-lg font-bold text-medical-red">₦119,000</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-yellow-50 rounded-lg">
                  <span className="text-sm font-medium">Net Revenue (Month)</span>
                  <span className="text-lg font-bold text-medical-green">₦1,119,390</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}