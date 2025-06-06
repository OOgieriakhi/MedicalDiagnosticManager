import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { 
  FileText, 
  Download, 
  Eye, 
  Calendar, 
  DollarSign, 
  TrendingUp, 
  Users, 
  CreditCard,
  Banknote,
  ArrowRightLeft,
  CheckCircle,
  AlertTriangle,
  Clock,
  Filter,
  RefreshCw
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface DailyTransaction {
  id: number;
  receiptNumber: string;
  patientName: string;
  amount: number;
  paymentMethod: string;
  transactionTime: string;
  cashierId: number;
  status: string;
}

interface HandoverSummary {
  id: number;
  handoverDate: string;
  cashierName: string;
  shiftPeriod: string;
  cashCollected: number;
  posCollected: number;
  transferCollected: number;
  totalCollected: number;
  transactionCount: number;
  status: string;
  managerVerified: boolean;
  varianceAmount: number;
}

export default function DailyTransactionViewer() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('all');
  const [selectedBranch, setSelectedBranch] = useState(user?.branchId?.toString() || 'all');
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);

  // Fetch daily transactions
  const { data: transactions = [], isLoading: transactionsLoading, refetch: refetchTransactions } = useQuery({
    queryKey: ["/api/daily-transactions", selectedDate, selectedPaymentMethod, selectedBranch],
    enabled: !!selectedDate,
  });

  // Fetch handover summaries
  const { data: handoverSummaries = [], isLoading: handoversLoading } = useQuery({
    queryKey: ["/api/cashier-handovers", selectedDate, selectedBranch],
    enabled: !!selectedDate,
  });

  // Fetch branches for filtering
  const { data: branches = [] } = useQuery({
    queryKey: ["/api/branches", user?.tenantId],
    enabled: !!user?.tenantId,
  });

  // Generate report mutation
  const generateReportMutation = useMutation({
    mutationFn: async (reportData: any) => {
      const response = await apiRequest("POST", "/api/generate-daily-report", reportData);
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Report Generated",
        description: `Daily transaction report has been generated successfully.`,
      });
      setIsGeneratingReport(false);
    },
    onError: () => {
      toast({
        title: "Report Generation Failed",
        description: "Failed to generate report. Please try again.",
        variant: "destructive",
      });
      setIsGeneratingReport(false);
    },
  });

  // Verify transactions mutation (for managers/directors)
  const verifyTransactionsMutation = useMutation({
    mutationFn: async (verificationData: any) => {
      const response = await apiRequest("POST", "/api/verify-daily-transactions", verificationData);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Transactions Verified",
        description: "Daily transactions have been verified successfully.",
      });
      refetchTransactions();
    },
    onError: () => {
      toast({
        title: "Verification Failed",
        description: "Failed to verify transactions. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleGenerateReport = () => {
    setIsGeneratingReport(true);
    const reportData = {
      date: selectedDate,
      branchId: selectedBranch === 'all' ? null : parseInt(selectedBranch),
      paymentMethod: selectedPaymentMethod === 'all' ? null : selectedPaymentMethod,
      reportType: 'daily_transactions',
      requestedBy: user?.id,
      userRole: user?.role || 'accountant'
    };
    generateReportMutation.mutate(reportData);
  };

  const handleVerifyTransactions = () => {
    const verificationData = {
      date: selectedDate,
      branchId: selectedBranch === 'all' ? null : parseInt(selectedBranch),
      verifiedBy: user?.id,
      verificationLevel: user?.role || 'manager'
    };
    verifyTransactionsMutation.mutate(verificationData);
  };

  // Calculate summary statistics
  const totalRevenue = transactions.reduce((sum: number, t: any) => sum + t.amount, 0);
  const cashRevenue = transactions.filter((t: any) => t.paymentMethod === 'cash').reduce((sum: number, t: any) => sum + t.amount, 0);
  const posRevenue = transactions.filter((t: any) => t.paymentMethod === 'pos').reduce((sum: number, t: any) => sum + t.amount, 0);
  const transferRevenue = transactions.filter((t: any) => t.paymentMethod === 'transfer').reduce((sum: number, t: any) => sum + t.amount, 0);

  const getRoleSpecificActions = () => {
    const role = user?.role;
    
    if (role === 'ceo' || role === 'director' || role === 'finance_director') {
      return (
        <div className="flex gap-2">
          <Button onClick={handleGenerateReport} disabled={isGeneratingReport}>
            <FileText className="h-4 w-4 mr-2" />
            {isGeneratingReport ? "Generating..." : "Executive Report"}
          </Button>
          <Button onClick={handleVerifyTransactions} variant="outline">
            <CheckCircle className="h-4 w-4 mr-2" />
            Approve & Verify
          </Button>
        </div>
      );
    }
    
    if (role === 'manager' || role === 'branch_manager') {
      return (
        <div className="flex gap-2">
          <Button onClick={handleGenerateReport} disabled={isGeneratingReport}>
            <FileText className="h-4 w-4 mr-2" />
            {isGeneratingReport ? "Generating..." : "Management Report"}
          </Button>
          <Button onClick={handleVerifyTransactions} variant="outline">
            <CheckCircle className="h-4 w-4 mr-2" />
            Verify Handover
          </Button>
        </div>
      );
    }
    
    return (
      <Button onClick={handleGenerateReport} disabled={isGeneratingReport}>
        <FileText className="h-4 w-4 mr-2" />
        {isGeneratingReport ? "Generating..." : "Daily Report"}
      </Button>
    );
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Daily Transaction Verification</h1>
          <p className="text-muted-foreground">
            View and verify daily transactions for {user?.role === 'ceo' ? 'executive oversight' : user?.role === 'manager' ? 'management review' : 'accounting verification'}
          </p>
        </div>
        {getRoleSpecificActions()}
      </div>

      {/* Filters and Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Transaction Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="date">Transaction Date</Label>
              <Input
                id="date"
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="branch">Branch</Label>
              <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                <SelectTrigger>
                  <SelectValue placeholder="Select branch..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Branches</SelectItem>
                  {branches.map((branch: any) => (
                    <SelectItem key={branch.id} value={branch.id.toString()}>
                      {branch.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="payment-method">Payment Method</Label>
              <Select value={selectedPaymentMethod} onValueChange={setSelectedPaymentMethod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Methods</SelectItem>
                  <SelectItem value="cash">Cash Only</SelectItem>
                  <SelectItem value="pos">POS/Card Only</SelectItem>
                  <SelectItem value="transfer">Bank Transfer Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button variant="outline" onClick={() => refetchTransactions()}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Revenue</p>
                <h3 className="text-2xl font-bold">₦{totalRevenue.toLocaleString()}</h3>
              </div>
              <DollarSign className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Cash Payments</p>
                <h3 className="text-2xl font-bold">₦{cashRevenue.toLocaleString()}</h3>
              </div>
              <Banknote className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">POS Payments</p>
                <h3 className="text-2xl font-bold">₦{posRevenue.toLocaleString()}</h3>
              </div>
              <CreditCard className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Bank Transfers</p>
                <h3 className="text-2xl font-bold">₦{transferRevenue.toLocaleString()}</h3>
              </div>
              <ArrowRightLeft className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="transactions" className="space-y-4">
        <TabsList>
          <TabsTrigger value="transactions">Transaction Details</TabsTrigger>
          <TabsTrigger value="handovers">Cashier Handovers</TabsTrigger>
          <TabsTrigger value="verification">Management Verification</TabsTrigger>
        </TabsList>

        <TabsContent value="transactions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Daily Transaction Listing</CardTitle>
            </CardHeader>
            <CardContent>
              {transactionsLoading ? (
                <div className="text-center py-8">Loading transactions...</div>
              ) : transactions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No transactions found for the selected date and filters.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Receipt #</TableHead>
                      <TableHead>Patient Name</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Payment Method</TableHead>
                      <TableHead>Time</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map((transaction: any) => (
                      <TableRow key={transaction.id}>
                        <TableCell className="font-medium">{transaction.receiptNumber}</TableCell>
                        <TableCell>{transaction.patientName}</TableCell>
                        <TableCell>₦{transaction.amount.toLocaleString()}</TableCell>
                        <TableCell>
                          <Badge variant={
                            transaction.paymentMethod === 'cash' ? 'default' :
                            transaction.paymentMethod === 'pos' ? 'secondary' : 'outline'
                          }>
                            {transaction.paymentMethod.toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell>{new Date(transaction.transactionTime).toLocaleTimeString()}</TableCell>
                        <TableCell>
                          <Badge variant={transaction.status === 'verified' ? 'default' : 'secondary'}>
                            {transaction.status || 'pending'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button size="sm" variant="outline">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="handovers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Cashier Handover Summary</CardTitle>
            </CardHeader>
            <CardContent>
              {handoversLoading ? (
                <div className="text-center py-8">Loading handover data...</div>
              ) : handoverSummaries.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No handover records found for the selected date.
                </div>
              ) : (
                <div className="space-y-4">
                  {handoverSummaries.map((handover: any) => (
                    <Card key={handover.id}>
                      <CardContent className="p-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <h4 className="font-semibold">Cashier: {handover.cashierName}</h4>
                            <p className="text-sm text-muted-foreground">{handover.shiftPeriod}</p>
                            <p className="text-sm">Transactions: {handover.transactionCount}</p>
                          </div>
                          <div>
                            <p className="text-sm">Cash: ₦{handover.cashCollected?.toLocaleString()}</p>
                            <p className="text-sm">POS: ₦{handover.posCollected?.toLocaleString()}</p>
                            <p className="text-sm">Transfer: ₦{handover.transferCollected?.toLocaleString()}</p>
                            <p className="font-semibold">Total: ₦{handover.totalCollected?.toLocaleString()}</p>
                          </div>
                          <div className="flex flex-col gap-2">
                            <Badge variant={handover.status === 'manager_verified' ? 'default' : 'secondary'}>
                              {handover.status}
                            </Badge>
                            {handover.varianceAmount !== 0 && (
                              <Badge variant="destructive">
                                Variance: ₦{handover.varianceAmount}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="verification" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Management Verification & Approval</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 border rounded-lg">
                  <h4 className="font-semibold mb-2">Verification Summary for {selectedDate}</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Transactions</p>
                      <p className="text-lg font-semibold">{transactions.length}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Total Revenue</p>
                      <p className="text-lg font-semibold">₦{totalRevenue.toLocaleString()}</p>
                    </div>
                  </div>
                </div>
                
                {(user?.role === 'manager' || user?.role === 'director' || user?.role === 'ceo') && (
                  <div className="flex gap-2">
                    <Button onClick={handleVerifyTransactions} className="flex-1">
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Verify All Transactions
                    </Button>
                    <Button variant="outline" onClick={handleGenerateReport}>
                      <Download className="h-4 w-4 mr-2" />
                      Download Report
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}