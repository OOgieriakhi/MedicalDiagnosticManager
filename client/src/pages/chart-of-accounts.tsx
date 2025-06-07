import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  Plus,
  Edit,
  Trash2,
  Search,
  Filter,
  Download,
  Upload,
  BarChart3,
  Home,
  ArrowLeft,
  Building,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Wallet,
  Printer
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Link } from "wouter";

interface Account {
  id: number;
  accountCode: string;
  accountName: string;
  accountType: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
  subType: string;
  currentBalance: number;
  isActive: boolean;
  parentAccountId?: number;
  description?: string;
}

export default function ChartOfAccounts() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [newAccount, setNewAccount] = useState({
    accountCode: "",
    accountName: "",
    accountType: "asset",
    subType: "",
    description: "",
    parentAccountId: undefined
  });

  // Fetch chart of accounts
  const { data: accounts = [], isLoading } = useQuery({
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

  // Create account mutation
  const createAccountMutation = useMutation({
    mutationFn: (accountData: any) => apiRequest(`/api/chart-of-accounts`, {
      method: "POST",
      body: JSON.stringify(accountData)
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chart-of-accounts"] });
      setShowAddDialog(false);
      setNewAccount({
        accountCode: "",
        accountName: "",
        accountType: "asset",
        subType: "",
        description: "",
        parentAccountId: undefined
      });
      toast({ title: "Account created successfully" });
    },
    onError: () => {
      toast({ title: "Failed to create account", variant: "destructive" });
    }
  });

  // Update account mutation
  const updateAccountMutation = useMutation({
    mutationFn: ({ id, ...data }: any) => apiRequest(`/api/chart-of-accounts/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data)
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chart-of-accounts"] });
      setEditingAccount(null);
      toast({ title: "Account updated successfully" });
    },
    onError: () => {
      toast({ title: "Failed to update account", variant: "destructive" });
    }
  });

  // Filter accounts
  const filteredAccounts = accounts.filter((account: Account) => {
    const matchesSearch = account.accountName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         account.accountCode.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterType === "all" || account.accountType === filterType;
    return matchesSearch && matchesFilter;
  });

  // Group accounts by type
  const groupedAccounts = filteredAccounts.reduce((groups: any, account: Account) => {
    const type = account.accountType;
    if (!groups[type]) groups[type] = [];
    groups[type].push(account);
    return groups;
  }, {});

  const getAccountTypeIcon = (type: string) => {
    switch (type) {
      case 'asset': return <Building className="w-4 h-4 text-blue-600" />;
      case 'liability': return <TrendingDown className="w-4 h-4 text-red-600" />;
      case 'equity': return <Wallet className="w-4 h-4 text-purple-600" />;
      case 'revenue': return <TrendingUp className="w-4 h-4 text-green-600" />;
      case 'expense': return <DollarSign className="w-4 h-4 text-orange-600" />;
      default: return <BarChart3 className="w-4 h-4 text-gray-600" />;
    }
  };

  const getAccountTypeBadge = (type: string) => {
    const variants: Record<string, string> = {
      'asset': 'bg-blue-100 text-blue-800',
      'liability': 'bg-red-100 text-red-800',
      'equity': 'bg-purple-100 text-purple-800',
      'revenue': 'bg-green-100 text-green-800',
      'expense': 'bg-orange-100 text-orange-800'
    };
    return variants[type] || 'bg-gray-100 text-gray-800';
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN'
    }).format(amount);
  };

  const handleCreateAccount = () => {
    createAccountMutation.mutate({
      ...newAccount,
      branchId: user?.branchId,
      tenantId: user?.tenantId
    });
  };

  const handleUpdateAccount = () => {
    if (editingAccount) {
      updateAccountMutation.mutate(editingAccount);
    }
  };

  // Check if data is available for export
  const hasData = filteredAccounts && filteredAccounts.length > 0;

  // Print functionality
  const handlePrint = () => {
    if (!hasData) {
      toast({ 
        title: "No data to print", 
        description: "Please search or filter to view chart of accounts data",
        variant: "destructive" 
      });
      return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    
    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Chart of Accounts</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            h1 { color: #1f2937; text-align: center; }
            .summary { margin: 20px 0; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f3f4f6; }
            .amount { text-align: right; }
            .type-asset { color: #2563eb; }
            .type-liability { color: #dc2626; }
            .type-equity { color: #7c3aed; }
            .type-revenue { color: #059669; }
            .type-expense { color: #ea580c; }
          </style>
        </head>
        <body>
          <h1>Chart of Accounts</h1>
          <div class="summary">
            <p><strong>Total Accounts:</strong> ${filteredAccounts.length}</p>
            <p><strong>Filter:</strong> ${filterType === 'all' ? 'All Types' : filterType.toUpperCase()}</p>
            <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
          </div>
          
          <table>
            <thead>
              <tr>
                <th>Account Code</th>
                <th>Account Name</th>
                <th>Type</th>
                <th>Sub Type</th>
                <th>Current Balance</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${filteredAccounts.map((account: Account) => `
                <tr>
                  <td>${account.accountCode}</td>
                  <td>${account.accountName}</td>
                  <td class="type-${account.accountType}">${account.accountType.toUpperCase()}</td>
                  <td>${account.subType}</td>
                  <td class="amount">${formatCurrency(account.currentBalance)}</td>
                  <td>${account.isActive ? 'Active' : 'Inactive'}</td>
                </tr>
              `).join('')}
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
        description: "Please search or filter to view chart of accounts data",
        variant: "destructive" 
      });
      return;
    }
    
    let csvContent = "Chart of Accounts Export\n";
    csvContent += `Total Accounts,${filteredAccounts.length}\n`;
    csvContent += `Filter,${filterType === 'all' ? 'All Types' : filterType.toUpperCase()}\n`;
    csvContent += `Generated,${new Date().toLocaleString()}\n`;
    csvContent += "\n";

    csvContent += "Account Code,Account Name,Type,Sub Type,Current Balance,Status\n";
    filteredAccounts.forEach((account: Account) => {
      csvContent += `"${account.accountCode}","${account.accountName}","${account.accountType}","${account.subType}",${account.currentBalance},"${account.isActive ? 'Active' : 'Inactive'}"\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `chart-of-accounts-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
            <h1 className="text-3xl font-bold text-gray-900">Chart of Accounts</h1>
            <p className="text-gray-600">Manage your accounting structure and account classifications</p>
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
          <Button onClick={() => setShowAddDialog(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Account
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center space-x-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search accounts..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by type" />
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
        </CardContent>
      </Card>

      {/* Account Groups */}
      {Object.entries(groupedAccounts).map(([type, typeAccounts]: [string, any]) => (
        <Card key={type}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 capitalize">
              {getAccountTypeIcon(type)}
              {type} Accounts ({typeAccounts.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Account Code</TableHead>
                  <TableHead>Account Name</TableHead>
                  <TableHead>Sub Type</TableHead>
                  <TableHead>Current Balance</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {typeAccounts.map((account: Account) => (
                  <TableRow key={account.id}>
                    <TableCell className="font-mono">{account.accountCode}</TableCell>
                    <TableCell className="font-medium">{account.accountName}</TableCell>
                    <TableCell>{account.subType}</TableCell>
                    <TableCell className={account.currentBalance >= 0 ? 'text-green-600' : 'text-red-600'}>
                      {formatCurrency(account.currentBalance)}
                    </TableCell>
                    <TableCell>
                      <Badge className={account.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                        {account.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingAccount(account)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ))}

      {/* Add Account Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Account</DialogTitle>
            <DialogDescription>
              Create a new account in your chart of accounts
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="accountCode">Account Code</Label>
                <Input
                  id="accountCode"
                  value={newAccount.accountCode}
                  onChange={(e) => setNewAccount({ ...newAccount, accountCode: e.target.value })}
                  placeholder="e.g., 1001"
                />
              </div>
              <div>
                <Label htmlFor="accountType">Account Type</Label>
                <Select value={newAccount.accountType} onValueChange={(value) => setNewAccount({ ...newAccount, accountType: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="asset">Asset</SelectItem>
                    <SelectItem value="liability">Liability</SelectItem>
                    <SelectItem value="equity">Equity</SelectItem>
                    <SelectItem value="revenue">Revenue</SelectItem>
                    <SelectItem value="expense">Expense</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="accountName">Account Name</Label>
              <Input
                id="accountName"
                value={newAccount.accountName}
                onChange={(e) => setNewAccount({ ...newAccount, accountName: e.target.value })}
                placeholder="e.g., Cash on Hand"
              />
            </div>
            <div>
              <Label htmlFor="subType">Sub Type</Label>
              <Input
                id="subType"
                value={newAccount.subType}
                onChange={(e) => setNewAccount({ ...newAccount, subType: e.target.value })}
                placeholder="e.g., Current Asset"
              />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={newAccount.description}
                onChange={(e) => setNewAccount({ ...newAccount, description: e.target.value })}
                placeholder="Optional description"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateAccount} disabled={createAccountMutation.isPending}>
              {createAccountMutation.isPending ? "Creating..." : "Create Account"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Account Dialog */}
      <Dialog open={!!editingAccount} onOpenChange={() => setEditingAccount(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Account</DialogTitle>
            <DialogDescription>
              Update account information
            </DialogDescription>
          </DialogHeader>
          {editingAccount && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="editAccountCode">Account Code</Label>
                  <Input
                    id="editAccountCode"
                    value={editingAccount.accountCode}
                    onChange={(e) => setEditingAccount({ ...editingAccount, accountCode: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="editAccountType">Account Type</Label>
                  <Select value={editingAccount.accountType} onValueChange={(value: any) => setEditingAccount({ ...editingAccount, accountType: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="asset">Asset</SelectItem>
                      <SelectItem value="liability">Liability</SelectItem>
                      <SelectItem value="equity">Equity</SelectItem>
                      <SelectItem value="revenue">Revenue</SelectItem>
                      <SelectItem value="expense">Expense</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label htmlFor="editAccountName">Account Name</Label>
                <Input
                  id="editAccountName"
                  value={editingAccount.accountName}
                  onChange={(e) => setEditingAccount({ ...editingAccount, accountName: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="editSubType">Sub Type</Label>
                <Input
                  id="editSubType"
                  value={editingAccount.subType}
                  onChange={(e) => setEditingAccount({ ...editingAccount, subType: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="editDescription">Description</Label>
                <Input
                  id="editDescription"
                  value={editingAccount.description || ""}
                  onChange={(e) => setEditingAccount({ ...editingAccount, description: e.target.value })}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingAccount(null)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateAccount} disabled={updateAccountMutation.isPending}>
              {updateAccountMutation.isPending ? "Updating..." : "Update Account"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}