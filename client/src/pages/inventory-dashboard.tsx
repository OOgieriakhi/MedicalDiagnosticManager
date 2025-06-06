import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { AlertTriangle, Package, TrendingDown, TrendingUp, Activity, CheckCircle, Home } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";

interface InventoryItem {
  id: number;
  itemCode: string;
  name: string;
  categoryName: string;
  unitOfMeasure: string;
  reorderLevel: number;
  minimumStock: number;
  maximumStock: number;
  unitCost: number;
  isActive: boolean;
}

interface StockLevel {
  id: number;
  item_id: number;
  item_name: string;
  item_code: string;
  available_quantity: number;
  reorder_level: number;
  minimum_stock: number;
  maximum_stock: number;
  stock_status: 'critical' | 'low' | 'normal' | 'high';
  last_updated: string;
}

interface ConsumptionTemplate {
  id: number;
  testId: number;
  testName: string;
  itemId: number;
  itemName: string;
  itemCode: string;
  standardQuantity: number;
  consumptionType: string;
  costCenter: string;
  isCritical: boolean;
  unitOfMeasure: string;
}

interface RecentTransaction {
  id: number;
  type: 'in' | 'out' | 'adjustment';
  item_name: string;
  quantity: number;
  unit_of_measure: string;
  reason: string;
  created_at: string;
  performed_by: string;
}

