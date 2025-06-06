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
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/purchase-orders/approved'] });
      queryClient.invalidateQueries({ queryKey: ['/api/purchase-orders/delivery-pending'] });
      setShowExecutionModal(false);
      
      // Handle print functionality
      if (variables.method === 'print' && data.printData) {
        openPrintWindow(data.printData);
      }
      
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

  const openPrintWindow = (poData: any) => {
    const items = typeof poData.items === 'string' ? JSON.parse(poData.items) : poData.items || [];
    
    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Purchase Order - ${poData.po_number}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .header { text-align: center; margin-bottom: 30px; }
          .company-info { text-align: center; margin-bottom: 20px; }
          .po-details { margin-bottom: 20px; }
          .vendor-info { margin-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f2f2f2; }
          .total { font-weight: bold; }
          .footer { margin-top: 30px; }
          @media print {
            body { margin: 0; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>PURCHASE ORDER</h1>
        </div>
        
        <div class="company-info">
          <h2>Medical Diagnostic Center</h2>
          <p>123 Healthcare Drive, Medical District<br>
          Phone: (555) 123-4567 | Email: orders@medcenter.com</p>
        </div>
        
        <div class="po-details">
          <table style="width: 100%; border: none;">
            <tr style="border: none;">
              <td style="border: none; width: 50%;"><strong>PO Number:</strong> ${poData.po_number}</td>
              <td style="border: none; width: 50%;"><strong>Date:</strong> ${new Date(poData.created_at).toLocaleDateString()}</td>
            </tr>
            <tr style="border: none;">
              <td style="border: none;"><strong>Vendor:</strong> ${poData.vendor_name}</td>
              <td style="border: none;"><strong>Status:</strong> ${poData.status}</td>
            </tr>
          </table>
        </div>
        
        <div class="vendor-info">
          <h3>Vendor Information</h3>
          <p><strong>${poData.vendor_name}</strong><br>
          Contact for delivery and invoicing</p>
        </div>
        
        <table>
          <thead>
            <tr>
              <th>Item Description</th>
              <th>Quantity</th>
              <th>Unit</th>
              <th>Unit Price</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            ${items.map((item: any) => `
              <tr>
                <td>${item.description}</td>
                <td>${item.quantity}</td>
                <td>${item.unit}</td>
                <td>₦${parseFloat(item.unitPrice || 0).toLocaleString()}</td>
                <td>₦${(parseFloat(item.unitPrice || 0) * parseFloat(item.quantity || 0)).toLocaleString()}</td>
              </tr>
            `).join('')}
          </tbody>
          <tfoot>
            <tr class="total">
              <td colspan="4" style="text-align: right;"><strong>Total Amount:</strong></td>
              <td><strong>₦${parseFloat(poData.total_amount || 0).toLocaleString()}</strong></td>
            </tr>
          </tfoot>
        </table>
        
        <div class="footer">
          <p><strong>Notes:</strong> ${poData.notes || 'Please deliver items as specified and provide delivery confirmation.'}</p>
          <p><strong>Terms:</strong> Payment within 30 days of delivery. All items subject to quality inspection.</p>
          
          <div style="margin-top: 40px;">
            <div style="display: inline-block; width: 45%;">
              <div style="border-top: 1px solid #000; margin-top: 40px; text-align: center;">
                Authorized Signature
              </div>
            </div>
            <div style="display: inline-block; width: 45%; margin-left: 10%;">
              <div style="border-top: 1px solid #000; margin-top: 40px; text-align: center;">
                Date
              </div>
            </div>
          </div>
        </div>
        
        <div class="no-print" style="margin-top: 20px; text-align: center;">
          <button onclick="window.print()" style="background: #007bff; color: white; border: none; padding: 10px 20px; cursor: pointer;">Print</button>
          <button onclick="window.close()" style="background: #6c757d; color: white; border: none; padding: 10px 20px; cursor: pointer; margin-left: 10px;">Close</button>
        </div>
      </body>
      </html>
    `;
    
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      // Auto-trigger print dialog after a small delay
      setTimeout(() => {
        printWindow.print();
      }, 500);
    }
  };

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
                
                {/* Order Items */}
                <div className="mt-4">
                  <h4 className="font-semibold mb-2">Order Items</h4>
                  <div className="border rounded-lg">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Description</TableHead>
                          <TableHead>Qty</TableHead>
                          <TableHead>Unit</TableHead>
                          <TableHead>Unit Price</TableHead>
                          <TableHead>Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(() => {
                          try {
                            const items = typeof selectedPO.items === 'string' ? JSON.parse(selectedPO.items) : selectedPO.items || [];
                            return items.map((item: any, index: number) => (
                              <TableRow key={index}>
                                <TableCell>{item.description}</TableCell>
                                <TableCell>{item.quantity}</TableCell>
                                <TableCell>{item.unit}</TableCell>
                                <TableCell>₦{parseFloat(item.unitPrice || 0).toLocaleString()}</TableCell>
                                <TableCell>₦{(parseFloat(item.unitPrice || 0) * parseFloat(item.quantity || 0)).toLocaleString()}</TableCell>
                              </TableRow>
                            ));
                          } catch (e) {
                            return (
                              <TableRow>
                                <TableCell colSpan={5} className="text-center text-muted-foreground">
                                  Unable to display items
                                </TableCell>
                              </TableRow>
                            );
                          }
                        })()}
                      </TableBody>
                    </Table>
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
            <div className="grid grid-cols-1 gap-3">
              <Button
                onClick={() => executeMutation.mutate({ poId: selectedPO?.id, method: 'email' })}
                disabled={executeMutation.isPending}
                variant="outline"
                className="flex items-center gap-2 h-12"
              >
                <Mail className="h-4 w-4" />
                Email Vendor
              </Button>
              <Button
                onClick={() => executeMutation.mutate({ poId: selectedPO?.id, method: 'print' })}
                disabled={executeMutation.isPending}
                className="flex items-center gap-2 h-12 bg-green-600 hover:bg-green-700"
              >
                <Printer className="h-4 w-4" />
                Print Order
              </Button>
            </div>
            
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setShowExecutionModal(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}