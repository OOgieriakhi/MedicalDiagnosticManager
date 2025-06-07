import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { CheckCircle, XCircle, Clock, FileText, Lock, Edit, AlertTriangle } from "lucide-react";

interface DailySummary {
  id: string;
  date: string;
  totalIncome: number;
  totalExpenses: number;
  netAmount: number;
  incomeBreakdown: Record<string, number>;
  expenseBreakdown: Record<string, number>;
  notes: string;
  submittedBy: string;
  submittedById: number;
  submittedAt: string;
  status: 'pending_approval' | 'approved' | 'rejected';
  managerApproval?: string;
  approvedAt?: string;
  approvedBy?: string;
  approvedById?: number;
  approvalComments?: string;
  rejectedAt?: string;
  rejectedBy?: string;
  rejectionReason?: string;
  lockTimestamp?: string;
  isLocked: boolean;
  lastEditedAt?: string;
  lastEditedBy?: string;
}

export default function DailySummaryManagement() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedSummary, setSelectedSummary] = useState<DailySummary | null>(null);
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");

  // Form states for submission
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    totalIncome: 0,
    totalExpenses: 0,
    notes: '',
    incomeBreakdown: {
      consultations: 0,
      laboratory: 0,
      radiology: 0,
      pharmacy: 0,
      other: 0
    },
    expenseBreakdown: {
      supplies: 0,
      utilities: 0,
      maintenance: 0,
      salaries: 0,
      other: 0
    }
  });

  const [approvalComments, setApprovalComments] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");

  // Fetch all daily summaries
  const { data: dailySummaries = [], isLoading, refetch } = useQuery<DailySummary[]>({
    queryKey: ["/api/accounting/daily-summaries", statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.append('status', statusFilter);
      
      const response = await fetch(`/api/accounting/daily-summaries?${params}`);
      if (!response.ok) throw new Error("Failed to fetch daily summaries");
      return response.json();
    },
  });

  // Fetch pending summaries for managers
  const { data: pendingSummaries = [] } = useQuery<DailySummary[]>({
    queryKey: ["/api/accounting/pending-daily-summaries"],
    enabled: ['branch_manager', 'manager', 'finance_director', 'ceo', 'admin'].includes(user?.role || ''),
    queryFn: async () => {
      const response = await fetch("/api/accounting/pending-daily-summaries");
      if (!response.ok) throw new Error("Failed to fetch pending summaries");
      return response.json();
    },
  });

  // Submit daily summary mutation
  const submitSummaryMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      return apiRequest('POST', '/api/accounting/submit-daily-summary', data);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Daily summary submitted for manager approval"
      });
      refetch();
      setShowSubmitDialog(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to submit daily summary",
        variant: "destructive"
      });
    }
  });

  // Approve summary mutation
  const approveSummaryMutation = useMutation({
    mutationFn: async ({ summaryId, comments }: { summaryId: string, comments: string }) => {
      return apiRequest('POST', `/api/accounting/approve-daily-summary/${summaryId}`, { approvalComments: comments });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Daily summary approved successfully"
      });
      refetch();
      setShowApprovalDialog(false);
      setSelectedSummary(null);
      setApprovalComments("");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to approve summary",
        variant: "destructive"
      });
    }
  });

  // Reject summary mutation
  const rejectSummaryMutation = useMutation({
    mutationFn: async ({ summaryId, reason }: { summaryId: string, reason: string }) => {
      return apiRequest('POST', `/api/accounting/reject-daily-summary/${summaryId}`, { rejectionReason: reason });
    },
    onSuccess: () => {
      toast({
        title: "Summary Rejected",
        description: "Daily summary has been rejected"
      });
      refetch();
      setShowApprovalDialog(false);
      setSelectedSummary(null);
      setRejectionReason("");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to reject summary",
        variant: "destructive"
      });
    }
  });

  // Test edit locked summary mutation
  const testEditMutation = useMutation({
    mutationFn: async (summaryId: string) => {
      return apiRequest('PUT', `/api/accounting/edit-daily-summary/${summaryId}`, {
        totalIncome: 999999,
        totalExpenses: 999999,
        notes: "UNAUTHORIZED EDIT ATTEMPT"
      });
    },
    onSuccess: () => {
      toast({
        title: "Edit Successful",
        description: "Summary was successfully edited"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Edit Blocked",
        description: error.message || "Edit was prevented by security controls",
        variant: "destructive"
      });
    }
  });

  const resetForm = () => {
    setFormData({
      date: new Date().toISOString().split('T')[0],
      totalIncome: 0,
      totalExpenses: 0,
      notes: '',
      incomeBreakdown: {
        consultations: 0,
        laboratory: 0,
        radiology: 0,
        pharmacy: 0,
        other: 0
      },
      expenseBreakdown: {
        supplies: 0,
        utilities: 0,
        maintenance: 0,
        salaries: 0,
        other: 0
      }
    });
  };

  const handleSubmit = () => {
    const totalIncome = Object.values(formData.incomeBreakdown).reduce((sum, val) => sum + val, 0);
    const totalExpenses = Object.values(formData.expenseBreakdown).reduce((sum, val) => sum + val, 0);
    
    submitSummaryMutation.mutate({
      ...formData,
      totalIncome,
      totalExpenses
    });
  };

  const getStatusBadge = (status: string, isLocked: boolean) => {
    switch (status) {
      case 'pending_approval':
        return <Badge variant="outline" className="text-yellow-600"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      case 'approved':
        return (
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-green-600"><CheckCircle className="w-3 h-3 mr-1" />Approved</Badge>
            {isLocked && <Lock className="w-4 h-4 text-red-500" title="Locked from edits" />}
          </div>
        );
      case 'rejected':
        return <Badge variant="outline" className="text-red-600"><XCircle className="w-3 h-3 mr-1" />Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const canManageApprovals = ['branch_manager', 'manager', 'finance_director', 'ceo', 'admin'].includes(user?.role || '');

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Daily Summary Management</h1>
        <div className="flex gap-4">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Summaries</SelectItem>
              <SelectItem value="pending_approval">Pending Approval</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
          
          <Dialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
            <DialogTrigger asChild>
              <Button><FileText className="w-4 h-4 mr-2" />Submit Daily Summary</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Submit Daily Income/Expense Summary</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="date">Date</Label>
                  <Input
                    id="date"
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Income Breakdown</Label>
                    <div className="space-y-2 mt-2">
                      {Object.entries(formData.incomeBreakdown).map(([key, value]) => (
                        <div key={key} className="flex items-center gap-2">
                          <Label className="w-24 capitalize">{key}:</Label>
                          <Input
                            type="number"
                            value={value}
                            onChange={(e) => setFormData(prev => ({
                              ...prev,
                              incomeBreakdown: {
                                ...prev.incomeBreakdown,
                                [key]: parseFloat(e.target.value) || 0
                              }
                            }))}
                            className="flex-1"
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label className="text-sm font-medium">Expense Breakdown</Label>
                    <div className="space-y-2 mt-2">
                      {Object.entries(formData.expenseBreakdown).map(([key, value]) => (
                        <div key={key} className="flex items-center gap-2">
                          <Label className="w-24 capitalize">{key}:</Label>
                          <Input
                            type="number"
                            value={value}
                            onChange={(e) => setFormData(prev => ({
                              ...prev,
                              expenseBreakdown: {
                                ...prev.expenseBreakdown,
                                [key]: parseFloat(e.target.value) || 0
                              }
                            }))}
                            className="flex-1"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div>
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Additional comments or observations..."
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setShowSubmitDialog(false)}>Cancel</Button>
                  <Button 
                    onClick={handleSubmit}
                    disabled={submitSummaryMutation.isPending}
                  >
                    {submitSummaryMutation.isPending ? "Submitting..." : "Submit for Approval"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Pending Approvals Card for Managers */}
      {canManageApprovals && pendingSummaries.length > 0 && (
        <Card className="border-yellow-200">
          <CardHeader>
            <CardTitle className="text-yellow-600 flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Pending Manager Approvals ({pendingSummaries.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {pendingSummaries.map((summary) => (
                <div key={summary.id} className="flex items-center justify-between p-3 border rounded">
                  <div>
                    <p className="font-medium">{summary.date} - Submitted by {summary.submittedBy}</p>
                    <p className="text-sm text-gray-600">
                      Income: ₦{summary.totalIncome.toLocaleString()} | 
                      Expenses: ₦{summary.totalExpenses.toLocaleString()} | 
                      Net: ₦{summary.netAmount.toLocaleString()}
                    </p>
                  </div>
                  <Button 
                    size="sm"
                    onClick={() => {
                      setSelectedSummary(summary);
                      setShowApprovalDialog(true);
                    }}
                  >
                    Review
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* All Daily Summaries Table */}
      <Card>
        <CardHeader>
          <CardTitle>Daily Summaries History</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Loading summaries...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Submitted By</TableHead>
                  <TableHead>Total Income</TableHead>
                  <TableHead>Total Expenses</TableHead>
                  <TableHead>Net Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Submitted At</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dailySummaries.map((summary) => (
                  <TableRow key={summary.id}>
                    <TableCell>{summary.date}</TableCell>
                    <TableCell>{summary.submittedBy}</TableCell>
                    <TableCell className="text-green-600">₦{summary.totalIncome.toLocaleString()}</TableCell>
                    <TableCell className="text-red-600">₦{summary.totalExpenses.toLocaleString()}</TableCell>
                    <TableCell className={summary.netAmount >= 0 ? "text-green-600" : "text-red-600"}>
                      ₦{summary.netAmount.toLocaleString()}
                    </TableCell>
                    <TableCell>{getStatusBadge(summary.status, summary.isLocked)}</TableCell>
                    <TableCell>{new Date(summary.submittedAt).toLocaleString()}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {canManageApprovals && summary.status === 'pending_approval' && (
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => {
                              setSelectedSummary(summary);
                              setShowApprovalDialog(true);
                            }}
                          >
                            Review
                          </Button>
                        )}
                        
                        {summary.status === 'approved' && summary.isLocked && (
                          <Button 
                            size="sm" 
                            variant="outline"
                            className="text-red-600"
                            onClick={() => testEditMutation.mutate(summary.id)}
                            disabled={testEditMutation.isPending}
                          >
                            <AlertTriangle className="w-3 h-3 mr-1" />
                            Test Edit Lock
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Manager Approval Dialog */}
      <Dialog open={showApprovalDialog} onOpenChange={setShowApprovalDialog}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Review Daily Summary - {selectedSummary?.date}</DialogTitle>
          </DialogHeader>
          
          {selectedSummary && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium mb-2">Income Breakdown</h4>
                  {Object.entries(selectedSummary.incomeBreakdown).map(([key, value]) => (
                    <div key={key} className="flex justify-between">
                      <span className="capitalize">{key}:</span>
                      <span>₦{value.toLocaleString()}</span>
                    </div>
                  ))}
                  <div className="border-t pt-2 font-medium">
                    <div className="flex justify-between">
                      <span>Total Income:</span>
                      <span className="text-green-600">₦{selectedSummary.totalIncome.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Expense Breakdown</h4>
                  {Object.entries(selectedSummary.expenseBreakdown).map(([key, value]) => (
                    <div key={key} className="flex justify-between">
                      <span className="capitalize">{key}:</span>
                      <span>₦{value.toLocaleString()}</span>
                    </div>
                  ))}
                  <div className="border-t pt-2 font-medium">
                    <div className="flex justify-between">
                      <span>Total Expenses:</span>
                      <span className="text-red-600">₦{selectedSummary.totalExpenses.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <div className="flex justify-between text-lg font-bold">
                  <span>Net Amount:</span>
                  <span className={selectedSummary.netAmount >= 0 ? "text-green-600" : "text-red-600"}>
                    ₦{selectedSummary.netAmount.toLocaleString()}
                  </span>
                </div>
              </div>

              {selectedSummary.notes && (
                <div>
                  <h4 className="font-medium mb-2">Notes</h4>
                  <p className="text-gray-600">{selectedSummary.notes}</p>
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <Label htmlFor="approvalComments">Manager Comments</Label>
                  <Textarea
                    id="approvalComments"
                    value={approvalComments}
                    onChange={(e) => setApprovalComments(e.target.value)}
                    placeholder="Add approval comments..."
                  />
                </div>

                <div>
                  <Label htmlFor="rejectionReason">Rejection Reason (if rejecting)</Label>
                  <Textarea
                    id="rejectionReason"
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="Reason for rejection..."
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setShowApprovalDialog(false)}>Cancel</Button>
                  <Button 
                    variant="outline"
                    className="text-red-600"
                    onClick={() => rejectSummaryMutation.mutate({ 
                      summaryId: selectedSummary.id, 
                      reason: rejectionReason 
                    })}
                    disabled={!rejectionReason || rejectSummaryMutation.isPending}
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Reject
                  </Button>
                  <Button 
                    className="bg-green-600 hover:bg-green-700"
                    onClick={() => approveSummaryMutation.mutate({ 
                      summaryId: selectedSummary.id, 
                      comments: approvalComments 
                    })}
                    disabled={approveSummaryMutation.isPending}
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Approve
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}