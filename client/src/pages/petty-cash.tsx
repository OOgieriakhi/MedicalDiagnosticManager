import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { 
  Plus, 
  Wallet, 
  TrendingUp, 
  TrendingDown, 
  Eye,
  FileText,
  Calendar,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
  Home,
  ArrowLeft
} from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { insertPettyCashFundSchema, insertPettyCashTransactionSchema, insertPettyCashReconciliationSchema } from "@shared/schema";

// Simplified form schemas matching database structure
const transactionFormSchema = z.object({
  fundId: z.number().min(1, "Please select a fund"),
  type: z.string().min(1, "Please select type"),
  amount: z.number().min(0.01, "Amount must be greater than 0"),
  purpose: z.string().min(1, "Purpose is required"),
  category: z.string().optional(),
  recipient: z.string().optional(),
  receiptNumber: z.string().optional(),
});

const fundFormSchema = z.object({
  fundName: z.string().min(1, "Fund name is required"),
  initialAmount: z.number().min(0, "Initial amount must be positive"),
  monthlyLimit: z.number().min(0, "Monthly limit must be positive"),
});

const reconciliationFormSchema = z.object({
  fundId: z.number().min(1, "Please select a fund"),
  actualBalance: z.number().min(0, "Actual balance must be positive"),
  expectedBalance: z.number().min(0, "Expected balance must be positive"),
  varianceReason: z.string().optional(),
});

type TransactionFormData = z.infer<typeof transactionFormSchema>;
type FundFormData = z.infer<typeof fundFormSchema>;
type ReconciliationFormData = z.infer<typeof reconciliationFormSchema>;

