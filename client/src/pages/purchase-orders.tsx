import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTab 
} from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { 
  Plus, 
  FileText, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Eye,
  Edit,
  Trash2,
  DollarSign,
  Package,
  Calendar,
  User
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { insertPurchaseOrderSchema, insertPurchaseOrderItemSchema } from "@shared/schema";

// Form schemas
const poFormSchema = insertPurchaseOrderSchema.extend({
  items: z.array(insertPurchaseOrderItemSchema.omit({ poId: true })).min(1, "At least one item is required"),
});

type POFormData = z.infer<typeof poFormSchema>;

const approvalFormSchema = z.object({
  comments: z.string().min(1, "Comments are required"),
  action: z.enum(["approve", "reject"]),
});

type ApprovalFormData = z.infer<typeof approvalFormSchema>;

export default function PurchaseOrders() {
  const [activeTab, setActiveTab] = useState("overview");
  const [showNewPODialog, setShowNewPODialog] = useState(false);
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [selectedPO, setSelectedPO] = useState<any>(null);
  const [selectedItems, setSelectedItems] = useState<any[]>([{ itemName: "", description: "", category: "", quantity: 1, unitPrice: 0, totalPrice: 0 }]);
  
  const { toast } = useToast();

  // Queries
  const { data: purchaseOrders = [], isLoading: isLoadingPOs } = useQuery({
    queryKey: ["/api/purchase-orders"],
  });

  const { data: pendingApprovals = [], isLoading: isLoadingApprovals } = useQuery({
    queryKey: ["/api/purchase-orders/pending-approvals"],
  });

  const { data: vendors = [] } = useQuery({
    queryKey: ["/api/vendors"],
  });

  const { data: poMetrics = {} } = useQuery({
    queryKey: ["/api/purchase-orders/metrics"],
  });

  // Forms
  const poForm = useForm<POFormData>({
    resolver: zodResolver(poFormSchema),
    defaultValues: {
      poNumber: "",
      vendorName: "",
      vendorEmail: "",
      vendorPhone: "",
      vendorAddress: "",
      priority: "normal",
      subtotal: 0,
      taxAmount: 0,
      totalAmount: 0,
      notes: "",
      terms: "",
      items: [{ itemName: "", description: "", category: "", quantity: 1, unitPrice: 0, totalPrice: 0 }],
    },
  });

  const approvalForm = useForm<ApprovalFormData>({
    resolver: zodResolver(approvalFormSchema),
    defaultValues: {
      comments: "",
      action: "approve",
    },
  });

  // Mutations
  const createPOMutation = useMutation({
    mutationFn: async (data: POFormData) => {
      const res = await apiRequest("POST", "/api/purchase-orders", data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/purchase-orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/purchase-orders/metrics"] });
      setShowNewPODialog(false);
      poForm.reset();
      setSelectedItems([{ itemName: "", description: "", category: "", quantity: 1, unitPrice: 0, totalPrice: 0 }]);
      toast({
        title: "Purchase Order Created",
        description: "Purchase order has been created successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const processApprovalMutation = useMutation({
    mutationFn: async (data: ApprovalFormData & { poId: number }) => {
      const res = await apiRequest("POST", `/api/purchase-orders/${data.poId}/approve`, data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/purchase-orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/purchase-orders/pending-approvals"] });
      setShowApprovalDialog(false);
      approvalForm.reset();
      toast({
        title: "Approval Processed",
        description: "Purchase order approval has been processed.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Handlers
  const onPOSubmit = (data: POFormData) => {
    // Calculate totals
    const subtotal = selectedItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
    const taxAmount = subtotal * 0.075; // 7.5% VAT
    const totalAmount = subtotal + taxAmount;

    createPOMutation.mutate({
      ...data,
      subtotal,
      taxAmount,
      totalAmount,
      items: selectedItems,
    });
  };

  const onApprovalSubmit = (data: ApprovalFormData) => {
    if (selectedPO) {
      processApprovalMutation.mutate({
        ...data,
        poId: selectedPO.id,
      });
    }
  };

  const addItem = () => {
    setSelectedItems([...selectedItems, { itemName: "", description: "", category: "", quantity: 1, unitPrice: 0, totalPrice: 0 }]);
  };

  const removeItem = (index: number) => {
    setSelectedItems(selectedItems.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: string, value: any) => {
    const updatedItems = [...selectedItems];
    updatedItems[index][field] = value;
    
    // Calculate total price for the item
    if (field === 'quantity' || field === 'unitPrice') {
      updatedItems[index].totalPrice = updatedItems[index].quantity * updatedItems[index].unitPrice;
    }
    
    setSelectedItems(updatedItems);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      draft: { label: "Draft", variant: "secondary" as const },
      pending_approval: { label: "Pending Approval", variant: "default" as const },
      approved: { label: "Approved", variant: "default" as const },
      rejected: { label: "Rejected", variant: "destructive" as const },
      ordered: { label: "Ordered", variant: "default" as const },
      received: { label: "Received", variant: "default" as const },
      paid: { label: "Paid", variant: "default" as const },
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || { label: status, variant: "secondary" as const };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Purchase Orders</h1>
          <p className="text-muted-foreground">Manage purchase orders, approvals, and vendor relationships</p>
        </div>
        <Dialog open={showNewPODialog} onOpenChange={setShowNewPODialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Purchase Order
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Purchase Order</DialogTitle>
              <DialogDescription>
                Create a new purchase order for vendor supplies and equipment.
              </DialogDescription>
            </DialogHeader>
            <Form {...poForm}>
              <form onSubmit={poForm.handleSubmit(onPOSubmit)} className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={poForm.control}
                    name="poNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>PO Number</FormLabel>
                        <FormControl>
                          <Input placeholder="PO-2024-001" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={poForm.control}
                    name="priority"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Priority</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select priority" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="low">Low</SelectItem>
                            <SelectItem value="normal">Normal</SelectItem>
                            <SelectItem value="high">High</SelectItem>
                            <SelectItem value="urgent">Urgent</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Vendor Information</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={poForm.control}
                      name="vendorName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Vendor Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Vendor name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={poForm.control}
                      name="vendorEmail"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="vendor@example.com" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={poForm.control}
                      name="vendorPhone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone</FormLabel>
                          <FormControl>
                            <Input placeholder="+234 xxx xxxx xxx" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={poForm.control}
                      name="vendorAddress"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Address</FormLabel>
                          <FormControl>
                            <Input placeholder="Vendor address" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-medium">Items</h3>
                    <Button type="button" variant="outline" onClick={addItem}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Item
                    </Button>
                  </div>
                  <div className="space-y-3">
                    {selectedItems.map((item, index) => (
                      <div key={index} className="grid grid-cols-6 gap-2 p-3 border rounded-lg">
                        <Input
                          placeholder="Item name"
                          value={item.itemName}
                          onChange={(e) => updateItem(index, 'itemName', e.target.value)}
                        />
                        <Input
                          placeholder="Description"
                          value={item.description}
                          onChange={(e) => updateItem(index, 'description', e.target.value)}
                        />
                        <Input
                          placeholder="Category"
                          value={item.category}
                          onChange={(e) => updateItem(index, 'category', e.target.value)}
                        />
                        <Input
                          type="number"
                          placeholder="Qty"
                          value={item.quantity}
                          onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 0)}
                        />
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="Unit Price"
                          value={item.unitPrice}
                          onChange={(e) => updateItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                        />
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">₦{(item.quantity * item.unitPrice).toFixed(2)}</span>
                          {selectedItems.length > 1 && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => removeItem(index)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={poForm.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notes</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Additional notes" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={poForm.control}
                    name="terms"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Terms & Conditions</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Payment terms and conditions" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setShowNewPODialog(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createPOMutation.isPending}>
                    {createPOMutation.isPending ? "Creating..." : "Create Purchase Order"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total POs</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{poMetrics.totalPOs || 0}</div>
            <p className="text-xs text-muted-foreground">
              {poMetrics.totalValueFormatted || "₦0.00"} total value
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Approval</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{poMetrics.pendingApproval || 0}</div>
            <p className="text-xs text-muted-foreground">
              Requires review
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{poMetrics.thisMonth || 0}</div>
            <p className="text-xs text-muted-foreground">
              {poMetrics.monthlyValueFormatted || "₦0.00"} value
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Vendors</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{poMetrics.activeVendors || 0}</div>
            <p className="text-xs text-muted-foreground">
              Registered vendors
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTab value="overview">All Purchase Orders</TabsTab>
          <TabsTab value="approvals">Pending Approvals</TabsTab>
          <TabsTab value="vendors">Vendors</TabsTab>
        </TabsList>

        <TabsContent value="overview">
          <Card>
            <CardHeader>
              <CardTitle>Purchase Orders</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>PO Number</TableHead>
                    <TableHead>Vendor</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoadingPOs ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center">Loading...</TableCell>
                    </TableRow>
                  ) : purchaseOrders.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground">
                        No purchase orders found
                      </TableCell>
                    </TableRow>
                  ) : (
                    purchaseOrders.map((po: any) => (
                      <TableRow key={po.id}>
                        <TableCell className="font-medium">{po.poNumber}</TableCell>
                        <TableCell>{po.vendorName}</TableCell>
                        <TableCell>₦{parseFloat(po.totalAmount).toLocaleString()}</TableCell>
                        <TableCell>{getStatusBadge(po.status)}</TableCell>
                        <TableCell>
                          <Badge variant={po.priority === 'urgent' ? 'destructive' : 'secondary'}>
                            {po.priority}
                          </Badge>
                        </TableCell>
                        <TableCell>{new Date(po.createdAt).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
                            {po.status === 'pending_approval' && (
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => {
                                  setSelectedPO(po);
                                  setShowApprovalDialog(true);
                                }}
                              >
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="approvals">
          <Card>
            <CardHeader>
              <CardTitle>Pending Approvals</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>PO Number</TableHead>
                    <TableHead>Vendor</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Requested By</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoadingApprovals ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center">Loading...</TableCell>
                    </TableRow>
                  ) : pendingApprovals.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground">
                        No pending approvals
                      </TableCell>
                    </TableRow>
                  ) : (
                    pendingApprovals.map((po: any) => (
                      <TableRow key={po.id}>
                        <TableCell className="font-medium">{po.poNumber}</TableCell>
                        <TableCell>{po.vendorName}</TableCell>
                        <TableCell>₦{parseFloat(po.totalAmount).toLocaleString()}</TableCell>
                        <TableCell>
                          <Badge variant={po.priority === 'urgent' ? 'destructive' : 'secondary'}>
                            {po.priority}
                          </Badge>
                        </TableCell>
                        <TableCell>{po.requestedBy?.firstName} {po.requestedBy?.lastName}</TableCell>
                        <TableCell>{new Date(po.createdAt).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              setSelectedPO(po);
                              setShowApprovalDialog(true);
                            }}
                          >
                            Review
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="vendors">
          <Card>
            <CardHeader>
              <CardTitle>Vendor Management</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vendor Code</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Total Orders</TableHead>
                    <TableHead>Total Amount</TableHead>
                    <TableHead>Rating</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vendors.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground">
                        No vendors registered
                      </TableCell>
                    </TableRow>
                  ) : (
                    vendors.map((vendor: any) => (
                      <TableRow key={vendor.id}>
                        <TableCell className="font-medium">{vendor.vendorCode}</TableCell>
                        <TableCell>{vendor.name}</TableCell>
                        <TableCell>{vendor.category}</TableCell>
                        <TableCell>{vendor.totalTransactions}</TableCell>
                        <TableCell>₦{parseFloat(vendor.totalAmount || 0).toLocaleString()}</TableCell>
                        <TableCell>{vendor.rating}/5</TableCell>
                        <TableCell>
                          <Badge variant={vendor.status === 'active' ? 'default' : 'secondary'}>
                            {vendor.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Approval Dialog */}
      <Dialog open={showApprovalDialog} onOpenChange={setShowApprovalDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Purchase Order</DialogTitle>
            <DialogDescription>
              Review and approve or reject purchase order {selectedPO?.poNumber}
            </DialogDescription>
          </DialogHeader>
          {selectedPO && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium">Vendor</p>
                  <p className="text-sm text-muted-foreground">{selectedPO.vendorName}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Total Amount</p>
                  <p className="text-sm text-muted-foreground">₦{parseFloat(selectedPO.totalAmount).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Priority</p>
                  <p className="text-sm text-muted-foreground">{selectedPO.priority}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Created</p>
                  <p className="text-sm text-muted-foreground">{new Date(selectedPO.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
              
              <Form {...approvalForm}>
                <form onSubmit={approvalForm.handleSubmit(onApprovalSubmit)} className="space-y-4">
                  <FormField
                    control={approvalForm.control}
                    name="action"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Action</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="approve">Approve</SelectItem>
                            <SelectItem value="reject">Reject</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={approvalForm.control}
                    name="comments"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Comments</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Add your comments..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setShowApprovalDialog(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={processApprovalMutation.isPending}>
                      {processApprovalMutation.isPending ? "Processing..." : "Submit"}
                    </Button>
                  </div>
                </form>
              </Form>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}