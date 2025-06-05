import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Plus, Trash2, Calculator } from "lucide-react";

const purchaseOrderSchema = z.object({
  vendorId: z.string().min(1, "Vendor is required"),
  department: z.string().min(1, "Department is required"),
  category: z.string().min(1, "Category is required"),
  priority: z.enum(["low", "medium", "high", "urgent"]),
  requiredDate: z.string().min(1, "Required date is required"),
  description: z.string().min(1, "Description is required"),
  justification: z.string().min(1, "Justification is required"),
  deliveryAddress: z.string().min(1, "Delivery address is required"),
});

interface LineItem {
  id: string;
  itemCode: string;
  itemName: string;
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  category: string;
}

interface NewPurchaseOrderFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NewPurchaseOrderForm({ open, onOpenChange }: NewPurchaseOrderFormProps) {
  const { toast } = useToast();
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [newItem, setNewItem] = useState({
    itemCode: "",
    itemName: "",
    description: "",
    quantity: 1,
    unitPrice: 0,
    category: ""
  });

  const form = useForm<z.infer<typeof purchaseOrderSchema>>({
    resolver: zodResolver(purchaseOrderSchema),
    defaultValues: {
      vendorId: "",
      department: "",
      category: "",
      priority: "medium",
      requiredDate: "",
      description: "",
      justification: "",
      deliveryAddress: "",
    },
  });

  const vendors = [
    { id: "1", name: "MedSupply Co.", category: "Medical Supplies" },
    { id: "2", name: "TechEquip Ltd.", category: "Equipment" },
    { id: "3", name: "Office Solutions", category: "Office Supplies" },
    { id: "4", name: "Laboratory Systems Inc.", category: "Laboratory Equipment" },
    { id: "5", name: "Pharmaceutical Distributors", category: "Pharmaceuticals" }
  ];

  const departments = [
    "Laboratory", "Radiology", "Administration", "IT", "Pharmacy", 
    "Finance", "Human Resources", "Maintenance", "Security"
  ];

  const categories = [
    "Medical Supplies", "Laboratory Equipment", "Office Supplies", 
    "IT Equipment", "Pharmaceuticals", "Maintenance Supplies", 
    "Furniture", "Software", "Professional Services"
  ];

  const addLineItem = () => {
    if (!newItem.itemName || !newItem.quantity || !newItem.unitPrice) {
      toast({ title: "Please fill all line item fields", variant: "destructive" });
      return;
    }

    const lineItem: LineItem = {
      id: Date.now().toString(),
      itemCode: newItem.itemCode || `AUTO-${Date.now()}`,
      itemName: newItem.itemName,
      description: newItem.description,
      quantity: newItem.quantity,
      unitPrice: newItem.unitPrice,
      totalPrice: newItem.quantity * newItem.unitPrice,
      category: newItem.category || "General"
    };

    setLineItems([...lineItems, lineItem]);
    setNewItem({
      itemCode: "",
      itemName: "",
      description: "",
      quantity: 1,
      unitPrice: 0,
      category: ""
    });
  };

  const removeLineItem = (id: string) => {
    setLineItems(lineItems.filter(item => item.id !== id));
  };

  const getTotalAmount = () => {
    return lineItems.reduce((sum, item) => sum + item.totalPrice, 0);
  };

  const getRequiredApprovalLevel = (amount: number) => {
    if (amount <= 5000) return { level: 1, title: "Department Head" };
    if (amount <= 15000) return { level: 2, title: "Unit Manager" };
    if (amount <= 50000) return { level: 3, title: "Finance Manager" };
    return { level: 4, title: "CEO Approval" };
  };

