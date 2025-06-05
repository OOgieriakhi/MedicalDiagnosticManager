import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { JournalEntryForm } from "@/components/JournalEntryForm";
import { 
  DollarSign,
  TrendingUp,
  TrendingDown,
  BarChart3,
  PieChart,
  Calculator,
  FileText,
  CreditCard,
  Wallet,
  Building,
  Calendar,
  Plus,
  Edit,
  Eye,
  Download,
  Upload,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Clock,
  Filter,
  Search,
  Home
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar, PieChart as RechartsPieChart, Cell } from "recharts";

interface AccountBalance {
  id: number;
  accountCode: string;
  accountName: string;
  accountType: string;
  currentBalance: number;
  previousBalance: number;
  variance: number;
  variancePercent: number;
}

interface FinancialSummary {
  totalAssets: number;
  totalLiabilities: number;
  totalEquity: number;
  totalRevenue: number;
  totalExpenses: number;
  netIncome: number;
  currentRatio: number;
  quickRatio: number;
}

interface JournalEntry {
  id: number;
  entryNumber: string;
  entryDate: string;
  description: string;
  totalDebit: number;
  totalCredit: number;
  status: string;
  createdBy: string;
  referenceType: string;
  referenceNumber: string;
}

interface CashFlowData {
  month: string;
  inflow: number;
  outflow: number;
  netFlow: number;
}

