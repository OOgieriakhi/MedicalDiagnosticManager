import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Receipt, 
  Calculator, 
  Download, 
  Eye,
  CreditCard,
  CheckCircle,
  Clock,
  DollarSign,
  FileText,
  Plus,
  Minus
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function InvoiceManagement() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedPatient, setSelectedPatient] = useState("");
  const [selectedTests, setSelectedTests] = useState<any[]>([]);
  const [discountPercentage, setDiscountPercentage] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [showInvoicePreview, setShowInvoicePreview] = useState(false);
  const [createdInvoice, setCreatedInvoice] = useState<any>(null);

  // Fetch patients
  const { data: patients = [] } = useQuery({
    queryKey: ["/api/patients", user?.branchId],
    enabled: !!user?.branchId,
  });

  // Fetch tests
  const { data: tests = [] } = useQuery({
    queryKey: ["/api/tests", user?.tenantId],
    enabled: !!user?.tenantId,
  });

  // Fetch referral providers
  const { data: referralProviders = [] } = useQuery({
    queryKey: ["/api/referral-providers", user?.tenantId],
    enabled: !!user?.tenantId,
  });

  // Create invoice mutation
  const createInvoiceMutation = useMutation({
    mutationFn: async (invoiceData: any) => {
      const response = await apiRequest("POST", "/api/invoices", invoiceData);
      return response.json();
    },
    onSuccess: (invoice) => {
      setCreatedInvoice(invoice);
      setShowInvoicePreview(true);
      toast({
        title: "Invoice Created",
        description: `Invoice #${invoice.invoiceNumber} has been generated successfully.`,
      });
    },
    onError: () => {
      toast({
        title: "Invoice Creation Failed",
        description: "Failed to create invoice. Please try again.",
        variant: "destructive",
      });
    },
  });

  const selectedPatientData = patients.find((p: any) => p.id.toString() === selectedPatient);

  const addTestToInvoice = (testId: string) => {
    const test = tests.find((t: any) => t.id.toString() === testId);
    if (test && !selectedTests.find(t => t.id === test.id)) {
      setSelectedTests([...selectedTests, { ...test, quantity: 1 }]);
    }
  };

  const removeTestFromInvoice = (testId: number) => {
    setSelectedTests(selectedTests.filter(t => t.id !== testId));
  };

  const updateTestQuantity = (testId: number, quantity: number) => {
    if (quantity <= 0) {
      removeTestFromInvoice(testId);
      return;
    }
    setSelectedTests(selectedTests.map(t => 
      t.id === testId ? { ...t, quantity } : t
    ));
  };

  const calculateSubtotal = () => {
    return selectedTests.reduce((sum, test) => sum + (test.price * test.quantity), 0);
  };

  const calculateDiscount = () => {
    return (calculateSubtotal() * discountPercentage) / 100;
  };

  const calculateCommission = () => {
    if (selectedPatientData?.pathway !== "referral" || !selectedPatientData?.referralProviderId) {
      return 0;
    }
    const provider = referralProviders.find((p: any) => p.id === selectedPatientData.referralProviderId);
    const subtotal = calculateSubtotal();
    return Math.round(subtotal * (provider?.commissionRate || 0) / 100);
  };

  const calculateTotal = () => {
    return calculateSubtotal() - calculateDiscount();
  };

  const calculateNetAmount = () => {
    return calculateTotal() - calculateCommission();
  };

  const handleCreateInvoice = () => {
    if (!selectedPatient || selectedTests.length === 0) {
      toast({
        title: "Missing Information",
        description: "Please select a patient and at least one test.",
        variant: "destructive",
      });
      return;
    }

    const invoiceData = {
      patientId: parseInt(selectedPatient),
      tests: selectedTests.map(test => ({
        testId: test.id,
        quantity: test.quantity,
        unitPrice: test.price,
        totalPrice: test.price * test.quantity
      })),
      subtotal: calculateSubtotal(),
      discountPercentage,
      discountAmount: calculateDiscount(),
      commissionAmount: calculateCommission(),
      totalAmount: calculateTotal(),
      netAmount: calculateNetAmount(),
      paymentMethod,
      tenantId: user?.tenantId,
      branchId: user?.branchId,
      createdBy: user?.id
    };

    createInvoiceMutation.mutate(invoiceData);
  };

  const InvoicePreview = () => (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Receipt className="mr-2 w-5 h-5" />
          Invoice Preview
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Invoice Header */}
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-bold text-medical-blue">Orient Medical Diagnostic Center</h2>
            <p className="text-slate-gray">
              {user?.branchId === 1 ? "Victoria Island Branch" : 
               user?.branchId === 2 ? "Lekki Branch" : 
               user?.branchId === 3 ? "Ikeja Branch" : "Main Branch"}
            </p>
            <p className="text-slate-gray">Lagos, Nigeria</p>
          </div>
          <div className="text-right">
            <h3 className="text-xl font-bold">INVOICE</h3>
            <p className="text-slate-gray">#{new Date().getFullYear()}-{Math.floor(Math.random() * 10000).toString().padStart(4, '0')}</p>
            <p className="text-slate-gray">Date: {new Date().toLocaleDateString()}</p>
          </div>
        </div>

        <Separator />

        {/* Patient Information */}
        <div className="grid grid-cols-2 gap-6">
          <div>
            <h4 className="font-semibold text-gray-900 mb-2">Bill To:</h4>
            <div className="text-sm space-y-1">
              <p className="font-medium">{selectedPatientData?.firstName} {selectedPatientData?.lastName}</p>
              <p>Patient ID: {selectedPatientData?.patientId}</p>
              <p>Phone: {selectedPatientData?.phone}</p>
              {selectedPatientData?.email && <p>Email: {selectedPatientData?.email}</p>}
              {selectedPatientData?.address && <p>Address: {selectedPatientData?.address}</p>}
            </div>
          </div>
          <div>
            <h4 className="font-semibold text-gray-900 mb-2">Payment Method:</h4>
            <p className="text-sm capitalize">{paymentMethod.replace('_', ' ')}</p>
            {selectedPatientData?.pathway === "referral" && (
              <div className="mt-3">
                <h4 className="font-semibold text-gray-900 mb-1">Referral Information:</h4>
                <p className="text-sm">
                  {referralProviders.find((p: any) => p.id === selectedPatientData.referralProviderId)?.name}
                </p>
              </div>
            )}
          </div>
        </div>

        <Separator />

        {/* Test Items */}
        <div>
          <h4 className="font-semibold text-gray-900 mb-4">Services</h4>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-slate-gray uppercase">
                    Description
                  </th>
                  <th className="px-4 py-2 text-center text-xs font-medium text-slate-gray uppercase">
                    Qty
                  </th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-slate-gray uppercase">
                    Unit Price
                  </th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-slate-gray uppercase">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {selectedTests.map((test) => (
                  <tr key={test.id}>
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium text-gray-900">{test.name}</p>
                        <p className="text-sm text-slate-gray">Code: {test.code}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">{test.quantity}</td>
                    <td className="px-4 py-3 text-right">₦{test.price.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right font-medium">
                      ₦{(test.price * test.quantity).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <Separator />

        {/* Totals */}
        <div className="flex justify-end">
          <div className="w-80 space-y-2">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span>₦{calculateSubtotal().toLocaleString()}</span>
            </div>
            {discountPercentage > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Discount ({discountPercentage}%):</span>
                <span>-₦{calculateDiscount().toLocaleString()}</span>
              </div>
            )}
            <div className="flex justify-between font-semibold text-lg border-t pt-2">
              <span>Total Amount:</span>
              <span>₦{calculateTotal().toLocaleString()}</span>
            </div>
            {calculateCommission() > 0 && (
              <>
                <div className="flex justify-between text-red-600 text-sm">
                  <span>Provider Commission:</span>
                  <span>-₦{calculateCommission().toLocaleString()}</span>
                </div>
                <div className="flex justify-between font-bold text-lg text-medical-green border-t pt-2">
                  <span>Net Amount:</span>
                  <span>₦{calculateNetAmount().toLocaleString()}</span>
                </div>
              </>
            )}
          </div>
        </div>

        <Separator />

        <div className="text-center text-sm text-slate-gray">
          <p>Thank you for choosing Orient Medical Diagnostic Center</p>
          <p>For inquiries, please contact: +234-XXX-XXX-XXXX</p>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Invoice Management</h1>
        <p className="text-slate-gray">Create and manage invoices for diagnostic services</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Invoice Creation Form */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Calculator className="mr-2 w-5 h-5" />
                Create Invoice
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Patient Selection */}
              <div className="space-y-2">
                <Label>Select Patient *</Label>
                <Select value={selectedPatient} onValueChange={setSelectedPatient}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a patient" />
                  </SelectTrigger>
                  <SelectContent>
                    {patients.map((patient: any) => (
                      <SelectItem key={patient.id} value={patient.id.toString()}>
                        {patient.firstName} {patient.lastName} - {patient.patientId}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Test Selection */}
              <div className="space-y-4">
                <Label>Add Services</Label>
                <Select onValueChange={addTestToInvoice}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a diagnostic test" />
                  </SelectTrigger>
                  <SelectContent>
                    {tests.map((test: any) => (
                      <SelectItem key={test.id} value={test.id.toString()}>
                        {test.name} - ₦{test.price?.toLocaleString()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Selected Tests */}
                {selectedTests.length > 0 && (
                  <div className="border rounded-lg overflow-hidden">
                    <div className="bg-gray-50 px-4 py-2 font-medium text-gray-900">
                      Selected Services
                    </div>
                    <div className="divide-y">
                      {selectedTests.map((test) => (
                        <div key={test.id} className="px-4 py-3 flex items-center justify-between">
                          <div className="flex-1">
                            <p className="font-medium text-gray-900">{test.name}</p>
                            <p className="text-sm text-slate-gray">₦{test.price.toLocaleString()} each</p>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateTestQuantity(test.id, test.quantity - 1)}
                            >
                              <Minus className="w-3 h-3" />
                            </Button>
                            <span className="w-8 text-center">{test.quantity}</span>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateTestQuantity(test.id, test.quantity + 1)}
                            >
                              <Plus className="w-3 h-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => removeTestFromInvoice(test.id)}
                            >
                              Remove
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Discount */}
              <div className="space-y-2">
                <Label>Discount Percentage</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={discountPercentage}
                  onChange={(e) => setDiscountPercentage(parseFloat(e.target.value) || 0)}
                  placeholder="0"
                />
              </div>

              {/* Payment Method */}
              <div className="space-y-2">
                <Label>Payment Method</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash Payment</SelectItem>
                    <SelectItem value="card">Card Payment</SelectItem>
                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                    <SelectItem value="insurance">Insurance</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Invoice Summary */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <DollarSign className="mr-2 w-5 h-5" />
                Invoice Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {selectedTests.length === 0 ? (
                <p className="text-slate-gray text-center py-8">
                  No services selected
                </p>
              ) : (
                <>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Subtotal:</span>
                      <span>₦{calculateSubtotal().toLocaleString()}</span>
                    </div>
                    {discountPercentage > 0 && (
                      <div className="flex justify-between text-sm text-green-600">
                        <span>Discount ({discountPercentage}%):</span>
                        <span>-₦{calculateDiscount().toLocaleString()}</span>
                      </div>
                    )}
                    <Separator />
                    <div className="flex justify-between font-semibold">
                      <span>Total Amount:</span>
                      <span>₦{calculateTotal().toLocaleString()}</span>
                    </div>
                    {calculateCommission() > 0 && (
                      <>
                        <div className="flex justify-between text-sm text-red-600">
                          <span>Commission:</span>
                          <span>-₦{calculateCommission().toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between font-bold text-medical-green">
                          <span>Net Amount:</span>
                          <span>₦{calculateNetAmount().toLocaleString()}</span>
                        </div>
                      </>
                    )}
                  </div>

                  <div className="space-y-2 pt-4">
                    <Button
                      onClick={() => setShowInvoicePreview(!showInvoicePreview)}
                      variant="outline"
                      className="w-full"
                    >
                      <Eye className="mr-2 w-4 h-4" />
                      {showInvoicePreview ? "Hide Preview" : "Preview Invoice"}
                    </Button>
                    <Button
                      onClick={handleCreateInvoice}
                      disabled={createInvoiceMutation.isPending || !selectedPatient || selectedTests.length === 0}
                      className="w-full bg-medical-blue hover:bg-blue-700"
                    >
                      {createInvoiceMutation.isPending ? "Creating..." : "Create Invoice"}
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Recent Invoices */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Invoices</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {/* Demo invoice entries */}
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">#2025-0012</p>
                    <p className="text-sm text-slate-gray">Kemi Adeyemi</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">₦24,000</p>
                    <Badge className="bg-medical-green">Paid</Badge>
                  </div>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">#2025-0011</p>
                    <p className="text-sm text-slate-gray">Fatima Bello</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">₦18,500</p>
                    <Badge variant="outline">Pending</Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Invoice Preview */}
      {showInvoicePreview && selectedTests.length > 0 && <InvoicePreview />}
    </div>
  );
}