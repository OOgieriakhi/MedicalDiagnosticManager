import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { apiRequest } from "@/lib/queryClient";
import { toast } from "@/hooks/use-toast";
import {
  Check, XCircle, AlertTriangle, Eye, Edit, DollarSign,
  Users, TrendingUp, Clock, FileText, Filter, Search, Download,
  RefreshCw, Calculator, CreditCard, Banknote, Smartphone
} from "lucide-react";

interface Transaction {
  id: number;
  receipt_number: string;
  patient_name: string;
  amount: number;
  payment_method: string;
  transaction_time: string;
  cashier_name: string;
  verification_status: string;
  verification_notes?: string;
  verified_by?: string;
  verified_at?: string;
}

interface VerificationMetrics {
  totalTransactions: number;
  verifiedTransactions: number;
  pendingTransactions: number;
  flaggedTransactions: number;
  totalRevenue: number;
  cashRevenue: number;
  posRevenue: number;
  transferRevenue: number;
}

export default function TransactionVerificationDashboard() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Check if user has verification permissions
  const canVerifyTransactions = user?.role && ['admin', 'manager', 'branch_manager', 'accountant', 'finance_director', 'ceo'].includes(user.role);

  const [selectedBranchId, setSelectedBranchId] = useState(user?.branchId || 1);
  const [activeTab, setActiveTab] = useState("overview");
  const [filterStatus, setFilterStatus] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [verificationNotes, setVerificationNotes] = useState("");
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [dateRange, setDateRange] = useState({
    from: new Date().toISOString().split('T')[0], // Today
    to: new Date().toISOString().split('T')[0]     // Today
  });

  // Fetch transactions with date range
  const { data: transactions = [], isLoading: transactionsLoading, refetch } = useQuery({
    queryKey: ['/api/daily-transactions', dateRange.from, dateRange.to],
    queryFn: () => {
      const params = new URLSearchParams({
        from: dateRange.from,
        to: dateRange.to
      });
      return fetch(`/api/daily-transactions?${params}`).then(res => res.json());
    },
    refetchInterval: 30000,
  });

  // Fetch dashboard data for metrics
  const { data: dashboardData } = useQuery({
    queryKey: ['/api/dashboard-data'],
    refetchInterval: 30000,
  });

  // Verification mutation
  const verifyTransactionMutation = useMutation({
    mutationFn: async ({ transactionId, status, notes }: { transactionId: number; status: string; notes: string }) => {
      return apiRequest('POST', `/api/transactions/${transactionId}/verify`, {
        verification_status: status,
        notes
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/daily-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard-data'] });
      toast({ title: "Transaction verification updated successfully" });
      setVerificationNotes("");
      setSelectedTransaction(null);
    },
    onError: (error) => {
      toast({ title: "Error updating verification", description: error.message, variant: "destructive" });
    }
  });

  // Export report mutation
  const exportReportMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/export-verification-report', {
        dateRange,
        filterStatus,
        branchId: selectedBranchId
      });
      return response.blob();
    },
    onSuccess: (blob) => {
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `verification-report-${dateRange.from}-to-${dateRange.to}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast({ title: "Report exported successfully" });
    },
    onError: (error) => {
      toast({ title: "Export failed", description: error.message, variant: "destructive" });
    }
  });

  // Ensure transactions is always an array
  const transactionsArray = Array.isArray(transactions) ? transactions : [];

  // Calculate verification metrics
  const verificationMetrics: VerificationMetrics = {
    totalTransactions: transactionsArray.length,
    verifiedTransactions: transactionsArray.filter((t: Transaction) => t.verification_status === 'verified').length,
    pendingTransactions: transactionsArray.filter((t: Transaction) => t.verification_status === 'pending').length,
    flaggedTransactions: transactionsArray.filter((t: Transaction) => t.verification_status === 'flagged').length,
    totalRevenue: dashboardData?.revenue?.total || 0,
    cashRevenue: dashboardData?.revenue?.cash || 0,
    posRevenue: dashboardData?.revenue?.pos || 0,
    transferRevenue: dashboardData?.revenue?.transfer || 0,
  };

  // Filter transactions
  const filteredTransactions = transactionsArray.filter((transaction: Transaction) => {
    const matchesSearch = transaction.patient_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         transaction.receipt_number?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === "all" || transaction.verification_status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const handleVerifyTransaction = (transactionId: number, status: 'verified' | 'flagged' | 'pending') => {
    verifyTransactionMutation.mutate({
      transactionId,
      status,
      notes: verificationNotes
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'verified': return <Check className="w-4 h-4 text-green-600" />;
      case 'flagged': return <XCircle className="w-4 h-4 text-red-600" />;
      case 'pending': return <Clock className="w-4 h-4 text-yellow-600" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'verified': return <Badge className="bg-green-100 text-green-800">Verified</Badge>;
      case 'flagged': return <Badge className="bg-red-100 text-red-800">Flagged</Badge>;
      case 'pending': return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>;
      default: return <Badge className="bg-gray-100 text-gray-800">Unknown</Badge>;
    }
  };

  const getPaymentIcon = (method: string) => {
    switch (method.toLowerCase()) {
      case 'cash': return <Banknote className="w-4 h-4 text-green-600" />;
      case 'pos': return <CreditCard className="w-4 h-4 text-blue-600" />;
      case 'transfer': return <Smartphone className="w-4 h-4 text-purple-600" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  if (!user) return null;

  // Show unauthorized message for users without verification permissions
  if (!canVerifyTransactions) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="flex flex-col h-screen overflow-hidden">
          <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-blue-600 to-blue-700 text-white">
            <div>
              <h1 className="text-2xl font-bold">Transaction Verification Center</h1>
              <p className="text-blue-100 mt-1">Real-time transaction monitoring and verification</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm text-blue-100">Active Session</p>
                <p className="font-semibold">{user?.firstName} {user?.lastName}</p>
              </div>
              <Button 
                variant="secondary" 
                size="sm" 
                onClick={() => window.location.href = '/'}
                className="bg-white text-blue-600 hover:bg-blue-50"
              >
                Back to System
              </Button>
            </div>
          </div>
          
          <main className="flex-1 overflow-y-auto p-6">
            <Card>
              <CardContent className="p-8 text-center">
                <AlertTriangle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
                <h2 className="text-2xl font-bold mb-2">Access Restricted</h2>
                <p className="text-gray-600 mb-4">
                  You don't have permission to access the transaction verification dashboard.
                </p>
                <p className="text-sm text-gray-500">
                  This feature is available to: Admin, Manager, Branch Manager, Accountant, Finance Director, and CEO roles.
                </p>
              </CardContent>
            </Card>
          </main>
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider delayDuration={300}>
      <div className="min-h-screen bg-gray-50">
        <div className="flex flex-col h-screen overflow-hidden">
          <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-blue-600 to-blue-700 text-white">
            <div>
              <h1 className="text-2xl font-bold">Transaction Verification Center</h1>
              <p className="text-blue-100 mt-1">Real-time transaction monitoring and verification</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm text-blue-100">Active Session</p>
                <p className="font-semibold">{user?.firstName} {user?.lastName}</p>
              </div>
              <div className="bg-blue-500 px-3 py-2 rounded-lg">
                <p className="text-xs text-blue-100">Branch</p>
                <p className="font-semibold">Main Branch</p>
              </div>
              <div className="flex items-center gap-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="secondary" 
                      size="sm" 
                      onClick={() => refetch()}
                      disabled={transactionsLoading}
                      className="bg-white text-blue-600 hover:bg-blue-50"
                    >
                      <RefreshCw className={`w-4 h-4 mr-2 ${transactionsLoading ? 'animate-spin' : ''}`} />
                      Refresh
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Refresh transaction data manually</p>
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="secondary" 
                      size="sm" 
                      onClick={() => window.location.href = '/'}
                      className="bg-white text-blue-600 hover:bg-blue-50"
                    >
                      Back to System
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Return to main ERP dashboard</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>
          </div>
        
        {/* Quick Stats Bar */}
        <div className="bg-white border-b px-6 py-4">
          <div className="grid grid-cols-4 gap-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <Check className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Verified Today</p>
                <p className="text-xl font-bold text-green-600">{verificationMetrics.verifiedTransactions}</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                <Clock className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Pending Review</p>
                <p className="text-xl font-bold text-yellow-600">{verificationMetrics.pendingTransactions}</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Flagged</p>
                <p className="text-xl font-bold text-red-600">{verificationMetrics.flaggedTransactions}</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Revenue</p>
                <p className="text-xl font-bold text-blue-600">₦{verificationMetrics.totalRevenue.toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>

        <main className="flex-1 overflow-y-auto p-6">
          {/* Control Panel */}
          <div className="mb-6 bg-white rounded-lg border p-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Transaction Control Panel</h2>
                <p className="text-sm text-gray-500">Monitor and verify all daily transactions</p>
              </div>
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-sm text-gray-600">Live Monitoring</span>
                </div>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => exportReportMutation.mutate()}
                      disabled={exportReportMutation.isPending}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      {exportReportMutation.isPending ? "Exporting..." : "Export Report"}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Export transaction verification report as CSV</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4 mb-6">
              <TabsTrigger value="overview">Live Monitor</TabsTrigger>
              <TabsTrigger value="pending">Pending Review</TabsTrigger>
              <TabsTrigger value="verified">Verified</TabsTrigger>
              <TabsTrigger value="flagged">Flagged Items</TabsTrigger>
            </TabsList>

            <TabsContent value="overview">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="w-5 h-5" />
                      Daily Transaction Verification
                    </CardTitle>
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <Input
                          placeholder="Search by patient or receipt..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="pl-10 w-64"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="text-sm font-medium text-gray-700">From:</label>
                        <Input
                          type="date"
                          value={dateRange.from}
                          onChange={(e) => setDateRange(prev => ({ ...prev, from: e.target.value }))}
                          className="w-40"
                        />
                        <label className="text-sm font-medium text-gray-700">To:</label>
                        <Input
                          type="date"
                          value={dateRange.to}
                          onChange={(e) => setDateRange(prev => ({ ...prev, to: e.target.value }))}
                          className="w-40"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const today = new Date().toISOString().split('T')[0];
                            setDateRange({ from: today, to: today });
                          }}
                        >
                          Today
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const today = new Date();
                            const yesterday = new Date(today);
                            yesterday.setDate(yesterday.getDate() - 1);
                            const yesterdayStr = yesterday.toISOString().split('T')[0];
                            setDateRange({ from: yesterdayStr, to: yesterdayStr });
                          }}
                        >
                          Yesterday
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const today = new Date();
                            const lastWeek = new Date(today);
                            lastWeek.setDate(lastWeek.getDate() - 7);
                            setDateRange({ 
                              from: lastWeek.toISOString().split('T')[0], 
                              to: today.toISOString().split('T')[0] 
                            });
                          }}
                        >
                          Last 7 Days
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const today = new Date();
                            const lastMonth = new Date(today);
                            lastMonth.setDate(lastMonth.getDate() - 30);
                            setDateRange({ 
                              from: lastMonth.toISOString().split('T')[0], 
                              to: today.toISOString().split('T')[0] 
                            });
                          }}
                        >
                          Last 30 Days
                        </Button>
                      </div>
                      <Select value={filterStatus} onValueChange={setFilterStatus}>
                        <SelectTrigger className="w-40">
                          <SelectValue placeholder="All Status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Status</SelectItem>
                          <SelectItem value="verified">Verified</SelectItem>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="flagged">Flagged</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-3 px-4">Receipt</th>
                          <th className="text-left py-3 px-4">Patient</th>
                          <th className="text-left py-3 px-4">Amount</th>
                          <th className="text-left py-3 px-4">Payment Method</th>
                          <th className="text-left py-3 px-4">Time</th>
                          <th className="text-left py-3 px-4">Status</th>
                          <th className="text-left py-3 px-4">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredTransactions.map((transaction: Transaction) => (
                          <tr key={transaction.id} className="border-b hover:bg-gray-50">
                            <td className="py-3 px-4 font-mono text-sm">{transaction.receipt_number}</td>
                            <td className="py-3 px-4">
                              <div>
                                <p className="font-medium">{transaction.patient_name}</p>
                                <p className="text-sm text-gray-500">{transaction.cashier_name}</p>
                              </div>
                            </td>
                            <td className="py-3 px-4 font-semibold">₦{transaction.amount?.toLocaleString()}</td>
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2">
                                {getPaymentIcon(transaction.payment_method)}
                                <span className="text-sm">{transaction.payment_method}</span>
                              </div>
                            </td>
                            <td className="py-3 px-4 text-sm text-gray-500">
                              {new Date(transaction.transaction_time).toLocaleTimeString()}
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2">
                                {getStatusIcon(transaction.verification_status)}
                                {getStatusBadge(transaction.verification_status)}
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2">
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleVerifyTransaction(transaction.id, 'verified')}
                                      disabled={verifyTransactionMutation.isPending}
                                      className="text-green-600 hover:bg-green-50 border-green-200"
                                    >
                                      <Check className="w-4 h-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Mark transaction as verified</p>
                                  </TooltipContent>
                                </Tooltip>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleVerifyTransaction(transaction.id, 'flagged')}
                                      disabled={verifyTransactionMutation.isPending}
                                      className="text-red-600 hover:bg-red-50 border-red-200"
                                    >
                                      <XCircle className="w-4 h-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Flag transaction for review</p>
                                  </TooltipContent>
                                </Tooltip>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleVerifyTransaction(transaction.id, 'pending')}
                                      disabled={verifyTransactionMutation.isPending}
                                      className="text-yellow-600 hover:bg-yellow-50 border-yellow-200"
                                    >
                                      <Clock className="w-4 h-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Mark as pending review</p>
                                  </TooltipContent>
                                </Tooltip>
                                <Dialog>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <DialogTrigger asChild>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => setSelectedTransaction(transaction)}
                                        >
                                          <Eye className="w-4 h-4" />
                                        </Button>
                                      </DialogTrigger>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>View transaction details</p>
                                    </TooltipContent>
                                  </Tooltip>
                                  <DialogContent>
                                    <DialogHeader>
                                      <DialogTitle>Transaction Details</DialogTitle>
                                      <DialogDescription>
                                        Review and verify transaction information
                                      </DialogDescription>
                                    </DialogHeader>
                                    <div className="space-y-4">
                                      <div>
                                        <p className="font-semibold">Receipt: {transaction.receipt_number}</p>
                                        <p>Patient: {transaction.patient_name}</p>
                                        <p>Amount: ₦{transaction.amount?.toLocaleString()}</p>
                                        <p>Payment Method: {transaction.payment_method}</p>
                                        <p>Time: {new Date(transaction.transaction_time).toLocaleString()}</p>
                                        <p>Cashier: {transaction.cashier_name}</p>
                                      </div>
                                      <div>
                                        <label className="block text-sm font-medium mb-2">Verification Notes</label>
                                        <Textarea
                                          value={verificationNotes}
                                          onChange={(e) => setVerificationNotes(e.target.value)}
                                          placeholder="Add verification notes..."
                                          rows={3}
                                        />
                                      </div>
                                      <div className="flex gap-2">
                                        <Button
                                          onClick={() => handleVerifyTransaction(transaction.id, 'verified')}
                                          disabled={verifyTransactionMutation.isPending}
                                          className="bg-green-600 hover:bg-green-700"
                                        >
                                          Verify
                                        </Button>
                                        <Button
                                          onClick={() => handleVerifyTransaction(transaction.id, 'flagged')}
                                          disabled={verifyTransactionMutation.isPending}
                                          variant="destructive"
                                        >
                                          Flag
                                        </Button>
                                        <Button
                                          onClick={() => handleVerifyTransaction(transaction.id, 'pending')}
                                          disabled={verifyTransactionMutation.isPending}
                                          variant="outline"
                                        >
                                          Mark Pending
                                        </Button>
                                      </div>
                                    </div>
                                  </DialogContent>
                                </Dialog>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="pending">
              <Card>
                <CardHeader>
                  <CardTitle>Pending Verification</CardTitle>
                </CardHeader>
                <CardContent>
                  {transactionsArray.filter((t: Transaction) => t.verification_status === 'pending' || !t.verification_status).length === 0 ? (
                    <p className="text-gray-500">No transactions pending verification.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left p-3">Receipt</th>
                            <th className="text-left p-3">Patient</th>
                            <th className="text-left p-3">Amount</th>
                            <th className="text-left p-3">Time</th>
                            <th className="text-left p-3">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {transactionsArray.filter((t: Transaction) => t.verification_status === 'pending' || !t.verification_status).map((transaction: Transaction) => (
                            <tr key={transaction.id} className="border-b hover:bg-gray-50">
                              <td className="p-3">{transaction.receipt_number}</td>
                              <td className="p-3">{transaction.patient_name}</td>
                              <td className="p-3">₦{transaction.amount?.toLocaleString()}</td>
                              <td className="p-3">{new Date(transaction.transaction_time).toLocaleTimeString()}</td>
                              <td className="p-3">
                                <div className="flex items-center space-x-2">
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        size="sm"
                                        onClick={() => handleVerifyTransaction(transaction.id, 'verified')}
                                        disabled={verifyTransactionMutation.isPending}
                                        className="bg-green-600 hover:bg-green-700"
                                      >
                                        <CheckCircle2 className="w-4 h-4" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>Verify transaction</p>
                                    </TooltipContent>
                                  </Tooltip>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        size="sm"
                                        onClick={() => handleVerifyTransaction(transaction.id, 'flagged')}
                                        disabled={verifyTransactionMutation.isPending}
                                        variant="destructive"
                                      >
                                        <AlertTriangle className="w-4 h-4" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>Flag transaction for review</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="verified">
              <Card>
                <CardHeader>
                  <CardTitle>Verified Transactions</CardTitle>
                </CardHeader>
                <CardContent>
                  {transactionsArray.filter((t: Transaction) => t.verification_status === 'verified').length === 0 ? (
                    <p className="text-gray-500">No verified transactions.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left p-3">Receipt</th>
                            <th className="text-left p-3">Patient</th>
                            <th className="text-left p-3">Amount</th>
                            <th className="text-left p-3">Verified By</th>
                            <th className="text-left p-3">Verified At</th>
                          </tr>
                        </thead>
                        <tbody>
                          {transactionsArray.filter((t: Transaction) => t.verification_status === 'verified').map((transaction: Transaction) => (
                            <tr key={transaction.id} className="border-b hover:bg-gray-50">
                              <td className="p-3">{transaction.receipt_number}</td>
                              <td className="p-3">{transaction.patient_name}</td>
                              <td className="p-3">₦{transaction.amount?.toLocaleString()}</td>
                              <td className="p-3">{transaction.verified_by || 'System'}</td>
                              <td className="p-3">{transaction.verified_at ? new Date(transaction.verified_at).toLocaleString() : ''}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="flagged">
              <Card>
                <CardHeader>
                  <CardTitle>Flagged Transactions</CardTitle>
                </CardHeader>
                <CardContent>
                  {transactionsArray.filter((t: Transaction) => t.verification_status === 'flagged').length === 0 ? (
                    <p className="text-gray-500">No flagged transactions.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left p-3">Receipt</th>
                            <th className="text-left p-3">Patient</th>
                            <th className="text-left p-3">Amount</th>
                            <th className="text-left p-3">Notes</th>
                            <th className="text-left p-3">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {transactionsArray.filter((t: Transaction) => t.verification_status === 'flagged').map((transaction: Transaction) => (
                            <tr key={transaction.id} className="border-b hover:bg-gray-50 bg-red-50">
                              <td className="p-3">{transaction.receipt_number}</td>
                              <td className="p-3">{transaction.patient_name}</td>
                              <td className="p-3">₦{transaction.amount?.toLocaleString()}</td>
                              <td className="p-3">{transaction.verification_notes || 'No notes'}</td>
                              <td className="p-3">
                                <div className="flex items-center space-x-2">
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        size="sm"
                                        onClick={() => handleVerifyTransaction(transaction.id, 'verified')}
                                        disabled={verifyTransactionMutation.isPending}
                                        className="bg-green-600 hover:bg-green-700"
                                      >
                                        <CheckCircle2 className="w-4 h-4" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>Clear flag and verify</p>
                                    </TooltipContent>
                                  </Tooltip>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        size="sm"
                                        onClick={() => handleVerifyTransaction(transaction.id, 'pending')}
                                        disabled={verifyTransactionMutation.isPending}
                                        variant="outline"
                                      >
                                        <Clock className="w-4 h-4" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>Return to pending</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </div>
    </TooltipProvider>
  );
}