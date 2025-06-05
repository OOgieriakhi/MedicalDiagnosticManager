import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Package, AlertTriangle, Clock, TrendingUp, Search, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { MessageNotification } from "@/components/message-notification";

const itemSchema = z.object({
  tenantId: z.number(),
  categoryId: z.number(),
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  unitOfMeasure: z.string().min(1, "Unit of measure is required"),
  minimumStock: z.number().min(0),
  maximumStock: z.number().optional(),
  reorderLevel: z.number().min(0),
  standardCost: z.number().min(0),
  sellingPrice: z.number().optional(),
  isConsumable: z.boolean().default(true),
  requiresSerialNumber: z.boolean().default(false),
  expiryTracking: z.boolean().default(false),
});

const categorySchema = z.object({
  tenantId: z.number(),
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  parentCategoryId: z.number().optional(),
});

const transactionSchema = z.object({
  tenantId: z.number(),
  branchId: z.number(),
  itemId: z.number(),
  transactionType: z.enum(["in", "out", "transfer", "adjustment", "reserved", "unreserved"]),
  quantity: z.number().min(1),
  unitCost: z.number().optional(),
  batchNumber: z.string().optional(),
  expiryDate: z.date().optional(),
  notes: z.string().optional(),
  performedBy: z.number(),
});

type ItemFormData = z.infer<typeof itemSchema>;
type CategoryFormData = z.infer<typeof categorySchema>;
type TransactionFormData = z.infer<typeof transactionSchema>;