  const createPurchaseOrder = useMutation({
    mutationFn: async (data: z.infer<typeof purchaseOrderSchema>) => {
      const totalAmount = getTotalAmount();
      const approvalLevel = getRequiredApprovalLevel(totalAmount);
      
      const response = await fetch('/api/purchase-orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...data,
          lineItems,
          totalAmount,
          approvalLevel: approvalLevel.level,
          status: 'draft'
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to create purchase order');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Purchase order created successfully" });
      queryClient.invalidateQueries({ queryKey: ['/api/purchase-orders'] });
      onOpenChange(false);
      form.reset();
      setLineItems([]);
    },
    onError: () => {
      toast({ title: "Failed to create purchase order", variant: "destructive" });
    }
  });

  const submitPurchaseOrder = useMutation({
    mutationFn: async (data: z.infer<typeof purchaseOrderSchema>) => {
      const totalAmount = getTotalAmount();
      const approvalLevel = getRequiredApprovalLevel(totalAmount);
      
      const response = await fetch('/api/purchase-orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...data,
          lineItems,
          totalAmount,
          approvalLevel: approvalLevel.level,
          status: 'pending-approval'
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to submit purchase order');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Purchase order submitted for approval" });
      queryClient.invalidateQueries({ queryKey: ['/api/purchase-orders'] });
      onOpenChange(false);
      form.reset();
      setLineItems([]);
    },
    onError: () => {
      toast({ title: "Failed to submit purchase order", variant: "destructive" });
    }
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const totalAmount = getTotalAmount();
  const approvalInfo = getRequiredApprovalLevel(totalAmount);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Purchase Order</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <div className="space-y-6">
            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="vendorId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vendor *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select vendor" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {vendors.map((vendor) => (
                          <SelectItem key={vendor.id} value={vendor.id}>
                            {vendor.name} - {vendor.category}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="department"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Department *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select department" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {departments.map((dept) => (
                          <SelectItem key={dept} value={dept}>
                            {dept}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {categories.map((cat) => (
                          <SelectItem key={cat} value={cat}>
                            {cat}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Priority *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="urgent">Urgent</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="requiredDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Required Date *</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 gap-4">
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description *</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Brief description of the purchase order"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="justification"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Business Justification *</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Explain why this purchase is necessary"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="deliveryAddress"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Delivery Address *</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Complete delivery address"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Line Items Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Line Items</h3>
              
              {/* Add New Item Form */}
              <div className="border rounded-lg p-4 bg-gray-50">
                <h4 className="font-medium mb-3">Add Item</h4>
                <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
                  <Input
                    placeholder="Item Code"
                    value={newItem.itemCode}
                    onChange={(e) => setNewItem({ ...newItem, itemCode: e.target.value })}
                  />
                  <Input
                    placeholder="Item Name *"
                    value={newItem.itemName}
                    onChange={(e) => setNewItem({ ...newItem, itemName: e.target.value })}
                  />
                  <Input
                    placeholder="Description"
                    value={newItem.description}
                    onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                  />
                  <Input
                    type="number"
                    placeholder="Quantity *"
                    min="1"
                    value={newItem.quantity}
                    onChange={(e) => setNewItem({ ...newItem, quantity: parseInt(e.target.value) || 1 })}
                  />
                  <Input
                    type="number"
                    placeholder="Unit Price *"
                    min="0"
                    step="0.01"
                    value={newItem.unitPrice}
                    onChange={(e) => setNewItem({ ...newItem, unitPrice: parseFloat(e.target.value) || 0 })}
                  />
                  <Button onClick={addLineItem}>
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Line Items Table */}
              {lineItems.length > 0 && (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item Code</TableHead>
                      <TableHead>Item Name</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Qty</TableHead>
                      <TableHead>Unit Price</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lineItems.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>{item.itemCode}</TableCell>
                        <TableCell>{item.itemName}</TableCell>
                        <TableCell>{item.description}</TableCell>
                        <TableCell>{item.quantity}</TableCell>
                        <TableCell>{formatCurrency(item.unitPrice)}</TableCell>
                        <TableCell className="font-medium">{formatCurrency(item.totalPrice)}</TableCell>
                        <TableCell>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => removeLineItem(item.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}

              {/* Total and Approval Info */}
              {lineItems.length > 0 && (
                <div className="border rounded-lg p-4 bg-blue-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Calculator className="w-5 h-5" />
                      <span className="font-semibold">Total Amount: {formatCurrency(totalAmount)}</span>
                    </div>
                    <Badge variant="outline">
                      Requires Level {approvalInfo.level} Approval ({approvalInfo.title})
                    </Badge>
                  </div>
                </div>
              )}
            </div>

            {/* Form Actions */}
            <div className="flex gap-3 justify-end">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button 
                type="button"
                variant="outline"
                onClick={form.handleSubmit((data) => createPurchaseOrder.mutate(data))}
                disabled={createPurchaseOrder.isPending || lineItems.length === 0}
              >
                Save as Draft
              </Button>
              <Button 
                type="submit"
                onClick={form.handleSubmit((data) => submitPurchaseOrder.mutate(data))}
                disabled={submitPurchaseOrder.isPending || lineItems.length === 0}
              >
                Submit for Approval
              </Button>
            </div>
          </div>
        </Form>
      </DialogContent>
    </Dialog>
  );
}