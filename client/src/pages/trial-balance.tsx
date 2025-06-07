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
import { useToast } from "@/hooks/use-toast";
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
  const { toast } = useToast();
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

  // Check if data is available for export
  const filteredAccounts = (trialBalanceData?.accounts || []).filter((account: TrialBalanceAccount) => {
    if (accountTypeFilter === "all") return true;
    return account.accountType.toLowerCase() === accountTypeFilter.toLowerCase();
  });

  const hasData = filteredAccounts && filteredAccounts.length > 0;

  // Print functionality
  const handlePrint = () => {
    if (!hasData) {
      toast({ 
        title: "No data to print", 
        description: "Please select filters that return trial balance data",
        variant: "destructive" 
      });
      return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const summary = trialBalanceData?.summary || {};
    
    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Trial Balance Report</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            h1 { color: #1f2937; text-align: center; }
            .summary { margin: 20px 0; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f3f4f6; }
            .amount { text-align: right; }
            .total { font-weight: bold; background-color: #f9fafb; }
            .debit { color: #059669; }
            .credit { color: #dc2626; }
            .balanced { color: #059669; }
            .unbalanced { color: #dc2626; }
          </style>
        </head>
        <body>
          <h1>Trial Balance</h1>
          <div class="summary">
            <p><strong>As of Date:</strong> ${asOfDate}</p>
            <p><strong>Period:</strong> ${selectedPeriod}</p>
            <p><strong>Status:</strong> <span class="${summary.isBalanced ? 'balanced' : 'unbalanced'}">${summary.isBalanced ? 'Balanced' : 'Unbalanced'}</span></p>
            ${summary.variance ? `<p><strong>Variance:</strong> ${formatCurrency(summary.variance)}</p>` : ''}
          </div>
          
          <table>
            <thead>
              <tr>
                <th>Account Code</th>
                <th>Account Name</th>
                <th>Type</th>
                <th>Debit Balance</th>
                <th>Credit Balance</th>
              </tr>
            </thead>
            <tbody>
              ${filteredAccounts.map((account: TrialBalanceAccount) => `
                <tr>
                  <td>${account.accountCode}</td>
                  <td>${account.accountName}</td>
                  <td>${account.accountType}</td>
                  <td class="amount debit">${account.debitBalance > 0 ? formatCurrency(account.debitBalance) : ''}</td>
                  <td class="amount credit">${account.creditBalance > 0 ? formatCurrency(account.creditBalance) : ''}</td>
                </tr>
              `).join('')}
              <tr class="total">
                <td colspan="3"><strong>TOTALS</strong></td>
                <td class="amount debit"><strong>${formatCurrency(summary.totalDebits || 0)}</strong></td>
                <td class="amount credit"><strong>${formatCurrency(summary.totalCredits || 0)}</strong></td>
              </tr>
            </tbody>
          </table>
        </body>
      </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  };

  // Export to CSV functionality
  const exportToCSV = () => {
    if (!hasData) {
      toast({ 
        title: "No data to export", 
        description: "Please select filters that return trial balance data",
        variant: "destructive" 
      });
      return;
    }

    const summary = trialBalanceData?.summary || {};
    
    let csvContent = "Trial Balance Export\n";
    csvContent += `As of Date,${asOfDate}\n`;
    csvContent += `Period,${selectedPeriod}\n`;
    csvContent += `Status,${summary.isBalanced ? 'Balanced' : 'Unbalanced'}\n`;
    if (summary.variance) csvContent += `Variance,${summary.variance}\n`;
    csvContent += "\n";

    csvContent += "Account Code,Account Name,Type,Debit Balance,Credit Balance\n";
    filteredAccounts.forEach((account: TrialBalanceAccount) => {
      csvContent += `"${account.accountCode}","${account.accountName}","${account.accountType}",${account.debitBalance},${account.creditBalance}\n`;
    });
    
    csvContent += "\n";
    csvContent += `"TOTALS","","",${summary.totalDebits || 0},${summary.totalCredits || 0}\n`;

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `trial-balance-${asOfDate}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getAccountTypeIcon = (type: string) => {
    switch (type?.toLowerCase()) {
      case 'asset': return <Building className="w-4 h-4 text-blue-600" />;
      case 'liability': return <AlertTriangle className="w-4 h-4 text-red-600" />;
      case 'equity': return <CheckCircle className="w-4 h-4 text-green-600" />;
      default: return <DollarSign className="w-4 h-4 text-gray-600" />;
    }
  };

  const summary = trialBalanceData?.summary || {};

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
            <p className="text-gray-600">View account balances as of a specific date</p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handlePrint}
            disabled={!hasData}
          >
            <Printer className="w-4 h-4 mr-2" />
            Print
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={exportToCSV}
            disabled={!hasData}
          >
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

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
                  <SelectItem value="ytd">Year to Date</SelectItem>
                  <SelectItem value="custom">Custom Range</SelectItem>
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
                  <SelectValue placeholder="All types" />
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

            <div>
              <Label htmlFor="adjustments">Include Adjustments</Label>
              <div className="flex items-center space-x-2 mt-2">
                <input
                  id="adjustments"
                  type="checkbox"
                  checked={showAdjustments}
                  onChange={(e) => setShowAdjustments(e.target.checked)}
                  className="rounded border-gray-300"
                />
                <span className="text-sm">Show adjusted entries</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Debits</p>
                  <p className="text-2xl font-bold text-green-600">
                    {formatCurrency(summary.totalDebits || 0)}
                  </p>
                </div>
                <DollarSign className="w-8 h-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Credits</p>
                  <p className="text-2xl font-bold text-red-600">
                    {formatCurrency(summary.totalCredits || 0)}
                  </p>
                </div>
                <DollarSign className="w-8 h-8 text-red-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Balance Status</p>
                  <p className={`text-lg font-bold ${summary.isBalanced ? 'text-green-600' : 'text-red-600'}`}>
                    {summary.isBalanced ? 'Balanced' : 'Out of Balance'}
                  </p>
                </div>
                {summary.isBalanced ? 
                  <CheckCircle className="w-8 h-8 text-green-600" /> : 
                  <AlertTriangle className="w-8 h-8 text-red-600" />
                }
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Accounts</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {summary.accountCount || 0}
                  </p>
                </div>
                <Building className="w-8 h-8 text-gray-600" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Trial Balance Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Trial Balance Accounts
            {filteredAccounts.length > 0 && (
              <Badge variant="secondary">{filteredAccounts.length} accounts</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
              <span className="ml-2">Loading trial balance...</span>
            </div>
          ) : filteredAccounts.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Account Code</TableHead>
                    <TableHead>Account Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Debit Balance</TableHead>
                    <TableHead className="text-right">Credit Balance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAccounts.map((account: TrialBalanceAccount) => (
                    <TableRow key={account.id}>
                      <TableCell className="font-medium">{account.accountCode}</TableCell>
                      <TableCell>{account.accountName}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getAccountTypeIcon(account.accountType)}
                          <span className="capitalize">{account.accountType}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {account.debitBalance > 0 ? (
                          <span className="text-green-600 font-semibold">
                            {formatCurrency(account.debitBalance)}
                          </span>
                        ) : '—'}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {account.creditBalance > 0 ? (
                          <span className="text-red-600 font-semibold">
                            {formatCurrency(account.creditBalance)}
                          </span>
                        ) : '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                  
                  {/* Totals Row */}
                  <TableRow className="border-t-2 border-gray-300 bg-gray-50 font-bold">
                    <TableCell colSpan={3} className="font-bold">TOTALS</TableCell>
                    <TableCell className="text-right font-mono text-green-600 font-bold">
                      {formatCurrency(summary.totalDebits || 0)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-red-600 font-bold">
                      {formatCurrency(summary.totalCredits || 0)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Filter className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium mb-2">No accounts found</h3>
              <p>Try adjusting your filters to see trial balance data.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}