export default function InventoryManagement() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  // Queries
  const { data: categories } = useQuery({
    queryKey: ["/api/inventory/categories"],
    queryFn: () => apiRequest("GET", "/api/inventory/categories").then(res => res.json()),
  });

  const { data: items } = useQuery({
    queryKey: ["/api/inventory/items", selectedCategory],
    queryFn: () => {
      const url = selectedCategory 
        ? `/api/inventory/items?categoryId=${selectedCategory}`
        : "/api/inventory/items";
      return apiRequest("GET", url).then(res => res.json());
    },
  });

  const { data: stock } = useQuery({
    queryKey: ["/api/inventory/stock"],
    queryFn: () => apiRequest("GET", "/api/inventory/stock").then(res => res.json()),
  });

  const { data: lowStockItems } = useQuery({
    queryKey: ["/api/inventory/low-stock"],
    queryFn: () => apiRequest("GET", "/api/inventory/low-stock").then(res => res.json()),
  });

  const { data: expiringItems } = useQuery({
    queryKey: ["/api/inventory/expiring"],
    queryFn: () => apiRequest("GET", "/api/inventory/expiring").then(res => res.json()),
  });

  const { data: transactions } = useQuery({
    queryKey: ["/api/inventory/transactions"],
    queryFn: () => apiRequest("GET", "/api/inventory/transactions").then(res => res.json()),
  });

  const { data: valuation } = useQuery({
    queryKey: ["/api/inventory/valuation"],
    queryFn: () => apiRequest("GET", "/api/inventory/valuation").then(res => res.json()),
  });

  // Mutations
  const createCategoryMutation = useMutation({
    mutationFn: (data: CategoryFormData) =>
      apiRequest("POST", "/api/inventory/categories", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inventory/categories"] });
      toast({ title: "Category created successfully" });
    },
    onError: () => {
      toast({ title: "Failed to create category", variant: "destructive" });
    },
  });

  const createItemMutation = useMutation({
    mutationFn: (data: ItemFormData) =>
      apiRequest("POST", "/api/inventory/items", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inventory/items"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory/stock"] });
      toast({ title: "Item created successfully" });
    },
    onError: () => {
      toast({ title: "Failed to create item", variant: "destructive" });
    },
  });

  const createTransactionMutation = useMutation({
    mutationFn: (data: TransactionFormData) =>
      apiRequest("POST", "/api/inventory/transactions", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inventory/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory/stock"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory/low-stock"] });
      toast({ title: "Transaction recorded successfully" });
    },
    onError: () => {
      toast({ title: "Failed to record transaction", variant: "destructive" });
    },
  });

  // Forms
  const categoryForm = useForm<CategoryFormData>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      tenantId: 1,
      name: "",
      description: "",
    },
  });

  const itemForm = useForm<ItemFormData>({
    resolver: zodResolver(itemSchema),
    defaultValues: {
      tenantId: 1,
      categoryId: 1,
      name: "",
      description: "",
      unitOfMeasure: "",
      minimumStock: 0,
      reorderLevel: 0,
      standardCost: 0,
      isConsumable: true,
      requiresSerialNumber: false,
      expiryTracking: false,
    },
  });

  const transactionForm = useForm<TransactionFormData>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      tenantId: 1,
      branchId: 1,
      itemId: 1,
      transactionType: "in",
      quantity: 1,
      performedBy: 1,
    },
  });

  // Filter items based on search term
  const filteredItems = items?.filter((item: any) =>
    item.item_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.item_code?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const getStockStatus = (item: any) => {
    if (item.total_available <= item.minimum_stock) return "critical";
    if (item.total_available <= item.reorder_level) return "low";
    return "adequate";
  };

  const getStockStatusColor = (status: string) => {
    switch (status) {
      case "critical": return "destructive";
      case "low": return "warning";
      default: return "default";
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Inventory Management</h1>
          <p className="text-muted-foreground">
            Manage stock levels, track items, and monitor inventory valuation
          </p>
        </div>
        <div className="flex gap-2">
          <MessageNotification />
          <Dialog>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Category
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Category</DialogTitle>
                <DialogDescription>
                  Add a new inventory category to organize your items.
                </DialogDescription>
              </DialogHeader>
              <Form {...categoryForm}>
                <form
                  onSubmit={categoryForm.handleSubmit((data) =>
                    createCategoryMutation.mutate(data)
                  )}
                  className="space-y-4"
                >
                  <FormField
                    control={categoryForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Category Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Medical Supplies" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={categoryForm.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Category description..."
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button 
                    type="submit" 
                    disabled={createCategoryMutation.isPending}
                    className="w-full"
                  >
                    Create Category
                  </Button>
                </form>
              </Form>
            </DialogContent>
          </Dialog>

          <Dialog>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Item
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create New Item</DialogTitle>
                <DialogDescription>
                  Add a new inventory item to track stock levels.
                </DialogDescription>
              </DialogHeader>
              <Form {...itemForm}>
                <form
                  onSubmit={itemForm.handleSubmit((data) =>
                    createItemMutation.mutate(data)
                  )}
                  className="space-y-4"
                >
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={itemForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Item Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Surgical Gloves" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={itemForm.control}
                      name="categoryId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Category</FormLabel>
                          <Select
                            onValueChange={(value) => field.onChange(parseInt(value))}
                            defaultValue={field.value?.toString()}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select category" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {categories?.map((category: any) => (
                                <SelectItem key={category.id} value={category.id.toString()}>
                                  {category.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={itemForm.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Item description..."
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-3 gap-4">
                    <FormField
                      control={itemForm.control}
                      name="unitOfMeasure"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Unit of Measure</FormLabel>
                          <FormControl>
                            <Input placeholder="box, piece, liter" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={itemForm.control}
                      name="minimumStock"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Minimum Stock</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value))}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={itemForm.control}
                      name="reorderLevel"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Reorder Level</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value))}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={itemForm.control}
                      name="standardCost"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Standard Cost (₦)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.01"
                              {...field}
                              onChange={(e) => field.onChange(parseFloat(e.target.value))}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={itemForm.control}
                      name="sellingPrice"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Selling Price (₦)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.01"
                              {...field}
                              onChange={(e) => field.onChange(parseFloat(e.target.value) || undefined)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <Button 
                    type="submit" 
                    disabled={createItemMutation.isPending}
                    className="w-full"
                  >
                    Create Item
                  </Button>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Items</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{items?.length || 0}</div>
            <p className="text-xs text-muted-foreground">
              Active inventory items
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock Items</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {lowStockItems?.length || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Items below reorder level
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Expiring Soon</CardTitle>
            <Clock className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {expiringItems?.length || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Items expiring in 30 days
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Value</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ₦{valuation?.total_value?.toLocaleString() || "0"}
            </div>
            <p className="text-xs text-muted-foreground">
              Current inventory value
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="items">Items</TabsTrigger>
          <TabsTrigger value="stock">Stock Levels</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="alerts">Alerts</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Transactions */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Transactions</CardTitle>
                <CardDescription>Latest inventory movements</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {transactions?.slice(0, 5).map((transaction: any) => (
                    <div key={transaction.id} className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{transaction.item_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {transaction.transaction_type.toUpperCase()} - {transaction.quantity} units
                        </p>
                      </div>
                      <Badge variant={transaction.transaction_type === 'in' ? 'default' : 'secondary'}>
                        {transaction.transaction_type}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Low Stock Alerts */}
            <Card>
              <CardHeader>
                <CardTitle>Low Stock Alerts</CardTitle>
                <CardDescription>Items requiring attention</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {lowStockItems?.slice(0, 5).map((item: any) => (
                    <div key={item.id} className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{item.item_name}</p>
                        <p className="text-sm text-muted-foreground">
                          Current: {item.available_quantity} / Reorder: {item.reorder_level}
                        </p>
                      </div>
                      <Badge variant="destructive">Low</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="items" className="space-y-6">
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search items..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select
              value={selectedCategory?.toString() || ""}
              onValueChange={(value) => setSelectedCategory(value ? parseInt(value) : null)}
            >
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Categories</SelectItem>
                {categories?.map((category: any) => (
                  <SelectItem key={category.id} value={category.id.toString()}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Inventory Items</CardTitle>
              <CardDescription>
                Manage your inventory items and track stock levels
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item Code</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Available</TableHead>
                    <TableHead>Unit</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Value</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredItems.map((item: any) => {
                    const status = getStockStatus(item);
                    return (
                      <TableRow key={item.id}>
                        <TableCell className="font-mono">{item.item_code}</TableCell>
                        <TableCell className="font-medium">{item.item_name}</TableCell>
                        <TableCell>{item.category_name}</TableCell>
                        <TableCell>{item.total_available || 0}</TableCell>
                        <TableCell>{item.unit_of_measure}</TableCell>
                        <TableCell>
                          <Badge variant={getStockStatusColor(status)}>
                            {status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          ₦{((item.total_available || 0) * (item.standard_cost || 0)).toLocaleString()}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stock" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Stock Levels</CardTitle>
              <CardDescription>
                Current stock levels across all locations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>Available</TableHead>
                    <TableHead>Reserved</TableHead>
                    <TableHead>Minimum</TableHead>
                    <TableHead>Reorder Level</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stock?.map((stockItem: any) => (
                    <TableRow key={stockItem.id}>
                      <TableCell className="font-medium">{stockItem.item_name}</TableCell>
                      <TableCell>{stockItem.available_quantity}</TableCell>
                      <TableCell>{stockItem.reserved_quantity}</TableCell>
                      <TableCell>{stockItem.minimum_stock}</TableCell>
                      <TableCell>{stockItem.reorder_level}</TableCell>
                      <TableCell>
                        <Badge variant={getStockStatusColor(stockItem.stock_status)}>
                          {stockItem.stock_status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm">
                              Record Transaction
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Record Stock Transaction</DialogTitle>
                              <DialogDescription>
                                Record a stock movement for {stockItem.item_name}
                              </DialogDescription>
                            </DialogHeader>
                            <Form {...transactionForm}>
                              <form
                                onSubmit={transactionForm.handleSubmit((data) => {
                                  const transactionData = {
                                    ...data,
                                    itemId: stockItem.item_id,
                                  };
                                  createTransactionMutation.mutate(transactionData);
                                })}
                                className="space-y-4"
                              >
                                <FormField
                                  control={transactionForm.control}
                                  name="transactionType"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Transaction Type</FormLabel>
                                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                          <SelectTrigger>
                                            <SelectValue />
                                          </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                          <SelectItem value="in">Stock In</SelectItem>
                                          <SelectItem value="out">Stock Out</SelectItem>
                                          <SelectItem value="adjustment">Adjustment</SelectItem>
                                          <SelectItem value="transfer">Transfer</SelectItem>
                                        </SelectContent>
                                      </Select>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                <FormField
                                  control={transactionForm.control}
                                  name="quantity"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Quantity</FormLabel>
                                      <FormControl>
                                        <Input
                                          type="number"
                                          {...field}
                                          onChange={(e) => field.onChange(parseInt(e.target.value))}
                                        />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                <FormField
                                  control={transactionForm.control}
                                  name="notes"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Notes</FormLabel>
                                      <FormControl>
                                        <Textarea placeholder="Optional notes..." {...field} />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                <Button 
                                  type="submit" 
                                  disabled={createTransactionMutation.isPending}
                                  className="w-full"
                                >
                                  Record Transaction
                                </Button>
                              </form>
                            </Form>
                          </DialogContent>
                        </Dialog>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="transactions" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Transaction History</CardTitle>
              <CardDescription>
                Complete history of all inventory movements
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Item</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead>Performed By</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions?.map((transaction: any) => (
                    <TableRow key={transaction.id}>
                      <TableCell>
                        {new Date(transaction.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="font-medium">{transaction.item_name}</TableCell>
                      <TableCell>
                        <Badge variant={transaction.transaction_type === 'in' ? 'default' : 'secondary'}>
                          {transaction.transaction_type}
                        </Badge>
                      </TableCell>
                      <TableCell>{transaction.quantity}</TableCell>
                      <TableCell>{transaction.notes || "-"}</TableCell>
                      <TableCell>{transaction.performed_by_username}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alerts" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-orange-600" />
                  Low Stock Items
                </CardTitle>
                <CardDescription>
                  Items that need to be reordered
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {lowStockItems?.map((item: any) => (
                    <div key={item.id} className="flex items-center justify-between p-3 border rounded">
                      <div>
                        <p className="font-medium">{item.item_name}</p>
                        <p className="text-sm text-muted-foreground">
                          Current: {item.available_quantity} | Reorder at: {item.reorder_level}
                        </p>
                      </div>
                      <Badge variant="destructive">Reorder</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-red-600" />
                  Expiring Items
                </CardTitle>
                <CardDescription>
                  Items expiring within 30 days
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {expiringItems?.map((item: any) => (
                    <div key={item.id} className="flex items-center justify-between p-3 border rounded">
                      <div>
                        <p className="font-medium">{item.item_name}</p>
                        <p className="text-sm text-muted-foreground">
                          Expires: {new Date(item.expiry_date).toLocaleDateString()}
                        </p>
                      </div>
                      <Badge variant="destructive">Expiring</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}