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
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calendar,
  Download,
  Eye,
  Wallet,
  Building,
  CreditCard,
  PiggyBank
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Link } from "wouter";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar } from "recharts";

interface CashFlowEntry {
  id: number;
  date: string;
  description: string;
  category: string;
  amount: number;
  type: 'inflow' | 'outflow';
  accountName: string;
  reference: string;
  status: string;
}

interface CashFlowSummary {
  openingBalance: number;
  totalInflows: number;
  totalOutflows: number;
  netCashFlow: number;
  closingBalance: number;
  projectedBalance: number;
}

interface CashFlowChart {
  period: string;
  inflows: number;
  outflows: number;
  netFlow: number;
  cumulativeBalance: number;
}

export default function CashFlow() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedPeriod, setSelectedPeriod] = useState("current_month");
  const [startDate, setStartDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [categoryFilter, setCategoryFilter] = useState("all");

  // Fetch cash flow data
  const { data: cashFlowData, isLoading } = useQuery({
    queryKey: ["/api/cash-flow", selectedPeriod, startDate, endDate, user?.branchId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (user?.branchId) params.append('branchId', user.branchId.toString());
      if (selectedPeriod) params.append('period', selectedPeriod);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      
      const response = await fetch(`/api/cash-flow?${params}`);
      if (!response.ok) throw new Error("Failed to fetch cash flow data");
      return response.json();
    },
    enabled: !!user?.branchId
  });

  // Fetch cash flow projections
  const { data: projectionData = [] } = useQuery({
    queryKey: ["/api/cash-flow/projections", user?.branchId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (user?.branchId) params.append('branchId', user.branchId.toString());
      
      const response = await fetch(`/api/cash-flow/projections?${params}`);
      if (!response.ok) throw new Error("Failed to fetch projections");
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

  const filteredEntries = (cashFlowData?.entries || []).filter((entry: CashFlowEntry) => {
    if (categoryFilter === "all") return true;
    return entry.category.toLowerCase() === categoryFilter.toLowerCase();
  });

  const summary: CashFlowSummary = cashFlowData?.summary || {
    openingBalance: 0,
    totalInflows: 0,
    totalOutflows: 0,
    netCashFlow: 0,
    closingBalance: 0,
    projectedBalance: 0
  };

  const chartData: CashFlowChart[] = cashFlowData?.chartData || [];

  // Check if data is available for export
  const hasData = filteredEntries && filteredEntries.length > 0;

  // Print functionality
  const handlePrint = () => {
    if (!hasData) {
      toast({ 
        title: "No data to print", 
        description: "Please select a period with cash flow data",
        variant: "destructive" 
      });
      return;
    }
    const printContent = `
      <html>
        <head>
          <title>Cash Flow Statement</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; margin-bottom: 30px; }
            .company-name { font-size: 24px; font-weight: bold; margin-bottom: 5px; }
            .report-title { font-size: 18px; margin-bottom: 10px; }
            .report-date { font-size: 14px; color: #666; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f5f5f5; font-weight: bold; }
            .text-right { text-align: right; }
            .summary { margin-top: 30px; }
            .inflow { color: #16a34a; font-weight: bold; }
            .outflow { color: #dc2626; font-weight: bold; }
            .net-flow { border-top: 2px solid #000; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="company-name">Orient Medical Diagnostic Centre</div>
            <div class="report-title">Cash Flow Statement</div>
            <div class="report-date">Period: ${selectedPeriod} | ${startDate} to ${endDate}</div>
          </div>
          
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Description</th>
                <th>Category</th>
                <th>Reference</th>
                <th class="text-right">Amount</th>
                <th>Type</th>
              </tr>
            </thead>
            <tbody>
              ${filteredEntries.map(entry => `
                <tr>
                  <td>${new Date(entry.date).toLocaleDateString()}</td>
                  <td>${entry.description}</td>
                  <td>${entry.category}</td>
                  <td>${entry.reference}</td>
                  <td class="text-right ${entry.type === 'inflow' ? 'inflow' : 'outflow'}">${formatCurrency(Math.abs(entry.amount))}</td>
                  <td>${entry.type}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          
          <div class="summary">
            <table style="width: 50%; margin-left: auto;">
              <tr>
                <td><strong>Opening Balance:</strong></td>
                <td class="text-right"><strong>${formatCurrency(summary.openingBalance)}</strong></td>
              </tr>
              <tr>
                <td><strong>Total Inflows:</strong></td>
                <td class="text-right inflow"><strong>${formatCurrency(summary.totalInflows)}</strong></td>
              </tr>
              <tr>
                <td><strong>Total Outflows:</strong></td>
                <td class="text-right outflow"><strong>${formatCurrency(summary.totalOutflows)}</strong></td>
              </tr>
              <tr class="net-flow">
                <td><strong>Net Cash Flow:</strong></td>
                <td class="text-right"><strong>${formatCurrency(summary.netCashFlow)}</strong></td>
              </tr>
              <tr class="net-flow">
                <td><strong>Closing Balance:</strong></td>
                <td class="text-right"><strong>${formatCurrency(summary.closingBalance)}</strong></td>
              </tr>
            </table>
            <div style="margin-top: 20px;">Report Generated: ${new Date().toLocaleString()}</div>
          </div>
        </body>
      </html>
    `;
    
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.print();
    }
  };

  // Export to CSV
  const exportToCSV = () => {
    if (!hasData) {
      toast({ 
        title: "No data to export", 
        description: "Please select a period with cash flow data",
        variant: "destructive" 
      });
      return;
    }
    const headers = ['Date', 'Description', 'Category', 'Reference', 'Amount', 'Type', 'Account'];
    const csvData = filteredEntries.map(entry => [
      new Date(entry.date).toLocaleDateString(),
      entry.description,
      entry.category,
      entry.reference,
      entry.amount,
      entry.type,
      entry.accountName
    ]);
    
    // Add summary rows
    csvData.push(['', '', '', '', '', '', '']);
    csvData.push(['SUMMARY', '', '', '', '', '', '']);
    csvData.push(['Opening Balance', '', '', '', summary.openingBalance, '', '']);
    csvData.push(['Total Inflows', '', '', '', summary.totalInflows, '', '']);
    csvData.push(['Total Outflows', '', '', '', summary.totalOutflows, '', '']);
    csvData.push(['Net Cash Flow', '', '', '', summary.netCashFlow, '', '']);
    csvData.push(['Closing Balance', '', '', '', summary.closingBalance, '', '']);
    
    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cash-flow-${startDate}-to-${endDate}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const getFlowColor = (type: string) => {
    return type === 'inflow' ? 'text-green-600' : 'text-red-600';
  };

  const getFlowIcon = (type: string) => {
    return type === 'inflow' ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />;
  };

  const getCategoryColor = (category: string) => {
    switch (category.toLowerCase()) {
      case 'revenue': return 'bg-green-100 text-green-800';
      case 'operations': return 'bg-blue-100 text-blue-800';
      case 'expenses': return 'bg-red-100 text-red-800';
      case 'investments': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
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
            <h1 className="text-3xl font-bold text-gray-900">Cash Flow Management</h1>
            <p className="text-gray-600">Monitor cash inflows, outflows, and projections</p>
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
            Print Report
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

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Opening Balance</p>
                <p className="text-2xl font-bold text-blue-600">
                  {formatCurrency(summary.openingBalance)}
                </p>
              </div>
              <Wallet className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Inflows</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(summary.totalInflows)}
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Outflows</p>
                <p className="text-2xl font-bold text-red-600">
                  {formatCurrency(summary.totalOutflows)}
                </p>
              </div>
              <TrendingDown className="w-8 h-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Net Cash Flow</p>
                <p className={`text-2xl font-bold ${summary.netCashFlow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(summary.netCashFlow)}
                </p>
              </div>
              <DollarSign className={`w-8 h-8 ${summary.netCashFlow >= 0 ? 'text-green-600' : 'text-red-600'}`} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Closing Balance</p>
                <p className={`text-2xl font-bold ${summary.closingBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(summary.closingBalance)}
                </p>
              </div>
              <PiggyBank className={`w-8 h-8 ${summary.closingBalance >= 0 ? 'text-green-600' : 'text-red-600'}`} />
            </div>
          </CardContent>
        </Card>
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
                  <SelectItem value="current_month">Current Month</SelectItem>
                  <SelectItem value="last_month">Last Month</SelectItem>
                  <SelectItem value="quarter">Quarter to Date</SelectItem>
                  <SelectItem value="year">Year to Date</SelectItem>
                  <SelectItem value="custom">Custom Range</SelectItem>
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
                disabled={selectedPeriod !== "custom"}
              />
            </div>
            <div>
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                disabled={selectedPeriod !== "custom"}
              />
            </div>
            <div>
              <Label htmlFor="category">Category</Label>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="revenue">Revenue</SelectItem>
                  <SelectItem value="expenses">Expenses</SelectItem>
                  <SelectItem value="investments">Investments</SelectItem>
                  <SelectItem value="financing">Financing</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="projections">Projections</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Cash Flow Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Cash Flow Trend</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="period" />
                    <YAxis />
                    <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                    <Line type="monotone" dataKey="inflows" stroke="#10B981" strokeWidth={2} name="Inflows" />
                    <Line type="monotone" dataKey="outflows" stroke="#EF4444" strokeWidth={2} name="Outflows" />
                    <Line type="monotone" dataKey="netFlow" stroke="#3B82F6" strokeWidth={2} name="Net Flow" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Cash Flow by Category */}
            <Card>
              <CardHeader>
                <CardTitle>Cash Flow by Category</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="period" />
                    <YAxis />
                    <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                    <Bar dataKey="inflows" fill="#10B981" name="Inflows" />
                    <Bar dataKey="outflows" fill="#EF4444" name="Outflows" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="transactions">
          <Card>
            <CardHeader>
              <CardTitle>Cash Flow Transactions</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8">Loading cash flow transactions...</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Account</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Reference</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredEntries.map((entry: CashFlowEntry) => (
                      <TableRow key={entry.id}>
                        <TableCell>{new Date(entry.date).toLocaleDateString()}</TableCell>
                        <TableCell>{entry.description}</TableCell>
                        <TableCell>
                          <Badge className={getCategoryColor(entry.category)}>
                            {entry.category}
                          </Badge>
                        </TableCell>
                        <TableCell>{entry.accountName}</TableCell>
                        <TableCell>
                          <div className={`flex items-center gap-1 ${getFlowColor(entry.type)}`}>
                            {getFlowIcon(entry.type)}
                            <span className="capitalize">{entry.type}</span>
                          </div>
                        </TableCell>
                        <TableCell className={getFlowColor(entry.type)}>
                          {formatCurrency(Math.abs(entry.amount))}
                        </TableCell>
                        <TableCell className="font-mono text-sm">{entry.reference}</TableCell>
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

        <TabsContent value="projections">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Cash Flow Projections</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={projectionData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="period" />
                    <YAxis />
                    <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                    <Line type="monotone" dataKey="projectedInflows" stroke="#10B981" strokeWidth={2} strokeDasharray="5 5" name="Projected Inflows" />
                    <Line type="monotone" dataKey="projectedOutflows" stroke="#EF4444" strokeWidth={2} strokeDasharray="5 5" name="Projected Outflows" />
                    <Line type="monotone" dataKey="projectedBalance" stroke="#8B5CF6" strokeWidth={2} name="Projected Balance" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Cash Position Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Current Cash Position:</span>
                  <span className={`font-bold ${summary.closingBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(summary.closingBalance)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">30-Day Projection:</span>
                  <span className={`font-bold ${summary.projectedBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(summary.projectedBalance)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Cash Burn Rate:</span>
                  <span className="font-bold text-orange-600">
                    {formatCurrency(summary.totalOutflows / 30)} / day
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Days of Cash Remaining:</span>
                  <span className="font-bold text-blue-600">
                    {Math.round(summary.closingBalance / (summary.totalOutflows / 30))} days
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}