export default function AccountingDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedPeriod, setSelectedPeriod] = useState("current");
  const [selectedAccountType, setSelectedAccountType] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  // Financial Summary
  const { data: financialSummary, isLoading: summaryLoading } = useQuery({
    queryKey: ['/api/accounting/summary', user?.branchId, selectedPeriod],
    queryFn: async () => {
      const response = await fetch(`/api/accounting/summary?branchId=${user?.branchId}&period=${selectedPeriod}`);
      if (!response.ok) throw new Error('Failed to fetch financial summary');
      return response.json() as FinancialSummary;
    }
  });

  // Account Balances
  const { data: accountBalances, isLoading: balancesLoading } = useQuery({
    queryKey: ['/api/accounting/balances', user?.branchId, selectedAccountType, searchTerm],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (user?.branchId) params.append('branchId', user.branchId.toString());
      if (selectedAccountType !== 'all') params.append('accountType', selectedAccountType);
      if (searchTerm) params.append('search', searchTerm);
      
      const response = await fetch(`/api/accounting/balances?${params}`);
      if (!response.ok) throw new Error('Failed to fetch account balances');
      return response.json() as AccountBalance[];
    }
  });

  // Recent Journal Entries
  const { data: journalEntries, isLoading: entriesLoading } = useQuery({
    queryKey: ['/api/accounting/journal-entries', user?.branchId],
    queryFn: async () => {
      const response = await fetch(`/api/accounting/journal-entries?branchId=${user?.branchId}&limit=10`);
      if (!response.ok) throw new Error('Failed to fetch journal entries');
      return response.json() as JournalEntry[];
    }
  });

  // Cash Flow Data
  const { data: cashFlowData, isLoading: cashFlowLoading } = useQuery({
    queryKey: ['/api/accounting/cash-flow', user?.branchId],
    queryFn: async () => {
      const response = await fetch(`/api/accounting/cash-flow?branchId=${user?.branchId}`);
      if (!response.ok) throw new Error('Failed to fetch cash flow data');
      return response.json() as CashFlowData[];
    }
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const getVarianceColor = (variance: number) => {
    if (variance > 0) return 'text-green-600';
    if (variance < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'posted': return 'bg-green-100 text-green-800';
      case 'draft': return 'bg-yellow-100 text-yellow-800';
      case 'reversed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
            <Home className="w-5 h-5" />
            <span>Home</span>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Accounting & Financial Management</h1>
            <p className="text-sm text-gray-600">Comprehensive financial oversight and reporting</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="current">Current Period</SelectItem>
              <SelectItem value="previous">Previous Period</SelectItem>
              <SelectItem value="ytd">Year to Date</SelectItem>
              <SelectItem value="custom">Custom Range</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button size="sm">
            <Plus className="w-4 h-4 mr-2" />
            New Entry
          </Button>
        </div>
      </div>

      {/* Financial Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Assets</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {formatCurrency(financialSummary?.totalAssets || 0)}
                  </p>
                  <p className="text-xs text-blue-600">
                    +12.5% from last month
                  </p>
                </div>
                <div className="p-3 bg-blue-100 rounded-lg">
                  <Wallet className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                  <p className="text-2xl font-bold text-green-600">
                    {formatCurrency(financialSummary?.totalRevenue || 0)}
                  </p>
                  <p className="text-xs text-green-600">
                    +8.3% from last month
                  </p>
                </div>
                <div className="p-3 bg-green-100 rounded-lg">
                  <TrendingUp className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Expenses</p>
                  <p className="text-2xl font-bold text-red-600">
                    {formatCurrency(financialSummary?.totalExpenses || 0)}
                  </p>
                  <p className="text-xs text-red-600">
                    +3.1% from last month
                  </p>
                </div>
                <div className="p-3 bg-red-100 rounded-lg">
                  <TrendingDown className="w-6 h-6 text-red-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Net Income</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {formatCurrency(financialSummary?.netIncome || 0)}
                  </p>
                  <p className="text-xs text-purple-600">
                    +15.2% from last month
                  </p>
                </div>
                <div className="p-3 bg-purple-100 rounded-lg">
                  <Calculator className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="accounts">Chart of Accounts</TabsTrigger>
          <TabsTrigger value="journal">Journal Entries</TabsTrigger>
          <TabsTrigger value="reports">Financial Reports</TabsTrigger>
          <TabsTrigger value="budgets">Budgets & Analysis</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Cash Flow Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  Cash Flow Trend
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={cashFlowData || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                    <Line type="monotone" dataKey="inflow" stroke="#22c55e" strokeWidth={2} />
                    <Line type="monotone" dataKey="outflow" stroke="#ef4444" strokeWidth={2} />
                    <Line type="monotone" dataKey="netFlow" stroke="#3b82f6" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Financial Ratios */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="w-5 h-5" />
                  Key Financial Ratios
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <span className="font-medium">Current Ratio</span>
                    <span className="text-lg font-bold text-blue-600">
                      {financialSummary?.currentRatio?.toFixed(2) || '0.00'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <span className="font-medium">Quick Ratio</span>
                    <span className="text-lg font-bold text-green-600">
                      {financialSummary?.quickRatio?.toFixed(2) || '0.00'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <span className="font-medium">Debt-to-Equity</span>
                    <span className="text-lg font-bold text-orange-600">
                      {((financialSummary?.totalLiabilities || 0) / (financialSummary?.totalEquity || 1)).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <span className="font-medium">Profit Margin</span>
                    <span className="text-lg font-bold text-purple-600">
                      {(((financialSummary?.netIncome || 0) / (financialSummary?.totalRevenue || 1)) * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Journal Entries */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Recent Journal Entries
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Entry #</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Debit</TableHead>
                    <TableHead>Credit</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {journalEntries?.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="font-medium">{entry.entryNumber}</TableCell>
                      <TableCell>{new Date(entry.entryDate).toLocaleDateString()}</TableCell>
                      <TableCell>{entry.description}</TableCell>
                      <TableCell>{formatCurrency(entry.totalDebit)}</TableCell>
                      <TableCell>{formatCurrency(entry.totalCredit)}</TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(entry.status)}>
                          {entry.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="sm">
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Edit className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="accounts" className="space-y-6">
          {/* Account Filters */}
          <Card>
            <CardHeader>
              <CardTitle>Chart of Accounts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4 mb-6">
                <div className="flex-1">
                  <Label htmlFor="search">Search Accounts</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="search"
                      placeholder="Search by account name or code..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <div>
                  <Label>Account Type</Label>
                  <Select value={selectedAccountType} onValueChange={setSelectedAccountType}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="asset">Assets</SelectItem>
                      <SelectItem value="liability">Liabilities</SelectItem>
                      <SelectItem value="equity">Equity</SelectItem>
                      <SelectItem value="revenue">Revenue</SelectItem>
                      <SelectItem value="expense">Expenses</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Account
                </Button>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Account Code</TableHead>
                    <TableHead>Account Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Current Balance</TableHead>
                    <TableHead>Previous Balance</TableHead>
                    <TableHead>Variance</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {accountBalances?.map((account) => (
                    <TableRow key={account.id}>
                      <TableCell className="font-medium">{account.accountCode}</TableCell>
                      <TableCell>{account.accountName}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{account.accountType}</Badge>
                      </TableCell>
                      <TableCell>{formatCurrency(account.currentBalance)}</TableCell>
                      <TableCell>{formatCurrency(account.previousBalance)}</TableCell>
                      <TableCell className={getVarianceColor(account.variance)}>
                        {formatCurrency(account.variance)}
                        {account.variancePercent !== 0 && (
                          <span className="ml-2">
                            ({account.variancePercent > 0 ? '+' : ''}{account.variancePercent.toFixed(1)}%)
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="sm">
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Edit className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="journal" className="space-y-6">
          {/* Journal Entry Management */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Journal Entries</span>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  New Journal Entry
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <Input placeholder="Search entries..." className="flex-1" />
                  <Select defaultValue="all">
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="posted">Posted</SelectItem>
                      <SelectItem value="reversed">Reversed</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="outline">
                    <Filter className="w-4 h-4 mr-2" />
                    Filter
                  </Button>
                </div>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Entry Number</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Reference</TableHead>
                      <TableHead>Debit Amount</TableHead>
                      <TableHead>Credit Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created By</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {journalEntries?.map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell className="font-medium">{entry.entryNumber}</TableCell>
                        <TableCell>{new Date(entry.entryDate).toLocaleDateString()}</TableCell>
                        <TableCell>{entry.description}</TableCell>
                        <TableCell>
                          {entry.referenceType && (
                            <span className="text-sm">
                              {entry.referenceType}: {entry.referenceNumber}
                            </span>
                          )}
                        </TableCell>
                        <TableCell>{formatCurrency(entry.totalDebit)}</TableCell>
                        <TableCell>{formatCurrency(entry.totalCredit)}</TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(entry.status)}>
                            {entry.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{entry.createdBy}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button variant="ghost" size="sm">
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="sm">
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="sm">
                              <Download className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports" className="space-y-6">
          {/* Financial Reports */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <FileText className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Balance Sheet</h3>
                    <p className="text-sm text-gray-600">Assets, Liabilities & Equity</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-green-100 rounded-lg">
                    <TrendingUp className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Income Statement</h3>
                    <p className="text-sm text-gray-600">Revenue & Expenses</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-purple-100 rounded-lg">
                    <BarChart3 className="w-6 h-6 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Cash Flow Statement</h3>
                    <p className="text-sm text-gray-600">Operating, Investing & Financing</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-orange-100 rounded-lg">
                    <Calculator className="w-6 h-6 text-orange-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Trial Balance</h3>
                    <p className="text-sm text-gray-600">All Account Balances</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-red-100 rounded-lg">
                    <PieChart className="w-6 h-6 text-red-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold">General Ledger</h3>
                    <p className="text-sm text-gray-600">Detailed Account Activity</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-yellow-100 rounded-lg">
                    <Building className="w-6 h-6 text-yellow-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Aged Receivables</h3>
                    <p className="text-sm text-gray-600">Outstanding Patient Balances</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="budgets" className="space-y-6">
          {/* Budget Management */}
          <Card>
            <CardHeader>
              <CardTitle>Budget vs Actual Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Calculator className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <p className="text-gray-600">Budget management and variance analysis coming soon...</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}