export default function PettyCash() {
  const [activeTab, setActiveTab] = useState("overview");
  const [showNewFundDialog, setShowNewFundDialog] = useState(false);
  const [showNewTransactionDialog, setShowNewTransactionDialog] = useState(false);
  const [showReconciliationDialog, setShowReconciliationDialog] = useState(false);
  const [selectedFund, setSelectedFund] = useState<any>(null);
  
  const { toast } = useToast();

  // Queries
  const { data: funds = [], isLoading: isLoadingFunds } = useQuery({
    queryKey: ["/api/petty-cash/funds"],
  });

  const { data: transactions = [], isLoading: isLoadingTransactions } = useQuery({
    queryKey: ["/api/petty-cash/transactions"],
  });

  const { data: reconciliations = [], isLoading: isLoadingReconciliations } = useQuery({
    queryKey: ["/api/petty-cash/reconciliations"],
  });

  const { data: pettyCashMetrics = {} } = useQuery({
    queryKey: ["/api/petty-cash/metrics"],
  });

  // Forms
  const fundForm = useForm<FundFormData>({
    resolver: zodResolver(fundFormSchema),
    defaultValues: {
      fundName: "",
      initialAmount: 0,
      monthlyLimit: 0,
    },
  });

  const transactionForm = useForm<TransactionFormData>({
    resolver: zodResolver(transactionFormSchema),
    defaultValues: {
      fundId: 1,
      type: "expense",
      amount: 0,
      purpose: "",
      category: "Administrative",
      recipient: "",
      receiptNumber: "",
    },
  });

  const reconciliationForm = useForm<ReconciliationFormData>({
    resolver: zodResolver(reconciliationFormSchema),
    defaultValues: {
      fundId: 1,
      expectedBalance: 0,
      actualBalance: 0,
      varianceReason: "",
    },
  });

  // Mutations
  const createFundMutation = useMutation({
    mutationFn: async (data: FundFormData) => {
      const res = await apiRequest("POST", "/api/petty-cash/funds", {
        ...data,
        currentBalance: data.initialAmount,
      });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/petty-cash/funds"] });
      queryClient.invalidateQueries({ queryKey: ["/api/petty-cash/metrics"] });
      setShowNewFundDialog(false);
      fundForm.reset();
      toast({
        title: "Fund Created",
        description: "Petty cash fund has been created successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const createTransactionMutation = useMutation({
    mutationFn: async (data: TransactionFormData) => {
      const res = await apiRequest("POST", "/api/petty-cash/transactions", data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/petty-cash/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/petty-cash/funds"] });
      queryClient.invalidateQueries({ queryKey: ["/api/petty-cash/metrics"] });
      setShowNewTransactionDialog(false);
      transactionForm.reset();
      toast({
        title: "Transaction Recorded",
        description: "Petty cash transaction has been recorded successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const createReconciliationMutation = useMutation({
    mutationFn: async (data: ReconciliationFormData) => {
      const variance = data.actualBalance - data.expectedBalance;
      const res = await apiRequest("POST", "/api/petty-cash/reconciliations", {
        ...data,
        variance,
      });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/petty-cash/reconciliations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/petty-cash/funds"] });
      setShowReconciliationDialog(false);
      reconciliationForm.reset();
      toast({
        title: "Reconciliation Completed",
        description: "Petty cash reconciliation has been completed.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Handlers
  const onFundSubmit = (data: FundFormData) => {
    createFundMutation.mutate(data);
  };

  const onTransactionSubmit = (data: TransactionFormData) => {
    createTransactionMutation.mutate(data);
  };

  const onReconciliationSubmit = (data: ReconciliationFormData) => {
    createReconciliationMutation.mutate(data);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { label: "Pending", variant: "default" as const },
      approved: { label: "Approved", variant: "default" as const },
      rejected: { label: "Rejected", variant: "destructive" as const },
      paid: { label: "Paid", variant: "default" as const },
      active: { label: "Active", variant: "default" as const },
      suspended: { label: "Suspended", variant: "secondary" as const },
      closed: { label: "Closed", variant: "destructive" as const },
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || { label: status, variant: "secondary" as const };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getTransactionTypeBadge = (type: string) => {
    const typeConfig = {
      replenishment: { label: "Replenishment", variant: "default" as const, icon: TrendingUp },
      expense: { label: "Expense", variant: "destructive" as const, icon: TrendingDown },
      return: { label: "Return", variant: "default" as const, icon: RefreshCw },
    };
    
    const config = typeConfig[type as keyof typeof typeConfig] || { label: type, variant: "secondary" as const, icon: FileText };
    const Icon = config.icon;
    
    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Link href="/">
            <Button variant="outline" size="sm">
              <Home className="w-4 h-4 mr-2" />
              Dashboard
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Petty Cash Management</h1>
            <p className="text-muted-foreground">Manage petty cash funds, transactions, and reconciliations</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Dialog open={showNewFundDialog} onOpenChange={setShowNewFundDialog}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Wallet className="h-4 w-4 mr-2" />
                New Fund
              </Button>
            </DialogTrigger>
          </Dialog>
          <Dialog open={showNewTransactionDialog} onOpenChange={setShowNewTransactionDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Transaction
              </Button>
            </DialogTrigger>
          </Dialog>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Funds</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pettyCashMetrics.totalFunds || 0}</div>
            <p className="text-xs text-muted-foreground">
              Active petty cash funds
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Balance</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ₦{pettyCashMetrics.totalBalance?.toLocaleString() || "0.00"}
            </div>
            <p className="text-xs text-muted-foreground">
              Across all funds
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ₦{pettyCashMetrics.monthlyExpenses?.toLocaleString() || "0.00"}
            </div>
            <p className="text-xs text-muted-foreground">
              Total expenses
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pettyCashMetrics.pendingTransactions || 0}</div>
            <p className="text-xs text-muted-foreground">
              Awaiting approval
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Funds Overview</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="reconciliations">Reconciliations</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <Card>
            <CardHeader>
              <CardTitle>Petty Cash Funds</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fund Name</TableHead>
                    <TableHead>Custodian</TableHead>
                    <TableHead>Current Balance</TableHead>
                    <TableHead>Monthly Limit</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last Reconciled</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoadingFunds ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center">Loading...</TableCell>
                    </TableRow>
                  ) : funds.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground">
                        No petty cash funds found
                      </TableCell>
                    </TableRow>
                  ) : (
                    funds.map((fund: any) => (
                      <TableRow key={fund.id}>
                        <TableCell className="font-medium">{fund.fundName}</TableCell>
                        <TableCell>{fund.custodian?.firstName} {fund.custodian?.lastName}</TableCell>
                        <TableCell>₦{parseFloat(fund.currentBalance).toLocaleString()}</TableCell>
                        <TableCell>₦{parseFloat(fund.monthlyLimit || 0).toLocaleString()}</TableCell>
                        <TableCell>{getStatusBadge(fund.status)}</TableCell>
                        <TableCell>
                          {fund.lastReconciledAt ? new Date(fund.lastReconciledAt).toLocaleDateString() : "Never"}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => {
                                setSelectedFund(fund);
                                setShowReconciliationDialog(true);
                                reconciliationForm.setValue("fundId", fund.id);
                                reconciliationForm.setValue("expectedBalance", parseFloat(fund.currentBalance));
                              }}
                            >
                              <RefreshCw className="h-4 w-4" />
                            </Button>
                            <Button variant="outline" size="sm">
                              <Eye className="h-4 w-4" />
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
        </TabsContent>

        <TabsContent value="transactions">
          <Card>
            <CardHeader>
              <CardTitle>Recent Transactions</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Transaction #</TableHead>
                    <TableHead>Fund</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Purpose</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoadingTransactions ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center">Loading...</TableCell>
                    </TableRow>
                  ) : transactions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground">
                        No transactions found
                      </TableCell>
                    </TableRow>
                  ) : (
                    transactions.map((transaction: any) => (
                      <TableRow key={transaction.id}>
                        <TableCell className="font-medium">{transaction.transactionNumber}</TableCell>
                        <TableCell>{transaction.fund?.fundName}</TableCell>
                        <TableCell>{getTransactionTypeBadge(transaction.type)}</TableCell>
                        <TableCell>₦{parseFloat(transaction.amount).toLocaleString()}</TableCell>
                        <TableCell>{transaction.purpose}</TableCell>
                        <TableCell>{getStatusBadge(transaction.status)}</TableCell>
                        <TableCell>{new Date(transaction.createdAt).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <Button variant="outline" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reconciliations">
          <Card>
            <CardHeader>
              <CardTitle>Reconciliation History</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Reconciliation #</TableHead>
                    <TableHead>Fund</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Expected</TableHead>
                    <TableHead>Actual</TableHead>
                    <TableHead>Variance</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoadingReconciliations ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center">Loading...</TableCell>
                    </TableRow>
                  ) : reconciliations.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground">
                        No reconciliations found
                      </TableCell>
                    </TableRow>
                  ) : (
                    reconciliations.map((reconciliation: any) => (
                      <TableRow key={reconciliation.id}>
                        <TableCell className="font-medium">{reconciliation.reconciliationNumber}</TableCell>
                        <TableCell>{reconciliation.fund?.fundName}</TableCell>
                        <TableCell>{new Date(reconciliation.reconciliationDate).toLocaleDateString()}</TableCell>
                        <TableCell>₦{parseFloat(reconciliation.expectedBalance).toLocaleString()}</TableCell>
                        <TableCell>₦{parseFloat(reconciliation.actualBalance).toLocaleString()}</TableCell>
                        <TableCell className={parseFloat(reconciliation.variance) !== 0 ? "text-red-600" : ""}>
                          ₦{parseFloat(reconciliation.variance).toLocaleString()}
                        </TableCell>
                        <TableCell>{getStatusBadge(reconciliation.status)}</TableCell>
                        <TableCell>
                          <Button variant="outline" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* New Fund Dialog */}
      <Dialog open={showNewFundDialog} onOpenChange={setShowNewFundDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Petty Cash Fund</DialogTitle>
            <DialogDescription>
              Set up a new petty cash fund with initial balance and monthly limits.
            </DialogDescription>
          </DialogHeader>
          <Form {...fundForm}>
            <form onSubmit={fundForm.handleSubmit(onFundSubmit)} className="space-y-4">
              <FormField
                control={fundForm.control}
                name="fundName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fund Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Main Office Petty Cash" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={fundForm.control}
                  name="initialAmount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Initial Amount (₦)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={fundForm.control}
                  name="monthlyLimit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Monthly Limit (₦)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setShowNewFundDialog(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createFundMutation.isPending}>
                  {createFundMutation.isPending ? "Creating..." : "Create Fund"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* New Transaction Dialog */}
      <Dialog open={showNewTransactionDialog} onOpenChange={setShowNewTransactionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Transaction</DialogTitle>
            <DialogDescription>
              Record a new petty cash transaction (expense, replenishment, or return).
            </DialogDescription>
          </DialogHeader>
          <Form {...transactionForm}>
            <form onSubmit={transactionForm.handleSubmit(onTransactionSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={transactionForm.control}
                  name="fundId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fund</FormLabel>
                      <Select onValueChange={(value) => field.onChange(parseInt(value))}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select fund" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {funds.map((fund: any) => (
                            <SelectItem key={fund.id} value={fund.id.toString()}>
                              {fund.fundName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={transactionForm.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Type</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="expense">Expense</SelectItem>
                          <SelectItem value="replenishment">Replenishment</SelectItem>
                          <SelectItem value="return">Return</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={transactionForm.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Amount (₦)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={transactionForm.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <Select onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="office_supplies">Office Supplies</SelectItem>
                          <SelectItem value="utilities">Utilities</SelectItem>
                          <SelectItem value="transport">Transport</SelectItem>
                          <SelectItem value="refreshments">Refreshments</SelectItem>
                          <SelectItem value="maintenance">Maintenance</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={transactionForm.control}
                name="purpose"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Purpose</FormLabel>
                    <FormControl>
                      <Input placeholder="Brief description of purpose" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={transactionForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Detailed description" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={transactionForm.control}
                  name="recipient"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Vendor/Supplier</FormLabel>
                      <FormControl>
                        <Input placeholder="Vendor name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={transactionForm.control}
                  name="receiptNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Receipt Number</FormLabel>
                      <FormControl>
                        <Input placeholder="Receipt/invoice number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setShowNewTransactionDialog(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createTransactionMutation.isPending}>
                  {createTransactionMutation.isPending ? "Recording..." : "Record Transaction"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Reconciliation Dialog */}
      <Dialog open={showReconciliationDialog} onOpenChange={setShowReconciliationDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Petty Cash Reconciliation</DialogTitle>
            <DialogDescription>
              Reconcile the petty cash fund by comparing expected vs actual balance.
            </DialogDescription>
          </DialogHeader>
          {selectedFund && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium">Fund</p>
                  <p className="text-sm text-muted-foreground">{selectedFund.fundName}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Expected Balance</p>
                  <p className="text-sm text-muted-foreground">₦{parseFloat(selectedFund.currentBalance).toLocaleString()}</p>
                </div>
              </div>
              
              <Form {...reconciliationForm}>
                <form onSubmit={reconciliationForm.handleSubmit(onReconciliationSubmit)} className="space-y-4">
                  <FormField
                    control={reconciliationForm.control}
                    name="reconciliationNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Reconciliation Number</FormLabel>
                        <FormControl>
                          <Input placeholder="REC-2024-001" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={reconciliationForm.control}
                    name="actualBalance"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Actual Balance (₦)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            {...field}
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={reconciliationForm.control}
                    name="varianceReason"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Variance Reason (if any)</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Explain any discrepancies" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setShowReconciliationDialog(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={createReconciliationMutation.isPending}>
                      {createReconciliationMutation.isPending ? "Processing..." : "Complete Reconciliation"}
                    </Button>
                  </div>
                </form>
              </Form>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}