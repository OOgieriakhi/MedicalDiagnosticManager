import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend
} from "recharts";
import { 
  DollarSign, 
  TrendingUp, 
  Users, 
  CreditCard, 
  Download,
  FileText,
  Calendar,
  Filter,
  Building,
  Stethoscope,
  UserCheck
} from "lucide-react";

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

interface RevenueReportsProps {
  branchId?: number;
}

export function RevenueReports({ branchId }: RevenueReportsProps) {
  const { user } = useAuth();
  const [selectedPeriod, setSelectedPeriod] = useState("current-month");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());

  // Get date range based on selected period
  const getDateRange = () => {
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

    switch (selectedPeriod) {
      case "current-month":
        return {
          startDate: new Date(currentYear, currentMonth, 1).toISOString().split('T')[0],
          endDate: new Date(currentYear, currentMonth + 1, 0).toISOString().split('T')[0]
        };
      case "last-month":
        return {
          startDate: new Date(currentYear, currentMonth - 1, 1).toISOString().split('T')[0],
          endDate: new Date(currentYear, currentMonth, 0).toISOString().split('T')[0]
        };
      case "current-quarter":
        const quarterStart = Math.floor(currentMonth / 3) * 3;
        return {
          startDate: new Date(currentYear, quarterStart, 1).toISOString().split('T')[0],
          endDate: new Date(currentYear, quarterStart + 3, 0).toISOString().split('T')[0]
        };
      case "custom":
        return { startDate, endDate };
      default:
        return {
          startDate: new Date(currentYear, currentMonth, 1).toISOString().split('T')[0],
          endDate: new Date(currentYear, currentMonth + 1, 0).toISOString().split('T')[0]
        };
    }
  };

  const dateRange = getDateRange();

  // Revenue by Payment Methods
  const { data: paymentMethodsData = [], isLoading: paymentMethodsLoading } = useQuery({
    queryKey: ["/api/reports/revenue/payment-methods", dateRange.startDate, dateRange.endDate, branchId],
    queryFn: async () => {
      const params = new URLSearchParams({
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        ...(branchId && { branchId: branchId.toString() })
      });
      const response = await fetch(`/api/reports/revenue/payment-methods?${params}`);
      if (!response.ok) throw new Error("Failed to fetch payment methods data");
      return response.json();
    },
    enabled: !!dateRange.startDate && !!dateRange.endDate,
  });

  // Revenue by Staff
  const { data: staffRevenueData = [], isLoading: staffRevenueLoading } = useQuery({
    queryKey: ["/api/reports/revenue/staff", dateRange.startDate, dateRange.endDate, branchId],
    queryFn: async () => {
      const params = new URLSearchParams({
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        ...(branchId && { branchId: branchId.toString() })
      });
      const response = await fetch(`/api/reports/revenue/staff?${params}`);
      if (!response.ok) throw new Error("Failed to fetch staff revenue data");
      return response.json();
    },
    enabled: !!dateRange.startDate && !!dateRange.endDate,
  });

  // Revenue by Services
  const { data: servicesData = [], isLoading: servicesLoading } = useQuery({
    queryKey: ["/api/reports/revenue/services", dateRange.startDate, dateRange.endDate, branchId],
    queryFn: async () => {
      const params = new URLSearchParams({
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        ...(branchId && { branchId: branchId.toString() })
      });
      const response = await fetch(`/api/reports/revenue/services?${params}`);
      if (!response.ok) throw new Error("Failed to fetch services data");
      return response.json();
    },
    enabled: !!dateRange.startDate && !!dateRange.endDate,
  });

  // Revenue by Patient Types
  const { data: patientTypesData = [], isLoading: patientTypesLoading } = useQuery({
    queryKey: ["/api/reports/revenue/patient-types", dateRange.startDate, dateRange.endDate, branchId],
    queryFn: async () => {
      const params = new URLSearchParams({
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        ...(branchId && { branchId: branchId.toString() })
      });
      const response = await fetch(`/api/reports/revenue/patient-types?${params}`);
      if (!response.ok) throw new Error("Failed to fetch patient types data");
      return response.json();
    },
    enabled: !!dateRange.startDate && !!dateRange.endDate,
  });

  // Branch Revenue (if admin/manager)
  const { data: branchesData = [], isLoading: branchesLoading } = useQuery({
    queryKey: ["/api/reports/revenue/branches", dateRange.startDate, dateRange.endDate],
    queryFn: async () => {
      const params = new URLSearchParams({
        startDate: dateRange.startDate,
        endDate: dateRange.endDate
      });
      const response = await fetch(`/api/reports/revenue/branches?${params}`);
      if (!response.ok) throw new Error("Failed to fetch branches data");
      return response.json();
    },
    enabled: !!dateRange.startDate && !!dateRange.endDate && (user?.role === 'admin' || user?.role === 'manager'),
  });

  // Monthly Summary
  const { data: monthlySummaryData = [], isLoading: monthlySummaryLoading } = useQuery({
    queryKey: ["/api/reports/revenue/monthly-summary", selectedYear, branchId],
    queryFn: async () => {
      const params = new URLSearchParams({
        year: selectedYear,
        ...(branchId && { branchId: branchId.toString() })
      });
      const response = await fetch(`/api/reports/revenue/monthly-summary?${params}`);
      if (!response.ok) throw new Error("Failed to fetch monthly summary");
      return response.json();
    },
    enabled: !!selectedYear,
  });

  // Ledger Verification
  const { data: ledgerVerification = null, isLoading: ledgerLoading } = useQuery({
    queryKey: ["/api/reports/revenue/ledger-verification", dateRange.startDate, dateRange.endDate, branchId],
    queryFn: async () => {
      const params = new URLSearchParams({
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        ...(branchId && { branchId: branchId.toString() })
      });
      const response = await fetch(`/api/reports/revenue/ledger-verification?${params}`);
      if (!response.ok) throw new Error("Failed to fetch ledger verification");
      return response.json();
    },
    enabled: !!dateRange.startDate && !!dateRange.endDate,
  });

  const exportReport = (reportType: string, format: 'pdf' | 'excel') => {
    const params = new URLSearchParams({
      format,
      reportType,
      startDate: dateRange.startDate,
      endDate: dateRange.endDate,
      ...(branchId && { branchId: branchId.toString() }),
      ...(reportType === 'monthly-summary' && { year: selectedYear })
    });
    
    window.open(`/api/reports/revenue/export?${params}`, '_blank');
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      {/* Report Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Revenue Reports & Analytics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label>Report Period</Label>
              <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="current-month">Current Month</SelectItem>
                  <SelectItem value="last-month">Last Month</SelectItem>
                  <SelectItem value="current-quarter">Current Quarter</SelectItem>
                  <SelectItem value="custom">Custom Date Range</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {selectedPeriod === "custom" && (
              <>
                <div>
                  <Label>Start Date</Label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div>
                  <Label>End Date</Label>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </>
            )}

            <div>
              <Label>Year (for Monthly Summary)</Label>
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2023">2023</SelectItem>
                  <SelectItem value="2024">2024</SelectItem>
                  <SelectItem value="2025">2025</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="payment-methods" className="space-y-4">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="payment-methods">Payment Methods</TabsTrigger>
          <TabsTrigger value="staff">Staff Performance</TabsTrigger>
          <TabsTrigger value="services">Service Categories</TabsTrigger>
          <TabsTrigger value="patient-types">Patient Types</TabsTrigger>
          {(user?.role === 'admin' || user?.role === 'manager') && (
            <TabsTrigger value="branches">Branches</TabsTrigger>
          )}
          <TabsTrigger value="monthly">Monthly Trends</TabsTrigger>
        </TabsList>

        {/* Payment Methods Tab */}
        <TabsContent value="payment-methods" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Revenue by Payment Method</h3>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => exportReport('payment-methods', 'pdf')}
              >
                <FileText className="w-4 h-4 mr-2" />
                Export PDF
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => exportReport('payment-methods', 'excel')}
              >
                <Download className="w-4 h-4 mr-2" />
                Export Excel
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Payment Methods Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                {paymentMethodsLoading ? (
                  <div className="h-80 flex items-center justify-center">Loading...</div>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={paymentMethodsData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ payment_method, total_amount }) => `${payment_method}: ${formatCurrency(total_amount)}`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="total_amount"
                        nameKey="payment_method"
                      >
                        {paymentMethodsData.map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Payment Methods Details</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Payment Method</TableHead>
                      <TableHead>Transactions</TableHead>
                      <TableHead>Total Amount</TableHead>
                      <TableHead>Verified</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paymentMethodsData.map((item: any) => (
                      <TableRow key={item.payment_method}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            {item.payment_method === 'cash' && <DollarSign className="w-4 h-4" />}
                            {item.payment_method === 'pos' && <CreditCard className="w-4 h-4" />}
                            {item.payment_method === 'transfer' && <TrendingUp className="w-4 h-4" />}
                            {item.payment_method.toUpperCase()}
                          </div>
                        </TableCell>
                        <TableCell>{item.transaction_count}</TableCell>
                        <TableCell>{formatCurrency(item.total_amount)}</TableCell>
                        <TableCell>{formatCurrency(item.verified_amount)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Staff Performance Tab */}
        <TabsContent value="staff" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Revenue by Staff/Cashier</h3>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => exportReport('staff', 'pdf')}
              >
                <FileText className="w-4 h-4 mr-2" />
                Export PDF
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => exportReport('staff', 'excel')}
              >
                <Download className="w-4 h-4 mr-2" />
                Export Excel
              </Button>
            </div>
          </div>

          <Card>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={staffRevenueData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="cashier_name" />
                  <YAxis tickFormatter={formatCurrency} />
                  <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                  <Legend />
                  <Bar dataKey="total_amount" fill="#8884d8" name="Total Revenue" />
                  <Bar dataKey="cash_amount" fill="#82ca9d" name="Cash Revenue" />
                  <Bar dataKey="pos_amount" fill="#ffc658" name="POS Revenue" />
                  <Bar dataKey="transfer_amount" fill="#ff7300" name="Transfer Revenue" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Staff Performance Details</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Staff Member</TableHead>
                    <TableHead>Transactions</TableHead>
                    <TableHead>Total Revenue</TableHead>
                    <TableHead>Cash</TableHead>
                    <TableHead>POS</TableHead>
                    <TableHead>Transfer</TableHead>
                    <TableHead>Verification Rate</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {staffRevenueData.map((item: any, index: number) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4" />
                          {item.cashier_name}
                        </div>
                      </TableCell>
                      <TableCell>{item.transaction_count}</TableCell>
                      <TableCell>{formatCurrency(item.total_amount)}</TableCell>
                      <TableCell>{formatCurrency(item.cash_amount)}</TableCell>
                      <TableCell>{formatCurrency(item.pos_amount)}</TableCell>
                      <TableCell>{formatCurrency(item.transfer_amount)}</TableCell>
                      <TableCell>
                        <Badge variant={item.verification_rate >= 90 ? "default" : "secondary"}>
                          {item.verification_rate}%
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Service Categories Tab */}
        <TabsContent value="services" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Revenue by Service Category</h3>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => exportReport('services', 'pdf')}
              >
                <FileText className="w-4 h-4 mr-2" />
                Export PDF
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => exportReport('services', 'excel')}
              >
                <Download className="w-4 h-4 mr-2" />
                Export Excel
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Service Revenue Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={servicesData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ service_category, total_amount }) => `${service_category}: ${formatCurrency(total_amount)}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="total_amount"
                      nameKey="service_category"
                    >
                      {servicesData.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Service Details</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Service Category</TableHead>
                      <TableHead>Transactions</TableHead>
                      <TableHead>Total Revenue</TableHead>
                      <TableHead>Average</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {servicesData.map((item: any, index: number) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <Stethoscope className="w-4 h-4" />
                            {item.service_category}
                          </div>
                        </TableCell>
                        <TableCell>{item.transaction_count}</TableCell>
                        <TableCell>{formatCurrency(item.total_amount)}</TableCell>
                        <TableCell>{formatCurrency(item.avg_amount)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Patient Types Tab */}
        <TabsContent value="patient-types" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Revenue by Patient Type</h3>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => exportReport('patient-types', 'pdf')}
              >
                <FileText className="w-4 h-4 mr-2" />
                Export PDF
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => exportReport('patient-types', 'excel')}
              >
                <Download className="w-4 h-4 mr-2" />
                Export Excel
              </Button>
            </div>
          </div>

          <Card>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Patient Type</TableHead>
                    <TableHead>Unique Patients</TableHead>
                    <TableHead>Total Transactions</TableHead>
                    <TableHead>Total Revenue</TableHead>
                    <TableHead>Average per Patient</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {patientTypesData.map((item: any, index: number) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <UserCheck className="w-4 h-4" />
                          {item.patient_type}
                        </div>
                      </TableCell>
                      <TableCell>{item.patient_count}</TableCell>
                      <TableCell>{item.transaction_count}</TableCell>
                      <TableCell>{formatCurrency(item.total_amount)}</TableCell>
                      <TableCell>{formatCurrency(item.avg_per_patient)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Branches Tab */}
        {(user?.role === 'admin' || user?.role === 'manager') && (
          <TabsContent value="branches" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Revenue by Branch</h3>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => exportReport('branches', 'pdf')}
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Export PDF
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => exportReport('branches', 'excel')}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export Excel
                </Button>
              </div>
            </div>

            <Card>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Branch</TableHead>
                      <TableHead>Transactions</TableHead>
                      <TableHead>Total Revenue</TableHead>
                      <TableHead>Cash</TableHead>
                      <TableHead>POS</TableHead>
                      <TableHead>Transfer</TableHead>
                      <TableHead>Verification Rate</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {branchesData.map((item: any, index: number) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <Building className="w-4 h-4" />
                            {item.branch_name}
                          </div>
                        </TableCell>
                        <TableCell>{item.transaction_count}</TableCell>
                        <TableCell>{formatCurrency(item.total_amount)}</TableCell>
                        <TableCell>{formatCurrency(item.cash_amount)}</TableCell>
                        <TableCell>{formatCurrency(item.pos_amount)}</TableCell>
                        <TableCell>{formatCurrency(item.transfer_amount)}</TableCell>
                        <TableCell>
                          <Badge variant={item.verification_rate >= 90 ? "default" : "secondary"}>
                            {item.verification_rate}%
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* Monthly Trends Tab */}
        <TabsContent value="monthly" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Monthly Revenue Trends</h3>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => exportReport('monthly-summary', 'pdf')}
              >
                <FileText className="w-4 h-4 mr-2" />
                Export PDF
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => exportReport('monthly-summary', 'excel')}
              >
                <Download className="w-4 h-4 mr-2" />
                Export Excel
              </Button>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Monthly Revenue Trends ({selectedYear})</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={monthlySummaryData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month_name" />
                  <YAxis tickFormatter={formatCurrency} />
                  <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                  <Legend />
                  <Line type="monotone" dataKey="total_revenue" stroke="#8884d8" name="Total Revenue" />
                  <Line type="monotone" dataKey="cash_revenue" stroke="#82ca9d" name="Cash Revenue" />
                  <Line type="monotone" dataKey="pos_revenue" stroke="#ffc658" name="POS Revenue" />
                  <Line type="monotone" dataKey="transfer_revenue" stroke="#ff7300" name="Transfer Revenue" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Monthly Summary Details</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Month</TableHead>
                    <TableHead>Transactions</TableHead>
                    <TableHead>Total Revenue</TableHead>
                    <TableHead>Verified Revenue</TableHead>
                    <TableHead>Unique Patients</TableHead>
                    <TableHead>Average Transaction</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {monthlySummaryData.map((item: any) => (
                    <TableRow key={item.month}>
                      <TableCell className="font-medium">{item.month_name}</TableCell>
                      <TableCell>{item.transaction_count}</TableCell>
                      <TableCell>{formatCurrency(item.total_revenue)}</TableCell>
                      <TableCell>{formatCurrency(item.verified_revenue)}</TableCell>
                      <TableCell>{item.unique_patients}</TableCell>
                      <TableCell>{formatCurrency(item.avg_transaction)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Ledger Verification */}
      {ledgerVerification && (
        <Card>
          <CardHeader>
            <CardTitle>Ledger Verification & Reconciliation</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 border rounded-lg">
                <h4 className="font-semibold">Daily Transactions</h4>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(ledgerVerification.summary.daily_transactions)}
                </p>
              </div>
              <div className="p-4 border rounded-lg">
                <h4 className="font-semibold">Bank Deposits</h4>
                <p className="text-2xl font-bold text-blue-600">
                  {formatCurrency(ledgerVerification.summary.bank_deposits)}
                </p>
              </div>
              <div className="p-4 border rounded-lg">
                <h4 className="font-semibold">Variance</h4>
                <p className={`text-2xl font-bold ${ledgerVerification.summary.variance === 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(ledgerVerification.summary.variance)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}