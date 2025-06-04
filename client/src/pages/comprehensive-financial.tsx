import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { 
  DollarSign,
  TrendingUp,
  TrendingDown,
  FileText,
  Package,
  ShoppingCart,
  CreditCard,
  Calendar,
  Download,
  Upload,
  Filter,
  Search,
  Plus,
  Minus,
  AlertTriangle,
  CheckCircle,
  Clock,
  BarChart3,
  PieChart,
  Receipt
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Link } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function ComprehensiveFinancial() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [dateRange, setDateRange] = useState("month");
  const [startDate, setStartDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedCategory, setSelectedCategory] = useState("all");

  // Financial statements data
  const { data: incomeStatement, isLoading: incomeLoading } = useQuery({
    queryKey: ['/api/financial/income-statement', dateRange, startDate, endDate],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (dateRange !== 'custom') {
        params.append('range', dateRange);
      } else {
        params.append('startDate', startDate);
        params.append('endDate', endDate);
      }
      
      const response = await fetch(`/api/financial/income-statement?${params}`, {
        headers: { 'Cache-Control': 'no-cache' }
      });
      if (!response.ok) throw new Error('Failed to fetch income statement');
      return response.json();
    }
  });

  const { data: balanceSheet, isLoading: balanceLoading } = useQuery({
    queryKey: ['/api/financial/balance-sheet', dateRange, startDate, endDate],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (dateRange !== 'custom') {
        params.append('range', dateRange);
      } else {
        params.append('startDate', startDate);
        params.append('endDate', endDate);
      }
      
      const response = await fetch(`/api/financial/balance-sheet?${params}`, {
        headers: { 'Cache-Control': 'no-cache' }
      });
      if (!response.ok) throw new Error('Failed to fetch balance sheet');
      return response.json();
    }
  });

  // Inventory data
  const { data: inventoryItems, isLoading: inventoryLoading } = useQuery({
    queryKey: ['/api/inventory/items', selectedCategory],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedCategory !== 'all') params.append('category', selectedCategory);
      
      const response = await fetch(`/api/inventory/items?${params}`, {
        headers: { 'Cache-Control': 'no-cache' }
      });
      if (!response.ok) throw new Error('Failed to fetch inventory');
      return response.json();
    }
  });

  // Supply orders data
  const { data: supplyOrders, isLoading: ordersLoading } = useQuery({
    queryKey: ['/api/supply/orders'],
    queryFn: async () => {
      const response = await fetch('/api/supply/orders', {
        headers: { 'Cache-Control': 'no-cache' }
      });
      if (!response.ok) throw new Error('Failed to fetch supply orders');
      return response.json();
    }
  });

  // Bank reconciliation data
  const { data: bankReconciliation, isLoading: bankLoading } = useQuery({
    queryKey: ['/api/financial/bank-reconciliation', dateRange],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('range', dateRange);
      
      const response = await fetch(`/api/financial/bank-reconciliation?${params}`, {
        headers: { 'Cache-Control': 'no-cache' }
      });
      if (!response.ok) throw new Error('Failed to fetch bank reconciliation');
      return response.json();
    }
  });

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/">
            <Button variant="outline" size="sm" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Dashboard
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Comprehensive Financial Management</h1>
            <p className="text-gray-600">Income statements, balance sheets, inventory control, and bank reconciliation</p>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <Button variant="outline" className="flex items-center gap-2">
            <Download className="w-4 h-4" />
            Export Reports
          </Button>
          <Button className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Generate Statement
          </Button>
        </div>
      </div>

      {/* Date Range Filter */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Label>Period:</Label>
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="month">This Month</SelectItem>
                  <SelectItem value="quarter">This Quarter</SelectItem>
                  <SelectItem value="year">This Year</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {dateRange === 'custom' && (
              <div className="flex items-center gap-2">
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-40"
                />
                <span>to</span>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-40"
                />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Main Tabs */}
      <Tabs defaultValue="statements" className="space-y-6">
        <TabsList>
          <TabsTrigger value="statements">Financial Statements</TabsTrigger>
          <TabsTrigger value="inventory">Inventory Control</TabsTrigger>
          <TabsTrigger value="procurement">Supply Ordering</TabsTrigger>
          <TabsTrigger value="reconciliation">Bank Reconciliation</TabsTrigger>
          <TabsTrigger value="costing">Procedure Costing</TabsTrigger>
        </TabsList>

        <TabsContent value="statements" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Income Statement */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                  Income Statement
                </CardTitle>
              </CardHeader>
              <CardContent>
                {incomeLoading ? (
                  <div className="text-center py-8">Loading income statement...</div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center p-3 bg-green-50 rounded">
                      <span className="font-medium">Total Revenue</span>
                      <span className="text-2xl font-bold text-green-600">
                        ₦{incomeStatement?.totalRevenue?.toLocaleString() || '0'}
                      </span>
                    </div>
                    
                    <div className="space-y-2">
                      <h4 className="font-medium text-gray-700">Revenue Breakdown</h4>
                      {incomeStatement?.revenueBreakdown?.map((item: any) => (
                        <div key={item.category} className="flex justify-between">
                          <span>{item.category}</span>
                          <span>₦{item.amount?.toLocaleString()}</span>
                        </div>
                      )) || (
                        <div className="text-gray-500">No revenue data available</div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <h4 className="font-medium text-gray-700">Operating Expenses</h4>
                      {incomeStatement?.expenses?.map((expense: any) => (
                        <div key={expense.category} className="flex justify-between">
                          <span>{expense.category}</span>
                          <span className="text-red-600">₦{expense.amount?.toLocaleString()}</span>
                        </div>
                      )) || (
                        <div className="text-gray-500">No expense data available</div>
                      )}
                    </div>

                    <div className="flex justify-between items-center p-3 bg-blue-50 rounded border-t">
                      <span className="font-medium">Net Income</span>
                      <span className="text-xl font-bold text-blue-600">
                        ₦{incomeStatement?.netIncome?.toLocaleString() || '0'}
                      </span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Balance Sheet */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="w-5 h-5 text-blue-600" />
                  Balance Sheet
                </CardTitle>
              </CardHeader>
              <CardContent>
                {balanceLoading ? (
                  <div className="text-center py-8">Loading balance sheet...</div>
                ) : (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <h4 className="font-medium text-gray-700">Assets</h4>
                      <div className="space-y-1">
                        <div className="flex justify-between">
                          <span>Cash & Bank</span>
                          <span>₦{balanceSheet?.assets?.cash?.toLocaleString() || '0'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Accounts Receivable</span>
                          <span>₦{balanceSheet?.assets?.receivables?.toLocaleString() || '0'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Inventory</span>
                          <span>₦{balanceSheet?.assets?.inventory?.toLocaleString() || '0'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Equipment</span>
                          <span>₦{balanceSheet?.assets?.equipment?.toLocaleString() || '0'}</span>
                        </div>
                      </div>
                      <div className="flex justify-between font-medium pt-2 border-t">
                        <span>Total Assets</span>
                        <span>₦{balanceSheet?.totalAssets?.toLocaleString() || '0'}</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <h4 className="font-medium text-gray-700">Liabilities</h4>
                      <div className="space-y-1">
                        <div className="flex justify-between">
                          <span>Accounts Payable</span>
                          <span>₦{balanceSheet?.liabilities?.payables?.toLocaleString() || '0'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Short-term Debt</span>
                          <span>₦{balanceSheet?.liabilities?.shortTermDebt?.toLocaleString() || '0'}</span>
                        </div>
                      </div>
                      <div className="flex justify-between font-medium pt-2 border-t">
                        <span>Total Liabilities</span>
                        <span>₦{balanceSheet?.totalLiabilities?.toLocaleString() || '0'}</span>
                      </div>
                    </div>

                    <div className="flex justify-between items-center p-3 bg-green-50 rounded">
                      <span className="font-medium">Owner's Equity</span>
                      <span className="text-xl font-bold text-green-600">
                        ₦{balanceSheet?.equity?.toLocaleString() || '0'}
                      </span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="inventory" className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Inventory Management</h2>
            <div className="flex gap-2">
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="medical-supplies">Medical Supplies</SelectItem>
                  <SelectItem value="laboratory">Laboratory Reagents</SelectItem>
                  <SelectItem value="pharmaceuticals">Pharmaceuticals</SelectItem>
                  <SelectItem value="equipment">Equipment</SelectItem>
                </SelectContent>
              </Select>
              <Button className="flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Add Item
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Package className="w-5 h-5 text-blue-600" />
                  <div>
                    <p className="text-sm font-medium">Total Items</p>
                    <p className="text-2xl font-bold">
                      {inventoryItems?.summary?.totalItems || 0}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-yellow-600" />
                  <div>
                    <p className="text-sm font-medium">Low Stock</p>
                    <p className="text-2xl font-bold text-yellow-600">
                      {inventoryItems?.summary?.lowStock || 0}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-green-600" />
                  <div>
                    <p className="text-sm font-medium">Total Value</p>
                    <p className="text-2xl font-bold">
                      ₦{inventoryItems?.summary?.totalValue?.toLocaleString() || '0'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <TrendingDown className="w-5 h-5 text-red-600" />
                  <div>
                    <p className="text-sm font-medium">Out of Stock</p>
                    <p className="text-2xl font-bold text-red-600">
                      {inventoryItems?.summary?.outOfStock || 0}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Current Stock</TableHead>
                    <TableHead>Min Level</TableHead>
                    <TableHead>Unit Cost</TableHead>
                    <TableHead>Total Value</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {inventoryItems?.items?.map((item: any) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell>{item.category}</TableCell>
                      <TableCell>{item.currentStock}</TableCell>
                      <TableCell>{item.minLevel}</TableCell>
                      <TableCell>₦{item.unitCost?.toLocaleString()}</TableCell>
                      <TableCell>₦{(item.currentStock * item.unitCost)?.toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge variant={
                          item.currentStock === 0 ? 'destructive' :
                          item.currentStock <= item.minLevel ? 'secondary' :
                          'default'
                        }>
                          {item.currentStock === 0 ? 'Out of Stock' :
                           item.currentStock <= item.minLevel ? 'Low Stock' :
                           'In Stock'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm">
                            <Plus className="w-4 h-4" />
                          </Button>
                          <Button variant="outline" size="sm">
                            <Minus className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )) || (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8">
                        {inventoryLoading ? 'Loading inventory...' : 'No inventory items found'}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="procurement" className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Supply Ordering System</h2>
            <Button className="flex items-center gap-2">
              <ShoppingCart className="w-4 h-4" />
              Create Purchase Order
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-yellow-600" />
                  <div>
                    <p className="text-sm font-medium">Pending Orders</p>
                    <p className="text-2xl font-bold">
                      {supplyOrders?.summary?.pending || 0}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <div>
                    <p className="text-sm font-medium">Completed Orders</p>
                    <p className="text-2xl font-bold">
                      {supplyOrders?.summary?.completed || 0}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-blue-600" />
                  <div>
                    <p className="text-sm font-medium">Total Value</p>
                    <p className="text-2xl font-bold">
                      ₦{supplyOrders?.summary?.totalValue?.toLocaleString() || '0'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Recent Purchase Orders</CardTitle>
            </CardHeader>
            <CardContent>
              {ordersLoading ? (
                <div className="text-center py-8">Loading orders...</div>
              ) : (
                <div className="space-y-4">
                  {supplyOrders?.orders?.map((order: any) => (
                    <div key={order.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <h3 className="font-medium">{order.supplier}</h3>
                        <p className="text-sm text-gray-600">PO: {order.orderNumber} - {order.orderDate}</p>
                        <p className="text-xs text-gray-500">{order.itemCount} items</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">₦{order.totalAmount?.toLocaleString()}</p>
                        <Badge variant={
                          order.status === 'delivered' ? 'default' :
                          order.status === 'pending' ? 'secondary' :
                          'outline'
                        }>
                          {order.status}
                        </Badge>
                      </div>
                    </div>
                  )) || (
                    <div className="text-center py-8 text-gray-500">
                      No purchase orders found
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reconciliation" className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Bank Reconciliation</h2>
            <div className="flex gap-2">
              <Button variant="outline" className="flex items-center gap-2">
                <Upload className="w-4 h-4" />
                Import Bank Statement
              </Button>
              <Button className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                Reconcile
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-blue-600" />
                  <div>
                    <p className="text-sm font-medium">Bank Balance</p>
                    <p className="text-2xl font-bold">
                      ₦{bankReconciliation?.bankBalance?.toLocaleString() || '0'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Receipt className="w-5 h-5 text-green-600" />
                  <div>
                    <p className="text-sm font-medium">Book Balance</p>
                    <p className="text-2xl font-bold">
                      ₦{bankReconciliation?.bookBalance?.toLocaleString() || '0'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-yellow-600" />
                  <div>
                    <p className="text-sm font-medium">Unmatched Items</p>
                    <p className="text-2xl font-bold text-yellow-600">
                      {bankReconciliation?.unmatchedItems || 0}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <TrendingDown className="w-5 h-5 text-red-600" />
                  <div>
                    <p className="text-sm font-medium">Difference</p>
                    <p className="text-2xl font-bold text-red-600">
                      ₦{bankReconciliation?.difference?.toLocaleString() || '0'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Reconciliation Details</CardTitle>
            </CardHeader>
            <CardContent>
              {bankLoading ? (
                <div className="text-center py-8">Loading reconciliation data...</div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  Bank reconciliation data will be available once bank statements are imported
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="costing" className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Procedure Costing Analysis</h2>
            <Button className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Generate Cost Report
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-green-600" />
                  <div>
                    <p className="text-sm font-medium">Average Cost per Test</p>
                    <p className="text-2xl font-bold">₦8,500</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-blue-600" />
                  <div>
                    <p className="text-sm font-medium">Profit Margin</p>
                    <p className="text-2xl font-bold">65%</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-purple-600" />
                  <div>
                    <p className="text-sm font-medium">Most Profitable</p>
                    <p className="text-lg font-bold">ECG Tests</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Cost Breakdown by Procedure</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-gray-500">
                Procedure costing analysis will be available once cost data is configured
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}