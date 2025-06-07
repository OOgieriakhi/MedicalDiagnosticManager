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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { 
  ArrowLeft,
  Plus,
  Eye,
  Edit,
  CreditCard,
  Calendar,
  Filter,
  Search,
  Download,
  CheckCircle,
  Clock,
  AlertTriangle,
  DollarSign
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Link } from "wouter";

const paymentSchema = z.object({
  vendorId: z.string().min(1, "Vendor is required"),
  amount: z.string().min(1, "Amount is required"),
  paymentDate: z.string().min(1, "Payment date is required"),
  paymentMethod: z.string().min(1, "Payment method is required"),
  reference: z.string().optional(),
  description: z.string().optional(),
  invoiceIds: z.array(z.string()).optional()
});

interface AccountsPayableRecord {
  id: number;
  vendorName: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  amount: number;
  paidAmount: number;
  balanceAmount: number;
  status: string;
  paymentTerms: string;
  description: string;
  createdBy: string;
  lastPaymentDate?: string;
  daysOverdue: number;
}

export default function AccountsPayable() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [selectedRecords, setSelectedRecords] = useState<number[]>([]);

  const form = useForm({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      vendorId: "",
      amount: "",
      paymentDate: new Date().toISOString().split('T')[0],
      paymentMethod: "",
      reference: "",
      description: "",
      invoiceIds: []
    }
  });

  // Fetch accounts payable data
  const { data: payableData = [], isLoading } = useQuery({
    queryKey: ["/api/accounts-payable", statusFilter, user?.branchId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (user?.branchId) params.append('branchId', user.branchId.toString());
      if (statusFilter !== "all") params.append('status', statusFilter);
      
      const response = await fetch(`/api/accounts-payable?${params}`);
      if (!response.ok) throw new Error("Failed to fetch accounts payable");
      return response.json();
    },
    enabled: !!user?.branchId
  });

  // Fetch vendors for payment form
  const { data: vendors = [] } = useQuery({
    queryKey: ["/api/vendors", user?.branchId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (user?.branchId) params.append('branchId', user.branchId.toString());
      
      const response = await fetch(`/api/vendors?${params}`);
      if (!response.ok) throw new Error("Failed to fetch vendors");
      return response.json();
    },
    enabled: !!user?.branchId
  });

  const createPaymentMutation = useMutation({
    mutationFn: async (data: z.infer<typeof paymentSchema>) => {
      return apiRequest("/api/payments", {
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
      toast({ title: "Payment recorded successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/accounts-payable"] });
      setShowPaymentDialog(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({ 
        title: "Error recording payment", 
        description: error.message,
        variant: "destructive" 
      });
    }
  });

  const filteredRecords = payableData.filter((record: AccountsPayableRecord) => {
    const matchesSearch = record.vendorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
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
    totalOutstanding: filteredRecords.reduce((sum: number, record: AccountsPayableRecord) => sum + record.balanceAmount, 0),
    overdueAmount: filteredRecords.filter((r: AccountsPayableRecord) => r.status === 'overdue').reduce((sum: number, r: AccountsPayableRecord) => sum + r.balanceAmount, 0),
    dueSoonAmount: filteredRecords.filter((r: AccountsPayableRecord) => r.status === 'due_soon').reduce((sum: number, r: AccountsPayableRecord) => sum + r.balanceAmount, 0),
    paidThisMonth: filteredRecords.reduce((sum: number, record: AccountsPayableRecord) => sum + record.paidAmount, 0)
  };

  const onSubmit = (data: z.infer<typeof paymentSchema>) => {
    createPaymentMutation.mutate(data);
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
            <h1 className="text-3xl font-bold text-gray-900">Accounts Payable</h1>
            <p className="text-gray-600">Manage vendor payments and outstanding bills</p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Record Payment
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Record Vendor Payment</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="vendorId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Vendor</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select vendor" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {vendors.map((vendor: any) => (
                              <SelectItem key={vendor.id} value={vendor.id.toString()}>
                                {vendor.name}
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
                    name="paymentDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Payment Date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="paymentMethod"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Payment Method</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select method" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                            <SelectItem value="check">Check</SelectItem>
                            <SelectItem value="cash">Cash</SelectItem>
                            <SelectItem value="card">Card</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="reference"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Reference</FormLabel>
                        <FormControl>
                          <Input placeholder="Payment reference" {...field} />
                        </FormControl>
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
                          <Textarea placeholder="Payment description" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex justify-end space-x-2">
                    <Button type="button" variant="outline" onClick={() => setShowPaymentDialog(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={createPaymentMutation.isPending}>
                      {createPaymentMutation.isPending ? "Recording..." : "Record Payment"}
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
                <p className="text-2xl font-bold text-red-600">
                  {formatCurrency(summaryData.totalOutstanding)}
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Overdue</p>
                <p className="text-2xl font-bold text-red-800">
                  {formatCurrency(summaryData.overdueAmount)}
                </p>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-800" />
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
                <p className="text-sm font-medium text-gray-600">Paid This Month</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(summaryData.paidThisMonth)}
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
                  placeholder="Search by vendor, invoice, or description..."
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

      {/* Accounts Payable Table */}
      <Card>
        <CardHeader>
          <CardTitle>Outstanding Bills</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Loading accounts payable...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vendor</TableHead>
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
                {filteredRecords.map((record: AccountsPayableRecord) => (
                  <TableRow key={record.id}>
                    <TableCell className="font-medium">{record.vendorName}</TableCell>
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
                        <Button variant="ghost" size="sm">
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <CreditCard className="w-4 h-4" />
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