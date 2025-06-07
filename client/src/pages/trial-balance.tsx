import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ArrowLeft,
  Download,
  Printer,
  Filter,
  Calendar,
  Building,
  DollarSign,
  AlertTriangle,
  CheckCircle
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Link } from "wouter";

interface TrialBalanceAccount {
  id: number;
  accountCode: string;
  accountName: string;
  accountType: string;
  debitBalance: number;
  creditBalance: number;
  isAdjusted: boolean;
}

interface TrialBalanceSummary {
  totalDebits: number;
  totalCredits: number;
  isBalanced: boolean;
  variance: number;
  accountCount: number;
  lastUpdated: string;
}

export default function TrialBalance() {
  const { user } = useAuth();
  const [selectedPeriod, setSelectedPeriod] = useState("current");
  const [asOfDate, setAsOfDate] = useState(new Date().toISOString().split('T')[0]);
  const [showAdjustments, setShowAdjustments] = useState(false);
  const [accountTypeFilter, setAccountTypeFilter] = useState("all");

  // Fetch trial balance data
  const { data: trialBalanceData, isLoading } = useQuery({
    queryKey: ["/api/trial-balance", selectedPeriod, asOfDate, user?.branchId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (user?.branchId) params.append('branchId', user.branchId.toString());
      if (selectedPeriod) params.append('period', selectedPeriod);
      if (asOfDate) params.append('asOfDate', asOfDate);
      if (showAdjustments) params.append('includeAdjustments', 'true');
      
      const response = await fetch(`/api/trial-balance?${params}`);
      if (!response.ok) throw new Error("Failed to fetch trial balance");
      return response.json();
    },
    enabled: !!user?.branchId
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN'
    }).format(amount);
  };

  const getAccountTypeColor = (type: string) => {
    switch (type?.toLowerCase()) {
      case 'asset': return 'bg-blue-100 text-blue-800';
      case 'liability': return 'bg-red-100 text-red-800';
      case 'equity': return 'bg-purple-100 text-purple-800';
      case 'revenue': return 'bg-green-100 text-green-800';
      case 'expense': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredAccounts = (trialBalanceData?.accounts || []).filter((account: TrialBalanceAccount) => {
    if (accountTypeFilter === "all") return true;
    return account.accountType.toLowerCase() === accountTypeFilter.toLowerCase();
  });

  const groupedAccounts = filteredAccounts.reduce((groups: any, account: TrialBalanceAccount) => {
    const type = account.accountType;
    if (!groups[type]) groups[type] = [];
    groups[type].push(account);
    return groups;
  }, {});

  const summary: TrialBalanceSummary = trialBalanceData?.summary || {
    totalDebits: 0,
    totalCredits: 0,
    isBalanced: true,
    variance: 0,
    accountCount: 0,
    lastUpdated: new Date().toISOString()
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
            <h1 className="text-3xl font-bold text-gray-900">Trial Balance</h1>
            <p className="text-gray-600">Review account balances and verify books are balanced</p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <Button variant="outline" size="sm">
            <Printer className="w-4 h-4 mr-2" />
            Print
          </Button>
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Balance Status Card */}
      <Card className={`border-2 ${summary.isBalanced ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {summary.isBalanced ? (
                <CheckCircle className="w-8 h-8 text-green-600" />
              ) : (
                <AlertTriangle className="w-8 h-8 text-red-600" />
              )}
              <div>
                <h3 className={`text-lg font-semibold ${summary.isBalanced ? 'text-green-800' : 'text-red-800'}`}>
                  {summary.isBalanced ? 'Books are Balanced' : 'Out of Balance'}
                </h3>
                <p className="text-sm text-gray-600">
                  Total Debits: {formatCurrency(summary.totalDebits)} | Total Credits: {formatCurrency(summary.totalCredits)}
                </p>
                {!summary.isBalanced && (
                  <p className="text-sm text-red-600">
                    Variance: {formatCurrency(Math.abs(summary.variance))}
                  </p>
                )}
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">Last Updated</p>
              <p className="font-medium">{new Date(summary.lastUpdated).toLocaleString()}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="period">Period</Label>
              <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                <SelectTrigger>
                  <SelectValue placeholder="Select period" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="current">Current Period</SelectItem>
                  <SelectItem value="previous">Previous Period</SelectItem>
                  <SelectItem value="quarter">Quarter to Date</SelectItem>
                  <SelectItem value="year">Year to Date</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="asOfDate">As of Date</Label>
              <Input
                id="asOfDate"
                type="date"
                value={asOfDate}
                onChange={(e) => setAsOfDate(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="accountType">Account Type</Label>
              <Select value={accountTypeFilter} onValueChange={setAccountTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All account types" />
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
            <div className="flex items-end">
              <Button
                variant={showAdjustments ? "default" : "outline"}
                onClick={() => setShowAdjustments(!showAdjustments)}
                className="w-full"
              >
                {showAdjustments ? "Hide" : "Show"} Adjustments
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="summary">
        <TabsList>
          <TabsTrigger value="summary">Summary View</TabsTrigger>
          <TabsTrigger value="detailed">Detailed View</TabsTrigger>
        </TabsList>

        <TabsContent value="summary">
          <Card>
            <CardHeader>
              <CardTitle>Trial Balance Summary</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8">Loading trial balance...</div>
              ) : (
                <div className="space-y-6">
                  {Object.entries(groupedAccounts).map(([accountType, accounts]: [string, any[]]) => (
                    <div key={accountType}>
                      <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                        <Building className="w-5 h-5" />
                        {accountType.charAt(0).toUpperCase() + accountType.slice(1)}s
                      </h3>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Account Code</TableHead>
                            <TableHead>Account Name</TableHead>
                            <TableHead className="text-right">Debit Balance</TableHead>
                            <TableHead className="text-right">Credit Balance</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {accounts.map((account: TrialBalanceAccount) => (
                            <TableRow key={account.id}>
                              <TableCell className="font-mono">{account.accountCode}</TableCell>
                              <TableCell>{account.accountName}</TableCell>
                              <TableCell className="text-right text-blue-600">
                                {account.debitBalance > 0 ? formatCurrency(account.debitBalance) : ''}
                              </TableCell>
                              <TableCell className="text-right text-green-600">
                                {account.creditBalance > 0 ? formatCurrency(account.creditBalance) : ''}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                      <div className="mt-2 p-3 bg-gray-50 rounded">
                        <div className="flex justify-between text-sm font-medium">
                          <span>{accountType.charAt(0).toUpperCase() + accountType.slice(1)} Subtotal:</span>
                          <div className="flex gap-8">
                            <span className="text-blue-600">
                              {formatCurrency(accounts.reduce((sum, acc) => sum + acc.debitBalance, 0))}
                            </span>
                            <span className="text-green-600">
                              {formatCurrency(accounts.reduce((sum, acc) => sum + acc.creditBalance, 0))}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {/* Grand Totals */}
                  <div className="border-t-2 pt-4">
                    <div className="flex justify-between text-lg font-bold">
                      <span>Grand Totals:</span>
                      <div className="flex gap-8">
                        <span className="text-blue-600">{formatCurrency(summary.totalDebits)}</span>
                        <span className="text-green-600">{formatCurrency(summary.totalCredits)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="detailed">
          <Card>
            <CardHeader>
              <CardTitle>Detailed Trial Balance</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Account Code</TableHead>
                    <TableHead>Account Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Debit Balance</TableHead>
                    <TableHead className="text-right">Credit Balance</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAccounts.map((account: TrialBalanceAccount) => (
                    <TableRow key={account.id}>
                      <TableCell className="font-mono">{account.accountCode}</TableCell>
                      <TableCell>{account.accountName}</TableCell>
                      <TableCell>
                        <Badge className={getAccountTypeColor(account.accountType)}>
                          {account.accountType}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-blue-600">
                        {account.debitBalance > 0 ? formatCurrency(account.debitBalance) : ''}
                      </TableCell>
                      <TableCell className="text-right text-green-600">
                        {account.creditBalance > 0 ? formatCurrency(account.creditBalance) : ''}
                      </TableCell>
                      <TableCell>
                        {account.isAdjusted && (
                          <Badge variant="outline">Adjusted</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}