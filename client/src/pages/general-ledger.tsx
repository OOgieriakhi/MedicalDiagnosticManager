import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Search,
  Filter,
  Download,
  Calendar,
  Building,
  ArrowLeft,
  Eye,
  DollarSign,
  TrendingUp,
  TrendingDown
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Link } from "wouter";

interface LedgerEntry {
  id: number;
  entryDate: string;
  entryNumber: string;
  accountCode: string;
  accountName: string;
  description: string;
  debitAmount: number;
  creditAmount: number;
  runningBalance: number;
  referenceType: string;
  referenceNumber: string;
  createdBy: string;
}

interface AccountSummary {
  accountCode: string;
  accountName: string;
  accountType: string;
  openingBalance: number;
  totalDebits: number;
  totalCredits: number;
  closingBalance: number;
  entryCount: number;
}

export default function GeneralLedger() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedAccount, setSelectedAccount] = useState("");
  const [startDate, setStartDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [searchTerm, setSearchTerm] = useState("");

  // Fetch accounts for dropdown
  const { data: accounts = [] } = useQuery({
    queryKey: ["/api/accounting/chart-of-accounts", user?.branchId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (user?.branchId) params.append('branchId', user.branchId.toString());
      
      const response = await fetch(`/api/accounting/chart-of-accounts?${params}`);
      if (!response.ok) throw new Error("Failed to fetch accounts");
      return response.json();
    },
    enabled: !!user?.branchId
  });

  // Fetch general ledger entries
  const { data: ledgerData, isLoading } = useQuery({
    queryKey: ["/api/general-ledger", selectedAccount, startDate, endDate, user?.branchId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (user?.branchId) params.append('branchId', user.branchId.toString());
      if (selectedAccount) params.append('accountId', selectedAccount);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      
      const response = await fetch(`/api/general-ledger?${params}`);
      if (!response.ok) throw new Error("Failed to fetch ledger data");
      return response.json();
    },
    enabled: !!user?.branchId
  });

  // Fetch account summaries
  const { data: accountSummaries = [] } = useQuery({
    queryKey: ["/api/general-ledger/summary", startDate, endDate, user?.branchId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (user?.branchId) params.append('branchId', user.branchId.toString());
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      
      const response = await fetch(`/api/general-ledger/summary?${params}`);
      if (!response.ok) throw new Error("Failed to fetch account summaries");
      return response.json();
    },
    enabled: !!user?.branchId
  });

  const filteredEntries = (ledgerData?.entries || []).filter((entry: LedgerEntry) => {
    const matchesSearch = entry.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         entry.referenceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         entry.entryNumber.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN'
    }).format(amount);
  };

  // Check if data is available for export
  const hasData = (filteredEntries && filteredEntries.length > 0) || 
                  (accountSummaries && accountSummaries.length > 0);

  // Print functionality
  const handlePrint = () => {
    if (!hasData) {
      toast({ 
        title: "No data to print", 
        description: "Please select an account or date range with ledger data",
        variant: "destructive" 
      });
      return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const selectedAccountName = accounts.find(acc => acc.id.toString() === selectedAccount)?.name || 'All Accounts';

    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>General Ledger - ${selectedAccountName}</title>
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
          </style>
        </head>
        <body>
          <h1>General Ledger</h1>
          <div class="summary">
            <p><strong>Account:</strong> ${selectedAccountName}</p>
            <p><strong>Period:</strong> ${startDate} to ${endDate}</p>
          </div>
          
          <h2>Ledger Entries</h2>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Entry #</th>
                <th>Description</th>
                <th>Reference</th>
                <th>Debit</th>
                <th>Credit</th>
                <th>Balance</th>
              </tr>
            </thead>
            <tbody>
              ${filteredEntries.map(entry => `
                <tr>
                  <td>${new Date(entry.entryDate).toLocaleDateString()}</td>
                  <td>${entry.entryNumber}</td>
                  <td>${entry.description}</td>
                  <td>${entry.referenceNumber}</td>
                  <td class="amount debit">${entry.debitAmount > 0 ? formatCurrency(entry.debitAmount) : ''}</td>
                  <td class="amount credit">${entry.creditAmount > 0 ? formatCurrency(entry.creditAmount) : ''}</td>
                  <td class="amount">${formatCurrency(entry.runningBalance)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          
          ${accountSummaries.length > 0 ? `
            <h2>Account Summaries</h2>
            <table>
              <thead>
                <tr>
                  <th>Account</th>
                  <th>Type</th>
                  <th>Opening Balance</th>
                  <th>Total Debits</th>
                  <th>Total Credits</th>
                  <th>Closing Balance</th>
                  <th>Entries</th>
                </tr>
              </thead>
              <tbody>
                ${accountSummaries.map(summary => `
                  <tr>
                    <td>${summary.accountCode} - ${summary.accountName}</td>
                    <td>${summary.accountType}</td>
                    <td class="amount">${formatCurrency(summary.openingBalance)}</td>
                    <td class="amount debit">${formatCurrency(summary.totalDebits)}</td>
                    <td class="amount credit">${formatCurrency(summary.totalCredits)}</td>
                    <td class="amount">${formatCurrency(summary.closingBalance)}</td>
                    <td class="amount">${summary.entryCount}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          ` : ''}
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
        description: "Please select an account or date range with ledger data",
        variant: "destructive" 
      });
      return;
    }

    const selectedAccountName = accounts.find(acc => acc.id.toString() === selectedAccount)?.name || 'All Accounts';

    let csvContent = "General Ledger Export\n";
    csvContent += `Account,${selectedAccountName}\n`;
    csvContent += `Period,${startDate} to ${endDate}\n\n`;

    // Ledger entries section
    if (filteredEntries.length > 0) {
      csvContent += "LEDGER ENTRIES\n";
      csvContent += "Date,Entry Number,Description,Reference,Debit,Credit,Running Balance\n";
      filteredEntries.forEach(entry => {
        csvContent += `"${new Date(entry.entryDate).toLocaleDateString()}","${entry.entryNumber}","${entry.description}","${entry.referenceNumber}",${entry.debitAmount},${entry.creditAmount},${entry.runningBalance}\n`;
      });
      csvContent += "\n";
    }

    // Account summaries section
    if (accountSummaries.length > 0) {
      csvContent += "ACCOUNT SUMMARIES\n";
      csvContent += "Account Code,Account Name,Type,Opening Balance,Total Debits,Total Credits,Closing Balance,Entry Count\n";
      accountSummaries.forEach(summary => {
        csvContent += `"${summary.accountCode}","${summary.accountName}","${summary.accountType}",${summary.openingBalance},${summary.totalDebits},${summary.totalCredits},${summary.closingBalance},${summary.entryCount}\n`;
      });
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `general-ledger-${selectedAccountName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getBalanceColor = (balance: number) => {
    return balance >= 0 ? 'text-green-600' : 'text-red-600';
  };

  const getAccountTypeIcon = (type: string) => {
    switch (type?.toLowerCase()) {
      case 'asset': return <Building className="w-4 h-4 text-blue-600" />;
      case 'revenue': return <TrendingUp className="w-4 h-4 text-green-600" />;
      case 'expense': return <TrendingDown className="w-4 h-4 text-red-600" />;
      default: return <DollarSign className="w-4 h-4 text-gray-600" />;
    }
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
            <h1 className="text-3xl font-bold text-gray-900">General Ledger</h1>
            <p className="text-gray-600">View detailed account transactions and balances</p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handlePrint}
            disabled={!hasData}
          >
            <Download className="w-4 h-4 mr-2" />
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
              <Label htmlFor="account">Account</Label>
              <Select value={selectedAccount} onValueChange={setSelectedAccount}>
                <SelectTrigger>
                  <SelectValue placeholder="All accounts" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Accounts</SelectItem>
                  {accounts.map((account: any) => (
                    <SelectItem key={account.id} value={account.accountCode}>
                      {account.accountCode} - {account.accountName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="search">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  id="search"
                  placeholder="Search entries..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="entries">
        <TabsList>
          <TabsTrigger value="entries">Ledger Entries</TabsTrigger>
          <TabsTrigger value="summary">Account Summary</TabsTrigger>
        </TabsList>

        <TabsContent value="entries">
          {selectedAccount && ledgerData && (
            <Card className="mb-4">
              <CardHeader>
                <CardTitle>Account Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <p className="text-sm text-gray-600">Opening Balance</p>
                    <p className={`text-lg font-semibold ${getBalanceColor(ledgerData.openingBalance)}`}>
                      {formatCurrency(ledgerData.openingBalance)}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-gray-600">Total Debits</p>
                    <p className="text-lg font-semibold text-blue-600">
                      {formatCurrency(ledgerData.totalDebits)}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-gray-600">Total Credits</p>
                    <p className="text-lg font-semibold text-green-600">
                      {formatCurrency(ledgerData.totalCredits)}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-gray-600">Closing Balance</p>
                    <p className={`text-lg font-semibold ${getBalanceColor(ledgerData.closingBalance)}`}>
                      {formatCurrency(ledgerData.closingBalance)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Ledger Entries</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8">Loading ledger entries...</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Entry #</TableHead>
                      <TableHead>Account</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Debit</TableHead>
                      <TableHead>Credit</TableHead>
                      <TableHead>Balance</TableHead>
                      <TableHead>Reference</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredEntries.map((entry: LedgerEntry) => (
                      <TableRow key={entry.id}>
                        <TableCell>{new Date(entry.entryDate).toLocaleDateString()}</TableCell>
                        <TableCell className="font-mono">{entry.entryNumber}</TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{entry.accountCode}</div>
                            <div className="text-sm text-gray-600">{entry.accountName}</div>
                          </div>
                        </TableCell>
                        <TableCell>{entry.description}</TableCell>
                        <TableCell className="text-blue-600">
                          {entry.debitAmount > 0 ? formatCurrency(entry.debitAmount) : ''}
                        </TableCell>
                        <TableCell className="text-green-600">
                          {entry.creditAmount > 0 ? formatCurrency(entry.creditAmount) : ''}
                        </TableCell>
                        <TableCell className={getBalanceColor(entry.runningBalance)}>
                          {formatCurrency(entry.runningBalance)}
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="text-sm">{entry.referenceType}</div>
                            <div className="text-xs text-gray-600">{entry.referenceNumber}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm">
                            <Eye className="w-4 h-4" />
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

        <TabsContent value="summary">
          <Card>
            <CardHeader>
              <CardTitle>Account Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Account</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Opening Balance</TableHead>
                    <TableHead>Total Debits</TableHead>
                    <TableHead>Total Credits</TableHead>
                    <TableHead>Closing Balance</TableHead>
                    <TableHead>Entries</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {accountSummaries.map((summary: AccountSummary) => (
                    <TableRow key={summary.accountCode}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{summary.accountCode}</div>
                          <div className="text-sm text-gray-600">{summary.accountName}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getAccountTypeIcon(summary.accountType)}
                          <span className="capitalize">{summary.accountType}</span>
                        </div>
                      </TableCell>
                      <TableCell className={getBalanceColor(summary.openingBalance)}>
                        {formatCurrency(summary.openingBalance)}
                      </TableCell>
                      <TableCell className="text-blue-600">
                        {formatCurrency(summary.totalDebits)}
                      </TableCell>
                      <TableCell className="text-green-600">
                        {formatCurrency(summary.totalCredits)}
                      </TableCell>
                      <TableCell className={getBalanceColor(summary.closingBalance)}>
                        {formatCurrency(summary.closingBalance)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{summary.entryCount}</Badge>
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