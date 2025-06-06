import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { UserPlus, Search, Edit, Eye, Calendar, Phone, Mail, MapPin, FileText, Plus, Minus, Receipt, CreditCard, Banknote } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface ServiceItem {
  id: number;
  name: string;
  category: string;
  defaultPrice: number;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface PatientBill {
  patientId: number;
  patientName: string;
  services: ServiceItem[];
  subtotal: number;
  tax: number;
  discount: number;
  totalAmount: number;
  paymentMethod: string;
  staffId: number;
}

export default function PatientBilling() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [selectedServices, setSelectedServices] = useState<ServiceItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // Service master list with different pricing tiers
  const serviceMasterList = [
    // Laboratory Services
    { id: 1, name: "Complete Blood Count (CBC)", category: "Laboratory", defaultPrice: 8000 },
    { id: 2, name: "Blood Chemistry Analysis", category: "Laboratory", defaultPrice: 15000 },
    { id: 3, name: "Lipid Profile", category: "Laboratory", defaultPrice: 12000 },
    { id: 4, name: "Liver Function Test", category: "Laboratory", defaultPrice: 18000 },
    { id: 5, name: "Kidney Function Test", category: "Laboratory", defaultPrice: 16000 },
    { id: 6, name: "Thyroid Function Test", category: "Laboratory", defaultPrice: 22000 },
    { id: 7, name: "HbA1c (Diabetes)", category: "Laboratory", defaultPrice: 9500 },
    { id: 8, name: "Malaria Parasite Test", category: "Laboratory", defaultPrice: 3000 },
    { id: 9, name: "Hepatitis B & C Screening", category: "Laboratory", defaultPrice: 14000 },
    { id: 10, name: "HIV Rapid Test", category: "Laboratory", defaultPrice: 5000 },
    
    // Imaging Services
    { id: 11, name: "Chest X-Ray", category: "Imaging", defaultPrice: 12000 },
    { id: 12, name: "Abdominal Ultrasound", category: "Imaging", defaultPrice: 20000 },
    { id: 13, name: "Pelvic Ultrasound", category: "Imaging", defaultPrice: 18000 },
    { id: 14, name: "Obstetric Ultrasound", category: "Imaging", defaultPrice: 25000 },
    { id: 15, name: "ECG (Electrocardiogram)", category: "Imaging", defaultPrice: 10000 },
    { id: 16, name: "Echocardiogram", category: "Imaging", defaultPrice: 35000 },
    { id: 17, name: "CT Scan Head", category: "Imaging", defaultPrice: 85000 },
    { id: 18, name: "CT Scan Abdomen", category: "Imaging", defaultPrice: 95000 },
    { id: 19, name: "MRI Brain", category: "Imaging", defaultPrice: 150000 },
    { id: 20, name: "Mammography", category: "Imaging", defaultPrice: 45000 }
  ];

  // Fetch patients for selection
  const { data: patients = [] } = useQuery({
    queryKey: ["/api/patients", user?.branchId],
    enabled: !!user?.branchId,
  });

  // Add service to bill
  const addService = (service: any) => {
    const existingService = selectedServices.find(s => s.id === service.id);
    if (existingService) {
      updateServiceQuantity(service.id, existingService.quantity + 1);
    } else {
      const newService: ServiceItem = {
        ...service,
        quantity: 1,
        unitPrice: service.defaultPrice,
        total: service.defaultPrice
      };
      setSelectedServices([...selectedServices, newService]);
    }
  };

  // Update service quantity
  const updateServiceQuantity = (serviceId: number, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeService(serviceId);
      return;
    }
    setSelectedServices(services => 
      services.map(service => 
        service.id === serviceId 
          ? { ...service, quantity: newQuantity, total: service.unitPrice * newQuantity }
          : service
      )
    );
  };

  // Update service unit price (override capability)
  const updateServicePrice = (serviceId: number, newPrice: number) => {
    setSelectedServices(services => 
      services.map(service => 
        service.id === serviceId 
          ? { ...service, unitPrice: newPrice, total: newPrice * service.quantity }
          : service
      )
    );
  };

  // Remove service from bill
  const removeService = (serviceId: number) => {
    setSelectedServices(services => services.filter(s => s.id !== serviceId));
  };

  // Calculate totals
  const subtotal = selectedServices.reduce((sum, service) => sum + service.total, 0);
  const tax = subtotal * 0.075; // 7.5% VAT
  const discount = 0; // Can be implemented later
  const totalAmount = subtotal + tax - discount;

  // Process payment mutation
  const processPaymentMutation = useMutation({
    mutationFn: async (billData: PatientBill) => {
      const response = await apiRequest("POST", "/api/patient-billing", {
        ...billData,
        tenantId: user?.tenantId,
        branchId: user?.branchId,
        timestamp: new Date().toISOString(),
        staffInfo: {
          id: user?.id,
          username: user?.username,
          department: "Billing"
        }
      });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Payment Processed",
        description: `Receipt #${data.receiptNumber} generated successfully`,
      });
      // Reset form
      setSelectedServices([]);
      setSelectedPatient(null);
      setPaymentMethod("cash");
      setIsProcessingPayment(false);
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["/api/journal-entries"] });
      queryClient.invalidateQueries({ queryKey: ["/api/financial-summary"] });
    },
    onError: () => {
      toast({
        title: "Payment Failed",
        description: "Failed to process payment. Please try again.",
        variant: "destructive",
      });
      setIsProcessingPayment(false);
    },
  });

  const handleProcessPayment = async () => {
    if (!selectedPatient || selectedServices.length === 0) {
      toast({
        title: "Incomplete Information",
        description: "Please select a patient and add services before processing payment.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessingPayment(true);
    const billData: PatientBill = {
      patientId: selectedPatient.id,
      patientName: `${selectedPatient.firstName} ${selectedPatient.lastName}`,
      services: selectedServices,
      subtotal,
      tax,
      discount,
      totalAmount,
      paymentMethod,
      staffId: user?.id || 0
    };

    processPaymentMutation.mutate(billData);
  };

  const filteredServices = serviceMasterList.filter(service =>
    service.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    service.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Patient Billing</h1>
        <Badge variant="secondary">Walk-in Service</Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Patient Selection & Services */}
        <div className="space-y-6">
          {/* Patient Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Select Patient</CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={selectedPatient?.id?.toString() || ""} onValueChange={(value) => {
                const patient = patients.find((p: any) => p.id.toString() === value);
                setSelectedPatient(patient);
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a patient..." />
                </SelectTrigger>
                <SelectContent>
                  {patients.map((patient: any) => (
                    <SelectItem key={patient.id} value={patient.id.toString()}>
                      {patient.firstName} {patient.lastName} - {patient.patientId}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedPatient && (
                <div className="mt-4 p-3 bg-muted rounded-lg">
                  <p><strong>Patient:</strong> {selectedPatient.firstName} {selectedPatient.lastName}</p>
                  <p><strong>ID:</strong> {selectedPatient.patientId}</p>
                  <p><strong>Phone:</strong> {selectedPatient.phone}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Service Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Service Master List</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <Input
                  placeholder="Search services..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {filteredServices.map((service) => (
                  <div key={service.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">{service.name}</p>
                      <p className="text-sm text-muted-foreground">{service.category}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold">₦{service.defaultPrice.toLocaleString()}</span>
                      <Button size="sm" onClick={() => addService(service)}>
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Bill & Payment */}
        <div className="space-y-6">
          {/* Selected Services */}
          <Card>
            <CardHeader>
              <CardTitle>Selected Services</CardTitle>
            </CardHeader>
            <CardContent>
              {selectedServices.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">No services selected</p>
              ) : (
                <div className="space-y-4">
                  {selectedServices.map((service) => (
                    <div key={service.id} className="border rounded-lg p-3">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-medium">{service.name}</p>
                          <Badge variant="outline">{service.category}</Badge>
                        </div>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => removeService(service.id)}
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <Label className="text-xs">Quantity</Label>
                          <Input
                            type="number"
                            min="1"
                            value={service.quantity}
                            onChange={(e) => updateServiceQuantity(service.id, parseInt(e.target.value) || 1)}
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Unit Price (₦)</Label>
                          <Input
                            type="number"
                            value={service.unitPrice}
                            onChange={(e) => updateServicePrice(service.id, parseInt(e.target.value) || 0)}
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Total (₦)</Label>
                          <Input
                            value={service.total.toLocaleString()}
                            readOnly
                            className="bg-muted"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Bill Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Bill Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>₦{subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>VAT (7.5%):</span>
                  <span>₦{tax.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Discount:</span>
                  <span>₦{discount.toLocaleString()}</span>
                </div>
                <hr />
                <div className="flex justify-between font-bold text-lg">
                  <span>Total Amount:</span>
                  <span>₦{totalAmount.toLocaleString()}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payment Method */}
          <Card>
            <CardHeader>
              <CardTitle>Payment Method</CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">
                    <div className="flex items-center gap-2">
                      <Banknote className="h-4 w-4" />
                      Cash Payment
                    </div>
                  </SelectItem>
                  <SelectItem value="pos">
                    <div className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4" />
                      POS/Card Payment
                    </div>
                  </SelectItem>
                  <SelectItem value="transfer">
                    <div className="flex items-center gap-2">
                      <Receipt className="h-4 w-4" />
                      Bank Transfer
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Process Payment */}
          <Button
            size="lg"
            className="w-full"
            onClick={handleProcessPayment}
            disabled={!selectedPatient || selectedServices.length === 0 || isProcessingPayment}
          >
            {isProcessingPayment ? "Processing..." : `Process Payment - ₦${totalAmount.toLocaleString()}`}
          </Button>
        </div>
      </div>
    </div>
  );
}