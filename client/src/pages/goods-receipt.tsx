import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  Package,
  CheckCircle,
  AlertTriangle,
  Eye,
  Clock,
  Truck,
  ClipboardCheck,
  FileText,
  Calendar,
  Link
} from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

export default function GoodsReceipt() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [selectedPO, setSelectedPO] = useState<any>(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [receivedItems, setReceivedItems] = useState<any[]>([]);
  const [receiptNotes, setReceiptNotes] = useState("");
  const [supplierReceiptUrl, setSupplierReceiptUrl] = useState("");

  // Fetch approved purchase orders ready for goods receipt
  const { data: deliveryPendingPOs = [] } = useQuery({
    queryKey: ['/api/purchase-orders/delivery-pending'],
    queryFn: async () => {
      const response = await fetch('/api/purchase-orders/delivery-pending');
      if (!response.ok) throw new Error("Failed to fetch delivery pending POs");
      return response.json();
    }
  });

  // Fetch existing goods receipts
  const { data: goodsReceipts = [] } = useQuery({
    queryKey: ['/api/goods-receipts'],
    queryFn: async () => {
      const response = await fetch('/api/goods-receipts');
      if (!response.ok) throw new Error("Failed to fetch goods receipts");
      return response.json();
    }
  });

  // Create goods receipt mutation
  const createReceiptMutation = useMutation({
    mutationFn: async (receiptData: any) => {
      const response = await fetch('/api/goods-receipts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(receiptData)
      });
      if (!response.ok) throw new Error("Failed to create goods receipt");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/goods-receipts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/purchase-orders/delivery-pending'] });
      toast({ title: "Goods receipt created successfully" });
      setShowReceiptModal(false);
      setSelectedPO(null);
      setReceivedItems([]);
      setReceiptNotes("");
      setSupplierReceiptUrl("");
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to create goods receipt", 
        description: error.message,
        variant: "destructive" 
      });
    }
  });

  const handleStartReceipt = (po: any) => {
    setSelectedPO(po);
    // Initialize received items with PO items
    const items = po.items?.map((item: any) => ({
      ...item,
      receivedQuantity: 0,
      condition: 'good',
      batchNumber: '',
      expiryDate: '',
      notes: ''
    })) || [];
    setReceivedItems(items);
    setShowReceiptModal(true);
  };

  const updateReceivedItem = (index: number, field: string, value: any) => {
    const updated = [...receivedItems];
    updated[index] = { ...updated[index], [field]: value };
    setReceivedItems(updated);
  };

  const submitReceipt = () => {
    if (!selectedPO || receivedItems.length === 0) return;

    const receiptData = {
      purchaseOrderId: selectedPO.id,
      receivedDate: new Date().toISOString(),
      notes: receiptNotes,
      supplierReceiptUrl: supplierReceiptUrl,
      items: receivedItems.map(item => ({
        purchaseOrderItemId: item.id,
        itemDescription: item.description,
        orderedQuantity: item.quantity,
        receivedQuantity: item.receivedQuantity,
        unitPrice: item.unitPrice,
        condition: item.condition,
        batchNumber: item.batchNumber || null,
        expiryDate: item.expiryDate || null,
        notes: item.notes || null
      }))
    };

    createReceiptMutation.mutate(receiptData);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      'pending': { label: 'Pending Receipt', variant: 'secondary' as const, icon: Clock },
      'partial': { label: 'Partial Receipt', variant: 'default' as const, icon: AlertTriangle },
      'received': { label: 'Received', variant: 'default' as const, icon: CheckCircle },
      'confirmed': { label: 'Confirmed', variant: 'default' as const, icon: ClipboardCheck }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Goods Receipt</h1>
          <p className="text-gray-600">Record delivery confirmations and inventory receipts</p>
        </div>
      </div>

      {/* Delivery Pending Purchase Orders */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Truck className="h-5 w-5 text-blue-600" />
            <span>Pending Deliveries</span>
          </CardTitle>
          <CardDescription>
            Purchase orders approved and sent to vendors, awaiting delivery
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>PO Number</TableHead>
                <TableHead>Vendor</TableHead>
                <TableHead>Order Date</TableHead>
                <TableHead>Expected Delivery</TableHead>
                <TableHead>Total Amount</TableHead>
                <TableHead>Items Count</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {deliveryPendingPOs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No pending deliveries
                  </TableCell>
                </TableRow>
              ) : (
                deliveryPendingPOs.map((po: any) => (
                  <TableRow key={po.id}>
                    <TableCell className="font-medium">{po.poNumber}</TableCell>
                    <TableCell>{po.vendorName}</TableCell>
                    <TableCell>{new Date(po.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell>
                      {po.expectedDeliveryDate ? 
                        new Date(po.expectedDeliveryDate).toLocaleDateString() : 
                        'Not specified'
                      }
                    </TableCell>
                    <TableCell>₦{parseFloat(po.totalAmount || 0).toLocaleString()}</TableCell>
                    <TableCell>{po.items?.length || 0} items</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => {/* View PO details */}}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                        <Button 
                          size="sm"
                          className="bg-green-600 hover:bg-green-700"
                          onClick={() => handleStartReceipt(po)}
                        >
                          <Package className="h-4 w-4 mr-1" />
                          Receive
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Goods Receipts History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <ClipboardCheck className="h-5 w-5 text-green-600" />
            <span>Goods Receipts</span>
          </CardTitle>
          <CardDescription>
            History of received deliveries and their confirmation status
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Receipt #</TableHead>
                <TableHead>PO Number</TableHead>
                <TableHead>Vendor</TableHead>
                <TableHead>Received Date</TableHead>
                <TableHead>Received By</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {goodsReceipts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No goods receipts recorded yet
                  </TableCell>
                </TableRow>
              ) : (
                goodsReceipts.map((receipt: any) => (
                  <TableRow key={receipt.id}>
                    <TableCell className="font-medium">{receipt.receiptNumber}</TableCell>
                    <TableCell>{receipt.poNumber}</TableCell>
                    <TableCell>{receipt.vendorName}</TableCell>
                    <TableCell>{new Date(receipt.receivedDate).toLocaleDateString()}</TableCell>
                    <TableCell>{receipt.receivedByName}</TableCell>
                    <TableCell>{getStatusBadge(receipt.status)}</TableCell>
                    <TableCell>
                      <Button size="sm" variant="outline">
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Goods Receipt Modal */}
      <Dialog open={showReceiptModal} onOpenChange={setShowReceiptModal}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Record Goods Receipt</DialogTitle>
            <DialogDescription>
              Record the items received for PO: {selectedPO?.poNumber}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* PO Details */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold mb-2">Purchase Order Details</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Vendor:</span> {selectedPO?.vendorName}
                </div>
                <div>
                  <span className="font-medium">Order Date:</span> {new Date(selectedPO?.createdAt || '').toLocaleDateString()}
                </div>
                <div>
                  <span className="font-medium">Total Amount:</span> ₦{parseFloat(selectedPO?.totalAmount || 0).toLocaleString()}
                </div>
                <div>
                  <span className="font-medium">Items:</span> {receivedItems.length} items
                </div>
              </div>
            </div>

            {/* Items Receipt */}
            <div>
              <h3 className="font-semibold mb-4">Items Received</h3>
              <div className="space-y-4">
                {receivedItems.map((item, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div className="md:col-span-2 lg:col-span-1">
                        <Label className="text-sm font-medium">{item.description}</Label>
                        <p className="text-xs text-gray-500">
                          Ordered: {item.quantity} {item.unit} @ ₦{parseFloat(item.unitPrice || 0).toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <Label htmlFor={`qty-${index}`}>Received Quantity</Label>
                        <Input
                          id={`qty-${index}`}
                          type="number"
                          value={item.receivedQuantity}
                          onChange={(e) => updateReceivedItem(index, 'receivedQuantity', parseFloat(e.target.value) || 0)}
                          placeholder="Enter received quantity"
                        />
                      </div>
                      <div>
                        <Label htmlFor={`condition-${index}`}>Condition</Label>
                        <select
                          id={`condition-${index}`}
                          value={item.condition}
                          onChange={(e) => updateReceivedItem(index, 'condition', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        >
                          <option value="good">Good</option>
                          <option value="damaged">Damaged</option>
                          <option value="partial">Partial</option>
                        </select>
                      </div>
                      <div>
                        <Label htmlFor={`batch-${index}`}>Batch Number</Label>
                        <Input
                          id={`batch-${index}`}
                          value={item.batchNumber}
                          onChange={(e) => updateReceivedItem(index, 'batchNumber', e.target.value)}
                          placeholder="Optional"
                        />
                      </div>
                      <div>
                        <Label htmlFor={`expiry-${index}`}>Expiry Date</Label>
                        <Input
                          id={`expiry-${index}`}
                          type="date"
                          value={item.expiryDate}
                          onChange={(e) => updateReceivedItem(index, 'expiryDate', e.target.value)}
                        />
                      </div>
                      <div>
                        <Label htmlFor={`notes-${index}`}>Item Notes</Label>
                        <Input
                          id={`notes-${index}`}
                          value={item.notes}
                          onChange={(e) => updateReceivedItem(index, 'notes', e.target.value)}
                          placeholder="Any special notes"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Supplier Receipt Attachment */}
            <div>
              <Label htmlFor="supplier-receipt">Supplier Receipt/Delivery Note</Label>
              <div className="flex items-center space-x-2">
                <Input
                  id="supplier-receipt"
                  value={supplierReceiptUrl}
                  onChange={(e) => setSupplierReceiptUrl(e.target.value)}
                  placeholder="https://drive.google.com/... or document storage URL"
                  className="flex-1"
                />
                <Link className="h-4 w-4 text-muted-foreground" />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Link to supplier receipt or delivery note (hosted externally to avoid large uploads)
              </p>
            </div>

            {/* Receipt Notes */}
            <div>
              <Label htmlFor="receipt-notes">Overall Receipt Notes</Label>
              <Textarea
                id="receipt-notes"
                value={receiptNotes}
                onChange={(e) => setReceiptNotes(e.target.value)}
                placeholder="Any general notes about the delivery..."
                rows={3}
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setShowReceiptModal(false)}>
                Cancel
              </Button>
              <Button 
                onClick={submitReceipt}
                disabled={createReceiptMutation.isPending}
                className="bg-green-600 hover:bg-green-700"
              >
                {createReceiptMutation.isPending ? 'Creating...' : 'Create Receipt'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}