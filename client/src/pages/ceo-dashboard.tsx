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

  // CEO approval limit: 500,000 NGN (highest authority)
  const CEO_LIMIT = 500000;

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

  const canApproveAmount = (amount: number) => amount <= CEO_LIMIT;

  const handleApprove = (transactionId: number) => {
    approveMutation.mutate(transactionId);
  };

  const handleReject = (transactionId: number) => {
    rejectMutation.mutate(transactionId);
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
                pendingTransactions.map((transaction: any) => {
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
                    <TableRow key={transaction.id} className={amount > 100000 ? 'bg-red-50' : ''}>
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
                        <Badge className={levelColor}>
                          {levelText}
                        </Badge>
                      </TableCell>
                      <TableCell>{transaction.requestedBy}</TableCell>
                      <TableCell>{new Date(transaction.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell>
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
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}