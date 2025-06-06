import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  FileText,
  CheckCircle,
  AlertTriangle,
  Eye,
  Clock,
  DollarSign,
  Calculator,
  AlertCircle,
  Link,
  Search
} from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

export default function InvoiceMatching() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [selectedMatching, setSelectedMatching] = useState<any>(null);
  const [showMatchingModal, setShowMatchingModal] = useState(false);
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [invoiceDate, setInvoiceDate] = useState("");
  const [invoiceAmount, setInvoiceAmount] = useState("");
  const [invoiceUrl, setInvoiceUrl] = useState("");
  const [matchingNotes, setMatchingNotes] = useState("");
  const [matchedItems, setMatchedItems] = useState<any[]>([]);

  // Fetch unmatched goods receipts ready for invoice matching
  const { data: unmatchedReceipts = [] } = useQuery({
    queryKey: ['/api/goods-receipts/unmatched'],
  });

  // Fetch completed invoice matches
  const { data: invoiceMatches = [] } = useQuery({
    queryKey: ['/api/invoice-matches'],
  });

  // Create invoice match mutation
  const createMatchMutation = useMutation({
    mutationFn: async (matchData: any) => {
      const response = await fetch('/api/invoice-matches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(matchData)
      });
      if (!response.ok) throw new Error('Failed to create invoice match');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/invoice-matches'] });
      queryClient.invalidateQueries({ queryKey: ['/api/goods-receipts/unmatched'] });
      toast({ title: "Invoice match created successfully" });
      setShowMatchingModal(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to create invoice match", 
        description: error.message,
        variant: "destructive" 
      });
    }
  });

  const handleStartMatching = (receipt: any) => {
    setSelectedMatching(receipt);
    // Initialize matched items with receipt items
    const items = receipt.items?.map((item: any) => ({
      ...item,
      invoiceQuantity: item.receivedQuantity,
      invoiceUnitPrice: item.unitPrice,
      invoiceLineTotal: item.receivedQuantity * item.unitPrice,
      variance: 0,
      varianceType: 'none'
    })) || [];
    setMatchedItems(items);
    setShowMatchingModal(true);
  };

  const updateMatchedItem = (index: number, field: string, value: any) => {
    const updated = [...matchedItems];
    updated[index] = { ...updated[index], [field]: value };
    
    // Calculate variance when invoice details change
    if (field === 'invoiceQuantity' || field === 'invoiceUnitPrice') {
      const item = updated[index];
      const invoiceTotal = item.invoiceQuantity * item.invoiceUnitPrice;
      const expectedTotal = item.receivedQuantity * item.unitPrice;
      const variance = invoiceTotal - expectedTotal;
      
      updated[index].invoiceLineTotal = invoiceTotal;
      updated[index].variance = variance;
      updated[index].varianceType = variance === 0 ? 'none' : variance > 0 ? 'over' : 'under';
    }
    
    setMatchedItems(updated);
  };

  const calculateTotalVariance = () => {
    return matchedItems.reduce((total, item) => total + (item.variance || 0), 0);
  };

  const submitMatch = () => {
    if (!selectedMatching || !invoiceNumber || !invoiceAmount) {
      toast({
        title: "Error",
        description: "Please complete all required invoice details",
        variant: "destructive"
      });
      return;
    }

    const matchData = {
      goodsReceiptId: selectedMatching.id,
      purchaseOrderId: selectedMatching.purchaseOrderId,
      invoiceNumber,
      invoiceDate: invoiceDate ? new Date(invoiceDate).toISOString() : new Date().toISOString(),
      invoiceAmount: parseFloat(invoiceAmount),
      invoiceUrl,
      notes: matchingNotes,
      totalVariance: calculateTotalVariance(),
      items: matchedItems,
      status: Math.abs(calculateTotalVariance()) > 100 ? 'pending_approval' : 'matched'
    };

    createMatchMutation.mutate(matchData);
  };

  const resetForm = () => {
    setSelectedMatching(null);
    setInvoiceNumber("");
    setInvoiceDate("");
    setInvoiceAmount("");
    setInvoiceUrl("");
    setMatchingNotes("");
    setMatchedItems([]);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      'pending': { label: 'Pending Match', variant: 'secondary' as const, icon: Clock },
      'matched': { label: 'Matched', variant: 'default' as const, icon: CheckCircle },
      'pending_approval': { label: 'Pending Approval', variant: 'default' as const, icon: AlertTriangle },
      'approved': { label: 'Approved', variant: 'default' as const, icon: CheckCircle },
      'rejected': { label: 'Rejected', variant: 'destructive' as const, icon: AlertCircle }
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
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Invoice Matching</h1>
        <p className="text-muted-foreground">
          Match vendor invoices with purchase orders and goods receipts for 3-way verification
        </p>
      </div>

      {/* Unmatched Receipts - Ready for Invoice Matching */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Pending Invoice Matching
          </CardTitle>
          <CardDescription>
            Goods receipts awaiting invoice matching for payment processing
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
                <TableHead>Expected Amount</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {unmatchedReceipts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No goods receipts pending invoice matching
                  </TableCell>
                </TableRow>
              ) : (
                unmatchedReceipts.map((receipt: any) => (
                  <TableRow key={receipt.id}>
                    <TableCell className="font-medium">{receipt.receiptNumber}</TableCell>
                    <TableCell>{receipt.poNumber}</TableCell>
                    <TableCell>{receipt.vendorName}</TableCell>
                    <TableCell>{new Date(receipt.receivedDate).toLocaleDateString()}</TableCell>
                    <TableCell>₦{parseFloat(receipt.expectedAmount || 0).toLocaleString()}</TableCell>
                    <TableCell>{receipt.itemCount} items</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => {
                            toast({
                              title: "Goods Receipt Details",
                              description: `Receipt: ${receipt.receiptNumber} | PO: ${receipt.poNumber} | Vendor: ${receipt.vendorName} | Amount: ₦${parseFloat(receipt.expectedAmount || 0).toLocaleString()}`
                            });
                          }}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                        <Button 
                          size="sm" 
                          onClick={() => handleStartMatching(receipt)}
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          <Calculator className="h-4 w-4 mr-1" />
                          Match Invoice
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

      {/* Completed Invoice Matches */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5" />
            Invoice Matches
          </CardTitle>
          <CardDescription>
            Completed invoice matching records and their approval status
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Match #</TableHead>
                <TableHead>Invoice #</TableHead>
                <TableHead>PO Number</TableHead>
                <TableHead>Vendor</TableHead>
                <TableHead>Invoice Amount</TableHead>
                <TableHead>Variance</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoiceMatches.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    No invoice matches recorded yet
                  </TableCell>
                </TableRow>
              ) : (
                invoiceMatches.map((match: any) => (
                  <TableRow key={match.id}>
                    <TableCell className="font-medium">{match.matchNumber}</TableCell>
                    <TableCell>{match.invoiceNumber}</TableCell>
                    <TableCell>{match.poNumber}</TableCell>
                    <TableCell>{match.vendorName}</TableCell>
                    <TableCell>₦{parseFloat(match.invoiceAmount || 0).toLocaleString()}</TableCell>
                    <TableCell>
                      <span className={`font-medium ${match.totalVariance === 0 ? 'text-green-600' : 'text-red-600'}`}>
                        ₦{Math.abs(match.totalVariance || 0).toLocaleString()}
                        {match.totalVariance !== 0 && (match.totalVariance > 0 ? ' over' : ' under')}
                      </span>
                    </TableCell>
                    <TableCell>{getStatusBadge(match.status)}</TableCell>
                    <TableCell>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => {
                          toast({
                            title: "Invoice Match Details",
                            description: `Match: ${match.matchNumber} | Invoice: ${match.invoiceNumber} | Amount: ₦${parseFloat(match.invoiceAmount || 0).toLocaleString()} | Status: ${match.status}`
                          });
                        }}
                      >
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

      {/* Invoice Matching Modal */}
      <Dialog open={showMatchingModal} onOpenChange={setShowMatchingModal}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Match Invoice to Goods Receipt</DialogTitle>
            <DialogDescription>
              Create 3-way match: PO {selectedMatching?.poNumber} → Receipt {selectedMatching?.receiptNumber} → Invoice
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* PO and Receipt Summary */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold mb-2">Purchase Order & Receipt Details</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Vendor:</span> {selectedMatching?.vendorName}
                </div>
                <div>
                  <span className="font-medium">PO Amount:</span> ₦{parseFloat(selectedMatching?.poAmount || 0).toLocaleString()}
                </div>
                <div>
                  <span className="font-medium">Received Date:</span> {new Date(selectedMatching?.receivedDate || '').toLocaleDateString()}
                </div>
                <div>
                  <span className="font-medium">Expected Amount:</span> ₦{parseFloat(selectedMatching?.expectedAmount || 0).toLocaleString()}
                </div>
              </div>
            </div>

            {/* Invoice Details */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="invoice-number">Invoice Number *</Label>
                <Input
                  id="invoice-number"
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  placeholder="Enter invoice number"
                />
              </div>
              <div>
                <Label htmlFor="invoice-date">Invoice Date</Label>
                <Input
                  id="invoice-date"
                  type="date"
                  value={invoiceDate}
                  onChange={(e) => setInvoiceDate(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="invoice-amount">Total Invoice Amount *</Label>
                <Input
                  id="invoice-amount"
                  type="number"
                  step="0.01"
                  value={invoiceAmount}
                  onChange={(e) => setInvoiceAmount(e.target.value)}
                  placeholder="0.00"
                />
              </div>
              <div>
                <Label htmlFor="invoice-url">Invoice Document</Label>
                <div className="flex items-center space-x-2">
                  <Input
                    id="invoice-url"
                    value={invoiceUrl}
                    onChange={(e) => setInvoiceUrl(e.target.value)}
                    placeholder="Invoice document URL"
                    className="flex-1"
                  />
                  <Link className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>
            </div>

            {/* Line Item Matching */}
            <div>
              <h3 className="font-semibold mb-4">Line Item Verification</h3>
              <div className="space-y-4">
                {matchedItems.map((item, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="grid grid-cols-1 md:grid-cols-6 gap-4 items-end">
                      <div className="md:col-span-2">
                        <Label className="text-sm font-medium">{item.itemDescription}</Label>
                        <p className="text-xs text-gray-500">
                          Received: {item.receivedQuantity} @ ₦{parseFloat(item.unitPrice || 0).toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <Label htmlFor={`inv-qty-${index}`}>Invoice Qty</Label>
                        <Input
                          id={`inv-qty-${index}`}
                          type="number"
                          value={item.invoiceQuantity}
                          onChange={(e) => updateMatchedItem(index, 'invoiceQuantity', parseFloat(e.target.value) || 0)}
                        />
                      </div>
                      <div>
                        <Label htmlFor={`inv-price-${index}`}>Invoice Price</Label>
                        <Input
                          id={`inv-price-${index}`}
                          type="number"
                          step="0.01"
                          value={item.invoiceUnitPrice}
                          onChange={(e) => updateMatchedItem(index, 'invoiceUnitPrice', parseFloat(e.target.value) || 0)}
                        />
                      </div>
                      <div>
                        <Label>Line Total</Label>
                        <div className="text-sm font-medium py-2">
                          ₦{(item.invoiceLineTotal || 0).toLocaleString()}
                        </div>
                      </div>
                      <div>
                        <Label>Variance</Label>
                        <div className={`text-sm font-medium py-2 ${
                          item.varianceType === 'none' ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {item.variance === 0 ? 'Perfect Match' : 
                           `₦${Math.abs(item.variance || 0).toLocaleString()} ${item.varianceType}`}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Total Variance Summary */}
              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="font-medium">Total Variance:</span>
                  <span className={`font-bold text-lg ${
                    calculateTotalVariance() === 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {calculateTotalVariance() === 0 ? 'Perfect Match!' : 
                     `₦${Math.abs(calculateTotalVariance()).toLocaleString()} ${calculateTotalVariance() > 0 ? 'Over' : 'Under'}`}
                  </span>
                </div>
              </div>
            </div>

            {/* Matching Notes */}
            <div>
              <Label htmlFor="matching-notes">Matching Notes</Label>
              <Textarea
                id="matching-notes"
                value={matchingNotes}
                onChange={(e) => setMatchingNotes(e.target.value)}
                placeholder="Any notes about variances or special circumstances..."
                rows={3}
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setShowMatchingModal(false)}>
                Cancel
              </Button>
              <Button 
                onClick={submitMatch}
                disabled={createMatchMutation.isPending}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {createMatchMutation.isPending ? 'Creating Match...' : 'Create Invoice Match'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}