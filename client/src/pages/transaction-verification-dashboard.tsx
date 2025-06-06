import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiRequest } from "@/lib/queryClient";
import { toast } from "@/hooks/use-toast";
import {
  CheckCircle2, XCircle, AlertTriangle, Eye, Edit, DollarSign,
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
  notes: string;
}

interface VerificationMetrics {
  totalTransactions: number;
  verifiedTransactions: number;
  pendingVerification: number;
  flaggedTransactions: number;
  totalRevenue: number;
  cashRevenue: number;
  posRevenue: number;
  transferRevenue: number;
}

export default function TransactionVerificationDashboard() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedBranchId, setSelectedBranchId] = useState(user?.branchId || 1);
  const [activeTab, setActiveTab] = useState("overview");
  const [filterStatus, setFilterStatus] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [verificationNotes, setVerificationNotes] = useState("");

  // Fetch daily transactions with verification status
  const { data: transactions = [], isLoading: transactionsLoading, refetch } = useQuery({
    queryKey: ["/api/daily-transactions", selectedBranchId],
    enabled: !!selectedBranchId,
    refetchInterval: 30000,
  });

  // Fetch dashboard metrics
  const { data: dashboardData, isLoading: metricsLoading } = useQuery({
    queryKey: ["/api/dashboard-data", selectedBranchId],
    enabled: !!selectedBranchId,
    refetchInterval: 30000,
  });

  // Transaction verification mutation
  const verifyTransactionMutation = useMutation({
    mutationFn: async ({ transactionId, status, notes }: { transactionId: number; status: string; notes: string }) => {
      return apiRequest(`/api/transactions/${transactionId}/verify`, {
        method: "POST",
        body: { verification_status: status, notes },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/daily-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard-data"] });
      toast({
        title: "Transaction Verified",
        description: "Transaction verification status updated successfully.",
      });
      setSelectedTransaction(null);
      setVerificationNotes("");
    },
    onError: () => {
      toast({
        title: "Verification Failed",
        description: "Failed to update transaction verification status.",
        variant: "destructive",
      });
    },
  });

  // Calculate verification metrics
  const verificationMetrics: VerificationMetrics = {
    totalTransactions: transactions.length,
    verifiedTransactions: transactions.filter((t: any) => t.verification_status === "verified").length,
    pendingVerification: transactions.filter((t: any) => t.verification_status === "pending" || !t.verification_status).length,
    flaggedTransactions: transactions.filter((t: any) => t.verification_status === "flagged").length,
    totalRevenue: dashboardData?.revenue?.total || 0,
    cashRevenue: dashboardData?.revenue?.cash || 0,
    posRevenue: dashboardData?.revenue?.pos || 0,
    transferRevenue: dashboardData?.revenue?.transfer || 0,
  };

  // Filter transactions based on status and search
  const filteredTransactions = transactions.filter((transaction: any) => {
    const matchesStatus = filterStatus === "all" || 
      transaction.verification_status === filterStatus ||
      (filterStatus === "pending" && (!transaction.verification_status || transaction.verification_status === "pending"));
    
    const matchesSearch = !searchTerm || 
      transaction.patient_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transaction.receipt_number.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesStatus && matchesSearch;
  });

  const handleVerifyTransaction = (status: string) => {
    if (!selectedTransaction) return;
    
    verifyTransactionMutation.mutate({
      transactionId: selectedTransaction.id,
      status,
      notes: verificationNotes,
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "verified": return "bg-green-100 text-green-800";
      case "flagged": return "bg-red-100 text-red-800";
      case "pending": return "bg-yellow-100 text-yellow-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "verified": return <CheckCircle2 className="w-4 h-4" />;
      case "flagged": return <XCircle className="w-4 h-4" />;
      case "pending": return <AlertTriangle className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  if (!user) return null;

  return (
    <div className="flex h-screen overflow-hidden bg-light-bg">
      <Sidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b bg-white">
          <Header 
            selectedBranchId={selectedBranchId} 
            onBranchChange={setSelectedBranchId}
          />
          <div className="flex items-center gap-4">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => refetch()}
              disabled={transactionsLoading}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${transactionsLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>
        </div>
        
        <main className="flex-1 overflow-y-auto p-6">
          {/* Verification Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Transactions</p>
                    <p className="text-3xl font-bold text-gray-900">{verificationMetrics.totalTransactions}</p>
                    <p className="text-sm text-blue-600">Today's count</p>
                  </div>
                  <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center">
                    <FileText className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Verified</p>
                    <p className="text-3xl font-bold text-green-600">{verificationMetrics.verifiedTransactions}</p>
                    <p className="text-sm text-green-600">
                      {Math.round((verificationMetrics.verifiedTransactions / verificationMetrics.totalTransactions) * 100) || 0}% complete
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-green-50 rounded-lg flex items-center justify-center">
                    <CheckCircle2 className="w-6 h-6 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Pending</p>
                    <p className="text-3xl font-bold text-yellow-600">{verificationMetrics.pendingVerification}</p>
                    <p className="text-sm text-yellow-600">Needs review</p>
                  </div>
                  <div className="w-12 h-12 bg-yellow-50 rounded-lg flex items-center justify-center">
                    <Clock className="w-6 h-6 text-yellow-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Flagged</p>
                    <p className="text-3xl font-bold text-red-600">{verificationMetrics.flaggedTransactions}</p>
                    <p className="text-sm text-red-600">Requires attention</p>
                  </div>
                  <div className="w-12 h-12 bg-red-50 rounded-lg flex items-center justify-center">
                    <AlertTriangle className="w-6 h-6 text-red-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Revenue Summary */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gray-50 rounded-lg flex items-center justify-center">
                    <DollarSign className="w-6 h-6 text-gray-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Total Revenue</p>
                    <p className="text-2xl font-bold">₦{verificationMetrics.totalRevenue.toLocaleString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-green-50 rounded-lg flex items-center justify-center">
                    <Banknote className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Cash</p>
                    <p className="text-2xl font-bold">₦{verificationMetrics.cashRevenue.toLocaleString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center">
                    <CreditCard className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">POS</p>
                    <p className="text-2xl font-bold">₦{verificationMetrics.posRevenue.toLocaleString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-purple-50 rounded-lg flex items-center justify-center">
                    <Smartphone className="w-6 h-6 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Transfer</p>
                    <p className="text-2xl font-bold">₦{verificationMetrics.transferRevenue.toLocaleString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Transaction Verification Interface */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Daily Transaction Verification
                </CardTitle>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Search className="w-4 h-4 text-gray-400" />
                    <Input
                      placeholder="Search by patient or receipt..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-64"
                    />
                  </div>
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="verified">Verified</SelectItem>
                      <SelectItem value="flagged">Flagged</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Receipt
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Patient
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Amount
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Payment Method
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Time
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredTransactions.map((transaction: any) => (
                      <tr key={transaction.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {transaction.receipt_number}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">{transaction.patient_name}</div>
                            <div className="text-sm text-gray-500">{transaction.cashier_name}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          ₦{Number(transaction.amount).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge variant="outline">
                            {transaction.payment_method.toUpperCase()}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(transaction.transaction_time).toLocaleTimeString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(transaction.verification_status || 'pending')}`}>
                            {getStatusIcon(transaction.verification_status || 'pending')}
                            {transaction.verification_status || 'Pending'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex items-center gap-2">
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setSelectedTransaction(transaction)}
                                >
                                  <Eye className="w-4 h-4 mr-1" />
                                  Verify
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-2xl">
                                <DialogHeader>
                                  <DialogTitle>Transaction Verification</DialogTitle>
                                </DialogHeader>
                                {selectedTransaction && (
                                  <div className="space-y-6">
                                    <div className="grid grid-cols-2 gap-4">
                                      <div>
                                        <label className="text-sm font-medium text-gray-700">Receipt Number</label>
                                        <p className="text-lg font-semibold">{selectedTransaction.receipt_number}</p>
                                      </div>
                                      <div>
                                        <label className="text-sm font-medium text-gray-700">Amount</label>
                                        <p className="text-lg font-semibold">₦{Number(selectedTransaction.amount).toLocaleString()}</p>
                                      </div>
                                      <div>
                                        <label className="text-sm font-medium text-gray-700">Patient</label>
                                        <p className="text-lg">{selectedTransaction.patient_name}</p>
                                      </div>
                                      <div>
                                        <label className="text-sm font-medium text-gray-700">Payment Method</label>
                                        <p className="text-lg">{selectedTransaction.payment_method.toUpperCase()}</p>
                                      </div>
                                      <div>
                                        <label className="text-sm font-medium text-gray-700">Time</label>
                                        <p className="text-lg">{new Date(selectedTransaction.transaction_time).toLocaleString()}</p>
                                      </div>
                                      <div>
                                        <label className="text-sm font-medium text-gray-700">Cashier</label>
                                        <p className="text-lg">{selectedTransaction.cashier_name}</p>
                                      </div>
                                    </div>

                                    <div>
                                      <label className="text-sm font-medium text-gray-700">Verification Notes</label>
                                      <Textarea
                                        value={verificationNotes}
                                        onChange={(e) => setVerificationNotes(e.target.value)}
                                        placeholder="Add verification notes..."
                                        className="mt-1"
                                      />
                                    </div>

                                    <div className="flex items-center gap-3">
                                      <Button
                                        onClick={() => handleVerifyTransaction("verified")}
                                        disabled={verifyTransactionMutation.isPending}
                                        className="bg-green-600 hover:bg-green-700"
                                      >
                                        <CheckCircle2 className="w-4 h-4 mr-2" />
                                        Verify
                                      </Button>
                                      <Button
                                        variant="destructive"
                                        onClick={() => handleVerifyTransaction("flagged")}
                                        disabled={verifyTransactionMutation.isPending}
                                      >
                                        <XCircle className="w-4 h-4 mr-2" />
                                        Flag
                                      </Button>
                                      <Button
                                        variant="outline"
                                        onClick={() => handleVerifyTransaction("pending")}
                                        disabled={verifyTransactionMutation.isPending}
                                      >
                                        <AlertTriangle className="w-4 h-4 mr-2" />
                                        Mark Pending
                                      </Button>
                                    </div>
                                  </div>
                                )}
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
        </main>
      </div>
    </div>
  );
}