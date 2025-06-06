import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  Building2, Plus, Upload, AlertTriangle, Check, X, Eye,
  Calendar, DollarSign, CreditCard, FileText, Banknote,
  ChevronDown, Filter, Search, Download, TrendingUp, RefreshCw
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
  const [depositDialogOpen, setDepositDialogOpen] = useState(false);
  const [selectedDeposit, setSelectedDeposit] = useState<BankDeposit | null>(null);
  const [formData, setFormData] = useState({
    bankAccountId: '',
    depositAmount: '',
    depositDate: format(new Date(), 'yyyy-MM-dd'),
    depositMethod: 'cash',
    referenceNumber: '',
    sourceType: 'cumulative_cash',
    linkedCashAmount: '',
    notes: ''
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch data
  const { data: bankAccounts } = useQuery({
    queryKey: ["/api/bank-accounts"],
  });

  const { data: bankDeposits } = useQuery({
    queryKey: ["/api/bank-deposits"],
  });

  const { data: verifiedCash } = useQuery({
    queryKey: ["/api/verified-cash-summary"],
  });

  const { data: varianceMetrics } = useQuery({
    queryKey: ["/api/cash-variance-metrics"],
  });

  // Create deposit mutation
  const createDepositMutation = useMutation({
    mutationFn: (depositData: any) => apiRequest("POST", "/api/bank-deposits", depositData),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Bank deposit recorded successfully",
      });
      setDepositDialogOpen(false);
      setFormData({
        bankAccountId: '',
        depositAmount: '',
        depositDate: format(new Date(), 'yyyy-MM-dd'),
        depositMethod: 'cash',
        referenceNumber: '',
        sourceType: 'cumulative_cash',
        linkedCashAmount: '',
        notes: ''
      });
      queryClient.invalidateQueries({ queryKey: ["/api/bank-deposits"] });
      queryClient.invalidateQueries({ queryKey: ["/api/verified-cash-summary"] });
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
    
    if (!formData.bankAccountId || !formData.depositAmount) {
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
    };

    createDepositMutation.mutate(submitData);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const getStatusBadge = (status: string, reconcileStatus?: string) => {
    if (status === 'verified') {
      return <Badge variant="default" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Verified</Badge>;
    } else if (status === 'flagged') {
      return <Badge variant="destructive">Flagged</Badge>;
    } else if (status === 'pending') {
      return <Badge variant="secondary">Pending</Badge>;
    }
    return <Badge variant="outline">{status}</Badge>;
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
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => {
              queryClient.invalidateQueries({ queryKey: ["/api/verified-cash-summary"] });
              queryClient.invalidateQueries({ queryKey: ["/api/cash-variance-metrics"] });
              queryClient.invalidateQueries({ queryKey: ["/api/bank-deposits"] });
            }}
            className="gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </Button>
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
                        {(bankAccounts as any)?.map((account: BankAccount) => (
                          <SelectItem key={account.id} value={account.id.toString()}>
                            {account.accountName} - {account.bankName}
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
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="depositDate">Deposit Date</Label>
                    <Input
                      id="depositDate"
                      type="date"
                      value={formData.depositDate}
                      onChange={(e) => setFormData(prev => ({ ...prev, depositDate: e.target.value }))}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="depositMethod">Deposit Method</Label>
                    <Select value={formData.depositMethod} onValueChange={(value) => setFormData(prev => ({ ...prev, depositMethod: value }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash">Cash Deposit</SelectItem>
                        <SelectItem value="check">Check Deposit</SelectItem>
                        <SelectItem value="transfer">Bank Transfer</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Undeposited Cash Display */}
                {(verifiedCash as any)?.cumulative?.totalAmount > 0 && (
                  <div className="p-4 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg">
                    <h4 className="font-medium text-green-800 dark:text-green-200 mb-2">Available Undeposited Cash</h4>
                    <div className="text-2xl font-bold text-green-700 dark:text-green-300">
                      {formatCurrency((verifiedCash as any).cumulative.totalAmount)}
                    </div>
                    <p className="text-sm text-green-600 dark:text-green-400">
                      {(verifiedCash as any).cumulative.transactionCount} transactions over {(verifiedCash as any).cumulative.daySpan} days
                    </p>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Optional deposit notes..."
                    rows={3}
                  />
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setDepositDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createDepositMutation.isPending}>
                    {createDepositMutation.isPending ? 'Recording...' : 'Record Deposit'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Bank Accounts Section */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader className="flex flex-row items-center space-y-0 pb-2">
              <Building2 className="w-5 h-5 text-muted-foreground mr-2" />
              <div>
                <CardTitle className="text-lg">Bank Accounts</CardTitle>
                <CardDescription>Available accounts for deposits</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {(bankAccounts as any)?.map((account: BankAccount) => (
                <div key={account.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold">{account.accountName}</h3>
                      <p className="text-sm text-muted-foreground">{account.bankName} - {account.accountNumber}</p>
                      {account.isMainAccount && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 mt-1">
                          Main
                        </span>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-lg">{formatCurrency(account.currentBalance)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Undeposited Cash Section */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader className="flex flex-row items-center space-y-0 pb-2">
              <Banknote className="w-5 h-5 text-muted-foreground mr-2" />
              <div>
                <CardTitle className="text-lg">Undeposited Cash</CardTitle>
                <CardDescription>Verified cash since last deposit</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              {(verifiedCash as any)?.cumulative?.totalAmount > 0 ? (
                <div className="space-y-4">
                  <div className="text-center p-6 border-2 border-dashed border-green-200 dark:border-green-800 rounded-lg bg-green-50 dark:bg-green-950/20">
                    <DollarSign className="w-8 h-8 text-green-600 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-green-700 dark:text-green-400">
                      {formatCurrency((verifiedCash as any).cumulative.totalAmount)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {(verifiedCash as any).cumulative.transactionCount} transactions, {(verifiedCash as any).cumulative.daySpan} days
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Since {format(new Date((verifiedCash as any).cumulative.fromDate), 'MMM dd')} - {format(new Date((verifiedCash as any).cumulative.toDate), 'MMM dd')}
                    </p>
                  </div>

                  {/* Daily Breakdown */}
                  {(verifiedCash as any)?.daily?.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-medium text-sm">Daily Breakdown:</h4>
                      {(verifiedCash as any).daily.map((day: any) => (
                        <div key={day.businessDate} className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-800 rounded">
                          <span className="text-sm">{format(new Date(day.businessDate), 'MMM dd, yyyy')}</span>
                          <div className="text-right">
                            <span className="font-medium">{formatCurrency(day.totalAmount)}</span>
                            <span className="text-xs text-muted-foreground ml-2">({day.transactionCount} txns)</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center p-6 border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-lg">
                  <Check className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-600 dark:text-gray-400">All cash collections have been deposited</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recent Deposits */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader className="flex flex-row items-center space-y-0 pb-2">
              <FileText className="w-5 h-5 text-muted-foreground mr-2" />
              <div>
                <CardTitle className="text-lg">Recent Deposits</CardTitle>
                <CardDescription>Latest bank deposits</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {(bankDeposits as any)?.slice(0, 5).map((deposit: BankDeposit) => (
                  <div key={deposit.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium text-sm">{deposit.depositNumber}</p>
                      <p className="text-xs text-muted-foreground">{deposit.bankName}</p>
                      <p className="text-xs text-muted-foreground">{format(new Date(deposit.createdAt), 'MMM dd, yyyy')}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{formatCurrency(deposit.depositAmount)}</p>
                      {getStatusBadge(deposit.status, deposit.reconcileStatus)}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Deposit Management Tabs */}
      <Tabs defaultValue="pending" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="pending">Pending Verification</TabsTrigger>
          <TabsTrigger value="history">Deposit History</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Pending Verification</CardTitle>
              <CardDescription>Bank deposits awaiting verification or flagged for review</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {(bankDeposits as any)
                  ?.filter((deposit: BankDeposit) => deposit.status === 'pending' || deposit.status === 'flagged')
                  .map((deposit: BankDeposit) => (
                    <div key={deposit.id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold">{deposit.depositNumber}</h3>
                            {getStatusBadge(deposit.status, deposit.reconcileStatus)}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(deposit.createdAt), 'MMM dd, yyyy')} • {deposit.depositMethod}
                          </p>
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="text-muted-foreground">Bank:</span>
                              <div>{deposit.bankName}</div>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Account:</span>
                              <div>{deposit.accountNumber}</div>
                            </div>
                          </div>
                        </div>
                        <div className="text-right space-y-2">
                          <p className="font-semibold text-lg">{formatCurrency(deposit.depositAmount)}</p>
                          <div className="flex gap-2">
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => {
                                verifyDepositMutation.mutate({
                                  id: deposit.id,
                                  status: 'verified',
                                  notes: 'Verified via bank deposit recording interface'
                                });
                              }}
                              className="gap-1"
                            >
                              <Check className="w-4 h-4" />
                              Verify
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => {
                                verifyDepositMutation.mutate({
                                  id: deposit.id,
                                  status: 'flagged',
                                  notes: 'Flagged for review via bank deposit recording interface'
                                });
                              }}
                              className="gap-1"
                            >
                              <X className="w-4 h-4" />
                              Flag
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}

                {(bankDeposits as any)?.filter((deposit: BankDeposit) => deposit.status === 'pending' || deposit.status === 'flagged').length === 0 && (
                  <div className="text-center py-8">
                    <Check className="w-12 h-12 text-green-500 mx-auto mb-4" />
                    <p className="text-muted-foreground">No deposits pending verification</p>
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
              <CardDescription>All bank deposits and their verification status</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {(bankDeposits as any)?.map((deposit: BankDeposit) => (
                  <div key={deposit.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">{deposit.depositNumber}</h3>
                          {getStatusBadge(deposit.status, deposit.reconcileStatus)}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(deposit.createdAt), 'MMM dd, yyyy')} • {deposit.depositMethod}
                        </p>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">Bank:</span>
                            <div>{deposit.bankName}</div>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Account:</span>
                            <div>{deposit.accountNumber}</div>
                          </div>
                        </div>
                      </div>
                      <div className="text-right space-y-2">
                        <p className="font-semibold text-lg">{formatCurrency(deposit.depositAmount)}</p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedDeposit(deposit)}
                          className="gap-1"
                        >
                          <Eye className="w-4 h-4" />
                          View Details
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}