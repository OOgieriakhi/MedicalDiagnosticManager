import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { 
  FileText, 
  Download, 
  Calendar as CalendarIcon,
  TrendingUp,
  DollarSign,
  BarChart3,
  PieChart as PieChartIcon
} from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell, LineChart, Line } from "recharts";

interface FinancialReportData {
  id: string;
  reportType: string;
  reportName: string;
  period: string;
  generatedAt: string;
  status: 'draft' | 'final' | 'published';
  data: any;
}

interface BalanceSheetItem {
  account: string;
  currentPeriod: number;
  previousPeriod: number;
  variance: number;
  variancePercent: number;
}

interface IncomeStatementItem {
  account: string;
  amount: number;
  percentage: number;
  category: 'revenue' | 'cogs' | 'operating_expense' | 'other';
}

interface CashFlowItem {
  category: string;
  amount: number;
  subcategories: {
    description: string;
    amount: number;
  }[];
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

export function FinancialReports() {
  const [selectedReport, setSelectedReport] = useState("balance-sheet");
  const [reportPeriod, setReportPeriod] = useState("current-month");
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [comparisonPeriod, setComparisonPeriod] = useState("previous-period");

  // Mock data - in real implementation, this would come from API
  const balanceSheetData: BalanceSheetItem[] = [
    {
      account: "Current Assets",
      currentPeriod: 850000,
      previousPeriod: 780000,
      variance: 70000,
      variancePercent: 8.97
    },
    {
      account: "Cash and Cash Equivalents",
      currentPeriod: 320000,
      previousPeriod: 280000,
      variance: 40000,
      variancePercent: 14.29
    },
    {
      account: "Accounts Receivable",
      currentPeriod: 420000,
      previousPeriod: 380000,
      variance: 40000,
      variancePercent: 10.53
    },
    {
      account: "Medical Equipment (Net)",
      currentPeriod: 1200000,
      previousPeriod: 1250000,
      variance: -50000,
      variancePercent: -4.00
    },
    {
      account: "Current Liabilities",
      currentPeriod: 380000,
      previousPeriod: 420000,
      variance: -40000,
      variancePercent: -9.52
    },
    {
      account: "Accounts Payable",
      currentPeriod: 180000,
      previousPeriod: 200000,
      variance: -20000,
      variancePercent: -10.00
    },
    {
      account: "Total Equity",
      currentPeriod: 1670000,
      previousPeriod: 1610000,
      variance: 60000,
      variancePercent: 3.73
    }
  ];

  const incomeStatementData: IncomeStatementItem[] = [
    { account: "Laboratory Revenue", amount: 1200000, percentage: 65.22, category: 'revenue' },
    { account: "Radiology Revenue", amount: 480000, percentage: 26.09, category: 'revenue' },
    { account: "Consultation Revenue", amount: 160000, percentage: 8.70, category: 'revenue' },
    { account: "Cost of Services", amount: 720000, percentage: 39.13, category: 'cogs' },
    { account: "Staff Salaries", amount: 450000, percentage: 24.46, category: 'operating_expense' },
    { account: "Equipment Maintenance", amount: 85000, percentage: 4.62, category: 'operating_expense' },
    { account: "Utilities", amount: 65000, percentage: 3.53, category: 'operating_expense' },
    { account: "Marketing", amount: 45000, percentage: 2.45, category: 'operating_expense' },
    { account: "Other Operating Expenses", amount: 95000, percentage: 5.16, category: 'operating_expense' }
  ];

  const cashFlowData: CashFlowItem[] = [
    {
      category: "Operating Activities",
      amount: 485000,
      subcategories: [
        { description: "Net Income", amount: 395000 },
        { description: "Depreciation", amount: 120000 },
        { description: "Changes in Working Capital", amount: -30000 }
      ]
    },
    {
      category: "Investing Activities", 
      amount: -180000,
      subcategories: [
        { description: "Equipment Purchases", amount: -200000 },
        { description: "Facility Improvements", amount: -50000 },
        { description: "Investment Income", amount: 70000 }
      ]
    },
    {
      category: "Financing Activities",
      amount: -125000,
      subcategories: [
        { description: "Loan Payments", amount: -85000 },
        { description: "Owner Distributions", amount: -40000 }
      ]
    }
  ];

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getVarianceColor = (variance: number) => {
    if (variance > 0) return "text-green-600";
    if (variance < 0) return "text-red-600";
    return "text-gray-600";
  };

  const revenueBreakdownData = incomeStatementData
    .filter(item => item.category === 'revenue')
    .map(item => ({
      name: item.account.replace(' Revenue', ''),
      value: item.amount,
      percentage: item.percentage
    }));

  const expenseBreakdownData = incomeStatementData
    .filter(item => item.category === 'operating_expense')
    .map(item => ({
      name: item.account,
      value: item.amount,
      percentage: item.percentage
    }));

  return (
    <div className="space-y-6">
      {/* Report Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Financial Reports
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label>Report Type</Label>
              <Select value={selectedReport} onValueChange={setSelectedReport}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="balance-sheet">Balance Sheet</SelectItem>
                  <SelectItem value="income-statement">Income Statement</SelectItem>
                  <SelectItem value="cash-flow">Cash Flow Statement</SelectItem>
                  <SelectItem value="financial-ratios">Financial Ratios</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label>Period</Label>
              <Select value={reportPeriod} onValueChange={setReportPeriod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="current-month">Current Month</SelectItem>
                  <SelectItem value="current-quarter">Current Quarter</SelectItem>
                  <SelectItem value="current-year">Current Year</SelectItem>
                  <SelectItem value="custom">Custom Range</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label>Comparison</Label>
              <Select value={comparisonPeriod} onValueChange={setComparisonPeriod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="previous-period">Previous Period</SelectItem>
                  <SelectItem value="previous-year">Previous Year</SelectItem>
                  <SelectItem value="budget">Budget</SelectItem>
                  <SelectItem value="none">No Comparison</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-end gap-2">
              <Button className="flex-1">
                Generate Report
              </Button>
              <Button variant="outline" size="icon">
                <Download className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Report Content */}
      <Tabs value={selectedReport} onValueChange={setSelectedReport}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="balance-sheet">Balance Sheet</TabsTrigger>
          <TabsTrigger value="income-statement">Income Statement</TabsTrigger>
          <TabsTrigger value="cash-flow">Cash Flow</TabsTrigger>
          <TabsTrigger value="financial-ratios">Ratios</TabsTrigger>
        </TabsList>

        <TabsContent value="balance-sheet" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Balance Sheet Comparison</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Account</TableHead>
                    <TableHead className="text-right">Current Period</TableHead>
                    <TableHead className="text-right">Previous Period</TableHead>
                    <TableHead className="text-right">Variance</TableHead>
                    <TableHead className="text-right">Variance %</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {balanceSheetData.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{item.account}</TableCell>
                      <TableCell className="text-right">{formatCurrency(item.currentPeriod)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(item.previousPeriod)}</TableCell>
                      <TableCell className={`text-right ${getVarianceColor(item.variance)}`}>
                        {formatCurrency(item.variance)}
                      </TableCell>
                      <TableCell className={`text-right ${getVarianceColor(item.variance)}`}>
                        {item.variancePercent > 0 ? '+' : ''}{item.variancePercent.toFixed(2)}%
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="income-statement" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Revenue Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={revenueBreakdownData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percentage }) => `${name}: ${percentage.toFixed(1)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {revenueBreakdownData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Expense Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={expenseBreakdownData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="name" 
                      angle={-45}
                      textAnchor="end"
                      height={100}
                      fontSize={10}
                    />
                    <YAxis />
                    <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                    <Bar dataKey="value" fill="#FF8042" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Income Statement Details</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Account</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-right">% of Revenue</TableHead>
                    <TableHead>Category</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {incomeStatementData.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{item.account}</TableCell>
                      <TableCell className="text-right">{formatCurrency(item.amount)}</TableCell>
                      <TableCell className="text-right">{item.percentage.toFixed(2)}%</TableCell>
                      <TableCell>
                        <Badge variant={
                          item.category === 'revenue' ? 'default' :
                          item.category === 'cogs' ? 'secondary' :
                          'outline'
                        }>
                          {item.category.replace('_', ' ').toUpperCase()}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cash-flow" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Cash Flow Statement</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {cashFlowData.map((category, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-semibold text-lg">{category.category}</h4>
                      <span className={`font-bold text-lg ${getVarianceColor(category.amount)}`}>
                        {formatCurrency(category.amount)}
                      </span>
                    </div>
                    <div className="space-y-2">
                      {category.subcategories.map((sub, subIndex) => (
                        <div key={subIndex} className="flex justify-between text-sm">
                          <span className="text-gray-600">{sub.description}</span>
                          <span className={getVarianceColor(sub.amount)}>
                            {formatCurrency(sub.amount)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                
                <div className="border-t pt-4">
                  <div className="flex justify-between items-center font-bold text-lg">
                    <span>Net Change in Cash</span>
                    <span className={getVarianceColor(
                      cashFlowData.reduce((sum, cat) => sum + cat.amount, 0)
                    )}>
                      {formatCurrency(cashFlowData.reduce((sum, cat) => sum + cat.amount, 0))}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="financial-ratios" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Current Ratio</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">2.24</div>
                <p className="text-xs text-muted-foreground">
                  Current Assets / Current Liabilities
                </p>
                <div className="flex items-center mt-2">
                  <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
                  <span className="text-green-500 text-sm">+0.15 from last period</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Gross Profit Margin</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">60.87%</div>
                <p className="text-xs text-muted-foreground">
                  (Revenue - COGS) / Revenue
                </p>
                <div className="flex items-center mt-2">
                  <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
                  <span className="text-green-500 text-sm">+2.3% from last period</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Operating Margin</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">21.45%</div>
                <p className="text-xs text-muted-foreground">
                  Operating Income / Revenue
                </p>
                <div className="flex items-center mt-2">
                  <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
                  <span className="text-green-500 text-sm">+1.8% from last period</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Return on Assets</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">19.23%</div>
                <p className="text-xs text-muted-foreground">
                  Net Income / Total Assets
                </p>
                <div className="flex items-center mt-2">
                  <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
                  <span className="text-green-500 text-sm">+0.9% from last period</span>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Financial Ratio Trends</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={[
                  { month: 'Jan', currentRatio: 2.1, grossMargin: 58.5, operatingMargin: 19.2 },
                  { month: 'Feb', currentRatio: 2.0, grossMargin: 59.1, operatingMargin: 20.1 },
                  { month: 'Mar', currentRatio: 2.15, grossMargin: 60.2, operatingMargin: 20.8 },
                  { month: 'Apr', currentRatio: 2.18, grossMargin: 60.5, operatingMargin: 21.1 },
                  { month: 'May', currentRatio: 2.22, grossMargin: 60.8, operatingMargin: 21.3 },
                  { month: 'Jun', currentRatio: 2.24, grossMargin: 60.9, operatingMargin: 21.5 }
                ]}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="currentRatio" stroke="#8884d8" name="Current Ratio" />
                  <Line type="monotone" dataKey="grossMargin" stroke="#82ca9d" name="Gross Margin %" />
                  <Line type="monotone" dataKey="operatingMargin" stroke="#ffc658" name="Operating Margin %" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}