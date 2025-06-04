import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { 
  UserPlus, 
  Calendar, 
  DollarSign, 
  Receipt, 
  CheckCircle, 
  Clock,
  User,
  Phone,
  Mail,
  MapPin,
  Building,
  FileText,
  CreditCard
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function PatientIntake() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedTests, setSelectedTests] = useState<number[]>([]);
  const [newPatient, setNewPatient] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    dateOfBirth: "",
    gender: "",
    address: "",
    pathway: "self",
    referralProviderId: null as number | null
  });
  const [appointmentDetails, setAppointmentDetails] = useState({
    scheduledAt: "",
    notes: "",
    branchId: user?.branchId || 1
  });

  // Fetch required data
  const { data: branches = [] } = useQuery({
    queryKey: ["/api/branches", user?.tenantId],
    enabled: !!user?.tenantId,
  });

  const { data: referralProviders = [] } = useQuery({
    queryKey: ["/api/referral-providers", user?.tenantId],
    enabled: !!user?.tenantId,
  });

  const { data: testCategories = [] } = useQuery({
    queryKey: ["/api/test-categories", user?.tenantId],
    enabled: !!user?.tenantId,
  });

  const { data: tests = [] } = useQuery({
    queryKey: ["/api/tests", user?.tenantId],
    enabled: !!user?.tenantId,
  });

  // Mock data for demonstration
  const mockTestCategories = [
    { id: 1, name: "Blood Tests", description: "Complete blood count, blood chemistry, etc." },
    { id: 2, name: "Imaging", description: "X-rays, CT scans, MRI, ultrasound" },
    { id: 3, name: "Cardiac Tests", description: "ECG, echocardiogram, stress tests" },
    { id: 4, name: "Microbiology", description: "Culture tests, sensitivity tests" }
  ];

  const mockTests = [
    { id: 1, name: "Complete Blood Count (CBC)", code: "CBC-001", categoryId: 1, price: 5000, duration: 30, requiresConsultant: false },
    { id: 2, name: "Lipid Profile", code: "LIP-001", categoryId: 1, price: 8000, duration: 45, requiresConsultant: false },
    { id: 3, name: "Chest X-Ray", code: "XR-001", categoryId: 2, price: 12000, duration: 15, requiresConsultant: true },
    { id: 4, name: "Abdominal Ultrasound", code: "US-001", categoryId: 2, price: 15000, duration: 30, requiresConsultant: true },
    { id: 5, name: "ECG (Electrocardiogram)", code: "ECG-001", categoryId: 3, price: 10000, duration: 20, requiresConsultant: true },
    { id: 6, name: "Liver Function Test", code: "LFT-001", categoryId: 1, price: 7500, duration: 40, requiresConsultant: false },
    { id: 7, name: "Kidney Function Test", code: "KFT-001", categoryId: 1, price: 6000, duration: 35, requiresConsultant: false },
    { id: 8, name: "Thyroid Function Test", code: "TFT-001", categoryId: 1, price: 9000, duration: 50, requiresConsultant: false }
  ];

  const mockReferralProviders = [
    { id: 1, name: "Lagos General Hospital", type: "hospital", commissionRate: 5.0 },
    { id: 2, name: "Dr. Emeka Okafor Clinic", type: "clinic", commissionRate: 7.5 },
    { id: 3, name: "Sunrise Medical Center", type: "clinic", commissionRate: 6.0 },
    { id: 4, name: "Federal Medical Centre", type: "hospital", commissionRate: 4.5 }
  ];

  // Add patient mutation
  const addPatientMutation = useMutation({
    mutationFn: async (patientData: any) => {
      const response = await apiRequest("POST", "/api/patients", {
        ...patientData,
        tenantId: user?.tenantId,
        branchId: appointmentDetails.branchId,
        dateOfBirth: patientData.dateOfBirth ? new Date(patientData.dateOfBirth).toISOString() : null
      });
      return response.json();
    },
    onSuccess: (patient) => {
      toast({
        title: "Patient Registered",
        description: `Patient ID: ${patient.patientId} created successfully.`,
      });
      setCurrentStep(3);
    },
    onError: () => {
      toast({
        title: "Registration Failed",
        description: "Failed to register patient. Please try again.",
        variant: "destructive",
      });
    },
  });

  const scheduleTestsMutation = useMutation({
    mutationFn: async (testData: any) => {
      const responses = await Promise.all(
        selectedTests.map(testId => 
          apiRequest("POST", "/api/patient-tests", {
            ...testData,
            testId,
            tenantId: user?.tenantId,
            branchId: appointmentDetails.branchId,
            technicianId: user?.id
          }).then(res => res.json())
        )
      );
      return responses;
    },
    onSuccess: () => {
      toast({
        title: "Tests Scheduled",
        description: "All selected tests have been scheduled successfully.",
      });
      setCurrentStep(4);
    },
    onError: () => {
      toast({
        title: "Scheduling Failed",
        description: "Failed to schedule tests. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handlePatientSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addPatientMutation.mutate(newPatient);
  };

  const handleTestSelection = (testId: number) => {
    setSelectedTests(prev => 
      prev.includes(testId) 
        ? prev.filter(id => id !== testId)
        : [...prev, testId]
    );
  };

  const handleScheduleTests = () => {
    if (selectedTests.length === 0) {
      toast({
        title: "No Tests Selected",
        description: "Please select at least one test to proceed.",
        variant: "destructive",
      });
      return;
    }

    scheduleTestsMutation.mutate({
      patientId: 1, // This would be the actual patient ID from step 2
      status: "scheduled",
      scheduledAt: new Date(appointmentDetails.scheduledAt).toISOString(),
      notes: appointmentDetails.notes
    });
  };

  const calculateTotal = () => {
    return selectedTests.reduce((total, testId) => {
      const test = mockTests.find(t => t.id === testId);
      return total + (test?.price || 0);
    }, 0);
  };

  const calculateCommission = () => {
    if (newPatient.pathway !== "referral" || !newPatient.referralProviderId) return 0;
    
    const provider = mockReferralProviders.find(p => p.id === newPatient.referralProviderId);
    const total = calculateTotal();
    return Math.round(total * (provider?.commissionRate || 0) / 100);
  };

  const steps = [
    { id: 1, title: "Patient Registration", icon: UserPlus },
    { id: 2, title: "Test Selection", icon: FileText },
    { id: 3, title: "Schedule & Payment", icon: Calendar },
    { id: 4, title: "Confirmation", icon: CheckCircle }
  ];

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Patient Intake Process</h1>
        <p className="text-slate-gray">Complete patient registration and test scheduling workflow</p>
        
        {/* Progress Steps */}
        <div className="flex items-center justify-between mt-6 mb-8">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const isActive = currentStep === step.id;
            const isCompleted = currentStep > step.id;
            
            return (
              <div key={step.id} className="flex items-center">
                <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                  isCompleted 
                    ? 'bg-medical-green border-medical-green text-white' 
                    : isActive 
                      ? 'bg-medical-blue border-medical-blue text-white' 
                      : 'border-gray-300 text-gray-300'
                }`}>
                  {isCompleted ? (
                    <CheckCircle className="w-5 h-5" />
                  ) : (
                    <Icon className="w-5 h-5" />
                  )}
                </div>
                <div className="ml-3">
                  <p className={`text-sm font-medium ${
                    isActive ? 'text-medical-blue' : isCompleted ? 'text-medical-green' : 'text-gray-400'
                  }`}>
                    Step {step.id}
                  </p>
                  <p className={`text-xs ${
                    isActive || isCompleted ? 'text-gray-900' : 'text-gray-400'
                  }`}>
                    {step.title}
                  </p>
                </div>
                {index < steps.length - 1 && (
                  <div className={`w-12 h-0.5 mx-6 ${
                    isCompleted ? 'bg-medical-green' : 'bg-gray-300'
                  }`} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Step 1: Patient Registration */}
      {currentStep === 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <UserPlus className="mr-2 w-5 h-5" />
              Patient Registration
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePatientSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Personal Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-gray-900">Personal Information</h3>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">First Name *</Label>
                      <Input
                        id="firstName"
                        value={newPatient.firstName}
                        onChange={(e) => setNewPatient({ ...newPatient, firstName: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">Last Name *</Label>
                      <Input
                        id="lastName"
                        value={newPatient.lastName}
                        onChange={(e) => setNewPatient({ ...newPatient, lastName: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number *</Label>
                    <Input
                      id="phone"
                      value={newPatient.phone}
                      onChange={(e) => setNewPatient({ ...newPatient, phone: e.target.value })}
                      placeholder="+234-xxx-xxx-xxxx"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      value={newPatient.email}
                      onChange={(e) => setNewPatient({ ...newPatient, email: e.target.value })}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="dateOfBirth">Date of Birth</Label>
                      <Input
                        id="dateOfBirth"
                        type="date"
                        value={newPatient.dateOfBirth}
                        onChange={(e) => setNewPatient({ ...newPatient, dateOfBirth: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="gender">Gender</Label>
                      <Select value={newPatient.gender} onValueChange={(value) => setNewPatient({ ...newPatient, gender: value })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select gender" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="male">Male</SelectItem>
                          <SelectItem value="female">Female</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="address">Address</Label>
                    <Textarea
                      id="address"
                      value={newPatient.address}
                      onChange={(e) => setNewPatient({ ...newPatient, address: e.target.value })}
                      placeholder="Full address including city and state"
                    />
                  </div>
                </div>

                {/* Payment Pathway */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-gray-900">Payment Information</h3>
                  
                  <div className="space-y-2">
                    <Label htmlFor="pathway">Payment Pathway *</Label>
                    <Select value={newPatient.pathway} onValueChange={(value) => setNewPatient({ ...newPatient, pathway: value, referralProviderId: null })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="self">Self-Pay Patient</SelectItem>
                        <SelectItem value="referral">Referral Patient</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {newPatient.pathway === "referral" && (
                    <div className="space-y-2">
                      <Label htmlFor="referralProvider">Referring Provider *</Label>
                      <Select 
                        value={newPatient.referralProviderId?.toString() || ""} 
                        onValueChange={(value) => setNewPatient({ ...newPatient, referralProviderId: parseInt(value) })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select referring provider" />
                        </SelectTrigger>
                        <SelectContent>
                          {mockReferralProviders.map((provider) => (
                            <SelectItem key={provider.id} value={provider.id.toString()}>
                              <div className="flex items-center">
                                <Building className="w-4 h-4 mr-2" />
                                <div>
                                  <div className="font-medium">{provider.name}</div>
                                  <div className="text-xs text-slate-gray capitalize">
                                    {provider.type} • {provider.commissionRate}% commission
                                  </div>
                                </div>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="branch">Branch Location</Label>
                    <Select 
                      value={appointmentDetails.branchId.toString()} 
                      onValueChange={(value) => setAppointmentDetails({ ...appointmentDetails, branchId: parseInt(value) })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {branches.map((branch: any) => (
                          <SelectItem key={branch.id} value={branch.id.toString()}>
                            {branch.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {newPatient.pathway === "referral" && newPatient.referralProviderId && (
                    <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <h4 className="font-medium text-blue-900 mb-2">Referral Information</h4>
                      <div className="text-sm text-blue-700">
                        <p>Provider: {mockReferralProviders.find(p => p.id === newPatient.referralProviderId)?.name}</p>
                        <p>Commission Rate: {mockReferralProviders.find(p => p.id === newPatient.referralProviderId)?.commissionRate}%</p>
                        <p className="text-xs mt-1">Commission will be calculated based on selected tests</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end pt-6">
                <Button 
                  type="submit" 
                  disabled={addPatientMutation.isPending}
                  className="bg-medical-blue hover:bg-blue-700"
                >
                  {addPatientMutation.isPending ? "Registering..." : "Continue to Test Selection"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Test Selection */}
      {currentStep === 2 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <FileText className="mr-2 w-5 h-5" />
              Test Selection
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Available Tests</h3>
                  
                  <Tabs defaultValue="1" className="space-y-4">
                    <TabsList>
                      {mockTestCategories.map((category) => (
                        <TabsTrigger key={category.id} value={category.id.toString()}>
                          {category.name}
                        </TabsTrigger>
                      ))}
                    </TabsList>

                    {mockTestCategories.map((category) => (
                      <TabsContent key={category.id} value={category.id.toString()}>
                        <div className="space-y-3">
                          {mockTests
                            .filter(test => test.categoryId === category.id)
                            .map((test) => (
                              <div 
                                key={test.id} 
                                className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                                  selectedTests.includes(test.id) 
                                    ? 'border-medical-blue bg-blue-50' 
                                    : 'border-gray-200 hover:border-gray-300'
                                }`}
                                onClick={() => handleTestSelection(test.id)}
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center space-x-3">
                                    <Checkbox 
                                      checked={selectedTests.includes(test.id)}
                                      onChange={() => handleTestSelection(test.id)}
                                    />
                                    <div>
                                      <h4 className="font-medium text-gray-900">{test.name}</h4>
                                      <p className="text-sm text-slate-gray">Code: {test.code}</p>
                                      <div className="flex items-center space-x-4 mt-1">
                                        <span className="text-xs text-slate-gray">
                                          <Clock className="inline w-3 h-3 mr-1" />
                                          {test.duration} min
                                        </span>
                                        {test.requiresConsultant && (
                                          <Badge variant="outline" className="text-xs">
                                            Requires Specialist
                                          </Badge>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <div className="text-lg font-bold text-gray-900">
                                      ₦{test.price.toLocaleString()}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))
                          }
                        </div>
                      </TabsContent>
                    ))}
                  </Tabs>
                </div>

                {/* Order Summary */}
                <div className="lg:col-span-1">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <Receipt className="mr-2 w-4 h-4" />
                        Order Summary
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {selectedTests.length === 0 ? (
                        <p className="text-slate-gray text-sm">No tests selected</p>
                      ) : (
                        <>
                          <div className="space-y-3">
                            {selectedTests.map(testId => {
                              const test = mockTests.find(t => t.id === testId);
                              return test ? (
                                <div key={test.id} className="flex justify-between text-sm">
                                  <span className="flex-1">{test.name}</span>
                                  <span className="font-medium">₦{test.price.toLocaleString()}</span>
                                </div>
                              ) : null;
                            })}
                          </div>
                          
                          <div className="border-t pt-3">
                            <div className="flex justify-between font-medium">
                              <span>Subtotal</span>
                              <span>₦{calculateTotal().toLocaleString()}</span>
                            </div>
                            
                            {newPatient.pathway === "referral" && calculateCommission() > 0 && (
                              <div className="flex justify-between text-sm text-medical-red">
                                <span>Commission</span>
                                <span>-₦{calculateCommission().toLocaleString()}</span>
                              </div>
                            )}
                            
                            <div className="flex justify-between text-lg font-bold mt-2 pt-2 border-t">
                              <span>Total</span>
                              <span>₦{(calculateTotal() - calculateCommission()).toLocaleString()}</span>
                            </div>
                          </div>
                        </>
                      )}
                      
                      <div className="pt-4">
                        <Button 
                          onClick={() => setCurrentStep(3)}
                          disabled={selectedTests.length === 0}
                          className="w-full bg-medical-blue hover:bg-blue-700"
                        >
                          Continue to Scheduling
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Schedule & Payment */}
      {currentStep === 3 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Calendar className="mr-2 w-5 h-5" />
                Schedule Appointment
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="scheduledAt">Appointment Date & Time</Label>
                <Input
                  id="scheduledAt"
                  type="datetime-local"
                  value={appointmentDetails.scheduledAt}
                  onChange={(e) => setAppointmentDetails({ ...appointmentDetails, scheduledAt: e.target.value })}
                  min={new Date().toISOString().slice(0, 16)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Special Instructions</Label>
                <Textarea
                  id="notes"
                  value={appointmentDetails.notes}
                  onChange={(e) => setAppointmentDetails({ ...appointmentDetails, notes: e.target.value })}
                  placeholder="Any special instructions or notes for the medical team..."
                />
              </div>

              <div className="p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">Patient Information</h4>
                <div className="text-sm text-slate-gray space-y-1">
                  <p><User className="inline w-3 h-3 mr-1" />{newPatient.firstName} {newPatient.lastName}</p>
                  <p><Phone className="inline w-3 h-3 mr-1" />{newPatient.phone}</p>
                  {newPatient.email && <p><Mail className="inline w-3 h-3 mr-1" />{newPatient.email}</p>}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <CreditCard className="mr-2 w-5 h-5" />
                Payment Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <h4 className="font-medium text-gray-900">Selected Tests</h4>
                {selectedTests.map(testId => {
                  const test = mockTests.find(t => t.id === testId);
                  return test ? (
                    <div key={test.id} className="flex justify-between text-sm">
                      <span>{test.name}</span>
                      <span>₦{test.price.toLocaleString()}</span>
                    </div>
                  ) : null;
                })}
              </div>

              <div className="border-t pt-3 space-y-2">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>₦{calculateTotal().toLocaleString()}</span>
                </div>
                
                {newPatient.pathway === "referral" && calculateCommission() > 0 && (
                  <div className="flex justify-between text-medical-red text-sm">
                    <span>Provider Commission ({mockReferralProviders.find(p => p.id === newPatient.referralProviderId)?.commissionRate}%)</span>
                    <span>-₦{calculateCommission().toLocaleString()}</span>
                  </div>
                )}
                
                <div className="flex justify-between text-lg font-bold pt-2 border-t">
                  <span>Total Amount</span>
                  <span>₦{(calculateTotal() - calculateCommission()).toLocaleString()}</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Payment Method</Label>
                <Select defaultValue="cash">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash Payment</SelectItem>
                    <SelectItem value="card">Card Payment</SelectItem>
                    <SelectItem value="transfer">Bank Transfer</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button 
                onClick={handleScheduleTests}
                disabled={scheduleTestsMutation.isPending || !appointmentDetails.scheduledAt}
                className="w-full bg-medical-green hover:bg-green-700"
              >
                {scheduleTestsMutation.isPending ? "Processing..." : "Confirm & Schedule Tests"}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Step 4: Confirmation */}
      {currentStep === 4 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-medical-green">
              <CheckCircle className="mr-2 w-5 h-5" />
              Appointment Confirmed
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center p-6 bg-green-50 rounded-lg border border-green-200">
              <CheckCircle className="w-16 h-16 text-medical-green mx-auto mb-4" />
              <h3 className="text-xl font-bold text-green-900 mb-2">
                Patient Successfully Registered!
              </h3>
              <p className="text-green-700">
                Patient ID: P-2024-006 • Appointment scheduled for {new Date(appointmentDetails.scheduledAt).toLocaleString()}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h4 className="font-medium text-gray-900">Patient Details</h4>
                <div className="p-4 bg-gray-50 rounded-lg space-y-2 text-sm">
                  <p><strong>Name:</strong> {newPatient.firstName} {newPatient.lastName}</p>
                  <p><strong>Phone:</strong> {newPatient.phone}</p>
                  <p><strong>Pathway:</strong> {newPatient.pathway === "self" ? "Self-Pay" : "Referral"}</p>
                  {newPatient.pathway === "referral" && (
                    <p><strong>Referring Provider:</strong> {mockReferralProviders.find(p => p.id === newPatient.referralProviderId)?.name}</p>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-medium text-gray-900">Financial Summary</h4>
                <div className="p-4 bg-gray-50 rounded-lg space-y-2 text-sm">
                  <p><strong>Total Tests:</strong> {selectedTests.length}</p>
                  <p><strong>Total Amount:</strong> ₦{calculateTotal().toLocaleString()}</p>
                  {calculateCommission() > 0 && (
                    <p><strong>Commission:</strong> ₦{calculateCommission().toLocaleString()}</p>
                  )}
                  <p><strong>Net Revenue:</strong> ₦{(calculateTotal() - calculateCommission()).toLocaleString()}</p>
                </div>
              </div>
            </div>

            <div className="flex justify-center space-x-4 pt-6">
              <Button variant="outline">
                <FileText className="mr-2 w-4 h-4" />
                Print Receipt
              </Button>
              <Button 
                onClick={() => {
                  setCurrentStep(1);
                  setSelectedTests([]);
                  setNewPatient({
                    firstName: "",
                    lastName: "",
                    email: "",
                    phone: "",
                    dateOfBirth: "",
                    gender: "",
                    address: "",
                    pathway: "self",
                    referralProviderId: null
                  });
                  setAppointmentDetails({
                    scheduledAt: "",
                    notes: "",
                    branchId: user?.branchId || 1
                  });
                }}
                className="bg-medical-blue hover:bg-blue-700"
              >
                <UserPlus className="mr-2 w-4 h-4" />
                Register Another Patient
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}