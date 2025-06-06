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
  Calendar,
  Banknote,
  CreditCard,
  Receipt,
  Wallet
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
      toast({ title: "Successfully posted to Accounts Payable" });
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
        <div className="text-center">Loading accounting entries...</div>
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
            <h1 className="text-3xl font-bold text-gray-900">Accountant Dashboard</h1>
            <p className="text-gray-600">Accounts payable posting and journal entries</p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <Link href="/cashier-dashboard">
            <Button variant="outline" size="sm">
              <Wallet className="w-4 h-4 mr-2" />
              Cashier Dashboard
            </Button>
          </Link>
          <Button variant="outline" size="sm" onClick={() => {
            queryClient.invalidateQueries({ queryKey: ["/api/accounting/pending-entries"] });
            queryClient.invalidateQueries({ queryKey: ["/api/accounting/metrics"] });
            toast({ title: "Dashboard refreshed successfully" });
          }}>
            <Activity className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      {accountingMetrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Pending Postings</p>
                  <p className="text-2xl font-bold text-yellow-600">{accountingMetrics.pendingPostings}</p>
                  <p className="text-xs text-yellow-600">Awaiting GL posting</p>
                </div>
                <div className="p-3 bg-yellow-100 rounded-lg">
                  <Calculator className="w-6 h-6 text-yellow-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Posted Today</p>
                  <p className="text-2xl font-bold text-green-600">{accountingMetrics.postedToday}</p>
                  <p className="text-xs text-green-600">Journal entries created</p>
                </div>
                <div className="p-3 bg-green-100 rounded-lg">
                  <BookOpen className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">A/P Value</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {formatCurrency(accountingMetrics.totalApValue)}
                  </p>
                  <p className="text-xs text-blue-600">Total accounts payable</p>
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
                  <p className="text-sm font-medium text-gray-600">Ready for Payment</p>
                  <p className="text-2xl font-bold text-purple-600">{accountingMetrics.pendingPayments}</p>
                  <p className="text-xs text-purple-600">For cashier processing</p>
                </div>
                <div className="p-3 bg-purple-100 rounded-lg">
                  <Wallet className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Accounts Payable Posting Queue */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <BookOpen className="w-5 h-5 mr-2" />
            Accounts Payable Posting Queue
          </CardTitle>
          <CardDescription>
            Authorized payments requiring GL posting and A/P setup
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Vendor</TableHead>
                <TableHead>Invoice #</TableHead>
                <TableHead>Authorized By</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!accountingEntries || accountingEntries.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                    No accounting entries available for posting
                  </TableCell>
                </TableRow>
              ) : (
                accountingEntries.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="font-medium">{entry.type}</TableCell>
                    <TableCell className="max-w-xs truncate">{entry.description}</TableCell>
                    <TableCell className="font-bold">{formatCurrency(entry.amount)}</TableCell>
                    <TableCell>{entry.vendorDetails || "N/A"}</TableCell>
                    <TableCell>{entry.invoiceNumber || "N/A"}</TableCell>
                    <TableCell>{entry.authorizedBy}</TableCell>
                    <TableCell>{getPriorityBadge(entry.priority)}</TableCell>
                    <TableCell>{new Date(entry.dueDate).toLocaleDateString()}</TableCell>
                    <TableCell>{getStatusBadge(entry.status)}</TableCell>
                    <TableCell>
                      {entry.status === 'pending_posting' && (
                        <div className="flex space-x-2">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button 
                                size="sm" 
                                onClick={() => setSelectedEntry(entry)}
                              >
                                <BookOpen className="w-4 h-4 mr-1" />
                                Post to A/P
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Post to Accounts Payable</DialogTitle>
                                <DialogDescription>
                                  Create journal entry and setup accounts payable record
                                </DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <Label htmlFor="glAccount">GL Account</Label>
                                    <Select value={glAccount} onValueChange={setGlAccount}>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Select GL account" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="5100-Equipment">5100 - Equipment Expense</SelectItem>
                                        <SelectItem value="5200-Training">5200 - Training & Development</SelectItem>
                                        <SelectItem value="5300-Software">5300 - Software Licenses</SelectItem>
                                        <SelectItem value="5400-Facilities">5400 - Facilities Expense</SelectItem>
                                        <SelectItem value="5500-Marketing">5500 - Marketing Expense</SelectItem>
                                        <SelectItem value="5600-Professional">5600 - Professional Services</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div>
                                    <Label htmlFor="costCenter">Cost Center</Label>
                                    <Select value={costCenter} onValueChange={setCostCenter}>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Select cost center" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="CC001-Admin">CC001 - Administration</SelectItem>
                                        <SelectItem value="CC002-Lab">CC002 - Laboratory</SelectItem>
                                        <SelectItem value="CC003-Radiology">CC003 - Radiology</SelectItem>
                                        <SelectItem value="CC004-Cardiology">CC004 - Cardiology</SelectItem>
                                        <SelectItem value="CC005-IT">CC005 - Information Technology</SelectItem>
                                        <SelectItem value="CC006-Marketing">CC006 - Marketing</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                </div>
                                <div>
                                  <Label htmlFor="postingNotes">Posting Notes</Label>
                                  <Textarea 
                                    id="postingNotes"
                                    value={postingNotes}
                                    onChange={(e) => setPostingNotes(e.target.value)}
                                    placeholder="Add journal entry description and notes..."
                                  />
                                </div>
                                <div className="bg-gray-50 p-3 rounded-lg">
                                  <h4 className="font-medium mb-2">Journal Entry Preview:</h4>
                                  <div className="text-sm space-y-1">
                                    <div className="flex justify-between">
                                      <span>Dr. {glAccount}</span>
                                      <span className="font-mono">{formatCurrency(selectedEntry?.amount || 0)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span>Cr. Accounts Payable</span>
                                      <span className="font-mono">{formatCurrency(selectedEntry?.amount || 0)}</span>
                                    </div>
                                  </div>
                                </div>
                                <div className="flex justify-end space-x-2">
                                  <Button
                                    variant="outline"
                                    onClick={() => {
                                      setSelectedEntry(null);
                                      setGlAccount("");
                                      setCostCenter("");
                                      setPostingNotes("");
                                    }}
                                  >
                                    Cancel
                                  </Button>
                                  <Button
                                    onClick={() => {
                                      if (selectedEntry && glAccount && costCenter) {
                                        postToAPMutation.mutate({
                                          id: selectedEntry.id,
                                          glAccount,
                                          costCenter,
                                          postingNotes
                                        });
                                      }
                                    }}
                                    disabled={!glAccount || !costCenter || postToAPMutation.isPending}
                                  >
                                    {postToAPMutation.isPending ? "Posting..." : "Post to A/P"}
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
                                rejectPostingMutation.mutate({ id: entry.id, reason });
                              }
                            }}
                          >
                            <XCircle className="w-4 h-4 mr-1" />
                            Reject
                          </Button>
                        </div>
                      )}
                      {entry.status !== 'pending_posting' && (
                        <Button size="sm" variant="outline">
                          <Eye className="w-4 h-4 mr-1" />
                          View Entry
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