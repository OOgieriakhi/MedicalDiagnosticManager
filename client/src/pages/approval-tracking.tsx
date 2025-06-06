import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  CheckCircle, 
  XCircle, 
  MessageSquare, 
  ArrowUp,
  Clock,
  Search,
  Filter,
  Eye,
  Download,
  Calendar,
  User,
  DollarSign,
  FileText,
  TrendingUp,
  TrendingDown,
  Activity
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

interface ApprovalRecord {
  id: number;
  type: string;
  description: string;
  amount: string;
  requestedBy: string;
  requestedAt: string;
  processedAt: string;
  processedBy: string;
  status: "approved" | "rejected" | "queried" | "referred_to_ceo";
  priority: string;
  department: string;
  justification: string;
  comments?: string;
  reason?: string;
  query?: string;
  referralReason?: string;
  referralNotes?: string;
}

interface ApprovalMetrics {
  totalProcessed: number;
  approved: number;
  rejected: number;
  queried: number;
  referredToCeo: number;
  totalValue: string;
  averageProcessingTime: string;
  approvalRate: number;
}

export default function ApprovalTracking() {
  const { user } = useAuth();
  const [selectedRecord, setSelectedRecord] = useState<ApprovalRecord | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");

  // Fetch approval tracking data
  const { data: approvalRecords, isLoading } = useQuery<ApprovalRecord[]>({
    queryKey: ["/api/approval-tracking"],
    queryFn: async () => {
      const response = await fetch("/api/approval-tracking");
      if (!response.ok) throw new Error("Failed to fetch approval records");
      return response.json();
    },
  });

  // Fetch approval metrics
  const { data: metrics } = useQuery<ApprovalMetrics>({
    queryKey: ["/api/approval-metrics"],
    queryFn: async () => {
      const response = await fetch("/api/approval-metrics");
      if (!response.ok) throw new Error("Failed to fetch approval metrics");
      return response.json();
    },
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
      case 'approved':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Approved</Badge>;
      case 'rejected':
        return <Badge className="bg-red-100 text-red-800"><XCircle className="w-3 h-3 mr-1" />Rejected</Badge>;
      case 'queried':
        return <Badge className="bg-blue-100 text-blue-800"><MessageSquare className="w-3 h-3 mr-1" />Queried</Badge>;
      case 'referred_to_ceo':
        return <Badge className="bg-yellow-100 text-yellow-800"><ArrowUp className="w-3 h-3 mr-1" />Referred to CEO</Badge>;
      default:
        return <Badge variant="outline"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
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

  const filteredRecords = approvalRecords?.filter(record => {
    const matchesSearch = record.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         record.requestedBy.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         record.department.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || record.status === statusFilter;
    return matchesSearch && matchesStatus;
  }) || [];

  const approvedRecords = filteredRecords.filter(r => r.status === "approved");
  const rejectedRecords = filteredRecords.filter(r => r.status === "rejected");
  const queriedRecords = filteredRecords.filter(r => r.status === "queried");
  const ceoReferredRecords = filteredRecords.filter(r => r.status === "referred_to_ceo");

  if (isLoading) {
    return (
      <div className="container mx-auto py-6">
        <div className="text-center">Loading approval tracking data...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Approval Tracking</h1>
          <p className="text-muted-foreground">Complete audit trail of all processed approvals</p>
        </div>
        <Button variant="outline">
          <Download className="w-4 h-4 mr-2" />
          Export Report
        </Button>
      </div>

      {/* Metrics Summary */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Processed</p>
                  <p className="text-2xl font-bold">{metrics.totalProcessed}</p>
                </div>
                <Activity className="w-8 h-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Approval Rate</p>
                  <p className="text-2xl font-bold text-green-600">{metrics.approvalRate}%</p>
                </div>
                <TrendingUp className="w-8 h-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Value</p>
                  <p className="text-2xl font-bold">{formatCurrency(metrics.totalValue)}</p>
                </div>
                <DollarSign className="w-8 h-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Avg Processing Time</p>
                  <p className="text-2xl font-bold">{metrics.averageProcessingTime}</p>
                </div>
                <Clock className="w-8 h-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search by description, requester, or department..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="queried">Queried</SelectItem>
                <SelectItem value="referred_to_ceo">Referred to CEO</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Approval Records Tabs */}
      <Tabs defaultValue="all" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="all">All Records ({filteredRecords.length})</TabsTrigger>
          <TabsTrigger value="approved">Approved ({approvedRecords.length})</TabsTrigger>
          <TabsTrigger value="rejected">Rejected ({rejectedRecords.length})</TabsTrigger>
          <TabsTrigger value="queried">Queried ({queriedRecords.length})</TabsTrigger>
          <TabsTrigger value="ceo-referred">CEO Referred ({ceoReferredRecords.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          <ApprovalTable records={filteredRecords} onSelectRecord={setSelectedRecord} />
        </TabsContent>

        <TabsContent value="approved">
          <ApprovalTable records={approvedRecords} onSelectRecord={setSelectedRecord} />
        </TabsContent>

        <TabsContent value="rejected">
          <ApprovalTable records={rejectedRecords} onSelectRecord={setSelectedRecord} />
        </TabsContent>

        <TabsContent value="queried">
          <ApprovalTable records={queriedRecords} onSelectRecord={setSelectedRecord} />
        </TabsContent>

        <TabsContent value="ceo-referred">
          <ApprovalTable records={ceoReferredRecords} onSelectRecord={setSelectedRecord} />
        </TabsContent>
      </Tabs>

      {/* Record Detail Dialog */}
      {selectedRecord && (
        <Dialog open={!!selectedRecord} onOpenChange={() => setSelectedRecord(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Approval Record Details</DialogTitle>
              <DialogDescription>
                Complete information about this approval record
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">Type</label>
                  <p className="text-sm">{selectedRecord.type}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Amount</label>
                  <p className="text-lg font-bold">{formatCurrency(selectedRecord.amount)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Status</label>
                  <div className="mt-1">{getStatusBadge(selectedRecord.status)}</div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Priority</label>
                  <div className="mt-1">{getPriorityBadge(selectedRecord.priority)}</div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Requested By</label>
                  <p className="text-sm">{selectedRecord.requestedBy}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Department</label>
                  <p className="text-sm">{selectedRecord.department}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Requested Date</label>
                  <p className="text-sm">{new Date(selectedRecord.requestedAt).toLocaleDateString()}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Processed Date</label>
                  <p className="text-sm">{new Date(selectedRecord.processedAt).toLocaleDateString()}</p>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-600">Description</label>
                <p className="text-sm mt-1">{selectedRecord.description}</p>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-600">Justification</label>
                <p className="text-sm mt-1">{selectedRecord.justification}</p>
              </div>

              {selectedRecord.status === "approved" && selectedRecord.comments && (
                <div>
                  <label className="text-sm font-medium text-gray-600">Approval Comments</label>
                  <p className="text-sm mt-1">{selectedRecord.comments}</p>
                </div>
              )}

              {selectedRecord.status === "rejected" && selectedRecord.reason && (
                <div>
                  <label className="text-sm font-medium text-gray-600">Rejection Reason</label>
                  <p className="text-sm mt-1 text-red-600">{selectedRecord.reason}</p>
                </div>
              )}

              {selectedRecord.status === "queried" && selectedRecord.query && (
                <div>
                  <label className="text-sm font-medium text-gray-600">Query Details</label>
                  <p className="text-sm mt-1 text-blue-600">{selectedRecord.query}</p>
                </div>
              )}

              {selectedRecord.status === "referred_to_ceo" && (
                <div className="space-y-2">
                  <div>
                    <label className="text-sm font-medium text-gray-600">Referral Reason</label>
                    <p className="text-sm mt-1">{selectedRecord.referralReason}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Referral Notes</label>
                    <p className="text-sm mt-1">{selectedRecord.referralNotes}</p>
                  </div>
                </div>
              )}

              <div>
                <label className="text-sm font-medium text-gray-600">Processed By</label>
                <p className="text-sm mt-1">{selectedRecord.processedBy}</p>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

// Reusable table component
function ApprovalTable({ 
  records, 
  onSelectRecord 
}: { 
  records: ApprovalRecord[]; 
  onSelectRecord: (record: ApprovalRecord) => void;
}) {
  const formatCurrency = (amount: string | number) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN'
    }).format(num);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Approved</Badge>;
      case 'rejected':
        return <Badge className="bg-red-100 text-red-800"><XCircle className="w-3 h-3 mr-1" />Rejected</Badge>;
      case 'queried':
        return <Badge className="bg-blue-100 text-blue-800"><MessageSquare className="w-3 h-3 mr-1" />Queried</Badge>;
      case 'referred_to_ceo':
        return <Badge className="bg-yellow-100 text-yellow-800"><ArrowUp className="w-3 h-3 mr-1" />Referred to CEO</Badge>;
      default:
        return <Badge variant="outline"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
    }
  };

  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Type</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Requested By</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Processed Date</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {records.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No records found
                </TableCell>
              </TableRow>
            ) : (
              records.map((record) => (
                <TableRow key={record.id}>
                  <TableCell className="font-medium">{record.type}</TableCell>
                  <TableCell>{formatCurrency(record.amount)}</TableCell>
                  <TableCell>{record.requestedBy}</TableCell>
                  <TableCell>{record.department}</TableCell>
                  <TableCell>{getStatusBadge(record.status)}</TableCell>
                  <TableCell>{new Date(record.processedAt).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onSelectRecord(record)}
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      View Details
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}