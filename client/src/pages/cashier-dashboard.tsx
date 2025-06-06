import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  CheckCircle, 
  XCircle, 
  FileText,
  Eye,
  Building,
  Activity,
  DollarSign,
  Calendar,
  Banknote,
  CreditCard,
  Receipt,
  Wallet,
  Clock,
  AlertTriangle
} from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Link } from "wouter";

interface PaymentRecord {
  id: number;
  type: string;
  description: string;
  amount: string;
  vendor: string;
  invoiceNumber: string;
  paymentMethod: string;
  bankAccount: string;
  dueDate: string;
  glAccount: string;
  costCenter: string;
  checkNumber?: string;
  referenceNumber?: string;
  status: "ready_for_payment" | "payment_processing" | "paid" | "payment_failed";
  postedBy: string;
  postedAt: string;
}

interface CashierMetrics {
  readyForPayment: number;
  paymentsToday: number;
  totalPaymentValue: string;
  overduePayments: number;
  averagePaymentTime: string;
  cashBalance: string;
}

export default function CashierDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedPayment, setSelectedPayment] = useState<PaymentRecord | null>(null);
  const [checkNumber, setCheckNumber] = useState("");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [paymentNotes, setPaymentNotes] = useState("");

  // Fetch payments ready for processing
  const { data: paymentRecords, isLoading } = useQuery<PaymentRecord[]>({
    queryKey: ["/api/cashier/payment-queue"],
    queryFn: async () => {
      const response = await fetch("/api/cashier/payment-queue");
      if (!response.ok) throw new Error("Failed to fetch payment queue");
      return response.json();
    },
  });

  // Fetch cashier metrics
  const { data: cashierMetrics } = useQuery<CashierMetrics>({
    queryKey: ["/api/cashier/metrics"],
    queryFn: async () => {
      const response = await fetch("/api/cashier/metrics");
      if (!response.ok) throw new Error("Failed to fetch cashier metrics");
      return response.json();
    },
  });

  // Process payment mutation
  const processPaymentMutation = useMutation({
    mutationFn: async ({ id, checkNumber, referenceNumber, paymentNotes }: { 
      id: number; 
      checkNumber: string; 
      referenceNumber: string; 
      paymentNotes: string; 
    }) => {
      const response = await fetch(`/api/cashier/process-payment/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ checkNumber, referenceNumber, paymentNotes }),
      });
      if (!response.ok) throw new Error("Failed to process payment");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cashier/payment-queue"] });
      queryClient.invalidateQueries({ queryKey: ["/api/cashier/metrics"] });
      toast({ title: "Payment processed successfully" });
      setSelectedPayment(null);
      setCheckNumber("");
      setReferenceNumber("");
      setPaymentNotes("");
    },
    onError: (error: any) => {
      toast({ 
        title: "Payment processing failed", 
        description: error.message,
        variant: "destructive" 
      });
    }
  });

  // Hold payment mutation
  const holdPaymentMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: number; reason: string }) => {
      const response = await fetch(`/api/cashier/hold-payment/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      if (!response.ok) throw new Error("Failed to hold payment");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cashier/payment-queue"] });
      queryClient.invalidateQueries({ queryKey: ["/api/cashier/metrics"] });
      toast({ title: "Payment placed on hold" });
      setSelectedPayment(null);
    },
    onError: (error: any) => {
      toast({ 
        title: "Hold failed", 
        description: error.message,
        variant: "destructive" 
      });
    }
  });

  const formatCurrency = (amount: string | number) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN'
    }).format(num);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ready_for_payment':
        return <Badge className="bg-green-100 text-green-800"><Wallet className="w-3 h-3 mr-1" />Ready for Payment</Badge>;
      case 'payment_processing':
        return <Badge className="bg-blue-100 text-blue-800"><Activity className="w-3 h-3 mr-1" />Processing</Badge>;
      case 'paid':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Paid</Badge>;
      case 'payment_failed':
        return <Badge className="bg-red-100 text-red-800"><XCircle className="w-3 h-3 mr-1" />Failed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getPaymentMethodIcon = (method: string) => {
    switch (method.toLowerCase()) {
      case 'bank_transfer':
      case 'electronic':
        return <CreditCard className="w-4 h-4" />;
      case 'check':
        return <Receipt className="w-4 h-4" />;
      case 'cash':
        return <Banknote className="w-4 h-4" />;
      default:
        return <DollarSign className="w-4 h-4" />;
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-6">
        <div className="text-center">Loading payment queue...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href="/dashboard">
            <Button variant="outline" size="sm">
              <Building className="w-4 h-4 mr-2" />
              Dashboard
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Cashier Dashboard</h1>
            <p className="text-gray-600">Payment processing and disbursement</p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <Button variant="outline" size="sm" onClick={() => {
            queryClient.invalidateQueries({ queryKey: ["/api/cashier/payment-queue"] });
            queryClient.invalidateQueries({ queryKey: ["/api/cashier/metrics"] });
            toast({ title: "Dashboard refreshed successfully" });
          }}>
            <Activity className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      {cashierMetrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Ready for Payment</p>
                  <p className="text-2xl font-bold text-green-600">{cashierMetrics.readyForPayment}</p>
                  <p className="text-xs text-green-600">Awaiting processing</p>
                </div>
                <div className="p-3 bg-green-100 rounded-lg">
                  <Wallet className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Payments Today</p>
                  <p className="text-2xl font-bold text-blue-600">{cashierMetrics.paymentsToday}</p>
                  <p className="text-xs text-blue-600">Processed today</p>
                </div>
                <div className="p-3 bg-blue-100 rounded-lg">
                  <CheckCircle className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Payment Value</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {formatCurrency(cashierMetrics.totalPaymentValue)}
                  </p>
                  <p className="text-xs text-purple-600">Total pending</p>
                </div>
                <div className="p-3 bg-purple-100 rounded-lg">
                  <DollarSign className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Overdue Payments</p>
                  <p className="text-2xl font-bold text-red-600">{cashierMetrics.overduePayments}</p>
                  <p className="text-xs text-red-600">Past due date</p>
                </div>
                <div className="p-3 bg-red-100 rounded-lg">
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Payment Processing Queue */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Wallet className="w-5 h-5 mr-2" />
            Payment Processing Queue
          </CardTitle>
          <CardDescription>
            Posted accounts payable ready for payment disbursement
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Vendor</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Payment Method</TableHead>
                <TableHead>Account</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>GL Account</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!paymentRecords || paymentRecords.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                    No payments ready for processing
                  </TableCell>
                </TableRow>
              ) : (
                paymentRecords.map((payment) => (
                  <TableRow key={payment.id} className={payment.dueDate < new Date().toISOString() ? "bg-red-50" : ""}>
                    <TableCell className="font-medium">{payment.type}</TableCell>
                    <TableCell>{payment.vendor}</TableCell>
                    <TableCell className="font-bold">{formatCurrency(payment.amount)}</TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        {getPaymentMethodIcon(payment.paymentMethod)}
                        <span className="capitalize">{payment.paymentMethod.replace('_', ' ')}</span>
                      </div>
                    </TableCell>
                    <TableCell>{payment.bankAccount}</TableCell>
                    <TableCell className={payment.dueDate < new Date().toISOString() ? "text-red-600 font-medium" : ""}>
                      {new Date(payment.dueDate).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="font-mono text-sm">{payment.glAccount}</TableCell>
                    <TableCell>{getStatusBadge(payment.status)}</TableCell>
                    <TableCell>
                      {payment.status === 'ready_for_payment' && (
                        <div className="flex space-x-2">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button 
                                size="sm" 
                                onClick={() => setSelectedPayment(payment)}
                              >
                                <Wallet className="w-4 h-4 mr-1" />
                                Process Payment
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Process Payment</DialogTitle>
                                <DialogDescription>
                                  Complete payment disbursement and record transaction details
                                </DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div className="bg-gray-50 p-3 rounded-lg">
                                  <h4 className="font-medium mb-2">Payment Details:</h4>
                                  <div className="text-sm space-y-1">
                                    <div className="flex justify-between">
                                      <span>Amount:</span>
                                      <span className="font-mono font-bold">{formatCurrency(selectedPayment?.amount || 0)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span>Method:</span>
                                      <span className="capitalize">{selectedPayment?.paymentMethod.replace('_', ' ')}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span>Account:</span>
                                      <span>{selectedPayment?.bankAccount}</span>
                                    </div>
                                  </div>
                                </div>
                                
                                {selectedPayment?.paymentMethod === 'check' && (
                                  <div>
                                    <Label htmlFor="checkNumber">Check Number</Label>
                                    <Input 
                                      id="checkNumber"
                                      value={checkNumber}
                                      onChange={(e) => setCheckNumber(e.target.value)}
                                      placeholder="Enter check number"
                                    />
                                  </div>
                                )}
                                
                                <div>
                                  <Label htmlFor="referenceNumber">Reference Number</Label>
                                  <Input 
                                    id="referenceNumber"
                                    value={referenceNumber}
                                    onChange={(e) => setReferenceNumber(e.target.value)}
                                    placeholder="Transaction/confirmation number"
                                  />
                                </div>
                                
                                <div>
                                  <Label htmlFor="paymentNotes">Payment Notes</Label>
                                  <Textarea 
                                    id="paymentNotes"
                                    value={paymentNotes}
                                    onChange={(e) => setPaymentNotes(e.target.value)}
                                    placeholder="Add payment processing notes..."
                                  />
                                </div>
                                
                                <div className="flex justify-end space-x-2">
                                  <Button
                                    variant="outline"
                                    onClick={() => {
                                      setSelectedPayment(null);
                                      setCheckNumber("");
                                      setReferenceNumber("");
                                      setPaymentNotes("");
                                    }}
                                  >
                                    Cancel
                                  </Button>
                                  <Button
                                    onClick={() => {
                                      if (selectedPayment) {
                                        processPaymentMutation.mutate({
                                          id: selectedPayment.id,
                                          checkNumber,
                                          referenceNumber,
                                          paymentNotes
                                        });
                                      }
                                    }}
                                    disabled={processPaymentMutation.isPending}
                                  >
                                    {processPaymentMutation.isPending ? "Processing..." : "Process Payment"}
                                  </Button>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => {
                              const reason = prompt("Enter hold reason:");
                              if (reason) {
                                holdPaymentMutation.mutate({ id: payment.id, reason });
                              }
                            }}
                          >
                            <Clock className="w-4 h-4 mr-1" />
                            Hold
                          </Button>
                        </div>
                      )}
                      {payment.status !== 'ready_for_payment' && (
                        <Button size="sm" variant="outline">
                          <Eye className="w-4 h-4 mr-1" />
                          View
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}