import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle, XCircle, TrendingUp, DollarSign, AlertTriangle, Shield, Crown, Eye, MessageSquare, FileText } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";

export default function CEODashboard() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [selectedApproval, setSelectedApproval] = useState<any>(null);
  const [queryText, setQueryText] = useState("");
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showQueryModal, setShowQueryModal] = useState(false);

  // CEO approval limit: 500,000 NGN (highest authority)
  const CEO_LIMIT = 500000;

  const { data: transactions } = useQuery({
    queryKey: ['/api/approvals/all-pending'],
  });

  const { data: userPermissions } = useQuery({
    queryKey: ['/api/petty-cash/user-permissions'],
  });

  const approveMutation = useMutation({
    mutationFn: (data: {transactionId: number, type: string}) => {
      const endpoint = data.type === 'petty_cash' 
        ? `/api/petty-cash/approve/${data.transactionId}`
        : `/api/purchase-orders/approve/${data.transactionId}`;
      return fetch(endpoint, { method: 'POST', credentials: 'include' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/approvals/all-pending'] });
      toast({ title: "Transaction approved successfully" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Approval failed", 
        description: error.message || "Failed to approve transaction",
        variant: "destructive" 
      });
    }
  });

  const rejectMutation = useMutation({
    mutationFn: (data: {transactionId: number, type: string}) => {
      const endpoint = data.type === 'petty_cash' 
        ? `/api/petty-cash/reject/${data.transactionId}`
        : `/api/purchase-orders/reject/${data.transactionId}`;
      return fetch(endpoint, { method: 'POST', credentials: 'include' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/approvals/all-pending'] });
      toast({ title: "Transaction rejected successfully" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Rejection failed", 
        description: error.message || "Failed to reject transaction",
        variant: "destructive" 
      });
    }
  });

  const queryMutation = useMutation({
    mutationFn: (data: {approvalId: number, query: string, queryType: string}) => 
      fetch(`/api/approvals/${data.approvalId}/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ query: data.query, queryType: data.queryType })
      }),
    onSuccess: () => {
      setShowQueryModal(false);
      setQueryText("");
      queryClient.invalidateQueries({ queryKey: ['/api/approvals/all-pending'] });
      toast({ title: "Query submitted successfully" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to submit query", 
        description: error.message || "Please try again",
        variant: "destructive" 
      });
    }
  });

  const pendingTransactions = Array.isArray(transactions) 
    ? transactions.filter((t: any) => t.status === 'pending')
    : [];

  const canApproveAmount = (amount: number) => amount <= CEO_LIMIT;

  const handleApprove = (transactionId: number, type: string) => {
    approveMutation.mutate({ transactionId, type });
  };

  const handleReject = (transactionId: number, type: string) => {
    rejectMutation.mutate({ transactionId, type });
  };

  const handleViewDetails = async (approval: any) => {
    setSelectedApproval(approval);
    setShowDetailsModal(true);
  };

  const handleRaiseQuery = (approval: any) => {
    setSelectedApproval(approval);
    setShowQueryModal(true);
  };

  const submitQuery = () => {
    if (!selectedApproval || !queryText.trim()) return;
    
    queryMutation.mutate({
      approvalId: selectedApproval.id,
      query: queryText,
      queryType: 'clarification_request'
    });
  };

  // Calculate metrics
  const totalPendingAmount = pendingTransactions.reduce((sum: number, t: any) => sum + parseFloat(t.amount), 0);
  const highValueTransactions = pendingTransactions.filter((t: any) => parseFloat(t.amount) > 100000);
  const urgentTransactions = pendingTransactions.filter((t: any) => t.priority === 'urgent');

  // Categorize by approval levels
  const branchManagerLevel = pendingTransactions.filter((t: any) => parseFloat(t.amount) <= 25000);
  const financeManagerLevel = pendingTransactions.filter((t: any) => parseFloat(t.amount) > 25000 && parseFloat(t.amount) <= 100000);
  const ceoLevel = pendingTransactions.filter((t: any) => parseFloat(t.amount) > 100000);

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <div className="flex items-center space-x-3">
          <Crown className="h-8 w-8 text-yellow-600" />
          <h2 className="text-3xl font-bold tracking-tight">CEO Executive Dashboard</h2>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="px-3 py-1 bg-yellow-50 border-yellow-200">
            <Shield className="h-4 w-4 mr-1" />
            Full Authority: ₦{CEO_LIMIT.toLocaleString()}
          </Badge>
        </div>
      </div>

      {/* Executive Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-l-4 border-l-red-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">High Value Pending</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{ceoLevel.length}</div>
            <p className="text-xs text-muted-foreground">
              Above ₦100,000 - Requires CEO approval
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Urgent Priority</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{urgentTransactions.length}</div>
            <p className="text-xs text-muted-foreground">
              Requires immediate attention
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Pending Value</CardTitle>
            <DollarSign className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">₦{totalPendingAmount.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Across {pendingTransactions.length} transactions
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approval Authority</CardTitle>
            <Shield className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">100%</div>
            <p className="text-xs text-muted-foreground">
              Can approve all transactions
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Approval Level Breakdown */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Branch Manager Level</CardTitle>
            <CardDescription>Transactions ≤ ₦25,000</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{branchManagerLevel.length}</div>
            <p className="text-sm text-muted-foreground">
              ₦{branchManagerLevel.reduce((sum: number, t: any) => sum + parseFloat(t.amount), 0).toLocaleString()}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Finance Manager Level</CardTitle>
            <CardDescription>₦25,001 - ₦100,000</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{financeManagerLevel.length}</div>
            <p className="text-sm text-muted-foreground">
              ₦{financeManagerLevel.reduce((sum: number, t: any) => sum + parseFloat(t.amount), 0).toLocaleString()}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">CEO Level</CardTitle>
            <CardDescription>Above ₦100,000</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{ceoLevel.length}</div>
            <p className="text-sm text-muted-foreground">
              ₦{ceoLevel.reduce((sum: number, t: any) => sum + parseFloat(t.amount), 0).toLocaleString()}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Executive Approval Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Crown className="h-5 w-5 text-yellow-600" />
            <span>Executive Approval Center</span>
          </CardTitle>
          <CardDescription>
            Full authorization to approve all petty cash transactions up to ₦{CEO_LIMIT.toLocaleString()}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Transaction #</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Purpose</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Level</TableHead>
                <TableHead>Requested By</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pendingTransactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                    No pending approvals
                  </TableCell>
                </TableRow>
              ) : (
                pendingTransactions.map((transaction: any, index: number) => {
                  const amount = parseFloat(transaction.amount);
                  let levelColor = 'bg-green-100 text-green-800';
                  let levelText = 'Branch Manager';
                  
                  if (amount > 100000) {
                    levelColor = 'bg-red-100 text-red-800';
                    levelText = 'CEO Required';
                  } else if (amount > 25000) {
                    levelColor = 'bg-orange-100 text-orange-800';
                    levelText = 'Finance Manager';
                  }

                  return (
                    <TableRow key={`${transaction.id}-${transaction.transactionNumber || 'transaction'}-${index}`} className={amount > 100000 ? 'bg-red-50' : ''}>
                      <TableCell className="font-medium">{transaction.transactionNumber}</TableCell>
                      <TableCell>
                        <span className={`font-bold ${amount > 100000 ? 'text-red-600' : amount > 25000 ? 'text-orange-600' : 'text-green-600'}`}>
                          ₦{amount.toLocaleString()}
                        </span>
                      </TableCell>
                      <TableCell>{transaction.purpose}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{transaction.category}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={transaction.priority === 'urgent' ? 'destructive' : 'secondary'}>
                          {transaction.priority}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <Badge className={levelColor}>
                            {levelText}
                          </Badge>
                          {transaction.status === 'queried' && (
                            <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300">
                              Query Sent
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{transaction.requestedBy}</TableCell>
                      <TableCell>{new Date(transaction.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleViewDetails(transaction)}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleRaiseQuery(transaction)}
                            disabled={['approved', 'rejected', 'queried'].includes(transaction.status)}
                          >
                            <MessageSquare className="h-4 w-4 mr-1" />
                            Query
                          </Button>
                          <Button 
                            size="sm" 
                            className="bg-green-600 hover:bg-green-700"
                            onClick={() => handleApprove(transaction.id, transaction.type || 'petty_cash')}
                            disabled={approveMutation.isPending || ['approved', 'rejected', 'queried'].includes(transaction.status)}
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            {transaction.status === 'approved' ? 'Approved' : 'Approve'}
                          </Button>
                          <Button 
                            size="sm" 
                            variant="destructive"
                            onClick={() => handleReject(transaction.id, transaction.type || 'petty_cash')}
                            disabled={rejectMutation.isPending || ['approved', 'rejected', 'queried'].includes(transaction.status)}
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            {transaction.status === 'rejected' ? 'Rejected' : 'Reject'}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Approval Details Modal */}
      <Dialog open={showDetailsModal} onOpenChange={setShowDetailsModal}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <FileText className="h-5 w-5" />
              <span>Approval Details - {selectedApproval?.module}</span>
            </DialogTitle>
            <DialogDescription>
              Review comprehensive details for {selectedApproval?.transactionNumber}
            </DialogDescription>
          </DialogHeader>
          
          {selectedApproval && (
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold text-sm text-muted-foreground">Transaction Details</h4>
                  <div className="space-y-2 mt-2">
                    <div className="flex justify-between">
                      <span className="text-sm">Transaction #:</span>
                      <span className="font-medium">{selectedApproval.transactionNumber}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Amount:</span>
                      <span className="font-bold text-lg">₦{parseFloat(selectedApproval.amount || 0).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Purpose:</span>
                      <span className="font-medium">{selectedApproval.purpose}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Category:</span>
                      <Badge variant="outline">{selectedApproval.category}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Priority:</span>
                      <Badge variant={selectedApproval.priority === 'urgent' ? 'destructive' : 'secondary'}>
                        {selectedApproval.priority}
                      </Badge>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold text-sm text-muted-foreground">Requester Information</h4>
                  <div className="space-y-2 mt-2">
                    <div className="flex justify-between">
                      <span className="text-sm">Requested By:</span>
                      <span className="font-medium">{selectedApproval.requestedBy}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Date Requested:</span>
                      <span className="font-medium">{new Date(selectedApproval.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold text-sm text-muted-foreground">Justification</h4>
                  <p className="text-sm mt-2 p-3 bg-gray-50 rounded-md">
                    {selectedApproval.justification || selectedApproval.description || "No additional justification provided"}
                  </p>
                </div>

                <div>
                  <h4 className="font-semibold text-sm text-muted-foreground">Approval Level</h4>
                  <div className="mt-2">
                    {parseFloat(selectedApproval.amount || 0) <= 25000 && (
                      <Badge className="bg-green-100 text-green-800">Branch Manager Level</Badge>
                    )}
                    {parseFloat(selectedApproval.amount || 0) > 25000 && parseFloat(selectedApproval.amount || 0) <= 100000 && (
                      <Badge className="bg-orange-100 text-orange-800">Finance Manager Level</Badge>
                    )}
                    {parseFloat(selectedApproval.amount || 0) > 100000 && (
                      <Badge className="bg-red-100 text-red-800">CEO Level Required</Badge>
                    )}
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold text-sm text-muted-foreground">Status</h4>
                  <Badge variant="outline" className="mt-2">
                    {selectedApproval.status?.replace('_', ' ').toUpperCase()}
                  </Badge>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="flex justify-between">
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => handleRaiseQuery(selectedApproval)}
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                Raise Query
              </Button>
            </div>
            <div className="flex gap-2">
              <Button 
                className="bg-green-600 hover:bg-green-700"
                onClick={() => {
                  handleApprove(selectedApproval.id, selectedApproval.type || 'petty_cash');
                  setShowDetailsModal(false);
                }}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Approve
              </Button>
              <Button 
                variant="destructive"
                onClick={() => {
                  handleReject(selectedApproval.id, selectedApproval.type || 'petty_cash');
                  setShowDetailsModal(false);
                }}
              >
                <XCircle className="h-4 w-4 mr-2" />
                Reject
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Query Modal */}
      <Dialog open={showQueryModal} onOpenChange={setShowQueryModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Raise Query</DialogTitle>
            <DialogDescription>
              Request clarification or additional information for this approval
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Transaction: {selectedApproval?.transactionNumber}</label>
              <p className="text-sm text-muted-foreground">Amount: ₦{parseFloat(selectedApproval?.amount || 0).toLocaleString()}</p>
            </div>
            
            <div>
              <label htmlFor="query" className="text-sm font-medium">Your Query</label>
              <Textarea
                id="query"
                placeholder="Please provide additional details about..."
                value={queryText}
                onChange={(e) => setQueryText(e.target.value)}
                className="mt-2"
                rows={4}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowQueryModal(false)}>
              Cancel
            </Button>
            <Button 
              onClick={submitQuery}
              disabled={!queryText.trim() || queryMutation.isPending}
            >
              Submit Query
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}