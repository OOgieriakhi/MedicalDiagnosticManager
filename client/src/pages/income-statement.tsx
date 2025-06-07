import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { ArrowLeft, Download, TrendingUp, TrendingDown, DollarSign, PieChart as PieChartIcon } from "lucide-react";
import { useLocation } from "wouter";

interface IncomeStatementItem {
  id: number;
  account: string;
  amount: number;
  percentage: number;
  category: string;
  description: string;
}

interface IncomeStatementSummary {
  totalRevenue: number;
  costOfServices: number;
  grossProfit: number;
  grossProfitMargin: number;
  operatingExpenses: number;
  operatingIncome: number;
  operatingMargin: number;
  nonOperatingExpenses: number;
  netIncome: number;
  netProfitMargin: number;
  period: string;
  startDate: string;
  endDate: string;
}

interface IncomeStatementData {
  revenue: IncomeStatementItem[];
  expenses: IncomeStatementItem[];
  summary: IncomeStatementSummary;
}

export default function IncomeStatement() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [selectedPeriod, setSelectedPeriod] = useState("current_month");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const { data: incomeData, isLoading } = useQuery<IncomeStatementData>({
    queryKey: ['/api/income-statement', selectedPeriod, startDate, endDate],
    queryFn: () => {
      const params = new URLSearchParams({
        period: selectedPeriod,
        ...(startDate && { startDate }),
        ...(endDate && { endDate })
      });
      return fetch(`/api/income-statement?${params}`).then(res => res.json());
    },
  });

  // Filter items based on category
  const filteredRevenue = (incomeData?.revenue || []).filter((item: IncomeStatementItem) => 
    categoryFilter === "all" || item.category === categoryFilter
  );

  const filteredExpenses = (incomeData?.expenses || []).filter((item: IncomeStatementItem) => 
    categoryFilter === "all" || item.category === categoryFilter
  );

  const summary: IncomeStatementSummary = incomeData?.summary || {
    totalRevenue: 0,
    costOfServices: 0,
    grossProfit: 0,
    grossProfitMargin: 0,
    operatingExpenses: 0,
    operatingIncome: 0,
    operatingMargin: 0,
    nonOperatingExpenses: 0,
    netIncome: 0,
    netProfitMargin: 0,
    period: 'current_month',
    startDate: '',
    endDate: ''
  };

  // Check if data is available for export
  const hasData = (filteredRevenue && filteredRevenue.length > 0) || 
                  (filteredExpenses && filteredExpenses.length > 0) || 
                  summary.totalRevenue > 0 || 
                  summary.operatingExpenses > 0;

  // Print functionality
  const handlePrint = () => {
    if (!hasData) {
      toast({ 
        title: "No data to print", 
        description: "Please select a period with income statement data",
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
          <title>Income Statement - ${summary.period}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            h1 { color: #1f2937; text-align: center; }
            .summary { margin: 20px 0; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f3f4f6; }
            .amount { text-align: right; }
            .total { font-weight: bold; background-color: #f9fafb; }
          </style>
        </head>
        <body>
          <h1>Income Statement</h1>
          <div class="summary">
            <p><strong>Period:</strong> ${summary.period}</p>
            ${summary.startDate ? `<p><strong>From:</strong> ${summary.startDate} <strong>To:</strong> ${summary.endDate}</p>` : ''}
          </div>
          
          <h2>Revenue</h2>
          <table>
            <thead>
              <tr>
                <th>Account</th>
                <th>Description</th>
                <th>Amount</th>
                <th>Percentage</th>
              </tr>
            </thead>
            <tbody>
              ${filteredRevenue.map(item => `
                <tr>
                  <td>${item.account}</td>
                  <td>${item.description}</td>
                  <td class="amount">${formatCurrency(item.amount)}</td>
                  <td class="amount">${item.percentage.toFixed(1)}%</td>
                </tr>
              `).join('')}
              <tr class="total">
                <td colspan="2"><strong>Total Revenue</strong></td>
                <td class="amount"><strong>${formatCurrency(summary.totalRevenue)}</strong></td>
                <td class="amount"><strong>100.0%</strong></td>
              </tr>
            </tbody>
          </table>
          
          <h2>Expenses</h2>
          <table>
            <thead>
              <tr>
                <th>Account</th>
                <th>Description</th>
                <th>Amount</th>
                <th>Percentage</th>
              </tr>
            </thead>
            <tbody>
              ${filteredExpenses.map(item => `
                <tr>
                  <td>${item.account}</td>
                  <td>${item.description}</td>
                  <td class="amount">${formatCurrency(item.amount)}</td>
                  <td class="amount">${item.percentage.toFixed(1)}%</td>
                </tr>
              `).join('')}
              <tr class="total">
                <td colspan="2"><strong>Total Expenses</strong></td>
                <td class="amount"><strong>${formatCurrency(summary.operatingExpenses)}</strong></td>
                <td class="amount"><strong>${((summary.operatingExpenses / summary.totalRevenue) * 100).toFixed(1)}%</strong></td>
              </tr>
            </tbody>
          </table>
          
          <h2>Summary</h2>
          <table>
            <tbody>
              <tr>
                <td><strong>Total Revenue</strong></td>
                <td class="amount"><strong>${formatCurrency(summary.totalRevenue)}</strong></td>
              </tr>
              <tr>
                <td><strong>Cost of Services</strong></td>
                <td class="amount"><strong>${formatCurrency(summary.costOfServices)}</strong></td>
              </tr>
              <tr>
                <td><strong>Gross Profit</strong></td>
                <td class="amount"><strong>${formatCurrency(summary.grossProfit)}</strong></td>
              </tr>
              <tr>
                <td><strong>Operating Expenses</strong></td>
                <td class="amount"><strong>${formatCurrency(summary.operatingExpenses)}</strong></td>
              </tr>
              <tr>
                <td><strong>Operating Income</strong></td>
                <td class="amount"><strong>${formatCurrency(summary.operatingIncome)}</strong></td>
              </tr>
              <tr>
                <td><strong>Net Income</strong></td>
                <td class="amount"><strong>${formatCurrency(summary.netIncome)}</strong></td>
              </tr>
              <tr>
                <td><strong>Net Profit Margin</strong></td>
                <td class="amount"><strong>${summary.netProfitMargin.toFixed(1)}%</strong></td>
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
        description: "Please select a period with income statement data",
        variant: "destructive" 
      });
      return;
    }

    let csvContent = "Income Statement Export\n";
    csvContent += `Period,${summary.period}\n`;
    if (summary.startDate) {
      csvContent += `Start Date,${summary.startDate}\n`;
      csvContent += `End Date,${summary.endDate}\n`;
    }
    csvContent += "\n";

    // Revenue section
    csvContent += "REVENUE\n";
    csvContent += "Account,Description,Amount,Percentage\n";
    filteredRevenue.forEach(item => {
      csvContent += `"${item.account}","${item.description}",${item.amount},${item.percentage}\n`;
    });
    csvContent += `"Total Revenue","",${summary.totalRevenue},100.0\n\n`;

    // Expenses section
    csvContent += "EXPENSES\n";
    csvContent += "Account,Description,Amount,Percentage\n";
    filteredExpenses.forEach(item => {
      csvContent += `"${item.account}","${item.description}",${item.amount},${item.percentage}\n`;
    });
    csvContent += `"Total Expenses","",${summary.operatingExpenses},${((summary.operatingExpenses / summary.totalRevenue) * 100).toFixed(1)}\n\n`;

    // Summary section
    csvContent += "SUMMARY\n";
    csvContent += "Metric,Amount\n";
    csvContent += `"Total Revenue",${summary.totalRevenue}\n`;
    csvContent += `"Cost of Services",${summary.costOfServices}\n`;
    csvContent += `"Gross Profit",${summary.grossProfit}\n`;
    csvContent += `"Operating Expenses",${summary.operatingExpenses}\n`;
    csvContent += `"Operating Income",${summary.operatingIncome}\n`;
    csvContent += `"Net Income",${summary.netIncome}\n`;
    csvContent += `"Net Profit Margin",${summary.netProfitMargin}\n`;

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `income-statement-${summary.period}-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'revenue': return 'bg-green-100 text-green-800';
      case 'cost_of_services': return 'bg-red-100 text-red-800';
      case 'operating_expense': return 'bg-blue-100 text-blue-800';
      case 'non_operating_expense': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'revenue': return 'Revenue';
      case 'cost_of_services': return 'Cost of Services';
      case 'operating_expense': return 'Operating Expense';
      case 'non_operating_expense': return 'Non-Operating';
      default: return category;
    }
  };

  // Chart data
  const revenueChartData = filteredRevenue.map(item => ({
    name: item.account.replace(' Revenue', ''),
    value: item.amount,
    percentage: item.percentage
  }));

  const expenseBreakdownData = filteredExpenses
    .filter(item => item.category === 'operating_expense')
    .map(item => ({
      name: item.account,
      amount: item.amount,
      percentage: item.percentage
    }));

  const profitabilityData = [
    { metric: 'Total Revenue', amount: summary.totalRevenue, color: '#10B981' },
    { metric: 'Gross Profit', amount: summary.grossProfit, color: '#3B82F6' },
    { metric: 'Operating Income', amount: summary.operatingIncome, color: '#8B5CF6' },
    { metric: 'Net Income', amount: summary.netIncome, color: '#F59E0B' }
  ];

  const COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

  return (
    <div className="min-h-screen bg-gray-50 p-6 print:p-0 print:bg-white">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 print:mb-4">
        <div className="flex items-center space-x-4">
          <Button 
            variant="ghost" 
            onClick={() => setLocation('/accounting-dashboard')}
            className="print:hidden"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Accounting
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Income Statement</h1>
            <p className="text-gray-600">Revenue, expenses, and profitability analysis</p>
          </div>
        </div>
        <div className="flex items-center space-x-3 print:hidden">
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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(summary.totalRevenue)}</p>
              </div>
              <div className="p-2 bg-green-100 rounded-lg">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Gross Profit</p>
                <p className="text-2xl font-bold text-blue-600">{formatCurrency(summary.grossProfit)}</p>
                <p className="text-sm text-gray-500">{summary.grossProfitMargin.toFixed(1)}% margin</p>
              </div>
              <div className="p-2 bg-blue-100 rounded-lg">
                <DollarSign className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Operating Income</p>
                <p className="text-2xl font-bold text-purple-600">{formatCurrency(summary.operatingIncome)}</p>
                <p className="text-sm text-gray-500">{summary.operatingMargin.toFixed(1)}% margin</p>
              </div>
              <div className="p-2 bg-purple-100 rounded-lg">
                <PieChartIcon className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Net Income</p>
                <p className={`text-2xl font-bold ${summary.netIncome >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(summary.netIncome)}
                </p>
                <p className="text-sm text-gray-500">{summary.netProfitMargin.toFixed(1)}% margin</p>
              </div>
              <div className={`p-2 rounded-lg ${summary.netIncome >= 0 ? 'bg-green-100' : 'bg-red-100'}`}>
                {summary.netIncome >= 0 ? (
                  <TrendingUp className={`w-6 h-6 ${summary.netIncome >= 0 ? 'text-green-600' : 'text-red-600'}`} />
                ) : (
                  <TrendingDown className="w-6 h-6 text-red-600" />
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-6 print:hidden">
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
                  <SelectItem value="cost_of_services">Cost of Services</SelectItem>
                  <SelectItem value="operating_expense">Operating Expenses</SelectItem>
                  <SelectItem value="non_operating_expense">Non-Operating</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="print:hidden">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="details">Detailed Statement</TabsTrigger>
          <TabsTrigger value="charts">Charts & Analysis</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Revenue Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle>Revenue Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={revenueChartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percentage }) => `${name}: ${percentage.toFixed(1)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {revenueChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Profitability Analysis */}
            <Card>
              <CardHeader>
                <CardTitle>Profitability Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={profitabilityData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="metric" />
                    <YAxis />
                    <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                    <Bar dataKey="amount" fill="#8884d8">
                      {profitabilityData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="details">
          <div className="space-y-6">
            {/* Revenue Details */}
            <Card>
              <CardHeader>
                <CardTitle>Revenue Details</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="text-center py-8">Loading revenue data...</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Account</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead className="text-right">% of Revenue</TableHead>
                        <TableHead>Category</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredRevenue.map((item: IncomeStatementItem) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">{item.account}</TableCell>
                          <TableCell className="text-sm text-gray-600">{item.description}</TableCell>
                          <TableCell className="text-right font-medium text-green-600">
                            {formatCurrency(item.amount)}
                          </TableCell>
                          <TableCell className="text-right">{item.percentage.toFixed(2)}%</TableCell>
                          <TableCell>
                            <Badge className={getCategoryColor(item.category)}>
                              {getCategoryLabel(item.category)}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="border-t-2 font-bold">
                        <TableCell>Total Revenue</TableCell>
                        <TableCell></TableCell>
                        <TableCell className="text-right text-green-600">
                          {formatCurrency(summary.totalRevenue)}
                        </TableCell>
                        <TableCell className="text-right">100.00%</TableCell>
                        <TableCell></TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            {/* Expense Details */}
            <Card>
              <CardHeader>
                <CardTitle>Expense Details</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="text-center py-8">Loading expense data...</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Account</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead className="text-right">% of Revenue</TableHead>
                        <TableHead>Category</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredExpenses.map((item: IncomeStatementItem) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">{item.account}</TableCell>
                          <TableCell className="text-sm text-gray-600">{item.description}</TableCell>
                          <TableCell className="text-right font-medium text-red-600">
                            {formatCurrency(item.amount)}
                          </TableCell>
                          <TableCell className="text-right">{item.percentage.toFixed(2)}%</TableCell>
                          <TableCell>
                            <Badge className={getCategoryColor(item.category)}>
                              {getCategoryLabel(item.category)}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="charts">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Operating Expenses Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle>Operating Expenses Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={expenseBreakdownData} layout="horizontal">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" width={120} />
                    <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                    <Bar dataKey="amount" fill="#EF4444" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Key Metrics Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Key Financial Metrics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="font-medium">Total Revenue</span>
                  <span className="text-green-600 font-bold">{formatCurrency(summary.totalRevenue)}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="font-medium">Cost of Services</span>
                  <span className="text-red-600 font-bold">{formatCurrency(summary.costOfServices)}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="font-medium">Gross Profit</span>
                  <span className="text-blue-600 font-bold">{formatCurrency(summary.grossProfit)}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-sm text-gray-600">Gross Profit Margin</span>
                  <span className="text-blue-600">{summary.grossProfitMargin.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="font-medium">Operating Expenses</span>
                  <span className="text-red-600 font-bold">{formatCurrency(summary.operatingExpenses)}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="font-medium">Operating Income</span>
                  <span className="text-purple-600 font-bold">{formatCurrency(summary.operatingIncome)}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-sm text-gray-600">Operating Margin</span>
                  <span className="text-purple-600">{summary.operatingMargin.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-2">
                  <span className="font-bold">Net Income</span>
                  <span className={`font-bold text-lg ${summary.netIncome >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(summary.netIncome)}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-sm text-gray-600">Net Profit Margin</span>
                  <span className={summary.netIncome >= 0 ? 'text-green-600' : 'text-red-600'}>
                    {summary.netProfitMargin.toFixed(1)}%
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