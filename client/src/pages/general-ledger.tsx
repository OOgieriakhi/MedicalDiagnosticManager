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

  const handlePrint = () => {
    window.print();
  };

  const exportToCSV = () => {
    const csvData = [
      ['General Ledger Report'],
      ['Account:', selectedAccount === 'all' ? 'All Accounts' : selectedAccount],
      ['Date Range:', `${startDate || 'All'} to ${endDate || 'All'}`],
      [''],
      ['Date', 'Entry Number', 'Account Code', 'Account Name', 'Description', 'Debit Amount', 'Credit Amount', 'Running Balance', 'Reference Type', 'Reference Number', 'Created By'],
      ...filteredEntries.map((entry: LedgerEntry) => [
        entry.entryDate,
        entry.entryNumber,
        entry.accountCode,
        entry.accountName,
        entry.description,
        entry.debitAmount.toString(),
        entry.creditAmount.toString(),
        entry.runningBalance.toString(),
        entry.referenceType,
        entry.referenceNumber,
        entry.createdBy
      ]),
      [''],
      ['Account Summaries'],
      ['Account Code', 'Account Name', 'Account Type', 'Opening Balance', 'Total Debits', 'Total Credits', 'Closing Balance', 'Entry Count'],
      ...accountSummaries.map((summary: AccountSummary) => [
        summary.accountCode,
        summary.accountName,
        summary.accountType,
        summary.openingBalance.toString(),
        summary.totalDebits.toString(),
        summary.totalCredits.toString(),
        summary.closingBalance.toString(),
        summary.entryCount.toString()
      ])
    ];

    const csvContent = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `general-ledger-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
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
          <Button variant="outline" size="sm" onClick={handlePrint}>
            <Download className="w-4 h-4 mr-2" />
            Print
          </Button>
          <Button variant="outline" size="sm" onClick={exportToCSV}>
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