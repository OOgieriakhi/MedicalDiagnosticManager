import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { 
  ArrowLeft,
  CheckCircle,
  AlertTriangle,
  DollarSign,
  Receipt,
  CreditCard,
  Building,
  Calendar,
  Eye,
  Flag,
  FileText,
  Search,
  Filter,
  Download
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface IncomeEntry {
  id: number;
  transactionDate: string;
  invoiceNumber: string;
  patientName: string;
  serviceType: string;
  paymentMethod: string;
  amount: number;
  status: 'pending_review' | 'verified' | 'flagged' | 'posted';
  source: 'patient_billing' | 'pos_collection' | 'bank_deposit';
  receiptNumber?: string;
  bankReference?: string;
  verifiedBy?: string;
  verifiedAt?: string;
  glAccount?: string;
  notes?: string;
  duplicateCheck: boolean;
  balanceVerified: boolean;
}

interface IncomeVerificationSummary {
  totalPendingReview: number;
  totalPendingAmount: number;
  verifiedToday: number;
  flaggedEntries: number;
  duplicateCount: number;
  unbalancedCount: number;
}

export default function IncomeVerification() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedEntry, setSelectedEntry] = useState<IncomeEntry | null>(null);
  const [filterSource, setFilterSource] = useState("all");
  const [filterStatus, setFilterStatus] = useState("pending_review");
  const [searchTerm, setSearchTerm] = useState("");
  const [showVerificationDialog, setShowVerificationDialog] = useState(false);
  const [verificationNotes, setVerificationNotes] = useState("");
  const [selectedGLAccount, setSelectedGLAccount] = useState("");

  // Fetch income entries for verification
  const { data: incomeEntries = [], isLoading, refetch } = useQuery<IncomeEntry[]>({
    queryKey: ["/api/accounting/income-entries", filterSource, filterStatus],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filterSource !== "all") params.append('source', filterSource);
      if (filterStatus !== "all") params.append('status', filterStatus);
      
      const response = await fetch(`/api/accounting/income-entries?${params}`);
      if (!response.ok) throw new Error("Failed to fetch income entries");
      return response.json();
    },
  });

  // Fetch verification summary
  const { data: summary } = useQuery<IncomeVerificationSummary>({
    queryKey: ["/api/accounting/income-verification-summary"],
    queryFn: async () => {
      const response = await fetch("/api/accounting/income-verification-summary");
      if (!response.ok) throw new Error("Failed to fetch summary");
      return response.json();
    },
  });

  // Verify income entry mutation
  const verifyEntryMutation = useMutation({
    mutationFn: async ({ id, glAccount, notes }: { id: number, glAccount: string, notes: string }) => {
      return apiRequest(`/api/accounting/verify-income/${id}`, 'POST', { glAccount, notes });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Income entry verified and posted to general ledger"
      });
      refetch();
      setShowVerificationDialog(false);
      setSelectedEntry(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to verify income entry",
        variant: "destructive"
      });
    }
  });

  // Flag entry mutation
  const flagEntryMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: number, reason: string }) => {
      return apiRequest(`/api/accounting/flag-income/${id}`, 'POST', { reason });
    },
    onSuccess: () => {
      toast({
        title: "Entry Flagged",
        description: "Income entry has been flagged for review"
      });
      refetch();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to flag entry",
        variant: "destructive"
      });
    }
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN'
    }).format(amount);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'verified': return 'bg-green-100 text-green-800';
      case 'flagged': return 'bg-red-100 text-red-800';
      case 'posted': return 'bg-blue-100 text-blue-800';
      default: return 'bg-yellow-100 text-yellow-800';
    }
  };

  const getSourceIcon = (source: string) => {
    switch (source) {
      case 'patient_billing': return <Receipt className="w-4 h-4" />;
      case 'pos_collection': return <CreditCard className="w-4 h-4" />;
      case 'bank_deposit': return <Building className="w-4 h-4" />;
      default: return <DollarSign className="w-4 h-4" />;
    }
  };

  const handleVerifyEntry = (entry: IncomeEntry) => {
    setSelectedEntry(entry);
    setSelectedGLAccount("41000"); // Default revenue account
    setVerificationNotes("");
    setShowVerificationDialog(true);
  };

  const handleFlagEntry = (entry: IncomeEntry) => {
    const reason = prompt("Enter reason for flagging this entry:");
    if (reason) {
      flagEntryMutation.mutate({ id: entry.id, reason });
    }
  };

  const filteredEntries = incomeEntries.filter(entry => {
    const matchesSearch = entry.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         entry.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         entry.serviceType.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/accounting-dashboard">
            <Button variant="outline" size="sm" className="flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back to Accounting
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Income Verification</h1>
            <p className="text-gray-600">Review and verify income transactions before posting</p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending Review</p>
                <p className="text-2xl font-bold text-orange-600">
                  {summary?.totalPendingReview || 0}
                </p>
              </div>
              <AlertTriangle className="w-8 h-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending Amount</p>
                <p className="text-xl font-bold text-orange-600">
                  {formatCurrency(summary?.totalPendingAmount || 0)}
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Verified Today</p>
                <p className="text-2xl font-bold text-green-600">
                  {summary?.verifiedToday || 0}
                </p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Flagged Entries</p>
                <p className="text-2xl font-bold text-red-600">
                  {summary?.flaggedEntries || 0}
                </p>
              </div>
              <Flag className="w-8 h-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Duplicates</p>
                <p className="text-2xl font-bold text-purple-600">
                  {summary?.duplicateCount || 0}
                </p>
              </div>
              <FileText className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Unbalanced</p>
                <p className="text-2xl font-bold text-red-600">
                  {summary?.unbalancedCount || 0}
                </p>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="search">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="search"
                  placeholder="Search by patient, invoice, or service..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="source">Source</Label>
              <Select value={filterSource} onValueChange={setFilterSource}>
                <SelectTrigger>
                  <SelectValue placeholder="All sources" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sources</SelectItem>
                  <SelectItem value="patient_billing">Patient Billing</SelectItem>
                  <SelectItem value="pos_collection">POS Collections</SelectItem>
                  <SelectItem value="bank_deposit">Bank Deposits</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="status">Status</Label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending_review">Pending Review</SelectItem>
                  <SelectItem value="verified">Verified</SelectItem>
                  <SelectItem value="flagged">Flagged</SelectItem>
                  <SelectItem value="posted">Posted</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button variant="outline" className="w-full">
                <Filter className="w-4 h-4 mr-2" />
                Apply Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Income Entries Table */}
      <Card>
        <CardHeader>
          <CardTitle>Income Transactions for Verification</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Loading income entries...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Patient</TableHead>
                  <TableHead>Service Type</TableHead>
                  <TableHead>Payment Method</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Validation</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEntries.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell>{new Date(entry.transactionDate).toLocaleDateString()}</TableCell>
                    <TableCell className="font-medium">{entry.invoiceNumber}</TableCell>
                    <TableCell>{entry.patientName}</TableCell>
                    <TableCell>{entry.serviceType}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <CreditCard className="w-4 h-4" />
                        {entry.paymentMethod}
                      </div>
                    </TableCell>
                    <TableCell className="font-bold text-green-600">
                      {formatCurrency(entry.amount)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {getSourceIcon(entry.source)}
                        <span className="capitalize">{entry.source.replace('_', ' ')}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(entry.status)}>
                        {entry.status.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {entry.duplicateCheck && (
                          <Badge variant="outline" className="text-xs">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            No Dup
                          </Badge>
                        )}
                        {entry.balanceVerified && (
                          <Badge variant="outline" className="text-xs">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Balanced
                          </Badge>
                        )}
                        {!entry.duplicateCheck && (
                          <Badge variant="destructive" className="text-xs">
                            <AlertTriangle className="w-3 h-3 mr-1" />
                            Dup Risk
                          </Badge>
                        )}
                        {!entry.balanceVerified && (
                          <Badge variant="destructive" className="text-xs">
                            <AlertTriangle className="w-3 h-3 mr-1" />
                            Unbalanced
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm">
                          <Eye className="w-4 h-4" />
                        </Button>
                        {entry.status === 'pending_review' && (
                          <>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => handleVerifyEntry(entry)}
                              className="text-green-600 hover:text-green-700"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => handleFlagEntry(entry)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Flag className="w-4 h-4" />
                            </Button>
                          </>
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

      {/* Verification Dialog */}
      <Dialog open={showVerificationDialog} onOpenChange={setShowVerificationDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Verify Income Entry</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {selectedEntry && (
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><strong>Invoice:</strong> {selectedEntry.invoiceNumber}</div>
                  <div><strong>Patient:</strong> {selectedEntry.patientName}</div>
                  <div><strong>Amount:</strong> {formatCurrency(selectedEntry.amount)}</div>
                  <div><strong>Service:</strong> {selectedEntry.serviceType}</div>
                  <div><strong>Payment:</strong> {selectedEntry.paymentMethod}</div>
                  <div><strong>Source:</strong> {selectedEntry.source.replace('_', ' ')}</div>
                </div>
              </div>
            )}
            
            <div>
              <Label htmlFor="glAccount">General Ledger Account</Label>
              <Select value={selectedGLAccount} onValueChange={setSelectedGLAccount}>
                <SelectTrigger>
                  <SelectValue placeholder="Select GL account" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="41000">41000 - Patient Service Revenue</SelectItem>
                  <SelectItem value="41100">41100 - Laboratory Revenue</SelectItem>
                  <SelectItem value="41200">41200 - Radiology Revenue</SelectItem>
                  <SelectItem value="41300">41300 - Cardiology Revenue</SelectItem>
                  <SelectItem value="41400">41400 - Pharmacy Revenue</SelectItem>
                  <SelectItem value="41500">41500 - Consultation Revenue</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="notes">Verification Notes</Label>
              <Textarea
                id="notes"
                value={verificationNotes}
                onChange={(e) => setVerificationNotes(e.target.value)}
                placeholder="Enter verification notes (optional)"
                rows={3}
              />
            </div>
            
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowVerificationDialog(false)}>
                Cancel
              </Button>
              <Button 
                onClick={() => {
                  if (selectedEntry && selectedGLAccount) {
                    verifyEntryMutation.mutate({
                      id: selectedEntry.id,
                      glAccount: selectedGLAccount,
                      notes: verificationNotes
                    });
                  }
                }}
                disabled={!selectedGLAccount || verifyEntryMutation.isPending}
              >
                {verifyEntryMutation.isPending ? "Verifying..." : "Verify & Post"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}