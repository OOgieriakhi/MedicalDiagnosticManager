import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  FileText,
  CheckCircle,
  AlertTriangle,
  Eye,
  Clock,
  Calculator,
  Link2,
  Upload,
  DollarSign,
  Package,
  Receipt
} from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

export default function InvoiceMatching() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [showMatchingModal, setShowMatchingModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [selectedMatching, setSelectedMatching] = useState<any>(null);
  const [invoiceForm, setInvoiceForm] = useState({
    vendorId: '',
    invoiceNumber: '',
    invoiceDate: '',
    dueDate: '',
    totalAmount: '',
    taxAmount: '',
    discountAmount: '',
    attachmentUrl: '',
    notes: '',
    items: []
  });

  // Fetch pending invoices
  const { data: pendingInvoices = [] } = useQuery({
    queryKey: ['/api/vendor-invoices/pending'],
    queryFn: async () => {
      const response = await fetch('/api/vendor-invoices/pending');
      if (!response.ok) throw new Error("Failed to fetch pending invoices");
      return response.json();
    }
  });

  // Fetch goods receipts ready for matching
  const { data: unmatchedReceipts = [] } = useQuery({
    queryKey: ['/api/goods-receipts/unmatched'],
    queryFn: async () => {
      const response = await fetch('/api/goods-receipts/unmatched');
      if (!response.ok) throw new Error("Failed to fetch unmatched receipts");
      return response.json();
    }
  });

  // Fetch three-way matching records
  const { data: matchingRecords = [] } = useQuery({
    queryKey: ['/api/three-way-matching'],
    queryFn: async () => {
      const response = await fetch('/api/three-way-matching');
      if (!response.ok) throw new Error("Failed to fetch matching records");
      return response.json();
    }
  });

  // Fetch vendors for dropdown
  const { data: vendors = [] } = useQuery({
    queryKey: ['/api/vendors'],
    queryFn: async () => {
      const response = await fetch('/api/vendors');
      if (!response.ok) throw new Error("Failed to fetch vendors");
      return response.json();
    }
  });

  // Create vendor invoice mutation
  const createInvoiceMutation = useMutation({
    mutationFn: async (invoiceData: any) => {
      const response = await fetch('/api/vendor-invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(invoiceData)
      });
      if (!response.ok) throw new Error("Failed to create vendor invoice");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/vendor-invoices/pending'] });
      toast({ title: "Vendor invoice created successfully" });
      setShowInvoiceModal(false);
      resetInvoiceForm();
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to create invoice", 
        description: error.message,
        variant: "destructive" 
      });
    }
  });

  // Perform three-way matching mutation
  const performMatchingMutation = useMutation({
    mutationFn: async (matchingData: any) => {
      const response = await fetch('/api/three-way-matching/perform', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(matchingData)
      });
      if (!response.ok) throw new Error("Failed to perform matching");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/three-way-matching'] });
      queryClient.invalidateQueries({ queryKey: ['/api/vendor-invoices/pending'] });
      queryClient.invalidateQueries({ queryKey: ['/api/goods-receipts/unmatched'] });
      toast({ title: "Three-way matching completed successfully" });
      setShowMatchingModal(false);
    },
    onError: (error: any) => {
      toast({ 
        title: "Matching failed", 
        description: error.message,
        variant: "destructive" 
      });
    }
  });

  // Approve matching mutation
  const approveMatchingMutation = useMutation({
    mutationFn: async (matchingId: number) => {
      const response = await fetch(`/api/three-way-matching/${matchingId}/approve`, {
        method: 'POST',
        credentials: 'include'
      });
      if (!response.ok) throw new Error("Failed to approve matching");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/three-way-matching'] });
      toast({ title: "Matching approved - Payment order can now be created" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Approval failed", 
        description: error.message,
        variant: "destructive" 
      });
    }
  });

  const resetInvoiceForm = () => {
    setInvoiceForm({
      vendorId: '',
      invoiceNumber: '',
      invoiceDate: '',
      dueDate: '',
      totalAmount: '',
      taxAmount: '',
      discountAmount: '',
      attachmentUrl: '',
      notes: '',
      items: []
    });
  };

  const handleCreateInvoice = () => {
    createInvoiceMutation.mutate(invoiceForm);
  };

  const handlePerformMatching = (invoice: any, receipt: any) => {
    const matchingData = {
      purchaseOrderId: receipt.purchaseOrderId,
      goodsReceiptId: receipt.id,
      invoiceId: invoice.id
    };
    performMatchingMutation.mutate(matchingData);
  };

  const getMatchingStatusBadge = (status: string, variance: number = 0) => {
    const statusConfig = {
      'pending': { label: 'Pending', variant: 'secondary' as const, icon: Clock },
      'matched': { 
        label: variance === 0 ? 'Perfect Match' : 'Matched with Variance', 
        variant: variance === 0 ? 'default' as const : 'default' as const, 
        icon: variance === 0 ? CheckCircle : AlertTriangle 
      },
      'discrepancy': { label: 'Discrepancy', variant: 'destructive' as const, icon: AlertTriangle },
      'approved': { label: 'Approved', variant: 'default' as const, icon: CheckCircle }
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

  const formatCurrency = (amount: number) => {
    return `₦${amount.toLocaleString()}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Invoice Matching</h1>
          <p className="text-gray-600">Three-way matching: Purchase Orders, Goods Receipts, and Vendor Invoices</p>
        </div>
        <Button onClick={() => setShowInvoiceModal(true)}>
          <Upload className="h-4 w-4 mr-2" />
          Record Invoice
        </Button>
      </div>

      <Tabs defaultValue="pending" className="space-y-4">
        <TabsList>
          <TabsTrigger value="pending">Pending Matching</TabsTrigger>
          <TabsTrigger value="matched">Matched Records</TabsTrigger>
          <TabsTrigger value="invoices">Vendor Invoices</TabsTrigger>
        </TabsList>

        {/* Pending Matching Tab */}
        <TabsContent value="pending" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Unmatched Invoices */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <FileText className="h-5 w-5 text-blue-600" />
                  <span>Pending Invoices</span>
                </CardTitle>
                <CardDescription>Vendor invoices awaiting matching</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {pendingInvoices.length === 0 ? (
                    <p className="text-center text-muted-foreground py-4">No pending invoices</p>
                  ) : (
                    pendingInvoices.map((invoice: any) => (
                      <div key={invoice.id} className="border rounded-lg p-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium">{invoice.invoiceNumber}</p>
                            <p className="text-sm text-gray-600">{invoice.vendorName}</p>
                            <p className="text-sm font-semibold text-green-600">
                              {formatCurrency(parseFloat(invoice.totalAmount))}
                            </p>
                          </div>
                          <Badge variant="secondary">
                            {new Date(invoice.invoiceDate).toLocaleDateString()}
                          </Badge>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Unmatched Receipts */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Package className="h-5 w-5 text-green-600" />
                  <span>Unmatched Receipts</span>
                </CardTitle>
                <CardDescription>Goods receipts awaiting invoice matching</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {unmatchedReceipts.length === 0 ? (
                    <p className="text-center text-muted-foreground py-4">No unmatched receipts</p>
                  ) : (
                    unmatchedReceipts.map((receipt: any) => (
                      <div key={receipt.id} className="border rounded-lg p-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium">{receipt.receiptNumber}</p>
                            <p className="text-sm text-gray-600">PO: {receipt.poNumber}</p>
                            <p className="text-sm text-gray-600">{receipt.vendorName}</p>
                          </div>
                          <Badge variant="secondary">
                            {new Date(receipt.receivedDate).toLocaleDateString()}
                          </Badge>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Matching Actions */}
          {pendingInvoices.length > 0 && unmatchedReceipts.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Link2 className="h-5 w-5 text-purple-600" />
                  <span>Quick Matching</span>
                </CardTitle>
                <CardDescription>
                  Automatically match invoices with goods receipts from the same vendor
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  onClick={() => setShowMatchingModal(true)}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  <Calculator className="h-4 w-4 mr-2" />
                  Start Auto-Matching
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Matched Records Tab */}
        <TabsContent value="matched">
          <Card>
            <CardHeader>
              <CardTitle>Three-Way Matching Records</CardTitle>
              <CardDescription>
                Completed matching between Purchase Orders, Goods Receipts, and Vendor Invoices
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>PO Number</TableHead>
                    <TableHead>Receipt #</TableHead>
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Vendor</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Variance</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {matchingRecords.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        No matching records found
                      </TableCell>
                    </TableRow>
                  ) : (
                    matchingRecords.map((record: any) => (
                      <TableRow key={record.id}>
                        <TableCell className="font-medium">{record.poNumber}</TableCell>
                        <TableCell>{record.receiptNumber}</TableCell>
                        <TableCell>{record.invoiceNumber}</TableCell>
                        <TableCell>{record.vendorName}</TableCell>
                        <TableCell>{formatCurrency(parseFloat(record.totalAmount || 0))}</TableCell>
                        <TableCell>
                          <span className={`font-medium ${
                            parseFloat(record.totalVariance || 0) === 0 
                              ? 'text-green-600' 
                              : 'text-orange-600'
                          }`}>
                            {formatCurrency(parseFloat(record.totalVariance || 0))}
                          </span>
                        </TableCell>
                        <TableCell>
                          {getMatchingStatusBadge(record.matchingStatus, parseFloat(record.totalVariance || 0))}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline">
                              <Eye className="h-4 w-4 mr-1" />
                              View
                            </Button>
                            {record.matchingStatus === 'matched' && (
                              <Button 
                                size="sm"
                                className="bg-green-600 hover:bg-green-700"
                                onClick={() => approveMatchingMutation.mutate(record.id)}
                                disabled={approveMatchingMutation.isPending}
                              >
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Approve
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

        {/* Vendor Invoices Tab */}
        <TabsContent value="invoices">
          <Card>
            <CardHeader>
              <CardTitle>Vendor Invoices</CardTitle>
              <CardDescription>All recorded vendor invoices and their status</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Vendor</TableHead>
                    <TableHead>Invoice Date</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingInvoices.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        No invoices recorded yet
                      </TableCell>
                    </TableRow>
                  ) : (
                    pendingInvoices.map((invoice: any) => (
                      <TableRow key={invoice.id}>
                        <TableCell className="font-medium">{invoice.invoiceNumber}</TableCell>
                        <TableCell>{invoice.vendorName}</TableCell>
                        <TableCell>{new Date(invoice.invoiceDate).toLocaleDateString()}</TableCell>
                        <TableCell>{new Date(invoice.dueDate).toLocaleDateString()}</TableCell>
                        <TableCell>{formatCurrency(parseFloat(invoice.totalAmount))}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{invoice.status}</Badge>
                        </TableCell>
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
        </TabsContent>
      </Tabs>

      {/* Create Invoice Modal */}
      <Dialog open={showInvoiceModal} onOpenChange={setShowInvoiceModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Record Vendor Invoice</DialogTitle>
            <DialogDescription>
              Enter the details from the vendor invoice for processing
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="vendor">Vendor</Label>
                <select
                  id="vendor"
                  value={invoiceForm.vendorId}
                  onChange={(e) => setInvoiceForm({...invoiceForm, vendorId: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="">Select vendor</option>
                  {vendors.map((vendor: any) => (
                    <option key={vendor.id} value={vendor.id}>
                      {vendor.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="invoice-number">Invoice Number</Label>
                <Input
                  id="invoice-number"
                  value={invoiceForm.invoiceNumber}
                  onChange={(e) => setInvoiceForm({...invoiceForm, invoiceNumber: e.target.value})}
                  placeholder="INV-2024-001"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="invoice-date">Invoice Date</Label>
                <Input
                  id="invoice-date"
                  type="date"
                  value={invoiceForm.invoiceDate}
                  onChange={(e) => setInvoiceForm({...invoiceForm, invoiceDate: e.target.value})}
                />
              </div>
              <div>
                <Label htmlFor="due-date">Due Date</Label>
                <Input
                  id="due-date"
                  type="date"
                  value={invoiceForm.dueDate}
                  onChange={(e) => setInvoiceForm({...invoiceForm, dueDate: e.target.value})}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="total-amount">Total Amount</Label>
                <Input
                  id="total-amount"
                  type="number"
                  step="0.01"
                  value={invoiceForm.totalAmount}
                  onChange={(e) => setInvoiceForm({...invoiceForm, totalAmount: e.target.value})}
                  placeholder="0.00"
                />
              </div>
              <div>
                <Label htmlFor="tax-amount">Tax Amount</Label>
                <Input
                  id="tax-amount"
                  type="number"
                  step="0.01"
                  value={invoiceForm.taxAmount}
                  onChange={(e) => setInvoiceForm({...invoiceForm, taxAmount: e.target.value})}
                  placeholder="0.00"
                />
              </div>
              <div>
                <Label htmlFor="discount-amount">Discount Amount</Label>
                <Input
                  id="discount-amount"
                  type="number"
                  step="0.01"
                  value={invoiceForm.discountAmount}
                  onChange={(e) => setInvoiceForm({...invoiceForm, discountAmount: e.target.value})}
                  placeholder="0.00"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={invoiceForm.notes}
                onChange={(e) => setInvoiceForm({...invoiceForm, notes: e.target.value})}
                placeholder="Any additional notes about the invoice..."
                rows={3}
              />
            </div>

            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setShowInvoiceModal(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleCreateInvoice}
                disabled={createInvoiceMutation.isPending}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {createInvoiceMutation.isPending ? 'Creating...' : 'Create Invoice'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}