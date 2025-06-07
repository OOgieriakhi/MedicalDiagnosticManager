import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  Plus,
  Check,
  X,
  Download,
  Upload,
  CreditCard,
  Home,
  ArrowLeft,
  AlertTriangle,
  CheckCircle,
  Calendar,
  DollarSign,
  RefreshCw
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Link } from "wouter";

interface BankTransaction {
  id: number;
  date: string;
  description: string;
  amount: number;
  type: 'debit' | 'credit';
  reconciled: boolean;
  statementBalance?: number;
}

interface ReconciliationItem {
  id: number;
  transactionId: number;
  amount: number;
  description: string;
  type: 'outstanding_check' | 'deposit_in_transit' | 'bank_charge' | 'book_error';
  date: string;
}

export default function BankReconciliation() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedAccount, setSelectedAccount] = useState("");
  const [reconciliationDate, setReconciliationDate] = useState(new Date().toISOString().split('T')[0]);
  const [statementBalance, setStatementBalance] = useState("");
  const [selectedTransactions, setSelectedTransactions] = useState<number[]>([]);
  const [importFile, setImportFile] = useState<File | null>(null);

  // Fetch bank accounts
  const { data: bankAccounts = [] } = useQuery({
    queryKey: ["/api/bank-accounts", user?.branchId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (user?.branchId) params.append('branchId', user.branchId.toString());
      
      const response = await fetch(`/api/bank-accounts?${params}`);
      if (!response.ok) throw new Error("Failed to fetch bank accounts");
      return response.json();
    },
    enabled: !!user?.branchId
  });

  // Fetch unreconciled transactions
  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ["/api/bank-transactions", selectedAccount, reconciliationDate],
    queryFn: async () => {
      if (!selectedAccount) return [];
      
      const params = new URLSearchParams();
      params.append('accountId', selectedAccount);
      params.append('date', reconciliationDate);
      
      const response = await fetch(`/api/bank-transactions/unreconciled?${params}`);
      if (!response.ok) throw new Error("Failed to fetch transactions");
      return response.json();
    },
    enabled: !!selectedAccount
  });

  // Fetch reconciliation items
  const { data: reconciliationItems = [] } = useQuery({
    queryKey: ["/api/bank-reconciliation-items", selectedAccount, reconciliationDate],
    queryFn: async () => {
      if (!selectedAccount) return [];
      
      const params = new URLSearchParams();
      params.append('accountId', selectedAccount);
      params.append('date', reconciliationDate);
      
      const response = await fetch(`/api/bank-reconciliation-items?${params}`);
      if (!response.ok) throw new Error("Failed to fetch reconciliation items");
      return response.json();
    },
    enabled: !!selectedAccount
  });

  // Submit reconciliation
  const reconciliationMutation = useMutation({
    mutationFn: (data: any) => apiRequest(`/api/bank-reconciliation`, {
      method: "POST",
      body: JSON.stringify(data)
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bank-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/bank-reconciliation-items"] });
      setSelectedTransactions([]);
      toast({ title: "Bank reconciliation completed successfully" });
    },
    onError: () => {
      toast({ title: "Failed to complete reconciliation", variant: "destructive" });
    }
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN'
    }).format(amount);
  };

  const calculateBalances = () => {
    const bookBalance = transactions
      .filter((t: BankTransaction) => selectedTransactions.includes(t.id))
      .reduce((sum, t) => sum + (t.type === 'credit' ? t.amount : -t.amount), 0);

    const outstandingChecks = reconciliationItems
      .filter(item => item.type === 'outstanding_check')
      .reduce((sum, item) => sum + item.amount, 0);

    const depositsInTransit = reconciliationItems
      .filter(item => item.type === 'deposit_in_transit')
      .reduce((sum, item) => sum + item.amount, 0);

    const bankCharges = reconciliationItems
      .filter(item => item.type === 'bank_charge')
      .reduce((sum, item) => sum + item.amount, 0);

    const adjustedBankBalance = parseFloat(statementBalance || "0") - outstandingChecks + depositsInTransit;
    const adjustedBookBalance = bookBalance - bankCharges;

    return {
      bookBalance,
      adjustedBankBalance,
      adjustedBookBalance,
      difference: adjustedBankBalance - adjustedBookBalance,
      outstandingChecks,
      depositsInTransit,
      bankCharges
    };
  };

  const balances = calculateBalances();
  const isReconciled = Math.abs(balances.difference) < 0.01;

  const handleTransactionToggle = (transactionId: number) => {
    setSelectedTransactions(prev => 
      prev.includes(transactionId) 
        ? prev.filter(id => id !== transactionId)
        : [...prev, transactionId]
    );
  };

  const handleSubmitReconciliation = () => {
    if (!isReconciled) {
      toast({ 
        title: "Reconciliation not balanced", 
        description: `Difference: ${formatCurrency(balances.difference)}`,
        variant: "destructive" 
      });
      return;
    }

    reconciliationMutation.mutate({
      accountId: selectedAccount,
      reconciliationDate,
      statementBalance: parseFloat(statementBalance),
      selectedTransactions,
      reconciliationItems,
      finalBalance: balances.adjustedBankBalance
    });
  };

  const handlePrint = () => {
    window.print();
  };

  const exportToCSV = () => {
    const selectedAccountData = bankAccounts.find((acc: any) => acc.id.toString() === selectedAccount);
    const accountName = selectedAccountData ? `${selectedAccountData.accountName} - ${selectedAccountData.accountNumber}` : 'Selected Account';
    
    const csvData = [
      ['Bank Reconciliation Report'],
      ['Account:', accountName],
      ['Reconciliation Date:', reconciliationDate],
      ['Statement Balance:', statementBalance],
      [''],
      ['Selected Transactions'],
      ['Date', 'Description', 'Type', 'Amount', 'Reconciled'],
      ...transactions
        .filter((t: BankTransaction) => selectedTransactions.includes(t.id))
        .map((t: BankTransaction) => [
          t.date,
          t.description,
          t.type,
          t.amount.toString(),
          'Yes'
        ]),
      [''],
      ['Reconciliation Summary'],
      ['Book Balance', balances.bookBalance.toString()],
      ['Outstanding Checks', balances.outstandingChecks.toString()],
      ['Deposits in Transit', balances.depositsInTransit.toString()],
      ['Adjusted Bank Balance', balances.adjustedBankBalance.toString()],
      ['Bank Charges', balances.bankCharges.toString()],
      ['Adjusted Book Balance', balances.adjustedBookBalance.toString()],
      ['Difference', balances.difference.toString()],
      ['Status', isReconciled ? 'Reconciled' : 'Not Reconciled']
    ];

    const csvContent = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bank-reconciliation-${reconciliationDate}.csv`;
    a.click();
  };

  const handleImportStatement = () => {
    toast({ 
      title: "Import Statement", 
      description: "Statement import functionality ready for implementation" 
    });
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/accounting-dashboard">
            <Button variant="outline" size="sm" className="flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back to Accounting
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Bank Reconciliation</h1>
            <p className="text-gray-600">Reconcile bank statements with book records</p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <Button variant="outline" size="sm" onClick={handlePrint}>
            <Download className="w-4 h-4 mr-2" />
            Print Report
          </Button>
          <Button variant="outline" size="sm" onClick={exportToCSV}>
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
          <Button variant="outline" size="sm" onClick={handleImportStatement}>
            <Upload className="w-4 h-4 mr-2" />
            Import Statement
          </Button>
        </div>
      </div>

      {/* Reconciliation Setup */}
      <Card>
        <CardHeader>
          <CardTitle>Reconciliation Setup</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="bankAccount">Bank Account</Label>
              <Select value={selectedAccount} onValueChange={setSelectedAccount}>
                <SelectTrigger>
                  <SelectValue placeholder="Select bank account" />
                </SelectTrigger>
                <SelectContent>
                  {bankAccounts.map((account: any) => (
                    <SelectItem key={account.id} value={account.id.toString()}>
                      {account.accountName} - {account.accountNumber}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="reconciliationDate">Reconciliation Date</Label>
              <Input
                id="reconciliationDate"
                type="date"
                value={reconciliationDate}
                onChange={(e) => setReconciliationDate(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="statementBalance">Statement Balance</Label>
              <Input
                id="statementBalance"
                type="number"
                step="0.01"
                value={statementBalance}
                onChange={(e) => setStatementBalance(e.target.value)}
                placeholder="Enter statement balance"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {selectedAccount && (
        <>
          {/* Reconciliation Summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5" />
                  Reconciliation Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span>Statement Balance:</span>
                  <span className="font-medium">{formatCurrency(parseFloat(statementBalance || "0"))}</span>
                </div>
                <div className="flex justify-between">
                  <span>Outstanding Checks:</span>
                  <span className="font-medium text-red-600">-{formatCurrency(balances.outstandingChecks)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Deposits in Transit:</span>
                  <span className="font-medium text-green-600">+{formatCurrency(balances.depositsInTransit)}</span>
                </div>
                <div className="border-t pt-2">
                  <div className="flex justify-between font-semibold">
                    <span>Adjusted Bank Balance:</span>
                    <span>{formatCurrency(balances.adjustedBankBalance)}</span>
                  </div>
                </div>
                <div className="flex justify-between">
                  <span>Book Balance:</span>
                  <span className="font-medium">{formatCurrency(balances.bookBalance)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Bank Charges:</span>
                  <span className="font-medium text-red-600">-{formatCurrency(balances.bankCharges)}</span>
                </div>
                <div className="border-t pt-2">
                  <div className="flex justify-between font-semibold">
                    <span>Adjusted Book Balance:</span>
                    <span>{formatCurrency(balances.adjustedBookBalance)}</span>
                  </div>
                </div>
                <div className="border-t pt-2">
                  <div className={`flex justify-between font-bold text-lg ${isReconciled ? 'text-green-600' : 'text-red-600'}`}>
                    <span>Difference:</span>
                    <span>{formatCurrency(balances.difference)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-4">
                  {isReconciled ? (
                    <Badge className="bg-green-100 text-green-800">
                      <CheckCircle className="w-4 h-4 mr-1" />
                      Reconciled
                    </Badge>
                  ) : (
                    <Badge className="bg-red-100 text-red-800">
                      <AlertTriangle className="w-4 h-4 mr-1" />
                      Not Reconciled
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button 
                  className="w-full" 
                  onClick={handleSubmitReconciliation}
                  disabled={!isReconciled || reconciliationMutation.isPending}
                >
                  {reconciliationMutation.isPending ? "Processing..." : "Complete Reconciliation"}
                </Button>
                <Button variant="outline" className="w-full">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh Data
                </Button>
                <Button variant="outline" className="w-full">
                  <Upload className="w-4 h-4 mr-2" />
                  Import Statement
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Transactions */}
          <Tabs defaultValue="transactions">
            <TabsList>
              <TabsTrigger value="transactions">Bank Transactions</TabsTrigger>
              <TabsTrigger value="adjustments">Reconciliation Items</TabsTrigger>
            </TabsList>

            <TabsContent value="transactions">
              <Card>
                <CardHeader>
                  <CardTitle>Unreconciled Transactions</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Select</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Debit</TableHead>
                        <TableHead>Credit</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {transactions.map((transaction: BankTransaction) => (
                        <TableRow key={transaction.id}>
                          <TableCell>
                            <Checkbox
                              checked={selectedTransactions.includes(transaction.id)}
                              onCheckedChange={() => handleTransactionToggle(transaction.id)}
                            />
                          </TableCell>
                          <TableCell>{new Date(transaction.date).toLocaleDateString()}</TableCell>
                          <TableCell>{transaction.description}</TableCell>
                          <TableCell>
                            {transaction.type === 'debit' ? formatCurrency(transaction.amount) : ''}
                          </TableCell>
                          <TableCell>
                            {transaction.type === 'credit' ? formatCurrency(transaction.amount) : ''}
                          </TableCell>
                          <TableCell>
                            <Badge className={transaction.reconciled ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
                              {transaction.reconciled ? 'Reconciled' : 'Pending'}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="adjustments">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    Reconciliation Items
                    <Button size="sm">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Item
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reconciliationItems.map((item: ReconciliationItem) => (
                        <TableRow key={item.id}>
                          <TableCell>{new Date(item.date).toLocaleDateString()}</TableCell>
                          <TableCell>{item.description}</TableCell>
                          <TableCell>
                            <Badge className="capitalize">
                              {item.type.replace('_', ' ')}
                            </Badge>
                          </TableCell>
                          <TableCell>{formatCurrency(item.amount)}</TableCell>
                          <TableCell>
                            <Button variant="ghost" size="sm">
                              <X className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}