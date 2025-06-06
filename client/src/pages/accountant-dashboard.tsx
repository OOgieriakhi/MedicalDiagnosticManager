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
  Calculator,
  BookOpen,
  DollarSign,
  Banknote,
  Calendar,
  CreditCard,
  Receipt,
  Wallet,
  Package
} from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Link } from "wouter";

interface AccountingEntry {
  id: number;
  type: string;
  description: string;
  amount: string;
  requestedBy: string;
  approvedBy: string;
  authorizedBy: string;
  authorizedAt: string;
  priority: string;
  department: string;
  paymentMethod: string;
  bankAccount: string;
  vendorDetails?: string;
  invoiceNumber?: string;
  dueDate: string;
  glAccount?: string;
  costCenter?: string;
  status: "pending_posting" | "posted_to_ap" | "ready_for_payment" | "payment_processing" | "paid";
}

interface AccountingMetrics {
  pendingPostings: number;
  postedToday: number;
  totalApValue: string;
  pendingPayments: number;
  averagePostingTime: string;
}

export default function AccountantDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedEntry, setSelectedEntry] = useState<AccountingEntry | null>(null);
  const [glAccount, setGlAccount] = useState("");
  const [costCenter, setCostCenter] = useState("");
  const [postingNotes, setPostingNotes] = useState("");

  // Fetch authorized payments for posting
  const { data: accountingEntries, isLoading } = useQuery<AccountingEntry[]>({
    queryKey: ["/api/accounting/pending-entries"],
    queryFn: async () => {
      const response = await fetch("/api/accounting/pending-entries");
      if (!response.ok) throw new Error("Failed to fetch accounting entries");
      return response.json();
    },
  });

  // Fetch pending delivery confirmations
  const { data: pendingDeliveries = [] } = useQuery({
    queryKey: ['/api/purchase-orders/pending-deliveries'],
    enabled: !!user,
    queryFn: async () => {
      const response = await fetch('/api/purchase-orders/pending-deliveries');
      if (!response.ok) throw new Error("Failed to fetch pending deliveries");
      return response.json();
    }
  });

  // Confirm delivery mutation
  const confirmDeliveryMutation = useMutation({
    mutationFn: async ({ poId }: { poId: number }) => {
      const response = await fetch(`/api/purchase-orders/${poId}/confirm-delivery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      if (!response.ok) throw new Error('Failed to confirm delivery');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/purchase-orders/pending-deliveries'] });
      toast({
        title: "Success",
        description: "Delivery confirmed successfully"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to confirm delivery",
        variant: "destructive"
      });
    }
  });

  // Fetch accounting metrics
  const { data: accountingMetrics } = useQuery<AccountingMetrics>({
    queryKey: ["/api/accounting/metrics"],
    queryFn: async () => {
      const response = await fetch("/api/accounting/metrics");
      if (!response.ok) throw new Error("Failed to fetch accounting metrics");
      return response.json();
    },
  });

  // Post to accounts payable mutation
  const postToAPMutation = useMutation({
    mutationFn: async ({ id, glAccount, costCenter, postingNotes }: { 
      id: number; 
      glAccount: string; 
      costCenter: string; 
      postingNotes: string; 
    }) => {
      const response = await fetch(`/api/accounting/post-to-ap/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ glAccount, costCenter, postingNotes }),
      });
      if (!response.ok) throw new Error("Failed to post to accounts payable");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/accounting/pending-entries"] });
      queryClient.invalidateQueries({ queryKey: ["/api/accounting/metrics"] });
      toast({ title: "Posted to accounts payable successfully" });
      setSelectedEntry(null);
      setGlAccount("");
      setCostCenter("");
      setPostingNotes("");
    },
    onError: (error: any) => {
      toast({ 
        title: "Posting failed", 
        description: error.message,
        variant: "destructive" 
      });
    }
  });

  // Reject posting mutation
  const rejectPostingMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: number; reason: string }) => {
      const response = await fetch(`/api/accounting/reject-posting/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      if (!response.ok) throw new Error("Failed to reject posting");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/accounting/pending-entries"] });
      queryClient.invalidateQueries({ queryKey: ["/api/accounting/metrics"] });
      toast({ title: "Posting rejected successfully" });
      setSelectedEntry(null);
    },
    onError: (error: any) => {
      toast({ 
        title: "Rejection failed", 
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
      case 'pending_posting':
        return <Badge className="bg-yellow-100 text-yellow-800"><Calculator className="w-3 h-3 mr-1" />Pending Posting</Badge>;
      case 'posted_to_ap':
        return <Badge className="bg-blue-100 text-blue-800"><BookOpen className="w-3 h-3 mr-1" />Posted to A/P</Badge>;
      case 'ready_for_payment':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Ready for Payment</Badge>;
      case 'payment_processing':
        return <Badge className="bg-purple-100 text-purple-800"><Activity className="w-3 h-3 mr-1" />Payment Processing</Badge>;
      case 'paid':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Paid</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return <Badge variant="destructive">Urgent</Badge>;
      case 'high':
        return <Badge className="bg-orange-100 text-orange-800">High</Badge>;
      case 'medium':
        return <Badge className="bg-yellow-100 text-yellow-800">Medium</Badge>;
      case 'low':
        return <Badge className="bg-gray-100 text-gray-800">Low</Badge>;
      default:
        return <Badge variant="outline">{priority}</Badge>;
    }
  };

  const handlePostToAP = () => {
    if (!selectedEntry) return;
    
    postToAPMutation.mutate({
      id: selectedEntry.id,
      glAccount,
      costCenter,
      postingNotes
    });
  };

  const pendingCount = accountingEntries?.filter(entry => entry.status === 'pending_posting').length || 0;
  const readyForPaymentCount = accountingEntries?.filter(entry => entry.status === 'ready_for_payment').length || 0;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Accounting & Financial Management</h1>
            <p className="text-muted-foreground">Comprehensive financial oversight and reporting</p>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Loading...</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Accounting & Financial Management</h1>
          <p className="text-muted-foreground">Comprehensive financial oversight and reporting</p>
        </div>
        <div className="flex space-x-2">
          <Select>
            <SelectTrigger>
              <SelectValue placeholder="Current Period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="current">Current Period</SelectItem>
              <SelectItem value="previous">Previous Period</SelectItem>
              <SelectItem value="ytd">Year to Date</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline">
            <FileText className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button>
            <DollarSign className="w-4 h-4 mr-2" />
            New Entry
          </Button>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Assets</CardTitle>
            <Building className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₦650,000.00</div>
            <p className="text-xs text-muted-foreground">
              +12.5% from last month
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₦1,132,000.00</div>
            <p className="text-xs text-muted-foreground">
              +8.3% from last month
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₦792,400.00</div>
            <p className="text-xs text-muted-foreground">
              +3.1% from last month
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Income</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₦339,600.00</div>
            <p className="text-xs text-muted-foreground">
              +15.2% from last month
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Actions</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingCount + readyForPaymentCount}</div>
            <p className="text-xs text-muted-foreground">
              {pendingCount} postings, {readyForPaymentCount} payments
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Action Required Section */}
      {(pendingCount > 0 || readyForPaymentCount > 0) && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-2">
            <Activity className="w-5 h-5 text-yellow-600" />
            <h3 className="font-semibold text-yellow-800">Action Required</h3>
          </div>
          <div className="grid gap-2 md:grid-cols-2">
            {pendingCount > 0 && (
              <div className="flex items-center justify-between bg-white rounded p-3">
                <span className="text-sm">Pending Postings</span>
                <Badge variant="secondary">{pendingCount}</Badge>
              </div>
            )}
            {readyForPaymentCount > 0 && (
              <div className="flex items-center justify-between bg-white rounded p-3">
                <span className="text-sm">Ready for Payment</span>
                <Badge variant="secondary">{readyForPaymentCount}</Badge>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Pending Delivery Confirmations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Package className="w-5 h-5 mr-2" />
            Pending Delivery Confirmations
          </CardTitle>
          <CardDescription>
            Purchase orders awaiting accountant delivery confirmation
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>PO Number</TableHead>
                <TableHead>Vendor</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Executed By</TableHead>
                <TableHead>Execution Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!pendingDeliveries || pendingDeliveries.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No pending delivery confirmations
                  </TableCell>
                </TableRow>
              ) : (
                pendingDeliveries.map((po: any) => (
                  <TableRow key={po.id}>
                    <TableCell className="font-medium">{po.poNumber}</TableCell>
                    <TableCell>{po.vendorName}</TableCell>
                    <TableCell className="font-bold">{formatCurrency(po.totalAmount)}</TableCell>
                    <TableCell className="max-w-xs truncate">{po.description}</TableCell>
                    <TableCell>{po.executedByName}</TableCell>
                    <TableCell>{po.executionDate ? new Date(po.executionDate).toLocaleDateString() : 'N/A'}</TableCell>
                    <TableCell>
                      <Button 
                        size="sm" 
                        onClick={() => confirmDeliveryMutation.mutate({ poId: po.id })}
                      >
                        <Package className="w-4 h-4 mr-1" />
                        Confirm Delivery
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Accounts Payable Posting Queue */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <BookOpen className="w-5 h-5 mr-2" />
            Accounts Payable Posting Queue
          </CardTitle>
          <CardDescription>
            Authorized payments requiring GL account posting
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Requested By</TableHead>
                <TableHead>Approved By</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!accountingEntries || accountingEntries.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                    No accounting entries pending posting
                  </TableCell>
                </TableRow>
              ) : (
                accountingEntries.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="font-medium">{entry.type}</TableCell>
                    <TableCell className="max-w-xs truncate">{entry.description}</TableCell>
                    <TableCell className="font-bold">{formatCurrency(entry.amount)}</TableCell>
                    <TableCell>{entry.requestedBy}</TableCell>
                    <TableCell>{entry.approvedBy}</TableCell>
                    <TableCell>{getPriorityBadge(entry.priority)}</TableCell>
                    <TableCell>{new Date(entry.dueDate).toLocaleDateString()}</TableCell>
                    <TableCell>{getStatusBadge(entry.status)}</TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => setSelectedEntry(entry)}
                            >
                              <Eye className="w-4 h-4 mr-1" />
                              View
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl">
                            <DialogHeader>
                              <DialogTitle>Payment Entry Details</DialogTitle>
                              <DialogDescription>
                                Review and post to accounts payable
                              </DialogDescription>
                            </DialogHeader>
                            {selectedEntry && (
                              <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <Label className="text-sm font-medium">Type</Label>
                                    <p className="text-sm">{selectedEntry.type}</p>
                                  </div>
                                  <div>
                                    <Label className="text-sm font-medium">Amount</Label>
                                    <p className="text-sm font-bold">{formatCurrency(selectedEntry.amount)}</p>
                                  </div>
                                  <div>
                                    <Label className="text-sm font-medium">Requested By</Label>
                                    <p className="text-sm">{selectedEntry.requestedBy}</p>
                                  </div>
                                  <div>
                                    <Label className="text-sm font-medium">Approved By</Label>
                                    <p className="text-sm">{selectedEntry.approvedBy}</p>
                                  </div>
                                  <div>
                                    <Label className="text-sm font-medium">Department</Label>
                                    <p className="text-sm">{selectedEntry.department}</p>
                                  </div>
                                  <div>
                                    <Label className="text-sm font-medium">Payment Method</Label>
                                    <p className="text-sm">{selectedEntry.paymentMethod}</p>
                                  </div>
                                </div>
                                <div>
                                  <Label className="text-sm font-medium">Description</Label>
                                  <p className="text-sm">{selectedEntry.description}</p>
                                </div>
                                
                                <div className="border-t pt-4">
                                  <h4 className="font-medium mb-3">Posting Information</h4>
                                  <div className="grid grid-cols-2 gap-4">
                                    <div>
                                      <Label htmlFor="glAccount">GL Account *</Label>
                                      <Input
                                        id="glAccount"
                                        value={glAccount}
                                        onChange={(e) => setGlAccount(e.target.value)}
                                        placeholder="e.g., 2100-001"
                                      />
                                    </div>
                                    <div>
                                      <Label htmlFor="costCenter">Cost Center</Label>
                                      <Input
                                        id="costCenter"
                                        value={costCenter}
                                        onChange={(e) => setCostCenter(e.target.value)}
                                        placeholder="e.g., LAB-001"
                                      />
                                    </div>
                                  </div>
                                  <div className="mt-4">
                                    <Label htmlFor="postingNotes">Posting Notes</Label>
                                    <Textarea
                                      id="postingNotes"
                                      value={postingNotes}
                                      onChange={(e) => setPostingNotes(e.target.value)}
                                      placeholder="Additional notes for this posting..."
                                    />
                                  </div>
                                </div>

                                <div className="flex justify-end space-x-2 pt-4">
                                  <Button
                                    variant="outline"
                                    onClick={() => {
                                      rejectPostingMutation.mutate({
                                        id: selectedEntry.id,
                                        reason: "Rejected by accountant"
                                      });
                                    }}
                                  >
                                    <XCircle className="w-4 h-4 mr-2" />
                                    Reject
                                  </Button>
                                  <Button
                                    onClick={handlePostToAP}
                                    disabled={!glAccount || postToAPMutation.isPending}
                                  >
                                    <CheckCircle className="w-4 h-4 mr-2" />
                                    {postToAPMutation.isPending ? "Posting..." : "Post to A/P"}
                                  </Button>
                                </div>
                              </div>
                            )}
                          </DialogContent>
                        </Dialog>
                        
                        {entry.status === 'pending_posting' && (
                          <Button 
                            size="sm"
                            onClick={() => setSelectedEntry(entry)}
                          >
                            <Calculator className="w-4 h-4 mr-1" />
                            Post
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
    </div>
  );
}