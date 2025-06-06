import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  Building2, Plus, Upload, AlertTriangle, Check, X, Eye,
  Calendar, DollarSign, CreditCard, FileText, Banknote,
  ChevronDown, Filter, Search, Download, TrendingUp
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface BankAccount {
  id: number;
  accountName: string;
  accountNumber: string;
  bankName: string;
  accountType: string;
  currency: string;
  currentBalance: number;
  isMainAccount: boolean;
  isActive: boolean;
}

interface BankDeposit {
  id: number;
  depositNumber: string;
  depositAmount: number;
  depositDate: string;
  depositMethod: string;
  referenceNumber?: string;
  sourceType: string;
  status: string;
  reconcileStatus: string;
  bankAccountName: string;
  bankName: string;
  accountNumber: string;
  depositedByName: string;
  createdAt: string;
}

interface VerifiedCashSummary {
  totalAmount: number;
  transactionCount: number;
  businessDate: string;
}

export default function BankDepositRecording() {
  const [activeTab, setActiveTab] = useState("record");
  const [selectedDate, setSelectedDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [depositDialogOpen, setDepositDialogOpen] = useState(false);
  const [viewDepositDialogOpen, setViewDepositDialogOpen] = useState(false);
  const [selectedDeposit, setSelectedDeposit] = useState<BankDeposit | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Form state
  const [formData, setFormData] = useState({
    bankAccountId: "",
    depositAmount: "",
    depositDate: format(new Date(), "yyyy-MM-dd"),
    depositMethod: "cash",
    referenceNumber: "",
    tellerReference: "",
    sourceType: "daily_cash",
    sourceReference: "",
    linkedCashAmount: "",
    notes: "",
    proofOfPayment: ""
  });

  // Fetch bank accounts
  const { data: bankAccounts = [], isLoading: accountsLoading } = useQuery({
    queryKey: ["/api/bank-accounts"],
  });

  // Fetch bank deposits
  const { data: bankDeposits = [], isLoading: depositsLoading } = useQuery({
    queryKey: ["/api/bank-deposits"],
  });

  // Fetch verified cash summary
  const { data: verifiedCash = [], isLoading: cashLoading } = useQuery({
    queryKey: ["/api/verified-cash-summary", selectedDate],
    enabled: !!selectedDate,
  });

  // Fetch cumulative variance metrics
  const { data: varianceMetrics, isLoading: metricsLoading } = useQuery({
    queryKey: ["/api/cash-variance-metrics"],
  });

  // Create deposit mutation
  const createDepositMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/bank-deposits", data),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Bank deposit recorded successfully",
      });
      setDepositDialogOpen(false);
      setFormData({
        bankAccountId: "",
        depositAmount: "",
        depositDate: format(new Date(), "yyyy-MM-dd"),
        depositMethod: "cash",
        referenceNumber: "",
        tellerReference: "",
        sourceType: "daily_cash",
        sourceReference: "",
        linkedCashAmount: "",
        notes: "",
        proofOfPayment: ""
      });
      queryClient.invalidateQueries({ queryKey: ["/api/bank-deposits"] });
      queryClient.invalidateQueries({ queryKey: ["/api/bank-accounts"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to record deposit",
        variant: "destructive",
      });
    },
  });

  // Verify deposit mutation
  const verifyDepositMutation = useMutation({
    mutationFn: ({ id, status, notes }: { id: number; status: string; notes?: string }) =>
      apiRequest("PATCH", `/api/bank-deposits/${id}/verify`, { status, notes }),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Deposit status updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/bank-deposits"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update deposit",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.bankAccountId || !formData.depositAmount || !formData.depositDate) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    const selectedCash = formData.depositDate 
      ? (verifiedCash as any)?.daily?.find((c: any) => c.businessDate === formData.depositDate)
      : (verifiedCash as any)?.cumulative;
    const submitData = {
      ...formData,
      depositAmount: parseFloat(formData.depositAmount),
      linkedCashAmount: formData.sourceType === 'daily_cash' && selectedCash 
        ? selectedCash.totalAmount 
        : parseFloat(formData.linkedCashAmount) || 0,
      bankAccountId: parseInt(formData.bankAccountId)
    };

    createDepositMutation.mutate(submitData);
  };

  const handleVerifyDeposit = (depositId: number, status: string) => {
    verifyDepositMutation.mutate({ id: depositId, status });
  };

  const getStatusBadge = (status: string, reconcileStatus: string) => {
    if (status === 'flagged') {
      return <Badge variant="destructive" className="gap-1"><AlertTriangle className="w-3 h-3" />Flagged</Badge>;
    }
    if (status === 'verified') {
      return <Badge variant="default" className="gap-1 bg-green-600"><Check className="w-3 h-3" />Verified</Badge>;
    }
    if (reconcileStatus === 'matched') {
      return <Badge variant="secondary" className="gap-1"><Eye className="w-3 h-3" />Matched</Badge>;
    }
    return <Badge variant="outline">Pending</Badge>;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const selectedCashForDate = formData.depositDate 
    ? (verifiedCash as any)?.daily?.find((c: any) => c.businessDate === formData.depositDate)
    : (verifiedCash as any)?.cumulative;

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Bank Deposit Recording</h1>
          <p className="text-muted-foreground">Record and manage bank deposits from verified cash collections</p>
        </div>
        <Dialog open={depositDialogOpen} onOpenChange={setDepositDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Record Deposit
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Record Bank Deposit</DialogTitle>
              <DialogDescription>
                Enter bank deposit details and link to verified cash transactions
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="bankAccount">Bank Account *</Label>
                  <Select value={formData.bankAccountId} onValueChange={(value) => setFormData(prev => ({ ...prev, bankAccountId: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select bank account" />
                    </SelectTrigger>
                    <SelectContent>
                      {bankAccounts.map((account: BankAccount) => (
                        <SelectItem key={account.id} value={account.id.toString()}>
                          <div className="flex flex-col">
                            <span className="font-medium">{account.accountName}</span>
                            <span className="text-sm text-muted-foreground">
                              {account.bankName} - {account.accountNumber}
                              {account.isMainAccount && <Badge variant="secondary" className="ml-2 text-xs">Main</Badge>}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="depositAmount">Deposit Amount *</Label>
                  <Input
                    id="depositAmount"
                    type="number"
                    step="0.01"
                    value={formData.depositAmount}
                    onChange={(e) => setFormData(prev => ({ ...prev, depositAmount: e.target.value }))}
                    placeholder="0.00"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="depositDate">Deposit Date *</Label>
                  <Input
                    id="depositDate"
                    type="date"
                    value={formData.depositDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, depositDate: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="depositMethod">Deposit Method *</Label>
                  <Select value={formData.depositMethod} onValueChange={(value) => setFormData(prev => ({ ...prev, depositMethod: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="cheque">Cheque</SelectItem>
                      <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                      <SelectItem value="card">Card</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sourceType">Source Type</Label>
                  <Select value={formData.sourceType} onValueChange={(value) => setFormData(prev => ({ ...prev, sourceType: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily_cash">Daily Cash Collections</SelectItem>
                      <SelectItem value="invoice_payments">Invoice Payments</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="referenceNumber">Bank Reference</Label>
                  <Input
                    id="referenceNumber"
                    value={formData.referenceNumber}
                    onChange={(e) => setFormData(prev => ({ ...prev, referenceNumber: e.target.value }))}
                    placeholder="Bank slip/reference number"
                  />
                </div>
              </div>

              {/* Verified Cash Linking */}
              {formData.sourceType === 'daily_cash' && selectedCashForDate && (
                <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <div className="flex items-center gap-2 mb-2">
                    <Banknote className="w-4 h-4 text-blue-600" />
                    <span className="font-medium text-blue-900 dark:text-blue-100">Verified Cash for {format(new Date(formData.depositDate), 'MMM dd, yyyy')}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Total Cash Amount:</span>
                      <div className="font-medium">{formatCurrency(selectedCashForDate.totalAmount)}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Transaction Count:</span>
                      <div className="font-medium">{selectedCashForDate.transactionCount}</div>
                    </div>
                  </div>
                  {formData.depositAmount && Math.abs(parseFloat(formData.depositAmount) - selectedCashForDate.totalAmount) > 0.01 && (
                    <div className="mt-2 p-2 bg-yellow-50 dark:bg-yellow-950/20 rounded border border-yellow-200 dark:border-yellow-800">
                      <div className="flex items-center gap-2 text-yellow-800 dark:text-yellow-200">
                        <AlertTriangle className="w-4 h-4" />
                        <span className="text-sm font-medium">Deposit Variance Detected</span>
                      </div>
                      <div className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                        Difference: {formatCurrency(Math.abs(parseFloat(formData.depositAmount) - selectedCashForDate.totalAmount))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Additional notes about this deposit..."
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setDepositDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createDepositMutation.isPending}>
                  {createDepositMutation.isPending ? "Recording..." : "Record Deposit"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Cumulative Variance Metrics Dashboard */}
      {!metricsLoading && varianceMetrics && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Month-to-Date Metrics */}
          <Card className="border-l-4 border-l-blue-500">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-600" />
                Month-to-Date Variance ({(varianceMetrics as any).monthToDate.period})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground">Cash Collected</div>
                  <div className="text-xl font-bold text-green-600">
                    {formatCurrency((varianceMetrics as any).monthToDate.cashCollected)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {(varianceMetrics as any).monthToDate.transactionCount} transactions, {(varianceMetrics as any).monthToDate.collectionDays} days
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Cash Deposited</div>
                  <div className="text-xl font-bold text-blue-600">
                    {formatCurrency((varianceMetrics as any).monthToDate.cashDeposited)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {(varianceMetrics as any).monthToDate.depositCount} deposits
                  </div>
                </div>
              </div>
              <div className={`p-3 rounded-lg border ${
                (varianceMetrics as any).monthToDate.variance === 0 
                  ? 'bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800' 
                  : Math.abs((varianceMetrics as any).monthToDate.variance) > 1000
                    ? 'bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-800'
                    : 'bg-yellow-50 border-yellow-200 dark:bg-yellow-950/20 dark:border-yellow-800'
              }`}>
                <div className="flex items-center justify-between">
                  <span className="font-medium">Net Variance:</span>
                  <span className={`font-bold ${
                    (varianceMetrics as any).monthToDate.variance === 0 
                      ? 'text-green-700' 
                      : (varianceMetrics as any).monthToDate.variance > 0 
                        ? 'text-blue-700' 
                        : 'text-red-700'
                  }`}>
                    {formatCurrency(Math.abs((varianceMetrics as any).monthToDate.variance))}
                    {(varianceMetrics as any).monthToDate.variance > 0 ? ' (Excess)' : (varianceMetrics as any).monthToDate.variance < 0 ? ' (Shortage)' : ''}
                  </span>
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  {Math.abs((varianceMetrics as any).monthToDate.variancePercentage).toFixed(2)}% of collections
                </div>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-green-600">✓ {(varianceMetrics as any).monthToDate.verifiedDeposits} Verified</span>
                <span className="text-red-600">⚠ {(varianceMetrics as any).monthToDate.flaggedDeposits} Flagged</span>
              </div>
            </CardContent>
          </Card>

          {/* Year-to-Date Metrics */}
          <Card className="border-l-4 border-l-purple-500">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-purple-600" />
                Year-to-Date Variance ({(varianceMetrics as any).yearToDate.period})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground">Cash Collected</div>
                  <div className="text-xl font-bold text-green-600">
                    {formatCurrency((varianceMetrics as any).yearToDate.cashCollected)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {(varianceMetrics as any).yearToDate.transactionCount} transactions, {(varianceMetrics as any).yearToDate.collectionDays} days
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Cash Deposited</div>
                  <div className="text-xl font-bold text-blue-600">
                    {formatCurrency((varianceMetrics as any).yearToDate.cashDeposited)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {(varianceMetrics as any).yearToDate.depositCount} deposits
                  </div>
                </div>
              </div>
              <div className={`p-3 rounded-lg border ${
                (varianceMetrics as any).yearToDate.variance === 0 
                  ? 'bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800' 
                  : Math.abs((varianceMetrics as any).yearToDate.variance) > 5000
                    ? 'bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-800'
                    : 'bg-yellow-50 border-yellow-200 dark:bg-yellow-950/20 dark:border-yellow-800'
              }`}>
                <div className="flex items-center justify-between">
                  <span className="font-medium">Net Variance:</span>
                  <span className={`font-bold ${
                    (varianceMetrics as any).yearToDate.variance === 0 
                      ? 'text-green-700' 
                      : (varianceMetrics as any).yearToDate.variance > 0 
                        ? 'text-blue-700' 
                        : 'text-red-700'
                  }`}>
                    {formatCurrency(Math.abs((varianceMetrics as any).yearToDate.variance))}
                    {(varianceMetrics as any).yearToDate.variance > 0 ? ' (Excess)' : (varianceMetrics as any).yearToDate.variance < 0 ? ' (Shortage)' : ''}
                  </span>
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  {Math.abs((varianceMetrics as any).yearToDate.variancePercentage).toFixed(2)}% of collections
                </div>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-green-600">✓ {(varianceMetrics as any).yearToDate.verifiedDeposits} Verified</span>
                <span className="text-red-600">⚠ {(varianceMetrics as any).yearToDate.flaggedDeposits} Flagged</span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="record">Record Deposits</TabsTrigger>
          <TabsTrigger value="pending">Pending Verification</TabsTrigger>
          <TabsTrigger value="history">Deposit History</TabsTrigger>
        </TabsList>

        <TabsContent value="record" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Bank Accounts Overview */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="w-5 h-5" />
                  Bank Accounts
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {accountsLoading ? (
                  <div className="space-y-2">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="h-16 bg-muted animate-pulse rounded" />
                    ))}
                  </div>
                ) : (
                  bankAccounts.map((account: BankAccount) => (
                    <div key={account.id} className="p-3 border rounded-lg">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-sm">{account.accountName}</span>
                        {account.isMainAccount && <Badge variant="secondary" className="text-xs">Main</Badge>}
                      </div>
                      <div className="text-xs text-muted-foreground mb-2">
                        {account.bankName} - {account.accountNumber}
                      </div>
                      <div className="text-lg font-bold text-green-600">
                        {formatCurrency(account.currentBalance)}
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Undeposited Cash Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Banknote className="w-5 h-5" />
                  Undeposited Cash
                </CardTitle>
                <CardDescription>Verified cash since last deposit</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {cashLoading ? (
                  <div className="h-20 bg-muted animate-pulse rounded" />
                ) : (verifiedCash as any)?.cumulative?.totalAmount > 0 ? (
                  <div className="space-y-3">
                    {/* Cumulative Total */}
                    <div className="p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-blue-800 dark:text-blue-200">
                          Total Undeposited
                        </span>
                        <Badge variant="outline" className="text-blue-600 border-blue-300">
                          {(verifiedCash as any).cumulative.daySpan} days
                        </Badge>
                      </div>
                      <div className="text-2xl font-bold text-blue-700 dark:text-blue-300 mb-1">
                        {formatCurrency(parseFloat((verifiedCash as any).cumulative.totalAmount.toString()))}
                      </div>
                      <div className="text-sm text-blue-600 dark:text-blue-400">
                        {(verifiedCash as any).cumulative.transactionCount} transactions
                        {(verifiedCash as any).cumulative.fromDate && (
                          <span className="ml-2">
                            from {format(new Date((verifiedCash as any).cumulative.fromDate), 'MMM dd')} 
                            to {format(new Date((verifiedCash as any).cumulative.toDate), 'MMM dd')}
                          </span>
                        )}
                      </div>
                      {(verifiedCash as any).lastDepositDate && (
                        <div className="text-xs text-muted-foreground mt-2">
                          Last deposit: {format(new Date((verifiedCash as any).lastDepositDate), 'MMM dd, yyyy')}
                        </div>
                      )}
                    </div>

                    {/* Date Selection for Specific Day */}
                    <div className="space-y-2">
                      <Label htmlFor="cashDate">Select Specific Date (Optional)</Label>
                      <Input
                        id="cashDate"
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        placeholder="Choose date for specific amount"
                      />
                    </div>

                    {/* Daily Breakdown */}
                    {(verifiedCash as any)?.daily?.length > 0 && (
                      <div className="space-y-2">
                        <div className="text-sm font-medium text-muted-foreground">Daily Breakdown:</div>
                        {(verifiedCash as any).daily.slice(0, 3).map((cash: any) => (
                          <div key={cash.businessDate} 
                               className="p-3 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                               onClick={() => setFormData(prev => ({ ...prev, depositDate: cash.businessDate }))}>
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-medium text-sm">
                                {format(new Date(cash.businessDate), 'MMM dd, yyyy')}
                              </span>
                              <Badge variant="secondary" className="text-xs">
                                {cash.transactionCount} transactions
                              </Badge>
                            </div>
                            <div className="text-lg font-bold text-green-600">
                              {formatCurrency(parseFloat(cash.totalAmount.toString()))}
                            </div>
                          </div>
                        ))}
                        {(verifiedCash as any).daily.length > 3 && (
                          <div className="text-xs text-muted-foreground text-center">
                            +{(verifiedCash as any).daily.length - 3} more days
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-4 text-muted-foreground">
                    All cash collections have been deposited
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Deposits */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Recent Deposits
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {depositsLoading ? (
                  <div className="space-y-2">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="h-12 bg-muted animate-pulse rounded" />
                    ))}
                  </div>
                ) : (
                  bankDeposits.slice(0, 5).map((deposit: BankDeposit) => (
                    <div key={deposit.id} className="p-2 border rounded text-sm">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium">{deposit.depositNumber}</span>
                        {getStatusBadge(deposit.status, deposit.reconcileStatus)}
                      </div>
                      <div className="text-muted-foreground text-xs mb-1">
                        {deposit.bankAccountName}
                      </div>
                      <div className="font-medium text-green-600">
                        {formatCurrency(deposit.depositAmount)}
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="pending" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Pending Verification</CardTitle>
              <CardDescription>Bank deposits awaiting verification or flagged for review</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {bankDeposits
                  .filter((deposit: BankDeposit) => deposit.status === 'pending' || deposit.status === 'flagged')
                  .map((deposit: BankDeposit) => (
                    <div key={deposit.id} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <div className="font-medium">{deposit.depositNumber}</div>
                          <div className="text-sm text-muted-foreground">
                            {format(new Date(deposit.depositDate), 'MMM dd, yyyy')} • {deposit.depositMethod}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold">{formatCurrency(deposit.depositAmount)}</div>
                          {getStatusBadge(deposit.status, deposit.reconcileStatus)}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                        <div>
                          <span className="text-muted-foreground">Bank:</span>
                          <div>{deposit.bankName}</div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Account:</span>
                          <div>{deposit.bankAccountName}</div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedDeposit(deposit);
                            setViewDepositDialogOpen(true);
                          }}
                          className="gap-1"
                        >
                          <Eye className="w-4 h-4" />
                          View Details
                        </Button>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleVerifyDeposit(deposit.id, 'verified')}
                            disabled={verifyDepositMutation.isPending}
                            className="gap-1 bg-green-600 hover:bg-green-700"
                          >
                            <Check className="w-4 h-4" />
                            Verify
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleVerifyDeposit(deposit.id, 'flagged')}
                            disabled={verifyDepositMutation.isPending}
                            className="gap-1"
                          >
                            <X className="w-4 h-4" />
                            Flag
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                {bankDeposits.filter((deposit: BankDeposit) => deposit.status === 'pending' || deposit.status === 'flagged').length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No deposits pending verification
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Deposit History</CardTitle>
              <CardDescription>All recorded bank deposits</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {bankDeposits.map((deposit: BankDeposit) => (
                  <div key={deposit.id} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <div className="font-medium">{deposit.depositNumber}</div>
                        <div className="text-sm text-muted-foreground">
                          {format(new Date(deposit.depositDate), 'MMM dd, yyyy')} • {deposit.depositMethod}
                          {deposit.referenceNumber && ` • Ref: ${deposit.referenceNumber}`}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold">{formatCurrency(deposit.depositAmount)}</div>
                        {getStatusBadge(deposit.status, deposit.reconcileStatus)}
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Bank:</span>
                        <div>{deposit.bankName}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Account:</span>
                        <div>{deposit.bankAccountName}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Deposited By:</span>
                        <div>{deposit.depositedByName}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* View Deposit Dialog */}
      <Dialog open={viewDepositDialogOpen} onOpenChange={setViewDepositDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Deposit Details</DialogTitle>
            <DialogDescription>
              Complete information for deposit {selectedDeposit?.depositNumber}
            </DialogDescription>
          </DialogHeader>
          {selectedDeposit && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Deposit Number</Label>
                  <div className="font-medium">{selectedDeposit.depositNumber}</div>
                </div>
                <div>
                  <Label>Amount</Label>
                  <div className="text-lg font-bold text-green-600">
                    {formatCurrency(selectedDeposit.depositAmount)}
                  </div>
                </div>
                <div>
                  <Label>Deposit Date</Label>
                  <div>{format(new Date(selectedDeposit.depositDate), 'MMM dd, yyyy')}</div>
                </div>
                <div>
                  <Label>Method</Label>
                  <div className="capitalize">{selectedDeposit.depositMethod}</div>
                </div>
                <div>
                  <Label>Bank</Label>
                  <div>{selectedDeposit.bankName}</div>
                </div>
                <div>
                  <Label>Account</Label>
                  <div>{selectedDeposit.bankAccountName}</div>
                </div>
                <div>
                  <Label>Reference Number</Label>
                  <div>{selectedDeposit.referenceNumber || "N/A"}</div>
                </div>
                <div>
                  <Label>Status</Label>
                  <div>{getStatusBadge(selectedDeposit.status, selectedDeposit.reconcileStatus)}</div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}