export default function InventoryDashboard() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("overview");

  // Fetch inventory overview data
  const { data: stockLevels = [] } = useQuery<StockLevel[]>({
    queryKey: ["/api/inventory/stock-levels"],
    queryFn: async () => {
      const response = await fetch("/api/inventory/stock-levels");
      return response.json();
    },
  });

  const { data: lowStockItems = [] } = useQuery<StockLevel[]>({
    queryKey: ["/api/inventory/low-stock"],
    queryFn: async () => {
      const response = await fetch("/api/inventory/low-stock");
      return response.json();
    },
  });

  const { data: recentTransactions = [] } = useQuery<RecentTransaction[]>({
    queryKey: ["/api/inventory/recent-transactions"],
    queryFn: async () => {
      const response = await fetch("/api/inventory/recent-transactions");
      return response.json();
    },
  });

  const { data: consumptionTemplates = [] } = useQuery<ConsumptionTemplate[]>({
    queryKey: ["/api/inventory/consumption-templates"],
    queryFn: async () => {
      const response = await fetch("/api/inventory/test-consumption-templates");
      return response.json();
    },
  });

  // Initialize standard consumption templates
  const initializeTemplates = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/inventory/initialize-standard-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) throw new Error("Failed to initialize templates");
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Standard consumption templates initialized successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory/consumption-templates"] });
    },
    onError: () => {
      toast({ title: "Failed to initialize templates", variant: "destructive" });
    },
  });

  // Calculate dashboard statistics
  const stockLevelsArray = Array.isArray(stockLevels) ? stockLevels : [];
  const totalItems = stockLevelsArray.length;
  const criticalItems = stockLevelsArray.filter(item => item.stock_status === 'critical').length;
  const lowStockCount = stockLevelsArray.filter(item => item.stock_status === 'low').length;
  const normalStockCount = stockLevelsArray.filter(item => item.stock_status === 'normal').length;
  const highStockCount = stockLevelsArray.filter(item => item.stock_status === 'high').length;

  const getStockStatusColor = (status: string) => {
    switch (status) {
      case 'critical': return 'destructive';
      case 'low': return 'secondary';
      case 'normal': return 'default';
      case 'high': return 'outline';
      default: return 'default';
    }
  };

  const getStockStatusIcon = (status: string) => {
    switch (status) {
      case 'critical': return <AlertTriangle className="h-4 w-4" />;
      case 'low': return <TrendingDown className="h-4 w-4" />;
      case 'normal': return <CheckCircle className="h-4 w-4" />;
      case 'high': return <TrendingUp className="h-4 w-4" />;
      default: return <Package className="h-4 w-4" />;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Link href="/">
            <Button variant="outline" size="sm">
              <Home className="h-4 w-4 mr-2" />
              Home
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Inventory Dashboard</h1>
            <p className="text-muted-foreground">
              Comprehensive inventory and stock management system
            </p>
          </div>
        </div>
        <Button 
          onClick={() => initializeTemplates.mutate()}
          disabled={initializeTemplates.isPending}
        >
          {initializeTemplates.isPending ? "Initializing..." : "Initialize Standards"}
        </Button>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Items</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalItems}</div>
            <p className="text-xs text-muted-foreground">
              Active inventory items
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Critical Stock</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{criticalItems}</div>
            <p className="text-xs text-muted-foreground">
              Items below minimum level
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock</CardTitle>
            <TrendingDown className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-500">{lowStockCount}</div>
            <p className="text-xs text-muted-foreground">
              Items near reorder level
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Normal Stock</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">{normalStockCount}</div>
            <p className="text-xs text-muted-foreground">
              Items at optimal levels
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Stock Overview</TabsTrigger>
          <TabsTrigger value="low-stock">Low Stock Alerts</TabsTrigger>
          <TabsTrigger value="consumption">Test Consumption</TabsTrigger>
          <TabsTrigger value="transactions">Recent Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <Card>
            <CardHeader>
              <CardTitle>Current Stock Levels</CardTitle>
              <CardDescription>
                Real-time view of all inventory items and their stock status
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>Current Stock</TableHead>
                    <TableHead>Stock Level</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last Updated</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stockLevelsArray.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{item.item_name}</div>
                          <div className="text-sm text-muted-foreground">{item.item_code}</div>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">
                        {item.available_quantity}
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <Progress 
                            value={(item.available_quantity / item.reorder_level) * 100}
                            className="h-2"
                          />
                          <div className="text-xs text-muted-foreground">
                            Reorder at {item.reorder_level} | Min: {item.minimum_stock}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={getStockStatusColor(item.stock_status) as any}
                          className="flex items-center gap-1"
                        >
                          {getStockStatusIcon(item.stock_status)}
                          {item.stock_status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(item.last_updated)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="low-stock">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                Low Stock Alerts
              </CardTitle>
              <CardDescription>
                Items that require immediate attention for restocking
              </CardDescription>
            </CardHeader>
            <CardContent>
              {lowStockItems.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
                  <p>All items are at adequate stock levels</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead>Current</TableHead>
                      <TableHead>Reorder Level</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lowStockItems.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{item.item_name}</div>
                            <div className="text-sm text-muted-foreground">{item.item_code}</div>
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">
                          {item.available_quantity}
                        </TableCell>
                        <TableCell>{item.reorder_level}</TableCell>
                        <TableCell>
                          <Badge variant={item.stock_status === 'critical' ? 'destructive' : 'secondary'}>
                            {item.stock_status === 'critical' ? 'URGENT' : 'Medium'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button size="sm" variant="outline">
                            Create PO
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

        <TabsContent value="consumption">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Test Consumption Templates
              </CardTitle>
              <CardDescription>
                Standard inventory consumption patterns for medical tests and procedures
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Test</TableHead>
                    <TableHead>Consumable Item</TableHead>
                    <TableHead>Standard Qty</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Cost Center</TableHead>
                    <TableHead>Critical</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {consumptionTemplates.map((template) => (
                    <TableRow key={template.id}>
                      <TableCell>
                        <div className="font-medium">{template.testName}</div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{template.itemName}</div>
                          <div className="text-sm text-muted-foreground">{template.itemCode}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {template.standardQuantity} {template.unitOfMeasure}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{template.consumptionType}</Badge>
                      </TableCell>
                      <TableCell className="text-sm">{template.costCenter}</TableCell>
                      <TableCell>
                        {template.isCritical ? (
                          <Badge variant="destructive">Critical</Badge>
                        ) : (
                          <Badge variant="secondary">Standard</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="transactions">
          <Card>
            <CardHeader>
              <CardTitle>Recent Inventory Transactions</CardTitle>
              <CardDescription>
                Latest inventory movements and adjustments
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Item</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Performed By</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentTransactions.map((transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell>
                        <Badge 
                          variant={
                            transaction.type === 'in' ? 'default' : 
                            transaction.type === 'out' ? 'secondary' : 'outline'
                          }
                        >
                          {transaction.type.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">{transaction.item_name}</TableCell>
                      <TableCell>
                        {transaction.type === 'out' ? '-' : '+'}{transaction.quantity} {transaction.unit_of_measure}
                      </TableCell>
                      <TableCell className="text-sm">{transaction.reason}</TableCell>
                      <TableCell className="text-sm">{transaction.performed_by}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(transaction.created_at)}
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