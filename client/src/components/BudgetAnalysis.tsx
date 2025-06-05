import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  Target, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle,
  CheckCircle,
  Plus,
  Edit,
  Save,
  Calendar,
  DollarSign
} from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, LineChart, Line } from "recharts";

interface BudgetItem {
  id: number;
  accountCode: string;
  accountName: string;
  category: string;
  budgetedAmount: number;
  actualAmount: number;
  variance: number;
  variancePercent: number;
  period: string;
  status: 'on-track' | 'over-budget' | 'under-budget';
}

interface BudgetSummary {
  totalBudgeted: number;
  totalActual: number;
  totalVariance: number;
  variancePercent: number;
  onTrackItems: number;
  overBudgetItems: number;
  underBudgetItems: number;
}

export function BudgetAnalysis() {
  const { toast } = useToast();
  const [selectedPeriod, setSelectedPeriod] = useState("current-year");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [showNewBudgetForm, setShowNewBudgetForm] = useState(false);

  // Mock data - replace with actual API calls
  const budgetSummary: BudgetSummary = {
    totalBudgeted: 2450000,
    totalActual: 2387500,
    totalVariance: -62500,
    variancePercent: -2.55,
    onTrackItems: 12,
    overBudgetItems: 3,
    underBudgetItems: 8
  };

  const budgetItems: BudgetItem[] = [
    {
      id: 1,
      accountCode: "4100",
      accountName: "Laboratory Revenue",
      category: "Revenue",
      budgetedAmount: 1400000,
      actualAmount: 1325000,
      variance: -75000,
      variancePercent: -5.36,
      period: "2024",
      status: "under-budget"
    },
    {
      id: 2,
      accountCode: "4200", 
      accountName: "Radiology Revenue",
      category: "Revenue",
      budgetedAmount: 550000,
      actualAmount: 587500,
      variance: 37500,
      variancePercent: 6.82,
      period: "2024",
      status: "over-budget"
    },
    {
      id: 3,
      accountCode: "5100",
      accountName: "Staff Salaries",
      category: "Operating Expenses",
      budgetedAmount: 480000,
      actualAmount: 465000,
      variance: -15000,
      variancePercent: -3.13,
      period: "2024",
      status: "under-budget"
    },
    {
      id: 4,
      accountCode: "5200",
      accountName: "Medical Supplies",
      category: "Operating Expenses", 
      budgetedAmount: 125000,
      actualAmount: 138500,
      variance: 13500,
      variancePercent: 10.8,
      period: "2024",
      status: "over-budget"
    },
    {
      id: 5,
      accountCode: "5300",
      accountName: "Equipment Maintenance",
      category: "Operating Expenses",
      budgetedAmount: 85000,
      actualAmount: 82000,
      variance: -3000,
      variancePercent: -3.53,
      period: "2024",
      status: "on-track"
    }
  ];

  const monthlyBudgetTrend = [
    { month: "Jan", budgeted: 200000, actual: 195000 },
    { month: "Feb", budgeted: 205000, actual: 198000 },
    { month: "Mar", budgeted: 210000, actual: 215000 },
    { month: "Apr", budgeted: 200000, actual: 203000 },
    { month: "May", budgeted: 195000, actual: 189000 },
    { month: "Jun", budgeted: 205000, actual: 207500 },
    { month: "Jul", budgeted: 210000, actual: 218000 },
    { month: "Aug", budgeted: 200000, actual: 196500 },
    { month: "Sep", budgeted: 205000, actual: 201000 },
    { month: "Oct", budgeted: 210000, actual: 214000 },
    { month: "Nov", budgeted: 200000, actual: 198500 },
    { month: "Dec", budgeted: 195000, actual: 191000 }
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'on-track':
        return <Badge className="bg-green-100 text-green-800">On Track</Badge>;
      case 'over-budget':
        return <Badge className="bg-red-100 text-red-800">Over Budget</Badge>;
      case 'under-budget':
        return <Badge className="bg-blue-100 text-blue-800">Under Budget</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const getProgressColor = (variancePercent: number) => {
    if (Math.abs(variancePercent) <= 5) return "bg-green-500";
    if (Math.abs(variancePercent) <= 10) return "bg-yellow-500";
    return "bg-red-500";
  };

  return (
    <div className="space-y-6">
      {/* Budget Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Budgeted</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(budgetSummary.totalBudgeted)}</div>
            <p className="text-xs text-muted-foreground">
              Annual budget allocation
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Actual Spending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(budgetSummary.totalActual)}</div>
            <div className="flex items-center mt-2">
              <TrendingDown className="w-4 h-4 text-red-500 mr-1" />
              <span className="text-red-500 text-sm">
                {budgetSummary.variancePercent.toFixed(1)}% vs budget
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Budget Variance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getVarianceColor(budgetSummary.totalVariance)}`}>
              {formatCurrency(Math.abs(budgetSummary.totalVariance))}
            </div>
            <p className="text-xs text-muted-foreground">
              {budgetSummary.totalVariance < 0 ? 'Under budget' : 'Over budget'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Budget Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-green-600">On Track: {budgetSummary.onTrackItems}</span>
                <span className="text-red-600">Over: {budgetSummary.overBudgetItems}</span>
              </div>
              <Progress 
                value={(budgetSummary.onTrackItems / (budgetSummary.onTrackItems + budgetSummary.overBudgetItems + budgetSummary.underBudgetItems)) * 100} 
                className="h-2"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Budget Controls */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5" />
              Budget Analysis & Planning
            </CardTitle>
            <Button onClick={() => setShowNewBudgetForm(true)}>
              <Plus className="w-4 h-4 mr-2" />
              New Budget
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Period</Label>
              <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="current-month">Current Month</SelectItem>
                  <SelectItem value="current-quarter">Current Quarter</SelectItem>
                  <SelectItem value="current-year">Current Year</SelectItem>
                  <SelectItem value="next-year">Next Year</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label>Category</Label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="revenue">Revenue</SelectItem>
                  <SelectItem value="operating-expenses">Operating Expenses</SelectItem>
                  <SelectItem value="capital-expenses">Capital Expenses</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-end">
              <Button variant="outline" className="w-full">
                Generate Report
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="budget-vs-actual" className="space-y-6">
        <TabsList>
          <TabsTrigger value="budget-vs-actual">Budget vs Actual</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="forecasting">Forecasting</TabsTrigger>
        </TabsList>

        <TabsContent value="budget-vs-actual" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Budget vs Actual Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Account</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Budgeted</TableHead>
                    <TableHead className="text-right">Actual</TableHead>
                    <TableHead className="text-right">Variance</TableHead>
                    <TableHead className="text-right">Variance %</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Progress</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {budgetItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{item.accountName}</div>
                          <div className="text-sm text-gray-500">{item.accountCode}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{item.category}</Badge>
                      </TableCell>
                      <TableCell className="text-right">{formatCurrency(item.budgetedAmount)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(item.actualAmount)}</TableCell>
                      <TableCell className={`text-right ${getVarianceColor(item.variance)}`}>
                        {formatCurrency(Math.abs(item.variance))}
                      </TableCell>
                      <TableCell className={`text-right ${getVarianceColor(item.variance)}`}>
                        {item.variancePercent > 0 ? '+' : ''}{item.variancePercent.toFixed(1)}%
                      </TableCell>
                      <TableCell>{getStatusBadge(item.status)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress 
                            value={Math.min((item.actualAmount / item.budgetedAmount) * 100, 100)} 
                            className="flex-1 h-2"
                          />
                          <span className="text-xs text-gray-500 w-12">
                            {((item.actualAmount / item.budgetedAmount) * 100).toFixed(0)}%
                          </span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Monthly Budget vs Actual Trends</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={monthlyBudgetTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                  <Line 
                    type="monotone" 
                    dataKey="budgeted" 
                    stroke="#3b82f6" 
                    strokeWidth={2}
                    name="Budgeted"
                    strokeDasharray="5 5"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="actual" 
                    stroke="#ef4444" 
                    strokeWidth={2}
                    name="Actual"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Variance Trends</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={monthlyBudgetTrend.map(item => ({
                    month: item.month,
                    variance: item.actual - item.budgeted
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                    <Bar dataKey="variance" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Budget Alerts</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-start gap-3 p-3 bg-red-50 rounded-lg">
                    <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5" />
                    <div>
                      <div className="font-medium text-red-800">Medical Supplies Over Budget</div>
                      <div className="text-sm text-red-600">10.8% over allocated budget</div>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3 p-3 bg-yellow-50 rounded-lg">
                    <AlertTriangle className="w-5 h-5 text-yellow-500 mt-0.5" />
                    <div>
                      <div className="font-medium text-yellow-800">Laboratory Revenue Below Target</div>
                      <div className="text-sm text-yellow-600">5.4% below projected revenue</div>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
                    <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
                    <div>
                      <div className="font-medium text-green-800">Equipment Maintenance On Track</div>
                      <div className="text-sm text-green-600">Within 5% of budget allocation</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="forecasting" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Budget Forecasting</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="font-semibold">Year-End Projections</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                      <span>Projected Total Revenue</span>
                      <span className="font-semibold">{formatCurrency(2125000)}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                      <span>Projected Total Expenses</span>
                      <span className="font-semibold">{formatCurrency(1875000)}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-green-50 rounded">
                      <span className="font-semibold">Projected Net Income</span>
                      <span className="font-semibold text-green-600">{formatCurrency(250000)}</span>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <h4 className="font-semibold">Recommendations</h4>
                  <div className="space-y-3">
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <div className="font-medium text-blue-800">Optimize Medical Supplies</div>
                      <div className="text-sm text-blue-600">Consider bulk purchasing to reduce costs by 5-8%</div>
                    </div>
                    <div className="p-3 bg-purple-50 rounded-lg">
                      <div className="font-medium text-purple-800">Increase Lab Marketing</div>
                      <div className="text-sm text-purple-600">Boost revenue by 3-5% with targeted campaigns</div>
                    </div>
                    <div className="p-3 bg-orange-50 rounded-lg">
                      <div className="font-medium text-orange-800">Equipment Investment</div>
                      <div className="text-sm text-orange-600">Consider new diagnostic equipment for Q2</div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}