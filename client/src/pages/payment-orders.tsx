import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  CreditCard,
  CheckCircle,
  AlertTriangle,
  Eye,
  Clock,
  DollarSign,
  Plus,
  Building2,
  Calendar,
  FileText,
  Banknote
} from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

export default function PaymentOrders() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [selectedMatch, setSelectedMatch] = useState<any>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("");
  const [bankAccount, setBankAccount] = useState("");
  const [paymentDate, setPaymentDate] = useState("");
  const [paymentReference, setPaymentReference] = useState("");
  const [paymentNotes, setPaymentNotes] = useState("");

  // Fetch approved invoice matches ready for payment
  const { data: readyForPayment = [] } = useQuery({
    queryKey: ['/api/invoice-matches/approved'],
  });

  // Fetch payment orders
  const { data: paymentOrders = [] } = useQuery({
    queryKey: ['/api/payment-orders'],
  });

  // Create payment order mutation
  const createPaymentMutation = useMutation({
    mutationFn: async (paymentData: any) => {
      const response = await fetch('/api/payment-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(paymentData)
      });
      if (!response.ok) throw new Error('Failed to create payment order');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/payment-orders'] });
      queryClient.invalidateQueries({ queryKey: ['/api/invoice-matches/approved'] });
      toast({ title: "Payment order created successfully" });
      setShowPaymentModal(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to create payment order", 
        description: error.message,
        variant: "destructive" 
      });
    }
  });

  // Approve payment mutation
  const approvePaymentMutation = useMutation({
    mutationFn: async ({ paymentId, action }: { paymentId: number, action: 'approve' | 'reject' }) => {
      const response = await fetch(`/api/payment-orders/${paymentId}/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      if (!response.ok) throw new Error(`Failed to ${action} payment order`);
      return response.json();
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/payment-orders'] });
      toast({ 
        title: `Payment order ${variables.action === 'approve' ? 'approved' : 'rejected'} successfully` 
      });
    },
    onError: (error: any) => {
      toast({ 
        title: "Action failed", 
        description: error.message,
        variant: "destructive" 
      });
    }
  });

  const handleCreatePayment = (match: any) => {
    setSelectedMatch(match);
    setPaymentReference(`PAY-${Date.now()}`);
    setPaymentDate(new Date().toISOString().split('T')[0]);
    setShowPaymentModal(true);
  };

  const submitPaymentOrder = () => {
    if (!selectedMatch || !paymentMethod || !bankAccount) {
      toast({
        title: "Error",
        description: "Please complete all required payment details",
        variant: "destructive"
      });
      return;
    }

    const paymentData = {
      invoiceMatchId: selectedMatch.id,
      purchaseOrderId: selectedMatch.purchaseOrderId,
      vendorId: selectedMatch.vendorId || 1,
      amount: selectedMatch.invoiceAmount,
      paymentMethod,
      bankAccount,
      paymentDate: new Date(paymentDate).toISOString(),
      reference: paymentReference,
      notes: paymentNotes,
      status: 'pending_approval'
    };

    createPaymentMutation.mutate(paymentData);
  };

  const resetForm = () => {
    setSelectedMatch(null);
    setPaymentMethod("");
    setBankAccount("");
    setPaymentDate("");
    setPaymentReference("");
    setPaymentNotes("");
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      'pending_approval': { label: 'Pending Approval', variant: 'secondary' as const, icon: Clock },
      'approved': { label: 'Approved', variant: 'default' as const, icon: CheckCircle },
      'paid': { label: 'Paid', variant: 'default' as const, icon: CheckCircle },
      'rejected': { label: 'Rejected', variant: 'destructive' as const, icon: AlertTriangle }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending_approval;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const getPriorityColor = (amount: number) => {
    if (amount >= 1000000) return 'text-red-600 font-bold';
    if (amount >= 500000) return 'text-orange-600 font-semibold';
    return 'text-green-600';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Payment Orders</h1>
        <p className="text-muted-foreground">
          Generate and manage vendor payment orders from approved invoice matches
        </p>
      </div>

      {/* Ready for Payment - Approved Invoice Matches */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Ready for Payment
          </CardTitle>
          <CardDescription>
            Approved invoice matches ready for payment order generation
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Match #</TableHead>
                <TableHead>Vendor</TableHead>
                <TableHead>Invoice #</TableHead>
                <TableHead>PO Number</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Matched Date</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {readyForPayment.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    No approved invoice matches ready for payment
                  </TableCell>
                </TableRow>
              ) : (
                readyForPayment.map((match: any) => (
                  <TableRow key={match.id}>
                    <TableCell className="font-medium">{match.matchNumber}</TableCell>
                    <TableCell>{match.vendorName}</TableCell>
                    <TableCell>{match.invoiceNumber}</TableCell>
                    <TableCell>{match.poNumber}</TableCell>
                    <TableCell className={getPriorityColor(match.invoiceAmount)}>
                      ₦{parseFloat(match.invoiceAmount || 0).toLocaleString()}
                    </TableCell>
                    <TableCell>{new Date(match.matchedAt).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Badge variant={match.invoiceAmount >= 1000000 ? 'destructive' : 
                                    match.invoiceAmount >= 500000 ? 'default' : 'secondary'}>
                        {match.invoiceAmount >= 1000000 ? 'High' : 
                         match.invoiceAmount >= 500000 ? 'Medium' : 'Normal'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline">
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                        <Button 
                          size="sm" 
                          onClick={() => handleCreatePayment(match)}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Create Payment
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

      {/* Payment Orders */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Banknote className="h-5 w-5" />
            Payment Orders
          </CardTitle>
          <CardDescription>
            All payment orders and their approval status
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Payment #</TableHead>
                <TableHead>Vendor</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Payment Method</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created By</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paymentOrders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    No payment orders created yet
                  </TableCell>
                </TableRow>
              ) : (
                paymentOrders.map((payment: any) => (
                  <TableRow key={payment.id}>
                    <TableCell className="font-medium">{payment.paymentNumber}</TableCell>
                    <TableCell>{payment.vendorName}</TableCell>
                    <TableCell className={getPriorityColor(payment.amount)}>
                      ₦{parseFloat(payment.amount || 0).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4" />
                        {payment.paymentMethod}
                      </div>
                    </TableCell>
                    <TableCell>{new Date(payment.paymentDate).toLocaleDateString()}</TableCell>
                    <TableCell>{getStatusBadge(payment.status)}</TableCell>
                    <TableCell>{payment.createdByName}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline">
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                        {payment.status === 'pending_approval' && (
                          <>
                            <Button 
                              size="sm" 
                              variant="outline"
                              className="text-green-600 border-green-600 hover:bg-green-50"
                              onClick={() => approvePaymentMutation.mutate({ paymentId: payment.id, action: 'approve' })}
                              disabled={approvePaymentMutation.isPending}
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Approve
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline"
                              className="text-red-600 border-red-600 hover:bg-red-50"
                              onClick={() => approvePaymentMutation.mutate({ paymentId: payment.id, action: 'reject' })}
                              disabled={approvePaymentMutation.isPending}
                            >
                              <AlertTriangle className="h-4 w-4 mr-1" />
                              Reject
                            </Button>
                          </>
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

      {/* Payment Order Creation Modal */}
      <Dialog open={showPaymentModal} onOpenChange={setShowPaymentModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Payment Order</DialogTitle>
            <DialogDescription>
              Generate payment order for approved invoice match: {selectedMatch?.matchNumber}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Invoice Match Summary */}
            {selectedMatch && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold mb-2">Invoice Match Details</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Vendor:</span> {selectedMatch.vendorName}
                  </div>
                  <div>
                    <span className="font-medium">Invoice:</span> {selectedMatch.invoiceNumber}
                  </div>
                  <div>
                    <span className="font-medium">PO Number:</span> {selectedMatch.poNumber}
                  </div>
                  <div>
                    <span className="font-medium">Amount:</span> ₦{parseFloat(selectedMatch.invoiceAmount || 0).toLocaleString()}
                  </div>
                </div>
              </div>
            )}

            {/* Payment Details */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="payment-method">Payment Method *</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select payment method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                    <SelectItem value="check">Check</SelectItem>
                    <SelectItem value="wire_transfer">Wire Transfer</SelectItem>
                    <SelectItem value="eft">Electronic Funds Transfer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="bank-account">Bank Account *</Label>
                <Select value={bankAccount} onValueChange={setBankAccount}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select bank account" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="main_operating">Main Operating Account</SelectItem>
                    <SelectItem value="vendor_payments">Vendor Payments Account</SelectItem>
                    <SelectItem value="petty_cash">Petty Cash Account</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="payment-date">Payment Date</Label>
                <Input
                  id="payment-date"
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="payment-reference">Payment Reference</Label>
                <Input
                  id="payment-reference"
                  value={paymentReference}
                  onChange={(e) => setPaymentReference(e.target.value)}
                  placeholder="Payment reference number"
                />
              </div>
            </div>

            {/* Payment Notes */}
            <div>
              <Label htmlFor="payment-notes">Payment Notes</Label>
              <Textarea
                id="payment-notes"
                value={paymentNotes}
                onChange={(e) => setPaymentNotes(e.target.value)}
                placeholder="Any special instructions or notes for this payment..."
                rows={3}
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setShowPaymentModal(false)}>
                Cancel
              </Button>
              <Button 
                onClick={submitPaymentOrder}
                disabled={createPaymentMutation.isPending}
                className="bg-green-600 hover:bg-green-700"
              >
                {createPaymentMutation.isPending ? 'Creating...' : 'Create Payment Order'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}