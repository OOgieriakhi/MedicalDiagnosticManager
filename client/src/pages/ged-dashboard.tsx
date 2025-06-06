import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { MessageNotification } from "@/components/message-notification";
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Users, 
  Building, 
  AlertTriangle,
  CheckCircle,
  Clock,
  Target,
  BarChart3,
  PieChart,
  Activity,
  Bell,
  Calendar,
  FileText,
  Settings,
  Eye,
  ArrowUp,
  ArrowDown,
  Zap,
  Shield,
  Briefcase,
  Star,
  Award,
  Globe,
  Heart,
  MessageSquare,
  Download,
  Filter,
  RefreshCw,
  Plus,
  CreditCard,
  ArrowRightLeft,
  Banknote,
  Wallet
} from "lucide-react";
import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface GEDMetrics {
  pendingApprovals: number;
  monthlyExpenseApprovals: string;
  fundTransferVolume: string;
  businessAccountBalance: string;
  fintechAccountBalance: string;
  approvedThisMonth: number;
  rejectedThisMonth: number;
  averageApprovalTime: string;
}

interface PendingApproval {
  id: number;
  type: string;
  description: string;
  amount: string;
  requestedBy: string;
  requestedAt: string;
  priority: string;
  department: string;
  justification: string;
}

interface FundTransferRequest {
  id: number;
  fromAccount: string;
  toAccount: string;
  amount: string;
  purpose: string;
  requestedAt: string;
  status: string;
}

