import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle, XCircle, TrendingUp, DollarSign, AlertTriangle, Users } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function FinanceDirectorDashboard() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Finance Director approval limit: 100,000 NGN
  const FINANCE_DIRECTOR_LIMIT = 100000;

  const { data: transactions } = useQuery({
    queryKey: ['/api/petty-cash/transactions'],
  });

  const { data: userPermissions } = useQuery({
    queryKey: ['/api/petty-cash/user-permissions'],
  });

  const approveMutation = useMutation({
    mutationFn: (transactionId: number) => 
      apiRequest(`/api/petty-cash/approve/${transactionId}`, { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/petty-cash/transactions'] });
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
    mutationFn: (transactionId: number) => 
      apiRequest(`/api/petty-cash/reject/${transactionId}`, { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/petty-cash/transactions'] });
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

  const pendingTransactions = Array.isArray(transactions) 
    ? transactions.filter((t: any) => t.status === 'pending')
    : [];

  const canApproveAmount = (amount: number) => amount <= FINANCE_DIRECTOR_LIMIT;

  const handleApprove = (transactionId: number) => {
    approveMutation.mutate(transactionId);
  };

  const handleReject = (transactionId: number) => {
    rejectMutation.mutate(transactionId);
  };

  // Calculate metrics
  const totalPendingAmount = pendingTransactions.reduce((sum: number, t: any) => sum + parseFloat(t.amount), 0);
  const approvableAmount = pendingTransactions
    .filter((t: any) => canApproveAmount(parseFloat(t.amount)))
    .reduce((sum: number, t: any) => sum + parseFloat(t.amount), 0);
  const requiresCEOApproval = pendingTransactions.filter((t: any) => !canApproveAmount(parseFloat(t.amount)));

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Finance Director Dashboard</h2>
        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="px-3 py-1">
            Approval Limit: ₦{FINANCE_DIRECTOR_LIMIT.toLocaleString()}
          </Badge>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Approvals</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingTransactions.length}</div>
            <p className="text-xs text-muted-foreground">
              ₦{totalPendingAmount.toLocaleString()}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Can Approve</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {pendingTransactions.filter((t: any) => canApproveAmount(parseFloat(t.amount))).length}
            </div>
            <p className="text-xs text-muted-foreground">
              ₦{approvableAmount.toLocaleString()}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Requires CEO</CardTitle>
            <Users className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{requiresCEOApproval.length}</div>
            <p className="text-xs text-muted-foreground">
              Above ₦{FINANCE_DIRECTOR_LIMIT.toLocaleString()}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approval Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {pendingTransactions.length > 0 
                ? Math.round((pendingTransactions.filter((t: any) => canApproveAmount(parseFloat(t.amount))).length / pendingTransactions.length) * 100)
                : 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              Within authority
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Pending Approvals Table */}
      <Card>
        <CardHeader>
          <CardTitle>Pending Petty Cash Approvals</CardTitle>
          <CardDescription>
            Review and approve transactions within your ₦{FINANCE_DIRECTOR_LIMIT.toLocaleString()} authorization limit
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
                <TableHead>Requested By</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pendingTransactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    No pending approvals
                  </TableCell>
                </TableRow>
              ) : (
                pendingTransactions.map((transaction: any) => (
                  <TableRow key={transaction.id}>
                    <TableCell className="font-medium">{transaction.transactionNumber}</TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className={`font-medium ${canApproveAmount(parseFloat(transaction.amount)) ? 'text-green-600' : 'text-red-600'}`}>
                          ₦{parseFloat(transaction.amount).toLocaleString()}
                        </span>
                        {!canApproveAmount(parseFloat(transaction.amount)) && (
                          <span className="text-xs text-red-500">Exceeds limit</span>
                        )}
                      </div>
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
                    <TableCell>{transaction.requestedBy}</TableCell>
                    <TableCell>{new Date(transaction.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell>
                      {canApproveAmount(parseFloat(transaction.amount)) ? (
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            className="bg-green-600 hover:bg-green-700"
                            onClick={() => handleApprove(transaction.id)}
                            disabled={approveMutation.isPending}
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Approve
                          </Button>
                          <Button 
                            size="sm" 
                            variant="destructive"
                            onClick={() => handleReject(transaction.id)}
                            disabled={rejectMutation.isPending}
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            Reject
                          </Button>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-1">
                          <div className="flex gap-2">
                            <Button 
                              size="sm" 
                              disabled
                              className="opacity-50 cursor-not-allowed"
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Approve
                            </Button>
                            <Button 
                              size="sm" 
                              disabled
                              variant="destructive" 
                              className="opacity-50 cursor-not-allowed"
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              Reject
                            </Button>
                          </div>
                          <p className="text-xs text-red-600">
                            Requires CEO approval
                          </p>
                        </div>
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