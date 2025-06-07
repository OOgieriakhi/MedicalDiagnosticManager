import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { 
  ArrowLeft,
  Plus,
  Eye,
  Send,
  DollarSign,
  Calendar,
  Search,
  Download,
  CheckCircle,
  Clock,
  AlertTriangle,
  Mail,
  Phone
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Link } from "wouter";

const invoiceSchema = z.object({
  patientId: z.string().min(1, "Patient is required"),
  amount: z.string().min(1, "Amount is required"),
  dueDate: z.string().min(1, "Due date is required"),
  description: z.string().min(1, "Description is required"),
  referenceNumber: z.string().optional(),
  paymentTerms: z.string().optional()
});

interface AccountsReceivableRecord {
  id: number;
  patientName: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  amount: number;
  paidAmount: number;
  balanceAmount: number;
  status: string;
  paymentTerms: string;
  description: string;
  lastPaymentDate?: string;
  daysOverdue: number;
  contactInfo: string;
}

export default function AccountsReceivable() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [showInvoiceDialog, setShowInvoiceDialog] = useState(false);

  const form = useForm({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      patientId: "",
      amount: "",
      dueDate: "",
      description: "",
      referenceNumber: "",
      paymentTerms: "net_30"
    }
  });

  // Fetch accounts receivable data
  const { data: receivableData = [], isLoading } = useQuery({
    queryKey: ["/api/accounts-receivable", statusFilter, user?.branchId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (user?.branchId) params.append('branchId', user.branchId.toString());
      if (statusFilter !== "all") params.append('status', statusFilter);
      
      const response = await fetch(`/api/accounts-receivable?${params}`);
      if (!response.ok) throw new Error("Failed to fetch accounts receivable");
      return response.json();
    },
    enabled: !!user?.branchId
  });

  // Fetch patients for invoice form
  const { data: patients = [] } = useQuery({
    queryKey: ["/api/patients", user?.branchId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (user?.branchId) params.append('branchId', user.branchId.toString());
      
      const response = await fetch(`/api/patients?${params}`);
      if (!response.ok) throw new Error("Failed to fetch patients");
      return response.json();
    },
    enabled: !!user?.branchId
  });

  const createInvoiceMutation = useMutation({
    mutationFn: async (data: z.infer<typeof invoiceSchema>) => {
      return apiRequest("/api/invoices", {
        method: "POST",
        body: JSON.stringify({
          ...data,
          amount: parseFloat(data.amount),
          branchId: user?.branchId,
          createdBy: user?.id
        })
      });
    },
    onSuccess: () => {
      toast({ title: "Invoice created successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/accounts-receivable"] });
      setShowInvoiceDialog(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({ 
        title: "Error creating invoice", 
        description: error.message,
        variant: "destructive" 
      });
    }
  });

  const filteredRecords = receivableData.filter((record: AccountsReceivableRecord) => {
    const matchesSearch = record.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         record.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         record.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN'
    }).format(amount);
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'paid': return 'bg-green-100 text-green-800';
      case 'overdue': return 'bg-red-100 text-red-800';
      case 'due_soon': return 'bg-yellow-100 text-yellow-800';
      case 'pending': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'paid': return <CheckCircle className="w-4 h-4" />;
      case 'overdue': return <AlertTriangle className="w-4 h-4" />;
      case 'due_soon': return <Clock className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  const summaryData = {
    totalOutstanding: filteredRecords.reduce((sum: number, record: AccountsReceivableRecord) => sum + record.balanceAmount, 0),
    overdueAmount: filteredRecords.filter((r: AccountsReceivableRecord) => r.status === 'overdue').reduce((sum: number, r: AccountsReceivableRecord) => sum + r.balanceAmount, 0),
    dueSoonAmount: filteredRecords.filter((r: AccountsReceivableRecord) => r.status === 'due_soon').reduce((sum: number, r: AccountsReceivableRecord) => sum + r.balanceAmount, 0),
    collectedThisMonth: filteredRecords.reduce((sum: number, record: AccountsReceivableRecord) => sum + record.paidAmount, 0)
  };

  const onSubmit = (data: z.infer<typeof invoiceSchema>) => {
    createInvoiceMutation.mutate(data);
  };

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
            <h1 className="text-3xl font-bold text-gray-900">Accounts Receivable</h1>
            <p className="text-gray-600">Manage patient invoices and outstanding payments</p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <Dialog open={showInvoiceDialog} onOpenChange={setShowInvoiceDialog}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Create Invoice
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Create New Invoice</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="patientId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Patient</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select patient" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {patients.map((patient: any) => (
                              <SelectItem key={patient.id} value={patient.id.toString()}>
                                {patient.firstName} {patient.lastName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="amount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Amount</FormLabel>
                        <FormControl>
                          <Input placeholder="0.00" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="dueDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Due Date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="paymentTerms"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Payment Terms</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select terms" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="net_15">Net 15 days</SelectItem>
                            <SelectItem value="net_30">Net 30 days</SelectItem>
                            <SelectItem value="net_60">Net 60 days</SelectItem>
                            <SelectItem value="due_on_receipt">Due on receipt</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Invoice description" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="referenceNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Reference Number</FormLabel>
                        <FormControl>
                          <Input placeholder="Optional reference" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex justify-end space-x-2">
                    <Button type="button" variant="outline" onClick={() => setShowInvoiceDialog(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={createInvoiceMutation.isPending}>
                      {createInvoiceMutation.isPending ? "Creating..." : "Create Invoice"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Outstanding</p>
                <p className="text-2xl font-bold text-blue-600">
                  {formatCurrency(summaryData.totalOutstanding)}
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Overdue</p>
                <p className="text-2xl font-bold text-red-600">
                  {formatCurrency(summaryData.overdueAmount)}
                </p>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Due Soon</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {formatCurrency(summaryData.dueSoonAmount)}
                </p>
              </div>
              <Clock className="w-8 h-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Collected This Month</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(summaryData.collectedThisMonth)}
                </p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <Label htmlFor="search">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  id="search"
                  placeholder="Search by patient, invoice, or description..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="w-48">
              <Label htmlFor="status">Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="due_soon">Due Soon</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Accounts Receivable Table */}
      <Card>
        <CardHeader>
          <CardTitle>Outstanding Invoices</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Loading accounts receivable...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Patient</TableHead>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Invoice Date</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Paid</TableHead>
                  <TableHead>Balance</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRecords.map((record: AccountsReceivableRecord) => (
                  <TableRow key={record.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{record.patientName}</div>
                        <div className="text-sm text-gray-600">{record.contactInfo}</div>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono">{record.invoiceNumber}</TableCell>
                    <TableCell>{new Date(record.invoiceDate).toLocaleDateString()}</TableCell>
                    <TableCell className={record.daysOverdue > 0 ? 'text-red-600 font-medium' : ''}>
                      {new Date(record.dueDate).toLocaleDateString()}
                      {record.daysOverdue > 0 && ` (${record.daysOverdue} days overdue)`}
                    </TableCell>
                    <TableCell>{formatCurrency(record.amount)}</TableCell>
                    <TableCell className="text-green-600">
                      {formatCurrency(record.paidAmount)}
                    </TableCell>
                    <TableCell className="font-medium">
                      {formatCurrency(record.balanceAmount)}
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(record.status)}>
                        <div className="flex items-center gap-1">
                          {getStatusIcon(record.status)}
                          {record.status.replace('_', ' ')}
                        </div>
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm" title="View Invoice">
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" title="Send Reminder">
                          <Send className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" title="Contact Patient">
                          <Phone className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}