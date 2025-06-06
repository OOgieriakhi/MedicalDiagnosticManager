import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  AlertTriangle,
  FileText,
  DollarSign,
  User,
  Calendar,
  Send,
  Printer,
  Mail
} from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

export default function PurchaseOrderApprovals() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [selectedPO, setSelectedPO] = useState<any>(null);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [showExecutionModal, setShowExecutionModal] = useState(false);
  const [approvalAction, setApprovalAction] = useState<'approve' | 'reject'>('approve');
  const [approvalComments, setApprovalComments] = useState("");
  const [executionMethod, setExecutionMethod] = useState<'email' | 'print'>('email');

  // Fetch pending purchase orders requiring approval
  const { data: pendingApprovals = [] } = useQuery({
    queryKey: ['/api/purchase-orders/pending-approval'],
  });

  // Fetch approved purchase orders
  const { data: approvedOrders = [] } = useQuery({
    queryKey: ['/api/purchase-orders/approved'],
  });

  // Approve/Reject purchase order mutation
  const approvalMutation = useMutation({
    mutationFn: async ({ poId, action, comments }: { poId: number, action: 'approve' | 'reject', comments: string }) => {
      const response = await fetch(`/api/purchase-orders/${poId}/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comments })
      });
      if (!response.ok) throw new Error(`Failed to ${action} purchase order`);
      return response.json();
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/purchase-orders/pending-approval'] });
      queryClient.invalidateQueries({ queryKey: ['/api/purchase-orders/approved'] });
      queryClient.invalidateQueries({ queryKey: ['/api/purchase-orders'] });
      toast({ 
        title: `Purchase order ${variables.action === 'approve' ? 'approved' : 'rejected'} successfully` 
      });
      setShowApprovalModal(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({ 
        title: "Approval action failed", 
        description: error.message,
        variant: "destructive" 
      });
    }
  });

  // Execute purchase order mutation
  const executeMutation = useMutation({
    mutationFn: async ({ poId, method }: { poId: number, method: 'email' | 'print' }) => {
      const response = await fetch(`/api/purchase-orders/${poId}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method })
      });
      if (!response.ok) throw new Error('Failed to execute purchase order');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/purchase-orders/approved'] });
      queryClient.invalidateQueries({ queryKey: ['/api/purchase-orders/delivery-pending'] });
      setShowExecutionModal(false);
      toast({
        title: "Purchase order executed and sent to vendor successfully"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Execution failed",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const handleApprovalAction = (po: any, action: 'approve' | 'reject') => {
    setSelectedPO(po);
    setApprovalAction(action);
    setShowApprovalModal(true);
  };

  const handleExecuteOrder = (po: any) => {
    setSelectedPO(po);
    setShowExecutionModal(true);
  };

  const submitApproval = () => {
    if (!selectedPO) return;

    approvalMutation.mutate({
      poId: selectedPO.id,
      action: approvalAction,
      comments: approvalComments
    });
  };

  const resetForm = () => {
    setSelectedPO(null);
    setApprovalAction('approve');
    setApprovalComments("");
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      'pending_approval': { label: 'Pending Approval', variant: 'secondary' as const, icon: Clock },
      'approved': { label: 'Approved', variant: 'default' as const, icon: CheckCircle },
      'rejected': { label: 'Rejected', variant: 'destructive' as const, icon: XCircle },
      'executed': { label: 'Executed', variant: 'default' as const, icon: CheckCircle }
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

  const getUrgencyBadge = (amount: number) => {
    if (amount >= 1000000) return <Badge variant="destructive">High Priority</Badge>;
    if (amount >= 500000) return <Badge variant="default">Medium Priority</Badge>;
    return <Badge variant="secondary">Normal</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Purchase Order Approvals</h1>
        <p className="text-muted-foreground">
          Review and approve purchase orders before execution
        </p>
      </div>

      {/* Pending Approvals */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Pending Approvals
          </CardTitle>
          <CardDescription>
            Purchase orders requiring approval before execution
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>PO Number</TableHead>
                <TableHead>Vendor</TableHead>
                <TableHead>Requested By</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Created Date</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pendingApprovals.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    No purchase orders pending approval
                  </TableCell>
                </TableRow>
              ) : (
                pendingApprovals.map((po: any) => (
                  <TableRow key={po.id}>
                    <TableCell className="font-medium">{po.poNumber}</TableCell>
                    <TableCell>{po.vendorName}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        {po.requestedBy}
                      </div>
                    </TableCell>
                    <TableCell className={getPriorityColor(po.totalAmount)}>
                      ₦{parseFloat(po.totalAmount || 0).toLocaleString()}
                    </TableCell>
                    <TableCell>{getUrgencyBadge(po.totalAmount)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        {new Date(po.createdAt).toLocaleDateString()}
                      </div>
                    </TableCell>
                    <TableCell className="max-w-xs truncate">{po.description}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => {
                            toast({
                              title: "Purchase Order Details",
                              description: `PO: ${po.poNumber} | Vendor: ${po.vendorName} | Amount: ₦${parseFloat(po.totalAmount || 0).toLocaleString()} | Items: ${po.itemCount || 0}`
                            });
                          }}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                        <Button 
                          size="sm" 
                          className="bg-green-600 hover:bg-green-700"
                          onClick={() => handleApprovalAction(po, 'approve')}
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Approve
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          className="text-red-600 border-red-600 hover:bg-red-50"
                          onClick={() => handleApprovalAction(po, 'reject')}
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          Reject
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

      {/* Approved Orders */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5" />
            Approved Purchase Orders
          </CardTitle>
          <CardDescription>
            Purchase orders approved and ready for execution
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>PO Number</TableHead>
                <TableHead>Vendor</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Approved By</TableHead>
                <TableHead>Approved Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {approvedOrders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No approved purchase orders yet
                  </TableCell>
                </TableRow>
              ) : (
                approvedOrders.map((po: any) => (
                  <TableRow key={po.id}>
                    <TableCell className="font-medium">{po.poNumber}</TableCell>
                    <TableCell>{po.vendorName}</TableCell>
                    <TableCell className={getPriorityColor(po.totalAmount)}>
                      ₦{parseFloat(po.totalAmount || 0).toLocaleString()}
                    </TableCell>
                    <TableCell>{po.approvedByName}</TableCell>
                    <TableCell>{new Date(po.approvedAt).toLocaleDateString()}</TableCell>
                    <TableCell>{getStatusBadge(po.status)}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline">
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                        {po.status === 'approved' && (
                          <Button 
                            size="sm" 
                            onClick={() => handleExecuteOrder(po)}
                            className="bg-green-600 hover:bg-green-700 text-white"
                          >
                            <Send className="h-4 w-4 mr-1" />
                            Execute
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

      {/* Approval Modal */}
      <Dialog open={showApprovalModal} onOpenChange={setShowApprovalModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {approvalAction === 'approve' ? 'Approve' : 'Reject'} Purchase Order
            </DialogTitle>
            <DialogDescription>
              {approvalAction === 'approve' 
                ? 'Approve this purchase order for execution'
                : 'Reject this purchase order with comments'
              }: {selectedPO?.poNumber}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Purchase Order Summary */}
            {selectedPO && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold mb-2">Purchase Order Details</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Vendor:</span> {selectedPO.vendorName}
                  </div>
                  <div>
                    <span className="font-medium">Total Amount:</span> ₦{parseFloat(selectedPO.totalAmount || 0).toLocaleString()}
                  </div>
                  <div>
                    <span className="font-medium">Requested By:</span> {selectedPO.requestedBy}
                  </div>
                  <div>
                    <span className="font-medium">Request Date:</span> {new Date(selectedPO.createdAt).toLocaleDateString()}
                  </div>
                  <div className="col-span-2">
                    <span className="font-medium">Description:</span> {selectedPO.description}
                  </div>
                </div>
              </div>
            )}

            {/* Approval Comments */}
            <div>
              <label className="block text-sm font-medium mb-2">
                {approvalAction === 'approve' ? 'Approval Comments' : 'Rejection Reason'} *
              </label>
              <Textarea
                value={approvalComments}
                onChange={(e) => setApprovalComments(e.target.value)}
                placeholder={
                  approvalAction === 'approve' 
                    ? "Add any comments or conditions for this approval..."
                    : "Please provide a clear reason for rejecting this purchase order..."
                }
                rows={4}
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setShowApprovalModal(false)}>
                Cancel
              </Button>
              <Button 
                onClick={submitApproval}
                disabled={!approvalComments.trim() || approvalMutation.isPending}
                className={approvalAction === 'approve' 
                  ? "bg-green-600 hover:bg-green-700" 
                  : "bg-red-600 hover:bg-red-700"
                }
              >
                {approvalMutation.isPending 
                  ? `${approvalAction === 'approve' ? 'Approving' : 'Rejecting'}...`
                  : `${approvalAction === 'approve' ? 'Approve' : 'Reject'} Purchase Order`
                }
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Execution Modal */}
      <Dialog open={showExecutionModal} onOpenChange={setShowExecutionModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Execute Purchase Order</DialogTitle>
            <DialogDescription>
              Send {selectedPO?.poNumber} to vendor {selectedPO?.vendorName}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant={executionMethod === 'email' ? 'default' : 'outline'}
                onClick={() => setExecutionMethod('email')}
                className="flex items-center gap-2"
              >
                <Mail className="h-4 w-4" />
                Email Vendor
              </Button>
              <Button
                variant={executionMethod === 'print' ? 'default' : 'outline'}
                onClick={() => setExecutionMethod('print')}
                className="flex items-center gap-2"
              >
                <Printer className="h-4 w-4" />
                Print Order
              </Button>
            </div>
            
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setShowExecutionModal(false)}>
                Cancel
              </Button>
              <Button 
                onClick={() => executeMutation.mutate({ poId: selectedPO?.id, method: executionMethod })}
                disabled={executeMutation.isPending}
                className="bg-green-600 hover:bg-green-700"
              >
                {executeMutation.isPending ? 'Executing...' : 'Execute Order'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}