export default function GEDDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedApproval, setSelectedApproval] = useState<PendingApproval | null>(null);
  const [transferAmount, setTransferAmount] = useState("");
  const [transferPurpose, setTransferPurpose] = useState("");
  const [fromAccount, setFromAccount] = useState("");
  const [toAccount, setToAccount] = useState("");
  const [queryText, setQueryText] = useState("");
  const [referralReason, setReferralReason] = useState("");
  const [referralNotes, setReferralNotes] = useState("");

  // Fetch GED metrics
  const { data: gedMetrics, isLoading: metricsLoading } = useQuery<GEDMetrics>({
    queryKey: ["/api/ged/metrics"],
    queryFn: async () => {
      const response = await fetch("/api/ged/metrics");
      if (!response.ok) throw new Error("Failed to fetch GED metrics");
      return response.json();
    },
  });

  // Fetch pending approvals
  const { data: pendingApprovals, isLoading: approvalsLoading } = useQuery<PendingApproval[]>({
    queryKey: ["/api/ged/pending-approvals"],
    queryFn: async () => {
      const response = await fetch("/api/ged/pending-approvals");
      if (!response.ok) throw new Error("Failed to fetch pending approvals");
      return response.json();
    },
  });

  // Fetch fund transfer requests
  const { data: fundTransfers, isLoading: transfersLoading } = useQuery<FundTransferRequest[]>({
    queryKey: ["/api/ged/fund-transfers"],
    queryFn: async () => {
      const response = await fetch("/api/ged/fund-transfers");
      if (!response.ok) throw new Error("Failed to fetch fund transfers");
      return response.json();
    },
  });

  // Approve expense mutation
  const approveExpenseMutation = useMutation({
    mutationFn: async ({ id, comments }: { id: number; comments?: string }) => {
      const response = await apiRequest("POST", `/api/ged/approve-expense/${id}`, { comments });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ged/pending-approvals"] });
      queryClient.invalidateQueries({ queryKey: ["/api/ged/metrics"] });
      toast({ title: "Expense approved successfully" });
      setSelectedApproval(null);
    },
    onError: () => {
      toast({ title: "Failed to approve expense", variant: "destructive" });
    },
  });

  // Reject expense mutation
  const rejectExpenseMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: number; reason: string }) => {
      const response = await apiRequest("POST", `/api/ged/reject-expense/${id}`, { reason });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ged/pending-approvals"] });
      queryClient.invalidateQueries({ queryKey: ["/api/ged/metrics"] });
      toast({ title: "Expense rejected successfully" });
      setSelectedApproval(null);
    },
    onError: () => {
      toast({ title: "Failed to reject expense", variant: "destructive" });
    },
  });

  // Query expense mutation
  const queryExpenseMutation = useMutation({
    mutationFn: async ({ id, query }: { id: number; query: string }) => {
      const response = await apiRequest("POST", `/api/ged/query-expense/${id}`, { query });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ged/pending-approvals"] });
      queryClient.invalidateQueries({ queryKey: ["/api/ged/metrics"] });
      toast({ title: "Query sent successfully" });
      setSelectedApproval(null);
      setQueryText("");
    },
    onError: () => {
      toast({ title: "Failed to send query", variant: "destructive" });
    },
  });

  // Refer to CEO mutation
  const referToCEOMutation = useMutation({
    mutationFn: async ({ id, reason, notes }: { id: number; reason: string; notes: string }) => {
      const response = await apiRequest("POST", `/api/ged/refer-to-ceo/${id}`, { reason, notes });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ged/pending-approvals"] });
      queryClient.invalidateQueries({ queryKey: ["/api/ged/metrics"] });
      toast({ title: "Successfully referred to CEO" });
      setSelectedApproval(null);
      setReferralReason("");
      setReferralNotes("");
    },
    onError: () => {
      toast({ title: "Failed to refer to CEO", variant: "destructive" });
    },
  });

  // Fund transfer mutation
  const fundTransferMutation = useMutation({
    mutationFn: async (data: { fromAccount: string; toAccount: string; amount: string; purpose: string }) => {
      const response = await apiRequest("POST", "/api/ged/fund-transfer", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ged/fund-transfers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/ged/metrics"] });
      toast({ title: "Fund transfer completed successfully" });
      setTransferAmount("");
      setTransferPurpose("");
      setFromAccount("");
      setToAccount("");
    },
    onError: () => {
      toast({ title: "Fund transfer failed", variant: "destructive" });
    },
  });

  const formatCurrency = (amount: string | number) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN'
    }).format(num);
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'urgent':
        return <Badge variant="destructive">Urgent</Badge>;
      case 'high':
        return <Badge className="bg-orange-100 text-orange-800">High</Badge>;
      case 'medium':
        return <Badge className="bg-yellow-100 text-yellow-800">Medium</Badge>;
      default:
        return <Badge variant="outline">Normal</Badge>;
    }
  };

  const getAccountTypeIcon = (accountType: string) => {
    switch (accountType.toLowerCase()) {
      case 'fintech':
        return <Zap className="w-4 h-4 text-blue-600" />;
      case 'business':
        return <Building className="w-4 h-4 text-green-600" />;
      default:
        return <Banknote className="w-4 h-4 text-gray-600" />;
    }
  };

  if (!user) {
    return (
      <div className="p-6">
        <div className="text-center">
          <p className="text-gray-500">Please log in to access the Group Executive Director dashboard.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/">
            <Button variant="outline" size="sm">
              <Building className="w-4 h-4 mr-2" />
              Dashboard
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Group Executive Director</h1>
            <p className="text-gray-600">Strategic oversight and high-level approvals</p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <MessageNotification />
          <Link href="/approval-tracking">
            <Button variant="outline" size="sm">
              <FileText className="w-4 h-4 mr-2" />
              Approval Tracking
            </Button>
          </Link>
          <Button variant="outline" size="sm" onClick={() => {
            queryClient.invalidateQueries({ queryKey: ["/api/ged/metrics"] });
            queryClient.invalidateQueries({ queryKey: ["/api/ged/pending-approvals"] });
            queryClient.invalidateQueries({ queryKey: ["/api/ged/fund-transfers"] });
            toast({ title: "Dashboard refreshed successfully" });
          }}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending Approvals</p>
                <p className="text-2xl font-bold text-red-600">
                  {gedMetrics?.pendingApprovals || 0}
                </p>
                <p className="text-xs text-red-600">Requires attention</p>
              </div>
              <div className="p-3 bg-red-100 rounded-lg">
                <Clock className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Monthly Approvals</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(gedMetrics?.monthlyExpenseApprovals || "0")}
                </p>
                <p className="text-xs text-green-600">Approved this month</p>
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
                <p className="text-sm font-medium text-gray-600">Fund Transfers</p>
                <p className="text-2xl font-bold text-blue-600">
                  {formatCurrency(gedMetrics?.fundTransferVolume || "0")}
                </p>
                <p className="text-xs text-blue-600">Total transferred</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <ArrowRightLeft className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Approval Rate</p>
                <p className="text-2xl font-bold text-purple-600">
                  {gedMetrics ? Math.round((gedMetrics.approvedThisMonth / (gedMetrics.approvedThisMonth + gedMetrics.rejectedThisMonth)) * 100) || 0 : 0}%
                </p>
                <p className="text-xs text-purple-600">This month</p>
              </div>
              <div className="p-3 bg-purple-100 rounded-lg">
                <Target className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Account Balances */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building className="h-5 w-5 text-green-600" />
              Business Main Account
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              {formatCurrency(gedMetrics?.businessAccountBalance || "0")}
            </div>
            <p className="text-sm text-gray-600 mt-2">Primary operating account</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-blue-600" />
              Fintech Accounts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">
              {formatCurrency(gedMetrics?.fintechAccountBalance || "0")}
            </div>
            <p className="text-sm text-gray-600 mt-2">Available for transfer</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="approvals" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="approvals">Pending Approvals</TabsTrigger>
          <TabsTrigger value="transfers">Fund Transfers</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="approvals" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Expenses Requiring Approval</CardTitle>
              <p className="text-sm text-gray-600">Review and approve expenses beyond manager limits</p>
            </CardHeader>
            <CardContent>
              {approvalsLoading ? (
                <div className="text-center py-8">Loading approvals...</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Requested By</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingApprovals?.map((approval) => (
                      <TableRow key={approval.id}>
                        <TableCell>
                          <Badge variant="outline">{approval.type}</Badge>
                        </TableCell>
                        <TableCell className="max-w-xs truncate">{approval.description}</TableCell>
                        <TableCell className="font-medium">{formatCurrency(approval.amount)}</TableCell>
                        <TableCell>{approval.requestedBy}</TableCell>
                        <TableCell>{getPriorityBadge(approval.priority)}</TableCell>
                        <TableCell>{approval.department}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => setSelectedApproval(approval)}
                                >
                                  <Eye className="w-4 h-4 mr-1" />
                                  Review
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-2xl">
                                <DialogHeader>
                                  <DialogTitle>Expense Approval Review</DialogTitle>
                                  <DialogDescription>
                                    Review and approve or reject this expense request
                                  </DialogDescription>
                                </DialogHeader>
                                {selectedApproval && (
                                  <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                      <div>
                                        <Label>Type</Label>
                                        <p className="text-sm">{selectedApproval.type}</p>
                                      </div>
                                      <div>
                                        <Label>Amount</Label>
                                        <p className="text-lg font-bold">{formatCurrency(selectedApproval.amount)}</p>
                                      </div>
                                      <div>
                                        <Label>Requested By</Label>
                                        <p className="text-sm">{selectedApproval.requestedBy}</p>
                                      </div>
                                      <div>
                                        <Label>Department</Label>
                                        <p className="text-sm">{selectedApproval.department}</p>
                                      </div>
                                    </div>
                                    <div>
                                      <Label>Description</Label>
                                      <p className="text-sm mt-1">{selectedApproval.description}</p>
                                    </div>
                                    <div>
                                      <Label>Justification</Label>
                                      <p className="text-sm mt-1">{selectedApproval.justification}</p>
                                    </div>
                                    <div className="flex gap-2 pt-4">
                                      <Button 
                                        className="bg-green-600 hover:bg-green-700"
                                        onClick={() => approveExpenseMutation.mutate({ id: selectedApproval.id })}
                                        disabled={approveExpenseMutation.isPending}
                                      >
                                        <CheckCircle className="w-4 h-4 mr-2" />
                                        Approve
                                      </Button>
                                      <Dialog>
                                        <DialogTrigger asChild>
                                          <Button variant="outline">
                                            <MessageSquare className="w-4 h-4 mr-2" />
                                            Query
                                          </Button>
                                        </DialogTrigger>
                                        <DialogContent>
                                          <DialogHeader>
                                            <DialogTitle>Raise Query</DialogTitle>
                                            <DialogDescription>
                                              Request additional information or clarification
                                            </DialogDescription>
                                          </DialogHeader>
                                          <div className="space-y-4">
                                            <div>
                                              <Label>Request Details</Label>
                                              <p className="text-sm text-gray-600">{selectedApproval?.type} - {formatCurrency(selectedApproval?.amount)}</p>
                                            </div>
                                            <div>
                                              <Label htmlFor="query">Your Query</Label>
                                              <Textarea
                                                id="query"
                                                value={queryText}
                                                onChange={(e) => setQueryText(e.target.value)}
                                                placeholder="Please provide additional details about..."
                                                rows={4}
                                              />
                                            </div>
                                            <div className="flex gap-2">
                                              <Button 
                                                className="flex-1"
                                                onClick={() => queryExpenseMutation.mutate({ 
                                                  id: selectedApproval?.id || 0, 
                                                  query: queryText 
                                                })}
                                                disabled={!queryText.trim() || queryExpenseMutation.isPending}
                                              >
                                                {queryExpenseMutation.isPending ? "Sending..." : "Submit Query"}
                                              </Button>
                                            </div>
                                          </div>
                                        </DialogContent>
                                      </Dialog>
                                      <Dialog>
                                        <DialogTrigger asChild>
                                          <Button variant="outline" className="bg-yellow-50 border-yellow-300 text-yellow-700 hover:bg-yellow-100">
                                            <ArrowUp className="w-4 h-4 mr-2" />
                                            Refer to CEO
                                          </Button>
                                        </DialogTrigger>
                                        <DialogContent>
                                          <DialogHeader>
                                            <DialogTitle>Refer to CEO</DialogTitle>
                                            <DialogDescription>
                                              Escalate this approval to CEO level
                                            </DialogDescription>
                                          </DialogHeader>
                                          <div className="space-y-4">
                                            <div>
                                              <Label>Request Details</Label>
                                              <p className="text-sm text-gray-600">{selectedApproval?.type} - {formatCurrency(selectedApproval?.amount)}</p>
                                            </div>
                                            <div>
                                              <Label htmlFor="referral-reason">Reason for CEO Referral</Label>
                                              <Select value={referralReason} onValueChange={setReferralReason}>
                                                <SelectTrigger>
                                                  <SelectValue placeholder="Select reason" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                  <SelectItem value="high-value">High Value Transaction</SelectItem>
                                                  <SelectItem value="policy-exception">Policy Exception Required</SelectItem>
                                                  <SelectItem value="strategic-decision">Strategic Decision</SelectItem>
                                                  <SelectItem value="compliance-review">Compliance Review</SelectItem>
                                                  <SelectItem value="other">Other</SelectItem>
                                                </SelectContent>
                                              </Select>
                                            </div>
                                            <div>
                                              <Label htmlFor="referral-notes">Additional Notes</Label>
                                              <Textarea
                                                id="referral-notes"
                                                value={referralNotes}
                                                onChange={(e) => setReferralNotes(e.target.value)}
                                                placeholder="Provide context for CEO review..."
                                                rows={3}
                                              />
                                            </div>
                                            <div className="flex gap-2">
                                              <Button 
                                                className="flex-1 bg-yellow-600 hover:bg-yellow-700"
                                                onClick={() => referToCEOMutation.mutate({ 
                                                  id: selectedApproval?.id || 0, 
                                                  reason: referralReason, 
                                                  notes: referralNotes 
                                                })}
                                                disabled={!referralReason || !referralNotes.trim() || referToCEOMutation.isPending}
                                              >
                                                <ArrowUp className="w-4 h-4 mr-2" />
                                                {referToCEOMutation.isPending ? "Referring..." : "Refer to CEO"}
                                              </Button>
                                            </div>
                                          </div>
                                        </DialogContent>
                                      </Dialog>
                                      <Button 
                                        variant="destructive"
                                        onClick={() => rejectExpenseMutation.mutate({ 
                                          id: selectedApproval.id, 
                                          reason: "Rejected by GED" 
                                        })}
                                        disabled={rejectExpenseMutation.isPending}
                                      >
                                        <AlertTriangle className="w-4 h-4 mr-2" />
                                        Reject
                                      </Button>
                                    </div>
                                  </div>
                                )}
                              </DialogContent>
                            </Dialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="transfers" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>New Fund Transfer</CardTitle>
                <p className="text-sm text-gray-600">Transfer funds between accounts</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>From Account</Label>
                    <Select value={fromAccount} onValueChange={setFromAccount}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select source account" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fintech-primary">Fintech Primary</SelectItem>
                        <SelectItem value="fintech-reserve">Fintech Reserve</SelectItem>
                        <SelectItem value="business-operating">Business Operating</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>To Account</Label>
                    <Select value={toAccount} onValueChange={setToAccount}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select destination account" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="business-main">Business Main Account</SelectItem>
                        <SelectItem value="business-reserve">Business Reserve</SelectItem>
                        <SelectItem value="fintech-primary">Fintech Primary</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label>Amount (NGN)</Label>
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={transferAmount}
                    onChange={(e) => setTransferAmount(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Purpose</Label>
                  <Textarea
                    placeholder="Internal fund reallocation..."
                    value={transferPurpose}
                    onChange={(e) => setTransferPurpose(e.target.value)}
                  />
                </div>
                <Button 
                  className="w-full"
                  onClick={() => fundTransferMutation.mutate({
                    fromAccount,
                    toAccount,
                    amount: transferAmount,
                    purpose: transferPurpose
                  })}
                  disabled={!fromAccount || !toAccount || !transferAmount || !transferPurpose || fundTransferMutation.isPending}
                >
                  <ArrowRightLeft className="w-4 h-4 mr-2" />
                  Execute Transfer
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recent Transfers</CardTitle>
                <p className="text-sm text-gray-600">Recent fund transfer activity</p>
              </CardHeader>
              <CardContent>
                {transfersLoading ? (
                  <div className="text-center py-8">Loading transfers...</div>
                ) : (
                  <div className="space-y-4">
                    {fundTransfers?.slice(0, 5).map((transfer) => (
                      <div key={transfer.id} className="flex items-center justify-between p-3 border rounded">
                        <div className="flex items-center gap-3">
                          <ArrowRightLeft className="w-4 h-4 text-blue-600" />
                          <div>
                            <p className="font-medium text-sm">{transfer.fromAccount} → {transfer.toAccount}</p>
                            <p className="text-xs text-gray-600">{transfer.purpose}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold">{formatCurrency(transfer.amount)}</p>
                          <Badge variant={transfer.status === 'completed' ? 'default' : 'outline'}>
                            {transfer.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Approval Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Approved This Month</span>
                    <span className="font-bold text-green-600">{gedMetrics?.approvedThisMonth || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Rejected This Month</span>
                    <span className="font-bold text-red-600">{gedMetrics?.rejectedThisMonth || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Average Approval Time</span>
                    <span className="font-bold">{gedMetrics?.averageApprovalTime || "N/A"}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Fund Flow Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Total Transfers This Month</span>
                    <span className="font-bold">{formatCurrency(gedMetrics?.fundTransferVolume || "0")}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Business Account Balance</span>
                    <span className="font-bold text-green-600">{formatCurrency(gedMetrics?.businessAccountBalance || "0")}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Fintech Accounts Balance</span>
                    <span className="font-bold text-blue-600">{formatCurrency(gedMetrics?.fintechAccountBalance || "0")}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}