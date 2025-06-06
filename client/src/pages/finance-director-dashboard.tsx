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
  TrendingUp, 
  DollarSign, 
  AlertTriangle, 
  Users,
  Clock,
  CreditCard,
  Banknote,
  FileText,
  Eye,
  Building,
  ArrowRightLeft,
  Wallet,
  Activity,
  Calendar
} from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Link } from "wouter";

interface PaymentRequest {
  id: number;
  type: string;
  description: string;
  amount: string;
  requestedBy: string;
  approvedBy: string;
  approvedAt: string;
  priority: string;
  department: string;
  paymentMethod: string;
  bankAccount?: string;
  vendorDetails?: string;
  invoiceNumber?: string;
  dueDate: string;
  status: "pending_payment" | "payment_authorized" | "payment_processing" | "paid" | "rejected";
}

interface FinanceMetrics {
  pendingPayments: number;
  paymentsProcessedToday: number;
  totalPaymentValue: string;
  averageProcessingTime: string;
  approvalRate: number;
  overduePayments: number;
}

export default function FinanceDirectorDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedPayment, setSelectedPayment] = useState<PaymentRequest | null>(null);
  const [paymentMethod, setPaymentMethod] = useState("");
  const [bankAccount, setBankAccount] = useState("");
  const [comments, setComments] = useState("");

  // Fetch payment requests (approved expenses from GED)
  const { data: paymentRequests, isLoading } = useQuery<PaymentRequest[]>({
    queryKey: ["/api/finance/payment-requests"],
    queryFn: async () => {
      const response = await fetch("/api/finance/payment-requests");
      if (!response.ok) throw new Error("Failed to fetch payment requests");
      return response.json();
    },
  });

  // Fetch finance metrics
  const { data: financeMetrics } = useQuery<FinanceMetrics>({
    queryKey: ["/api/finance/metrics"],
    queryFn: async () => {
      const response = await fetch("/api/finance/metrics");
      if (!response.ok) throw new Error("Failed to fetch finance metrics");
      return response.json();
    },
  });

  // Authorize payment mutation
  const authorizePaymentMutation = useMutation({
    mutationFn: async ({ id, paymentMethod, bankAccount, comments }: { 
      id: number; 
      paymentMethod: string; 
      bankAccount: string; 
      comments: string; 
    }) => {
      const response = await fetch(`/api/finance/authorize-payment/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentMethod, bankAccount, comments }),
      });
      if (!response.ok) throw new Error("Failed to authorize payment");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/finance/payment-requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/finance/metrics"] });
      toast({ title: "Payment authorized successfully" });
      setSelectedPayment(null);
      setPaymentMethod("");
      setBankAccount("");
      setComments("");
    },
    onError: (error: any) => {
      toast({ 
        title: "Authorization failed", 
        description: error.message,
        variant: "destructive" 
      });
    }
  });

  // Reject payment mutation
  const rejectPaymentMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: number; reason: string }) => {
      const response = await fetch(`/api/finance/reject-payment/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      if (!response.ok) throw new Error("Failed to reject payment");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/finance/payment-requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/finance/metrics"] });
      toast({ title: "Payment rejected successfully" });
      setSelectedPayment(null);
    },
    onError: (error: any) => {
      toast({ 
        title: "Rejection failed", 
        description: error.message || "Failed to reject transaction",
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
      case 'pending_payment':
        return <Badge className="bg-yellow-100 text-yellow-800"><Clock className="w-3 h-3 mr-1" />Pending Payment</Badge>;
      case 'payment_authorized':
        return <Badge className="bg-blue-100 text-blue-800"><CheckCircle className="w-3 h-3 mr-1" />Payment Authorized</Badge>;
      case 'payment_processing':
        return <Badge className="bg-purple-100 text-purple-800"><Activity className="w-3 h-3 mr-1" />Processing</Badge>;
      case 'paid':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Paid</Badge>;
      case 'rejected':
        return <Badge className="bg-red-100 text-red-800"><XCircle className="w-3 h-3 mr-1" />Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'urgent':
        return <Badge variant="destructive">Urgent</Badge>;
      case 'high':
        return <Badge className="bg-orange-100 text-orange-800">High</Badge>;
      case 'medium':
        return <Badge className="bg-yellow-100 text-yellow-800">Medium</Badge>;
      case 'low':
        return <Badge className="bg-gray-100 text-gray-800">Low</Badge>;
      default:
        return <Badge variant="outline">Normal</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-6">
        <div className="text-center">Loading payment requests...</div>
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
            <h1 className="text-3xl font-bold text-gray-900">Finance Director</h1>
            <p className="text-gray-600">Payment authorization and financial oversight</p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <Button variant="outline" size="sm" onClick={() => {
            queryClient.invalidateQueries({ queryKey: ["/api/finance/payment-requests"] });
            queryClient.invalidateQueries({ queryKey: ["/api/finance/metrics"] });
            toast({ title: "Dashboard refreshed successfully" });
          }}>
            <Activity className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      {financeMetrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Pending Payments</p>
                  <p className="text-2xl font-bold text-orange-600">{financeMetrics.pendingPayments}</p>
                  <p className="text-xs text-orange-600">Awaiting authorization</p>
                </div>
                <div className="p-3 bg-orange-100 rounded-lg">
                  <Clock className="w-6 h-6 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Today's Payments</p>
                  <p className="text-2xl font-bold text-green-600">{financeMetrics.paymentsProcessedToday}</p>
                  <p className="text-xs text-green-600">Processed today</p>
                </div>
                <div className="p-3 bg-green-100 rounded-lg">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Payment Value</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {formatCurrency(financeMetrics.totalPaymentValue)}
                  </p>
                  <p className="text-xs text-blue-600">Total pending value</p>
                </div>
                <div className="p-3 bg-blue-100 rounded-lg">
                  <DollarSign className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Overdue Payments</p>
                  <p className="text-2xl font-bold text-red-600">{financeMetrics.overduePayments}</p>
                  <p className="text-xs text-red-600">Require immediate attention</p>
                </div>
                <div className="p-3 bg-red-100 rounded-lg">
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Payment Authorization Workflow */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <CreditCard className="w-5 h-5 mr-2" />
            Payment Authorization Queue
          </CardTitle>
          <CardDescription>
            Approved expenses from GED requiring payment authorization
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Approved By</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!paymentRequests || paymentRequests.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                    No payment requests available
                  </TableCell>
                </TableRow>
              ) : (
                paymentRequests.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell className="font-medium">{payment.type}</TableCell>
                    <TableCell className="max-w-xs truncate">{payment.description}</TableCell>
                    <TableCell className="font-bold">{formatCurrency(payment.amount)}</TableCell>
                    <TableCell>{payment.department}</TableCell>
                    <TableCell>{payment.approvedBy}</TableCell>
                    <TableCell>{getPriorityBadge(payment.priority)}</TableCell>
                    <TableCell>{new Date(payment.dueDate).toLocaleDateString()}</TableCell>
                    <TableCell>{getStatusBadge(payment.status)}</TableCell>
                    <TableCell>
                      {payment.status === 'pending_payment' && (
                        <div className="flex space-x-2">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button 
                                size="sm" 
                                onClick={() => setSelectedPayment(payment)}
                              >
                                <CheckCircle className="w-4 h-4 mr-1" />
                                Authorize
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Authorize Payment</DialogTitle>
                                <DialogDescription>
                                  Configure payment details and authorize disbursement
                                </DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div>
                                  <Label htmlFor="paymentMethod">Payment Method</Label>
                                  <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select payment method" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                                      <SelectItem value="check">Check</SelectItem>
                                      <SelectItem value="cash">Cash</SelectItem>
                                      <SelectItem value="electronic">Electronic Payment</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div>
                                  <Label htmlFor="bankAccount">Bank Account</Label>
                                  <Select value={bankAccount} onValueChange={setBankAccount}>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select bank account" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="operating_account">Operating Account</SelectItem>
                                      <SelectItem value="payroll_account">Payroll Account</SelectItem>
                                      <SelectItem value="expense_account">Expense Account</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div>
                                  <Label htmlFor="comments">Authorization Comments</Label>
                                  <Textarea 
                                    id="comments"
                                    value={comments}
                                    onChange={(e) => setComments(e.target.value)}
                                    placeholder="Add authorization notes..."
                                  />
                                </div>
                                <div className="flex justify-end space-x-2">
                                  <Button
                                    variant="outline"
                                    onClick={() => {
                                      setSelectedPayment(null);
                                      setPaymentMethod("");
                                      setBankAccount("");
                                      setComments("");
                                    }}
                                  >
                                    Cancel
                                  </Button>
                                  <Button
                                    onClick={() => {
                                      if (selectedPayment && paymentMethod && bankAccount) {
                                        authorizePaymentMutation.mutate({
                                          id: selectedPayment.id,
                                          paymentMethod,
                                          bankAccount,
                                          comments
                                        });
                                      }
                                    }}
                                    disabled={!paymentMethod || !bankAccount || authorizePaymentMutation.isPending}
                                  >
                                    {authorizePaymentMutation.isPending ? "Authorizing..." : "Authorize Payment"}
                                  </Button>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>
                          <Button 
                            size="sm" 
                            variant="destructive"
                            onClick={() => {
                              const reason = prompt("Enter rejection reason:");
                              if (reason) {
                                rejectPaymentMutation.mutate({ id: payment.id, reason });
                              }
                            }}
                          >
                            <XCircle className="w-4 h-4 mr-1" />
                            Reject
                          </Button>
                        </div>
                      )}
                      {payment.status !== 'pending_payment' && (
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