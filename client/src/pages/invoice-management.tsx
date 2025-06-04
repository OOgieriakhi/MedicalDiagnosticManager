import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Search, Plus, Receipt, Eye, CreditCard, Banknote, Smartphone, FileText, Printer, DollarSign, Clock } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useQuery, useMutation } from "@tanstack/react-query";

interface Patient {
  id: number;
  patientId: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  email?: string;
}

interface Test {
  id: number;
  name: string;
  code: string;
  price: string;
  categoryId: number;
}

interface ReferralProvider {
  id: number;
  name: string;
}

interface InvoiceItem {
  testId: number;
  name: string;
  price: number;
}

interface Invoice {
  id: number;
  invoiceNumber: string;
  patientId: number;
  patientName: string;
  totalAmount: string;
  paymentStatus: 'unpaid' | 'paid';
  paymentMethod?: string;
  createdAt: string;
  paidAt?: string;
  createdByName: string;
  tests: any[];
}

export default function InvoiceManagement() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [selectedTests, setSelectedTests] = useState<InvoiceItem[]>([]);
  const [discountPercentage, setDiscountPercentage] = useState(0);
  const [referralProviderId, setReferralProviderId] = useState<number | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [paymentMethod, setPaymentMethod] = useState("");
  const [paymentDetails, setPaymentDetails] = useState<any>({});
  const [invoiceFilter, setInvoiceFilter] = useState<"all" | "unpaid" | "paid">("all");
  const [testSearchTerm, setTestSearchTerm] = useState("");

  // Query for patients
  const { data: patients } = useQuery({
    queryKey: ["/api/patients", user?.branchId],
    enabled: !!user?.branchId,
  });

  // Query for tests
  const { data: tests } = useQuery({
    queryKey: ["/api/tests", user?.tenantId],
    enabled: !!user?.tenantId,
  });

  // Query for referral providers
  const { data: referralProviders } = useQuery({
    queryKey: ["/api/referral-providers", user?.tenantId],
    enabled: !!user?.tenantId,
  });

  // Query for invoices with status filter
  const { data: invoices, refetch: refetchInvoices } = useQuery({
    queryKey: ["/api/invoices", user?.branchId, invoiceFilter === "all" ? undefined : invoiceFilter],
    queryFn: async () => {
      const params = new URLSearchParams({
        branchId: user?.branchId?.toString() || "",
      });
      if (invoiceFilter !== "all") {
        params.append("status", invoiceFilter);
      }
      const response = await apiRequest("GET", `/api/invoices?${params}`);
      return response.json();
    },
    enabled: !!user?.branchId,
  });

  // Mutation for creating invoices
  const createInvoiceMutation = useMutation({
    mutationFn: async (invoiceData: any) => {
      const response = await apiRequest("POST", "/api/invoices", invoiceData);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Invoice Created",
        description: "Invoice created successfully and is ready for payment collection.",
      });
      refetchInvoices();
      setShowCreateDialog(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create invoice",
        variant: "destructive",
      });
    },
  });

  // Mutation for processing payments
  const processPaymentMutation = useMutation({
    mutationFn: async ({ invoiceId, paymentData }: { invoiceId: number; paymentData: any }) => {
      const response = await apiRequest("PUT", `/api/invoices/${invoiceId}/pay`, paymentData);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Payment Processed",
        description: "Payment has been successfully processed and recorded.",
      });
      refetchInvoices();
      setShowPaymentDialog(false);
      setSelectedInvoice(null);
      setPaymentMethod("");
      setPaymentDetails({});
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to process payment",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setSelectedPatient(null);
    setSelectedTests([]);
    setDiscountPercentage(0);
    setReferralProviderId(null);
  };

  const handleAddTest = (test: Test) => {
    if (!selectedTests.find(t => t.testId === test.id)) {
      setSelectedTests([...selectedTests, {
        testId: test.id,
        name: test.name,
        price: parseFloat(test.price)
      }]);
    }
  };

  const handleRemoveTest = (testId: number) => {
    setSelectedTests(selectedTests.filter(t => t.testId !== testId));
  };

  const calculateInvoiceAmounts = () => {
    const subtotal = selectedTests.reduce((sum, test) => sum + test.price, 0);
    const discountAmount = (subtotal * discountPercentage) / 100;
    const totalAmount = subtotal - discountAmount;
    
    return {
      subtotal,
      discountAmount,
      totalAmount, // Patient pays this amount
      netAmount: totalAmount // Patient pays the full amount after discount
    };
  };

  const handleCreateInvoice = () => {
    if (!selectedPatient || selectedTests.length === 0) {
      toast({
        title: "Error",
        description: "Please select a patient and at least one test",
        variant: "destructive",
      });
      return;
    }

    const amounts = calculateInvoiceAmounts();
    
    const invoiceData = {
      patientId: selectedPatient.id,
      tenantId: user?.tenantId,
      branchId: user?.branchId,
      tests: selectedTests,
      subtotal: amounts.subtotal,
      discountPercentage,
      discountAmount: amounts.discountAmount,
      totalAmount: amounts.totalAmount,
      netAmount: amounts.netAmount,
      referralProviderId,
    };

    createInvoiceMutation.mutate(invoiceData);
  };

  const handleProcessPayment = () => {
    if (!selectedInvoice || !paymentMethod) {
      toast({
        title: "Error",
        description: "Please select payment method and fill required details",
        variant: "destructive",
      });
      return;
    }

    const paymentData = {
      paymentMethod,
      paymentDetails,
      paidBy: user?.id,
    };

    processPaymentMutation.mutate({
      invoiceId: selectedInvoice.id,
      paymentData,
    });
  };

  const filteredPatients = (patients as Patient[] || []).filter(patient =>
    `${patient.firstName} ${patient.lastName} ${patient.patientId}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredTests = (tests as Test[] || []).filter(test =>
    test.name.toLowerCase().includes(testSearchTerm.toLowerCase()) ||
    test.code.toLowerCase().includes(testSearchTerm.toLowerCase())
  );

  const amounts = calculateInvoiceAmounts();

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Invoice Management</h1>
        <p className="text-muted-foreground">Two-stage billing: Create invoices and process payments separately</p>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-4 mb-6">
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Create Invoice
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Invoice</DialogTitle>
              <DialogDescription>
                Create an unpaid invoice that can be paid later by the payment cashier
              </DialogDescription>
            </DialogHeader>
            
            {/* Patient Selection */}
            <div className="space-y-4">
              <div>
                <Label>Search and Select Patient</Label>
                <Input
                  placeholder="Search by name or patient ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="mb-2"
                />
                {searchTerm && (
                  <div className="max-h-40 overflow-y-auto border rounded-md">
                    {filteredPatients.map((patient) => (
                      <div
                        key={patient.id}
                        className={`p-2 cursor-pointer hover:bg-gray-50 ${
                          selectedPatient?.id === patient.id ? 'bg-blue-50' : ''
                        }`}
                        onClick={() => {
                          setSelectedPatient(patient);
                          setSearchTerm("");
                        }}
                      >
                        <div className="font-medium">{patient.firstName} {patient.lastName}</div>
                        <div className="text-sm text-gray-500">ID: {patient.patientId}</div>
                      </div>
                    ))}
                  </div>
                )}
                {selectedPatient && (
                  <div className="mt-2 p-2 bg-blue-50 rounded-md">
                    <div className="font-medium">{selectedPatient.firstName} {selectedPatient.lastName}</div>
                    <div className="text-sm text-gray-500">ID: {selectedPatient.patientId}</div>
                  </div>
                )}
              </div>

              {/* Test Selection */}
              <div>
                <Label>Select Tests</Label>
                <div className="space-y-2">
                  <Input
                    placeholder="Search tests..."
                    value={testSearchTerm}
                    onChange={(e) => setTestSearchTerm(e.target.value)}
                  />
                  <div className="max-h-60 overflow-y-auto border rounded-md">
                    {filteredTests.map((test: Test) => (
                      <div
                        key={test.id}
                        className={`p-3 cursor-pointer hover:bg-gray-50 border-b last:border-b-0 ${
                          selectedTests.some(t => t.testId === test.id) ? 'bg-blue-50' : ''
                        }`}
                        onClick={() => handleAddTest(test)}
                      >
                        <div className="flex justify-between items-center">
                          <div>
                            <div className="font-medium">{test.name}</div>
                            <div className="text-sm text-gray-500">Code: {test.code}</div>
                          </div>
                          <div className="text-right">
                            <div className="font-medium">₦{parseFloat(test.price).toLocaleString()}</div>
                            {selectedTests.some(t => t.testId === test.id) && (
                              <Badge variant="default" className="text-xs">Added</Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Selected Tests */}
              {selectedTests.length > 0 && (
                <div>
                  <Label>Selected Tests</Label>
                  <div className="space-y-2">
                    {selectedTests.map((test) => (
                      <div key={test.testId} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                        <span>{test.name}</span>
                        <div className="flex items-center gap-2">
                          <span>₦{test.price.toLocaleString()}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveTest(test.testId)}
                          >
                            Remove
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Referral Provider */}
              <div>
                <Label>Referral Provider (Optional)</Label>
                <Select value={referralProviderId?.toString() || ""} onValueChange={(value) => setReferralProviderId(value ? parseInt(value) : null)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select referral provider..." />
                  </SelectTrigger>
                  <SelectContent>
                    {(referralProviders as ReferralProvider[] || []).map((provider) => (
                      <SelectItem key={provider.id} value={provider.id.toString()}>
                        {provider.name} ({provider.commissionRate}% commission)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Discount */}
              <div>
                <Label>Discount Percentage</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={discountPercentage}
                  onChange={(e) => setDiscountPercentage(parseFloat(e.target.value) || 0)}
                />
              </div>

              {/* Invoice Summary */}
              {selectedTests.length > 0 && (
                <div className="p-4 bg-gray-50 rounded-md">
                  <h3 className="font-medium mb-2">Invoice Summary</h3>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>Subtotal:</span>
                      <span>₦{amounts.subtotal.toLocaleString()}</span>
                    </div>
                    {discountPercentage > 0 && (
                      <div className="flex justify-between text-red-600">
                        <span>Discount ({discountPercentage}%):</span>
                        <span>-₦{amounts.discountAmount.toLocaleString()}</span>
                      </div>
                    )}
                    <Separator />
                    <div className="flex justify-between font-medium text-lg">
                      <span>Patient Pays:</span>
                      <span>₦{amounts.totalAmount.toLocaleString()}</span>
                    </div>
                    {amounts.commissionAmount > 0 && (
                      <div className="mt-2 p-2 bg-blue-50 rounded border-l-4 border-blue-400">
                        <div className="text-xs text-blue-700 font-medium">Commission Tracking (Not deducted from patient)</div>
                        <div className="flex justify-between text-xs text-blue-600">
                          <span>Commission ({((amounts.commissionAmount / amounts.totalAmount) * 100).toFixed(1)}%):</span>
                          <span>₦{amounts.commissionAmount.toLocaleString()}</span>
                        </div>
                        <div className="text-xs text-blue-600 mt-1">Paid separately by accounting at month-end</div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleCreateInvoice}
                  disabled={!selectedPatient || selectedTests.length === 0 || createInvoiceMutation.isPending}
                >
                  {createInvoiceMutation.isPending ? "Creating..." : "Create Invoice"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Invoice Tabs */}
      <Tabs value={invoiceFilter} onValueChange={(value) => setInvoiceFilter(value as any)}>
        <TabsList>
          <TabsTrigger value="all">All Invoices</TabsTrigger>
          <TabsTrigger value="unpaid">Unpaid Invoices</TabsTrigger>
          <TabsTrigger value="paid">Paid Invoices</TabsTrigger>
        </TabsList>

        <TabsContent value={invoiceFilter} className="mt-6">
          <div className="grid gap-4">
            {(invoices as Invoice[] || []).map((invoice) => (
              <Card key={invoice.id}>
                <CardContent className="p-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-medium">{invoice.invoiceNumber}</h3>
                        <Badge variant={invoice.paymentStatus === 'paid' ? 'default' : 'secondary'}>
                          {invoice.paymentStatus === 'paid' ? 'PAID' : 'UNPAID'}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Patient: {invoice.patientName}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Created by: {invoice.createdByName}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Created: {new Date(invoice.createdAt).toLocaleDateString()}
                      </p>
                      {invoice.paidAt && (
                        <p className="text-sm text-muted-foreground">
                          Paid: {new Date(invoice.paidAt).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-medium">
                        ₦{parseFloat(invoice.totalAmount).toLocaleString()}
                      </div>
                      <div className="flex gap-2 mt-2">
                        {invoice.paymentStatus === 'unpaid' && (
                          <Button
                            size="sm"
                            onClick={() => {
                              setSelectedInvoice(invoice);
                              setShowPaymentDialog(true);
                            }}
                          >
                            <DollarSign className="w-4 h-4 mr-1" />
                            Collect Payment
                          </Button>
                        )}
                        <Button variant="outline" size="sm">
                          <Eye className="w-4 h-4 mr-1" />
                          View
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Payment Collection Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Collect Payment</DialogTitle>
            <DialogDescription>
              Process payment for invoice {selectedInvoice?.invoiceNumber}
            </DialogDescription>
          </DialogHeader>
          
          {selectedInvoice && (
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-md">
                <div className="flex justify-between">
                  <span>Patient:</span>
                  <span>{selectedInvoice.patientName}</span>
                </div>
                <div className="flex justify-between">
                  <span>Amount Due:</span>
                  <span className="font-medium">₦{parseFloat(selectedInvoice.totalAmount).toLocaleString()}</span>
                </div>
              </div>

              <div>
                <Label>Payment Method</Label>
                <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="cash" id="cash" />
                    <Label htmlFor="cash" className="flex items-center">
                      <Banknote className="w-4 h-4 mr-2" />
                      Cash
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="card" id="card" />
                    <Label htmlFor="card" className="flex items-center">
                      <CreditCard className="w-4 h-4 mr-2" />
                      Debit/Credit Card
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="transfer" id="transfer" />
                    <Label htmlFor="transfer" className="flex items-center">
                      <Smartphone className="w-4 h-4 mr-2" />
                      Bank Transfer
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Payment Details */}
              {paymentMethod === "card" && (
                <div className="space-y-2">
                  <Input
                    placeholder="Card last 4 digits"
                    value={paymentDetails.cardLastFour || ""}
                    onChange={(e) => setPaymentDetails({...paymentDetails, cardLastFour: e.target.value})}
                  />
                  <Input
                    placeholder="Transaction reference"
                    value={paymentDetails.transactionRef || ""}
                    onChange={(e) => setPaymentDetails({...paymentDetails, transactionRef: e.target.value})}
                  />
                </div>
              )}

              {paymentMethod === "transfer" && (
                <div className="space-y-2">
                  <Input
                    placeholder="Transfer reference"
                    value={paymentDetails.transferRef || ""}
                    onChange={(e) => setPaymentDetails({...paymentDetails, transferRef: e.target.value})}
                  />
                  <Input
                    placeholder="Sending bank"
                    value={paymentDetails.sendingBank || ""}
                    onChange={(e) => setPaymentDetails({...paymentDetails, sendingBank: e.target.value})}
                  />
                </div>
              )}

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowPaymentDialog(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleProcessPayment}
                  disabled={!paymentMethod || processPaymentMutation.isPending}
                >
                  {processPaymentMutation.isPending ? "Processing..." : "Process Payment"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}