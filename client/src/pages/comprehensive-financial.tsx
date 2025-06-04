import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { 
  DollarSign,
  TrendingUp,
  TrendingDown,
  FileText,
  Package,
  ShoppingCart,
  CreditCard,
  Calendar,
  Download,
  Upload,
  Filter,
  Search,
  Plus,
  Minus,
  AlertTriangle,
  CheckCircle,
  Clock,
  BarChart3,
  PieChart,
  Receipt
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Link } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function ComprehensiveFinancial() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [dateRange, setDateRange] = useState("month");
  const [startDate, setStartDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedCategory, setSelectedCategory] = useState("all");

  // Navigation and action handlers
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [showNewExpenseDialog, setShowNewExpenseDialog] = useState(false);
  const [showNewPaymentDialog, setShowNewPaymentDialog] = useState(false);

  // Financial overview data
  const { data: financialMetrics, isLoading: metricsLoading } = useQuery({
    queryKey: ["/api/financial/metrics", user?.branchId, startDate, endDate],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (user?.branchId) params.append('branchId', user.branchId.toString());
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      
      const response = await fetch(`/api/financial/metrics?${params}`);
      if (!response.ok) throw new Error("Failed to fetch financial metrics");
      return response.json();
    },
    enabled: !!user?.branchId
  });

  // Revenue breakdown data
  const { data: revenueBreakdown, isLoading: revenueLoading } = useQuery({
    queryKey: ["/api/financial/revenue-breakdown", user?.branchId, startDate, endDate],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (user?.branchId) params.append('branchId', user.branchId.toString());
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      
      const response = await fetch(`/api/financial/revenue-breakdown?${params}`);
      if (!response.ok) throw new Error("Failed to fetch revenue breakdown");
      return response.json();
    },
    enabled: !!user?.branchId
  });

  // Transaction history data
  const { data: transactionHistory, isLoading: transactionsLoading } = useQuery({
    queryKey: ["/api/financial/transactions", user?.branchId, selectedCategory, startDate, endDate],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (user?.branchId) params.append('branchId', user.branchId.toString());
      if (selectedCategory && selectedCategory !== 'all') params.append('category', selectedCategory);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      
      const response = await fetch(`/api/financial/transactions?${params}`);
      if (!response.ok) throw new Error("Failed to fetch transactions");
      return response.json();
    },
    enabled: !!user?.branchId
  });

  // Outstanding invoices data
  const { data: outstandingInvoices, isLoading: invoicesLoading } = useQuery({
    queryKey: ["/api/invoices", user?.branchId, "unpaid"],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (user?.branchId) params.append('branchId', user.branchId.toString());
      params.append('status', 'unpaid');
      
      const response = await fetch(`/api/invoices?${params}`);
      if (!response.ok) throw new Error("Failed to fetch outstanding invoices");
      return response.json();
    },
    enabled: !!user?.branchId
  });

  // Expense tracking data
  const { data: expenses, isLoading: expensesLoading } = useQuery({
    queryKey: ["/api/financial/expenses", user?.branchId, startDate, endDate],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (user?.branchId) params.append('branchId', user.branchId.toString());
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      
      const response = await fetch(`/api/financial/expenses?${params}`);
      if (!response.ok) throw new Error("Failed to fetch expenses");
      return response.json();
    },
    enabled: !!user?.branchId
  });

  // Payroll data
  const { data: payrollData, isLoading: payrollLoading } = useQuery({
    queryKey: ["/api/financial/payroll", user?.branchId, startDate, endDate],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (user?.branchId) params.append('branchId', user.branchId.toString());
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      
      const response = await fetch(`/api/financial/payroll?${params}`);
      if (!response.ok) throw new Error("Failed to fetch payroll data");
      return response.json();
    },
    enabled: !!user?.branchId
  });

  // Budget tracking data
  const { data: budgetData, isLoading: budgetLoading } = useQuery({
    queryKey: ["/api/financial/budget", user?.branchId, startDate, endDate],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (user?.branchId) params.append('branchId', user.branchId.toString());
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      
      const response = await fetch(`/api/financial/budget?${params}`);
      if (!response.ok) throw new Error("Failed to fetch budget data");
      return response.json();
    },
    enabled: !!user?.branchId
  });

  // New expense mutation
  const newExpenseMutation = useMutation({
    mutationFn: async (expenseData: any) => {
      const response = await apiRequest('POST', '/api/financial/expenses', expenseData);
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Expense recorded successfully", variant: "default" });
      queryClient.invalidateQueries({ queryKey: ["/api/financial/expenses"] });
      queryClient.invalidateQueries({ queryKey: ["/api/financial/metrics"] });
      setShowNewExpenseDialog(false);
    },
    onError: (error: any) => {
      toast({ title: "Failed to record expense", description: error.message, variant: "destructive" });
    }
  });

  // Payment processing mutation
  const processPaymentMutation = useMutation({
    mutationFn: async (paymentData: any) => {
      const response = await apiRequest('POST', '/api/financial/payments', paymentData);
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Payment processed successfully", variant: "default" });
      queryClient.invalidateQueries({ queryKey: ["/api/financial/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      setShowNewPaymentDialog(false);
    },
    onError: (error: any) => {
      toast({ title: "Failed to process payment", description: error.message, variant: "destructive" });
    }
  });

  const formatCurrency = (amount: number | string) => {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN'
    }).format(numAmount || 0);
  };

  const getStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'paid': return "bg-green-100 text-green-800";
      case 'unpaid': case 'pending': return "bg-yellow-100 text-yellow-800";
      case 'overdue': return "bg-red-100 text-red-800";
      case 'approved': return "bg-blue-100 text-blue-800";
      case 'rejected': return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  if (!user) {
    return (
      <div className="p-6">
        <div className="text-center">
          <p className="text-gray-500">Please log in to access financial management.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header with Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/">
            <Button variant="outline" size="sm">
              <BarChart3 className="w-4 h-4 mr-2" />
              Dashboard
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Financial Management</h1>
            <p className="text-gray-600">Comprehensive financial tracking and reporting system</p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <Button variant="outline" size="sm" onClick={() => setShowNewExpenseDialog(true)}>
            <Plus className="w-4 h-4 mr-2" />
            New Expense
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowNewPaymentDialog(true)}>
            <CreditCard className="w-4 h-4 mr-2" />
            Process Payment
          </Button>
          <Button className="bg-green-600 hover:bg-green-700">
            <Download className="w-4 h-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Date Range Controls */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Label htmlFor="dateRange">Period:</Label>
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">This Week</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                  <SelectItem value="quarter">This Quarter</SelectItem>
                  <SelectItem value="year">This Year</SelectItem>
                  <SelectItem value="custom">Custom Range</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {dateRange === 'custom' && (
              <>
                <div className="flex items-center gap-2">
                  <Label htmlFor="startDate">From:</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-40"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Label htmlFor="endDate">To:</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-40"
                  />
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Key Financial Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(financialMetrics?.totalRevenue || 0)}
                </p>
                <p className="text-xs text-green-600">
                  +{financialMetrics?.revenueGrowth || 0}% from last period
                </p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Expenses</p>
                <p className="text-2xl font-bold text-red-600">
                  {formatCurrency(financialMetrics?.totalExpenses || 0)}
                </p>
                <p className="text-xs text-red-600">
                  {financialMetrics?.expenseGrowth || 0}% from last period
                </p>
              </div>
              <div className="p-3 bg-red-100 rounded-lg">
                <TrendingDown className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Net Profit</p>
                <p className="text-2xl font-bold text-blue-600">
                  {formatCurrency(financialMetrics?.netProfit || 0)}
                </p>
                <p className="text-xs text-blue-600">
                  Margin: {financialMetrics?.profitMargin || 0}%
                </p>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <DollarSign className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Outstanding Amount</p>
                <p className="text-2xl font-bold text-orange-600">
                  {formatCurrency(financialMetrics?.outstandingAmount || 0)}
                </p>
                <p className="text-xs text-orange-600">
                  {financialMetrics?.outstandingCount || 0} pending invoices
                </p>
              </div>
              <div className="p-3 bg-orange-100 rounded-lg">
                <AlertTriangle className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
          <TabsTrigger value="expenses">Expenses</TabsTrigger>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
          <TabsTrigger value="payroll">Payroll</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Revenue Breakdown Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="w-5 h-5" />
                  Revenue by Service Category
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {revenueBreakdown?.topServices?.map((service: any, index: number) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium">{service.category}</p>
                        <p className="text-sm text-gray-600">{service.testCount} tests</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">{formatCurrency(service.revenue)}</p>
                        <p className="text-sm text-gray-600">{service.percentage}%</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Recent Transactions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Receipt className="w-5 h-5" />
                  Recent Transactions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {transactionHistory?.slice(0, 8).map((transaction: any) => (
                    <div key={transaction.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${
                          transaction.type === 'income' ? 'bg-green-100' : 'bg-red-100'
                        }`}>
                          {transaction.type === 'income' ? 
                            <TrendingUp className="w-4 h-4 text-green-600" /> : 
                            <TrendingDown className="w-4 h-4 text-red-600" />
                          }
                        </div>
                        <div>
                          <p className="font-medium">{transaction.description}</p>
                          <p className="text-sm text-gray-600">
                            {new Date(transaction.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`font-bold ${
                          transaction.type === 'income' ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount)}
                        </p>
                        <Badge className={getStatusBadge(transaction.status)}>
                          {transaction.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="revenue" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Revenue Analysis
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <p className="text-sm text-gray-600">Daily Average</p>
                  <p className="text-2xl font-bold text-green-600">
                    {formatCurrency(revenueBreakdown?.dailyAverage || 0)}
                  </p>
                </div>
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm text-gray-600">Monthly Target</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {formatCurrency(revenueBreakdown?.monthlyTarget || 0)}
                  </p>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <p className="text-sm text-gray-600">Target Achievement</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {revenueBreakdown?.targetAchievement || 0}%
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Payment Method Breakdown</h3>
                {revenueBreakdown?.paymentMethods?.map((method: any, index: number) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <CreditCard className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium">{method.method}</p>
                        <p className="text-sm text-gray-600">{method.transactionCount} transactions</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">{formatCurrency(method.amount)}</p>
                      <p className="text-sm text-gray-600">{method.percentage}%</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="expenses" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingDown className="w-5 h-5" />
                Expense Management
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="text-center p-4 bg-red-50 rounded-lg">
                  <p className="text-sm text-gray-600">Operational Costs</p>
                  <p className="text-xl font-bold text-red-600">
                    {formatCurrency(expenses?.operational || 0)}
                  </p>
                </div>
                <div className="text-center p-4 bg-orange-50 rounded-lg">
                  <p className="text-sm text-gray-600">Staff Salaries</p>
                  <p className="text-xl font-bold text-orange-600">
                    {formatCurrency(expenses?.salaries || 0)}
                  </p>
                </div>
                <div className="text-center p-4 bg-yellow-50 rounded-lg">
                  <p className="text-sm text-gray-600">Equipment</p>
                  <p className="text-xl font-bold text-yellow-600">
                    {formatCurrency(expenses?.equipment || 0)}
                  </p>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <p className="text-sm text-gray-600">Other Expenses</p>
                  <p className="text-xl font-bold text-purple-600">
                    {formatCurrency(expenses?.other || 0)}
                  </p>
                </div>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expenses?.recent?.map((expense: any) => (
                    <TableRow key={expense.id}>
                      <TableCell>{new Date(expense.date).toLocaleDateString()}</TableCell>
                      <TableCell>{expense.category}</TableCell>
                      <TableCell>{expense.description}</TableCell>
                      <TableCell>{formatCurrency(expense.amount)}</TableCell>
                      <TableCell>
                        <Badge className={getStatusBadge(expense.status)}>
                          {expense.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button variant="outline" size="sm">
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="invoices" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Invoice Management
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <p className="text-sm text-gray-600">Paid Invoices</p>
                  <p className="text-xl font-bold text-green-600">
                    {outstandingInvoices?.filter((inv: any) => inv.status === 'paid').length || 0}
                  </p>
                </div>
                <div className="text-center p-4 bg-yellow-50 rounded-lg">
                  <p className="text-sm text-gray-600">Pending Payment</p>
                  <p className="text-xl font-bold text-yellow-600">
                    {outstandingInvoices?.filter((inv: any) => inv.status === 'unpaid').length || 0}
                  </p>
                </div>
                <div className="text-center p-4 bg-red-50 rounded-lg">
                  <p className="text-sm text-gray-600">Overdue</p>
                  <p className="text-xl font-bold text-red-600">
                    {outstandingInvoices?.filter((inv: any) => inv.status === 'overdue').length || 0}
                  </p>
                </div>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Patient</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {outstandingInvoices?.slice(0, 10).map((invoice: any) => (
                    <TableRow key={invoice.id}>
                      <TableCell className="font-medium">{invoice.invoiceNumber}</TableCell>
                      <TableCell>{invoice.patientName}</TableCell>
                      <TableCell>{new Date(invoice.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell>{formatCurrency(invoice.totalAmount)}</TableCell>
                      <TableCell>
                        <Badge className={getStatusBadge(invoice.paymentStatus)}>
                          {invoice.paymentStatus}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="sm">
                            View
                          </Button>
                          {invoice.paymentStatus === 'unpaid' && (
                            <Button size="sm" className="bg-green-600 hover:bg-green-700">
                              Mark Paid
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payroll" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Payroll Management
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm text-gray-600">Total Staff</p>
                  <p className="text-xl font-bold text-blue-600">
                    {payrollData?.totalStaff || 0}
                  </p>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <p className="text-sm text-gray-600">Monthly Payroll</p>
                  <p className="text-xl font-bold text-green-600">
                    {formatCurrency(payrollData?.monthlyTotal || 0)}
                  </p>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <p className="text-sm text-gray-600">Pending Payments</p>
                  <p className="text-xl font-bold text-purple-600">
                    {payrollData?.pendingPayments || 0}
                  </p>
                </div>
              </div>

              <div className="text-center py-8 text-gray-500">
                <p>Payroll management functionality will be implemented based on staff records</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Financial Reports
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <FileText className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium">Income Statement</p>
                      <p className="text-sm text-gray-600">Revenue vs Expenses</p>
                    </div>
                  </div>
                </div>

                <div className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <BarChart3 className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <p className="font-medium">Cash Flow Statement</p>
                      <p className="text-sm text-gray-600">Money in and out</p>
                    </div>
                  </div>
                </div>

                <div className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <PieChart className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="font-medium">Balance Sheet</p>
                      <p className="text-sm text-gray-600">Assets and liabilities</p>
                    </div>
                  </div>
                </div>

                <div className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-orange-100 rounded-lg">
                      <TrendingUp className="w-5 h-5 text-orange-600" />
                    </div>
                    <div>
                      <p className="font-medium">Performance Report</p>
                      <p className="text-sm text-gray-600">KPIs and metrics</p>
                    </div>
                  </div>
                </div>

                <div className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-red-100 rounded-lg">
                      <Receipt className="w-5 h-5 text-red-600" />
                    </div>
                    <div>
                      <p className="font-medium">Tax Report</p>
                      <p className="text-sm text-gray-600">Tax obligations</p>
                    </div>
                  </div>
                </div>

                <div className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-yellow-100 rounded-lg">
                      <Calendar className="w-5 h-5 text-yellow-600" />
                    </div>
                    <div>
                      <p className="font-medium">Budget Analysis</p>
                      <p className="text-sm text-gray-600">Budget vs actual</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* New Expense Dialog */}
      <Dialog open={showNewExpenseDialog} onOpenChange={setShowNewExpenseDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Record New Expense</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="expenseCategory">Category</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="operational">Operational</SelectItem>
                    <SelectItem value="equipment">Equipment</SelectItem>
                    <SelectItem value="utilities">Utilities</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                    <SelectItem value="supplies">Medical Supplies</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="expenseAmount">Amount (₦)</Label>
                <Input
                  id="expenseAmount"
                  type="number"
                  placeholder="0.00"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="expenseDescription">Description</Label>
              <Input
                id="expenseDescription"
                placeholder="Brief description of the expense"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="expenseNotes">Notes (Optional)</Label>
              <Textarea
                id="expenseNotes"
                placeholder="Additional notes or details"
                rows={3}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowNewExpenseDialog(false)}>
              Cancel
            </Button>
            <Button>
              Record Expense
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Payment Processing Dialog */}
      <Dialog open={showNewPaymentDialog} onOpenChange={setShowNewPaymentDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Process Payment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="paymentType">Payment Type</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Select payment type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="invoice">Invoice Payment</SelectItem>
                  <SelectItem value="expense">Expense Payment</SelectItem>
                  <SelectItem value="salary">Salary Payment</SelectItem>
                  <SelectItem value="vendor">Vendor Payment</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="paymentAmount">Amount (₦)</Label>
                <Input
                  id="paymentAmount"
                  type="number"
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="paymentMethod">Method</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Payment method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="card">Card</SelectItem>
                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                    <SelectItem value="check">Check</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="paymentReference">Reference/Invoice Number</Label>
              <Input
                id="paymentReference"
                placeholder="Enter reference number"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="paymentNotes">Notes</Label>
              <Textarea
                id="paymentNotes"
                placeholder="Payment notes or details"
                rows={3}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowNewPaymentDialog(false)}>
              Cancel
            </Button>
            <Button>
              Process Payment
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
        headers: { 'Cache-Control': 'no-cache' }
      });
      if (!response.ok) throw new Error('Failed to fetch supply orders');
      return response.json();
    }
  });

  // Bank reconciliation data
  const { data: bankReconciliation, isLoading: bankLoading } = useQuery({
    queryKey: ['/api/financial/bank-reconciliation', dateRange],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('range', dateRange);
      
      const response = await fetch(`/api/financial/bank-reconciliation?${params}`, {
        headers: { 'Cache-Control': 'no-cache' }
      });
      if (!response.ok) throw new Error('Failed to fetch bank reconciliation');
      return response.json();
    }
  });

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/">
            <Button variant="outline" size="sm" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Dashboard
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Comprehensive Financial Management</h1>
            <p className="text-gray-600">Income statements, balance sheets, inventory control, and bank reconciliation</p>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <Button variant="outline" className="flex items-center gap-2">
            <Download className="w-4 h-4" />
            Export Reports
          </Button>
          <Button className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Generate Statement
          </Button>
        </div>
      </div>

      {/* Date Range Filter */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Label>Period:</Label>
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="month">This Month</SelectItem>
                  <SelectItem value="quarter">This Quarter</SelectItem>
                  <SelectItem value="year">This Year</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {dateRange === 'custom' && (
              <div className="flex items-center gap-2">
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-40"
                />
                <span>to</span>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-40"
                />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Main Tabs */}
      <Tabs defaultValue="statements" className="space-y-6">
        <TabsList>
          <TabsTrigger value="statements">Financial Statements</TabsTrigger>
          <TabsTrigger value="inventory">Inventory Control</TabsTrigger>
          <TabsTrigger value="procurement">Supply Ordering</TabsTrigger>
          <TabsTrigger value="reconciliation">Bank Reconciliation</TabsTrigger>
          <TabsTrigger value="costing">Procedure Costing</TabsTrigger>
        </TabsList>

        <TabsContent value="statements" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Income Statement */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                  Income Statement
                </CardTitle>
              </CardHeader>
              <CardContent>
                {incomeLoading ? (
                  <div className="text-center py-8">Loading income statement...</div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center p-3 bg-green-50 rounded">
                      <span className="font-medium">Total Revenue</span>
                      <span className="text-2xl font-bold text-green-600">
                        ₦{incomeStatement?.totalRevenue?.toLocaleString() || '0'}
                      </span>
                    </div>
                    
                    <div className="space-y-2">
                      <h4 className="font-medium text-gray-700">Revenue Breakdown</h4>
                      {incomeStatement?.revenueBreakdown?.map((item: any) => (
                        <div key={item.category} className="flex justify-between">
                          <span>{item.category}</span>
                          <span>₦{item.amount?.toLocaleString()}</span>
                        </div>
                      )) || (
                        <div className="text-gray-500">No revenue data available</div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <h4 className="font-medium text-gray-700">Operating Expenses</h4>
                      {incomeStatement?.expenses?.map((expense: any) => (
                        <div key={expense.category} className="flex justify-between">
                          <span>{expense.category}</span>
                          <span className="text-red-600">₦{expense.amount?.toLocaleString()}</span>
                        </div>
                      )) || (
                        <div className="text-gray-500">No expense data available</div>
                      )}
                    </div>

                    <div className="flex justify-between items-center p-3 bg-blue-50 rounded border-t">
                      <span className="font-medium">Net Income</span>
                      <span className="text-xl font-bold text-blue-600">
                        ₦{incomeStatement?.netIncome?.toLocaleString() || '0'}
                      </span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Balance Sheet */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="w-5 h-5 text-blue-600" />
                  Balance Sheet
                </CardTitle>
              </CardHeader>
              <CardContent>
                {balanceLoading ? (
                  <div className="text-center py-8">Loading balance sheet...</div>
                ) : (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <h4 className="font-medium text-gray-700">Assets</h4>
                      <div className="space-y-1">
                        <div className="flex justify-between">
                          <span>Cash & Bank</span>
                          <span>₦{balanceSheet?.assets?.cash?.toLocaleString() || '0'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Accounts Receivable</span>
                          <span>₦{balanceSheet?.assets?.receivables?.toLocaleString() || '0'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Inventory</span>
                          <span>₦{balanceSheet?.assets?.inventory?.toLocaleString() || '0'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Equipment</span>
                          <span>₦{balanceSheet?.assets?.equipment?.toLocaleString() || '0'}</span>
                        </div>
                      </div>
                      <div className="flex justify-between font-medium pt-2 border-t">
                        <span>Total Assets</span>
                        <span>₦{balanceSheet?.totalAssets?.toLocaleString() || '0'}</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <h4 className="font-medium text-gray-700">Liabilities</h4>
                      <div className="space-y-1">
                        <div className="flex justify-between">
                          <span>Accounts Payable</span>
                          <span>₦{balanceSheet?.liabilities?.payables?.toLocaleString() || '0'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Short-term Debt</span>
                          <span>₦{balanceSheet?.liabilities?.shortTermDebt?.toLocaleString() || '0'}</span>
                        </div>
                      </div>
                      <div className="flex justify-between font-medium pt-2 border-t">
                        <span>Total Liabilities</span>
                        <span>₦{balanceSheet?.totalLiabilities?.toLocaleString() || '0'}</span>
                      </div>
                    </div>

                    <div className="flex justify-between items-center p-3 bg-green-50 rounded">
                      <span className="font-medium">Owner's Equity</span>
                      <span className="text-xl font-bold text-green-600">
                        ₦{balanceSheet?.equity?.toLocaleString() || '0'}
                      </span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="inventory" className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Inventory Management</h2>
            <div className="flex gap-2">
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="medical-supplies">Medical Supplies</SelectItem>
                  <SelectItem value="laboratory">Laboratory Reagents</SelectItem>
                  <SelectItem value="pharmaceuticals">Pharmaceuticals</SelectItem>
                  <SelectItem value="equipment">Equipment</SelectItem>
                </SelectContent>
              </Select>
              <Button className="flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Add Item
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Package className="w-5 h-5 text-blue-600" />
                  <div>
                    <p className="text-sm font-medium">Total Items</p>
                    <p className="text-2xl font-bold">
                      {inventoryItems?.summary?.totalItems || 0}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-yellow-600" />
                  <div>
                    <p className="text-sm font-medium">Low Stock</p>
                    <p className="text-2xl font-bold text-yellow-600">
                      {inventoryItems?.summary?.lowStock || 0}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-green-600" />
                  <div>
                    <p className="text-sm font-medium">Total Value</p>
                    <p className="text-2xl font-bold">
                      ₦{inventoryItems?.summary?.totalValue?.toLocaleString() || '0'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <TrendingDown className="w-5 h-5 text-red-600" />
                  <div>
                    <p className="text-sm font-medium">Out of Stock</p>
                    <p className="text-2xl font-bold text-red-600">
                      {inventoryItems?.summary?.outOfStock || 0}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Current Stock</TableHead>
                    <TableHead>Min Level</TableHead>
                    <TableHead>Unit Cost</TableHead>
                    <TableHead>Total Value</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {inventoryItems?.items?.map((item: any) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell>{item.category}</TableCell>
                      <TableCell>{item.currentStock}</TableCell>
                      <TableCell>{item.minLevel}</TableCell>
                      <TableCell>₦{item.unitCost?.toLocaleString()}</TableCell>
                      <TableCell>₦{(item.currentStock * item.unitCost)?.toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge variant={
                          item.currentStock === 0 ? 'destructive' :
                          item.currentStock <= item.minLevel ? 'secondary' :
                          'default'
                        }>
                          {item.currentStock === 0 ? 'Out of Stock' :
                           item.currentStock <= item.minLevel ? 'Low Stock' :
                           'In Stock'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm">
                            <Plus className="w-4 h-4" />
                          </Button>
                          <Button variant="outline" size="sm">
                            <Minus className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )) || (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8">
                        {inventoryLoading ? 'Loading inventory...' : 'No inventory items found'}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="procurement" className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Supply Ordering System</h2>
            <Button className="flex items-center gap-2">
              <ShoppingCart className="w-4 h-4" />
              Create Purchase Order
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-yellow-600" />
                  <div>
                    <p className="text-sm font-medium">Pending Orders</p>
                    <p className="text-2xl font-bold">
                      {supplyOrders?.summary?.pending || 0}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <div>
                    <p className="text-sm font-medium">Completed Orders</p>
                    <p className="text-2xl font-bold">
                      {supplyOrders?.summary?.completed || 0}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-blue-600" />
                  <div>
                    <p className="text-sm font-medium">Total Value</p>
                    <p className="text-2xl font-bold">
                      ₦{supplyOrders?.summary?.totalValue?.toLocaleString() || '0'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Recent Purchase Orders</CardTitle>
            </CardHeader>
            <CardContent>
              {ordersLoading ? (
                <div className="text-center py-8">Loading orders...</div>
              ) : (
                <div className="space-y-4">
                  {supplyOrders?.orders?.map((order: any) => (
                    <div key={order.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <h3 className="font-medium">{order.supplier}</h3>
                        <p className="text-sm text-gray-600">PO: {order.orderNumber} - {order.orderDate}</p>
                        <p className="text-xs text-gray-500">{order.itemCount} items</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">₦{order.totalAmount?.toLocaleString()}</p>
                        <Badge variant={
                          order.status === 'delivered' ? 'default' :
                          order.status === 'pending' ? 'secondary' :
                          'outline'
                        }>
                          {order.status}
                        </Badge>
                      </div>
                    </div>
                  )) || (
                    <div className="text-center py-8 text-gray-500">
                      No purchase orders found
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reconciliation" className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Bank Reconciliation</h2>
            <div className="flex gap-2">
              <Button variant="outline" className="flex items-center gap-2">
                <Upload className="w-4 h-4" />
                Import Bank Statement
              </Button>
              <Button className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                Reconcile
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-blue-600" />
                  <div>
                    <p className="text-sm font-medium">Bank Balance</p>
                    <p className="text-2xl font-bold">
                      ₦{bankReconciliation?.bankBalance?.toLocaleString() || '0'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Receipt className="w-5 h-5 text-green-600" />
                  <div>
                    <p className="text-sm font-medium">Book Balance</p>
                    <p className="text-2xl font-bold">
                      ₦{bankReconciliation?.bookBalance?.toLocaleString() || '0'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-yellow-600" />
                  <div>
                    <p className="text-sm font-medium">Unmatched Items</p>
                    <p className="text-2xl font-bold text-yellow-600">
                      {bankReconciliation?.unmatchedItems || 0}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <TrendingDown className="w-5 h-5 text-red-600" />
                  <div>
                    <p className="text-sm font-medium">Difference</p>
                    <p className="text-2xl font-bold text-red-600">
                      ₦{bankReconciliation?.difference?.toLocaleString() || '0'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Reconciliation Details</CardTitle>
            </CardHeader>
            <CardContent>
              {bankLoading ? (
                <div className="text-center py-8">Loading reconciliation data...</div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  Bank reconciliation data will be available once bank statements are imported
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="costing" className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Procedure Costing Analysis</h2>
            <Button className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Generate Cost Report
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-green-600" />
                  <div>
                    <p className="text-sm font-medium">Average Cost per Test</p>
                    <p className="text-2xl font-bold">₦8,500</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-blue-600" />
                  <div>
                    <p className="text-sm font-medium">Profit Margin</p>
                    <p className="text-2xl font-bold">65%</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-purple-600" />
                  <div>
                    <p className="text-sm font-medium">Most Profitable</p>
                    <p className="text-lg font-bold">ECG Tests</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Cost Breakdown by Procedure</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-gray-500">
                Procedure costing analysis will be available once cost data is configured
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}