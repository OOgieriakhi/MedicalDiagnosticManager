import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { 
  Search, 
  CreditCard, 
  Receipt, 
  CheckCircle, 
  Clock, 
  Home,
  Banknote,
  TrendingUp,
  Users,
  FileText,
  Calendar,
  Eye,
  DollarSign,
  PieChart
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Link } from "wouter";

export default function CashiersModule() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [searchTerm, setSearchTerm] = useState("");
  const [paymentFilter, setPaymentFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("today");
  const [selectedTransaction, setSelectedTransaction] = useState<any>(null);
  const [showTransactionDetails, setShowTransactionDetails] = useState(false);

  // Query for paid invoices/transactions
  const { data: paidInvoices, isLoading: invoicesLoading } = useQuery({
    queryKey: ["/api/invoices", user?.branchId, "paid"],
    queryFn: async () => {
      const response = await fetch(`/api/invoices?branchId=${user?.branchId}&status=paid`);
      if (!response.ok) throw new Error("Failed to fetch paid invoices");
      return response.json();
    },
    enabled: !!user?.branchId,
  });

  // Query for daily revenue
  const { data: dailyRevenue } = useQuery({
    queryKey: ["/api/revenue/today", user?.branchId],
    queryFn: async () => {
      const response = await fetch(`/api/revenue/today?branchId=${user?.branchId}`);
      if (!response.ok) throw new Error("Failed to fetch revenue");
      return response.json();
    },
    enabled: !!user?.branchId,
  });

  // Query for payment methods breakdown
  const { data: paymentMethods } = useQuery({
    queryKey: ["/api/payments/methods", user?.branchId],
    queryFn: async () => {
      const response = await fetch(`/api/payments/methods?branchId=${user?.branchId}`);
      if (!response.ok) throw new Error("Failed to fetch payment methods");
      return response.json();
    },
    enabled: !!user?.branchId,
  });

  const getPaymentMethodColor = (method: string) => {
    switch (method?.toLowerCase()) {
      case "cash": return "bg-green-100 text-green-800";
      case "card": return "bg-blue-100 text-blue-800";
      case "transfer": return "bg-purple-100 text-purple-800";
      case "cheque": return "bg-orange-100 text-orange-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const filteredInvoices = (paidInvoices || []).filter((invoice: any) => {
    const matchesSearch = invoice.invoiceNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         invoice.patientName?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesPayment = paymentFilter === "all" || invoice.paymentMethod?.toLowerCase() === paymentFilter.toLowerCase();
    
    let matchesDate = true;
    if (dateFilter !== "all") {
      const invoiceDate = new Date(invoice.paidAt);
      const today = new Date();
      
      switch (dateFilter) {
        case "today":
          matchesDate = invoiceDate.toDateString() === today.toDateString();
          break;
        case "week":
          const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
          matchesDate = invoiceDate >= weekAgo;
          break;
        case "month":
          matchesDate = invoiceDate.getMonth() === today.getMonth() && 
                       invoiceDate.getFullYear() === today.getFullYear();
          break;
      }
    }
    
    return matchesSearch && matchesPayment && matchesDate;
  });

  const getCashierStats = () => {
    if (!paidInvoices) return { totalTransactions: 0, totalAmount: 0, cashPayments: 0, cardPayments: 0 };
    
    const today = new Date().toDateString();
    const todaysInvoices = paidInvoices.filter((invoice: any) => 
      new Date(invoice.paidAt).toDateString() === today
    );
    
    return {
      totalTransactions: todaysInvoices.length,
      totalAmount: todaysInvoices.reduce((sum: number, invoice: any) => 
        sum + parseFloat(invoice.totalAmount), 0
      ),
      cashPayments: todaysInvoices.filter((inv: any) => inv.paymentMethod === 'cash').length,
      cardPayments: todaysInvoices.filter((inv: any) => inv.paymentMethod === 'card').length,
    };
  };

  const stats = getCashierStats();

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <Link href="/">
            <Button variant="outline" size="sm">
              <Home className="w-4 h-4 mr-2" />
              Home
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <CreditCard className="w-8 h-8 text-green-600" />
              Cashiers Module
            </h1>
            <p className="text-gray-600">Track payments, receipts, and financial transactions</p>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Today's Transactions</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalTransactions}</p>
              </div>
              <Receipt className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                <p className="text-2xl font-bold text-green-600">₦{stats.totalAmount.toLocaleString()}</p>
              </div>
              <DollarSign className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Cash Payments</p>
                <p className="text-2xl font-bold text-green-600">{stats.cashPayments}</p>
              </div>
              <Banknote className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Card Payments</p>
                <p className="text-2xl font-bold text-blue-600">{stats.cardPayments}</p>
              </div>
              <CreditCard className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="transactions" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="transactions" className="flex items-center gap-2">
            <Receipt className="w-4 h-4" />
            Paid Transactions
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <PieChart className="w-4 h-4" />
            Payment Analytics
          </TabsTrigger>
          <TabsTrigger value="reports" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Financial Reports
          </TabsTrigger>
        </TabsList>

        {/* Paid Transactions Tab */}
        <TabsContent value="transactions" className="space-y-6">
          {/* Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <Label htmlFor="search">Search Transactions</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="search"
                      placeholder="Search by invoice or patient..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="payment">Payment Method</Label>
                  <Select value={paymentFilter} onValueChange={setPaymentFilter}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Methods</SelectItem>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="card">Card</SelectItem>
                      <SelectItem value="transfer">Transfer</SelectItem>
                      <SelectItem value="cheque">Cheque</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="date">Date Range</Label>
                  <Select value={dateFilter} onValueChange={setDateFilter}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Time</SelectItem>
                      <SelectItem value="today">Today</SelectItem>
                      <SelectItem value="week">This Week</SelectItem>
                      <SelectItem value="month">This Month</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setSearchTerm("");
                      setPaymentFilter("all");
                      setDateFilter("today");
                    }}
                  >
                    Clear Filters
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Transactions List */}
          <div className="grid gap-4">
            {invoicesLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
              </div>
            ) : filteredInvoices.length === 0 ? (
              <Card>
                <CardContent className="pt-6 text-center">
                  <Receipt className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No paid transactions found</p>
                </CardContent>
              </Card>
            ) : (
              filteredInvoices.map((invoice: any) => (
                <Card key={invoice.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <CheckCircle className="w-5 h-5 text-green-600" />
                          <h3 className="font-semibold text-lg">{invoice.invoiceNumber}</h3>
                          <Badge variant="default" className="bg-green-100 text-green-800">
                            PAID
                          </Badge>
                          <Badge 
                            variant="outline" 
                            className={getPaymentMethodColor(invoice.paymentMethod)}
                          >
                            {invoice.paymentMethod?.toUpperCase()}
                          </Badge>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <p className="text-gray-500">Patient</p>
                            <p className="font-medium">{invoice.patientName}</p>
                          </div>
                          <div>
                            <p className="text-gray-500">Amount Paid</p>
                            <p className="font-semibold text-green-600">₦{parseFloat(invoice.totalAmount).toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-gray-500">Payment Date</p>
                            <p className="font-medium">{new Date(invoice.paidAt).toLocaleDateString()}</p>
                          </div>
                          <div>
                            <p className="text-gray-500">Cashier</p>
                            <p className="font-medium">{invoice.paidByName || 'System'}</p>
                          </div>
                        </div>

                        {invoice.tests && invoice.tests.length > 0 && (
                          <div className="mt-3">
                            <p className="text-sm text-gray-500 mb-1">Services:</p>
                            <div className="flex flex-wrap gap-2">
                              {invoice.tests.slice(0, 3).map((test: any, index: number) => (
                                <Badge key={index} variant="outline" className="text-xs">
                                  {test.name || `Test ${index + 1}`}
                                </Badge>
                              ))}
                              {invoice.tests.length > 3 && (
                                <Badge variant="outline" className="text-xs">
                                  +{invoice.tests.length - 3} more
                                </Badge>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2 ml-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedTransaction(invoice);
                            setShowTransactionDetails(true);
                          }}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          View Details
                        </Button>
                        <Button variant="outline" size="sm">
                          <Receipt className="w-4 h-4 mr-1" />
                          Print Receipt
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        {/* Payment Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="w-5 h-5" />
                  Payment Methods Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 border rounded">
                    <div className="flex items-center gap-2">
                      <Banknote className="w-5 h-5 text-green-600" />
                      <span>Cash Payments</span>
                    </div>
                    <span className="font-semibold">{stats.cashPayments}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 border rounded">
                    <div className="flex items-center gap-2">
                      <CreditCard className="w-5 h-5 text-blue-600" />
                      <span>Card Payments</span>
                    </div>
                    <span className="font-semibold">{stats.cardPayments}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Revenue Trends
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-center p-4 border rounded">
                    <div className="text-2xl font-bold text-green-600">₦{stats.totalAmount.toLocaleString()}</div>
                    <div className="text-sm text-gray-600">Today's Revenue</div>
                  </div>
                  <div className="text-center p-4 border rounded">
                    <div className="text-2xl font-bold text-blue-600">{stats.totalTransactions}</div>
                    <div className="text-sm text-gray-600">Transactions Today</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Financial Reports Tab */}
        <TabsContent value="reports" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Financial Reports
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button variant="outline" className="h-20 flex-col">
                  <Calendar className="w-6 h-6 mb-2" />
                  Daily Cash Report
                </Button>
                <Button variant="outline" className="h-20 flex-col">
                  <TrendingUp className="w-6 h-6 mb-2" />
                  Revenue Summary
                </Button>
                <Button variant="outline" className="h-20 flex-col">
                  <PieChart className="w-6 h-6 mb-2" />
                  Payment Methods Report
                </Button>
                <Button variant="outline" className="h-20 flex-col">
                  <Users className="w-6 h-6 mb-2" />
                  Cashier Performance
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Transaction Details Dialog */}
      <Dialog open={showTransactionDetails} onOpenChange={setShowTransactionDetails}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Transaction Details</DialogTitle>
          </DialogHeader>
          
          {selectedTransaction && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded">
                <div>
                  <p className="text-sm text-gray-600">Invoice Number</p>
                  <p className="font-medium">{selectedTransaction.invoiceNumber}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Patient</p>
                  <p className="font-medium">{selectedTransaction.patientName}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Amount Paid</p>
                  <p className="font-semibold text-green-600">₦{parseFloat(selectedTransaction.totalAmount).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Payment Method</p>
                  <p className="font-medium capitalize">{selectedTransaction.paymentMethod}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Payment Date</p>
                  <p className="font-medium">{new Date(selectedTransaction.paidAt).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Processed By</p>
                  <p className="font-medium">{selectedTransaction.paidByName || 'System'}</p>
                </div>
              </div>

              <Separator />

              <div>
                <Label className="text-sm font-medium mb-2 block">Services Rendered</Label>
                {selectedTransaction.tests && selectedTransaction.tests.length > 0 ? (
                  <div className="space-y-2">
                    {selectedTransaction.tests.map((test: any, index: number) => (
                      <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                        <div>
                          <p className="font-medium">{test.name || `Test ${index + 1}`}</p>
                          {test.testId && <p className="text-sm text-gray-500">Test ID: {test.testId}</p>}
                        </div>
                        <p className="font-semibold">₦{(typeof test.price === 'string' ? parseFloat(test.price) : test.price || 0).toLocaleString()}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 italic">No service details available</p>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}