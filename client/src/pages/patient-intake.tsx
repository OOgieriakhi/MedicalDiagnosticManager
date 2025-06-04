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
  Receipt, 
  CheckCircle, 
  Clock,
  User,
  Phone,
  Mail,
  Building,
  FileText,
  CreditCard,
  Search
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import DynamicProgressTracker from "@/components/progress/dynamic-progress-tracker";

export default function PatientIntake() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [currentWorkflowStep, setCurrentWorkflowStep] = useState("registration");
  const [selectedTests, setSelectedTests] = useState<number[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isNewPatient, setIsNewPatient] = useState(true);
  
  const [newPatientData, setNewPatientData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    dateOfBirth: "",
    gender: "",
    address: ""
  });
  
  const [billingInfo, setBillingInfo] = useState({
    pathway: "self" as "self" | "referral",
    referralProviderId: null as number | null
  });
  
  const [appointmentDetails, setAppointmentDetails] = useState({
    scheduledAt: "",
    notes: ""
  });

  // Search existing patients
  const { data: searchResults = [], refetch: searchPatients } = useQuery({
    queryKey: ["/api/patients", user?.branchId, searchQuery],
    enabled: false
  });

  // Fetch referral providers
  const { data: referralProviders = [] } = useQuery({
    queryKey: ["/api/referral-providers"],
    enabled: !!user,
  });

  // Fetch test categories
  const { data: testCategories = [] } = useQuery({
    queryKey: ["/api/test-categories"],
    enabled: !!user,
  });

  // Fetch tests
  const { data: tests = [] } = useQuery({
    queryKey: ["/api/tests"],
    enabled: !!user,
  });

  // Add patient mutation
  const addPatientMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/patients", {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email || null,
        phone: data.phone,
        dateOfBirth: data.dateOfBirth || null,
        gender: data.gender || null,
        address: data.address || null,
        tenantId: user?.tenantId,
        branchId: user?.branchId
      });
      return response.json();
    },
    onSuccess: (patient) => {
      setSelectedPatient(patient);
      setCurrentWorkflowStep("pathway");
      toast({
        title: "Patient Registered",
        description: `Patient ID: ${patient.patientId} created successfully.`,
      });
      setCurrentStep(2);
    },
    onError: (error: any) => {
      toast({
        title: "Registration Failed",
        description: error.message || "Failed to register patient. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Schedule tests mutation
  const scheduleTestsMutation = useMutation({
    mutationFn: async (testData: any) => {
      const responses = await Promise.all(
        selectedTests.map(testId => 
          apiRequest("POST", "/api/patient-tests", {
            ...testData,
            testId,
            tenantId: user?.tenantId,
            branchId: user?.branchId,
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

  const handleSearch = async () => {
    if (searchQuery.trim()) {
      await searchPatients();
    }
  };

  const handlePatientSelect = (patient: any) => {
    setSelectedPatient(patient);
    setIsNewPatient(false);
    setCurrentStep(2);
  };

  const handleNewPatientSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addPatientMutation.mutate(newPatientData);
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
      patientId: selectedPatient?.id,
      status: "scheduled",
      scheduledAt: new Date(appointmentDetails.scheduledAt).toISOString(),
      notes: appointmentDetails.notes
    });
  };

  const calculateTotal = () => {
    return selectedTests.reduce((total, testId) => {
      const test = tests.find((t: any) => t.id === testId);
      return total + (test?.price || 0);
    }, 0);
  };

  const calculateCommission = () => {
    if (billingInfo.pathway !== "referral" || !billingInfo.referralProviderId) return 0;
    
    const provider = referralProviders.find((p: any) => p.id === billingInfo.referralProviderId);
    const total = calculateTotal();
    return Math.round(total * (provider?.commissionRate || 0) / 100);
  };

  const steps = [
    { id: 1, title: "Patient Selection", icon: UserPlus },
    { id: 2, title: "Test Selection & Billing", icon: FileText },
    { id: 3, title: "Schedule & Payment", icon: Calendar },
    { id: 4, title: "Confirmation", icon: CheckCircle }
  ];

  return (
    <div className="p-6">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Dynamic Progress Tracker */}
        <div className="lg:col-span-1">
          <DynamicProgressTracker 
            currentStep={currentWorkflowStep}
            patientData={selectedPatient || (newPatientData.firstName ? newPatientData : null)}
          />
        </div>

        {/* Main Content */}
        <div className="lg:col-span-3">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Patient Intake Process</h1>
            <p className="text-slate-gray">Search existing patients or register new ones for diagnostic tests</p>
          </div>

      {/* Step 1: Patient Selection */}
      {currentStep === 1 && (
        <div className="space-y-6">
          {/* Search Existing Patients */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Search className="mr-2 w-5 h-5" />
                Search Existing Patients
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex space-x-4">
                <div className="flex-1">
                  <Input
                    placeholder="Search by name, phone, or patient ID..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  />
                </div>
                <Button onClick={handleSearch} variant="outline">
                  <Search className="w-4 h-4 mr-2" />
                  Search
                </Button>
              </div>

              {searchResults.length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-medium text-gray-900">Search Results</h4>
                  {searchResults.map((patient: any) => (
                    <div 
                      key={patient.id}
                      className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer"
                      onClick={() => handlePatientSelect(patient)}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h5 className="font-medium text-gray-900">
                            {patient.firstName} {patient.lastName}
                          </h5>
                          <p className="text-sm text-slate-gray">
                            ID: {patient.patientId} • Phone: {patient.phone}
                          </p>
                          {patient.email && (
                            <p className="text-sm text-slate-gray">Email: {patient.email}</p>
                          )}
                        </div>
                        <Button size="sm">Select</Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Register New Patient */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <UserPlus className="mr-2 w-5 h-5" />
                Register New Patient
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleNewPatientSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium text-gray-900">Personal Information</h3>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="firstName">First Name *</Label>
                        <Input
                          id="firstName"
                          value={newPatientData.firstName}
                          onChange={(e) => setNewPatientData({ ...newPatientData, firstName: e.target.value })}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="lastName">Last Name *</Label>
                        <Input
                          id="lastName"
                          value={newPatientData.lastName}
                          onChange={(e) => setNewPatientData({ ...newPatientData, lastName: e.target.value })}
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone Number *</Label>
                      <Input
                        id="phone"
                        value={newPatientData.phone}
                        onChange={(e) => setNewPatientData({ ...newPatientData, phone: e.target.value })}
                        placeholder="+234-xxx-xxx-xxxx"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email">Email Address</Label>
                      <Input
                        id="email"
                        type="email"
                        value={newPatientData.email}
                        onChange={(e) => setNewPatientData({ ...newPatientData, email: e.target.value })}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="dateOfBirth">Date of Birth</Label>
                        <Input
                          id="dateOfBirth"
                          type="date"
                          value={newPatientData.dateOfBirth}
                          onChange={(e) => setNewPatientData({ ...newPatientData, dateOfBirth: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="gender">Gender</Label>
                        <Select value={newPatientData.gender} onValueChange={(value) => setNewPatientData({ ...newPatientData, gender: value })}>
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
                        value={newPatientData.address}
                        onChange={(e) => setNewPatientData({ ...newPatientData, address: e.target.value })}
                        placeholder="Full address including city and state"
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-lg font-medium text-gray-900">Location Information</h3>
                    
                    <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <h4 className="font-medium text-blue-900 mb-2">Current Branch</h4>
                      <div className="text-sm text-blue-700">
                        <p className="flex items-center">
                          <Building className="w-4 h-4 mr-2" />
                          {user?.branchId === 1 ? "Victoria Island Branch" : 
                           user?.branchId === 2 ? "Lekki Branch" : 
                           user?.branchId === 3 ? "Ikeja Branch" : "Main Branch"}
                        </p>
                        <p className="mt-2 text-xs">
                          Patient will be registered at this location
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-6">
                  <Button 
                    type="submit" 
                    disabled={addPatientMutation.isPending}
                    className="bg-medical-blue hover:bg-blue-700"
                  >
                    {addPatientMutation.isPending ? "Registering..." : "Register & Continue"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Step 2: Test Selection & Billing */}
      {currentStep === 2 && selectedPatient && (
        <div className="space-y-6">
          {/* Patient Info */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-gray-900">
                    {selectedPatient.firstName} {selectedPatient.lastName}
                  </h3>
                  <p className="text-sm text-slate-gray">
                    ID: {selectedPatient.patientId} • Phone: {selectedPatient.phone}
                  </p>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    setCurrentStep(1);
                    setSelectedPatient(null);
                    setSelectedTests([]);
                  }}
                >
                  Change Patient
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Billing Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <CreditCard className="mr-2 w-5 h-5" />
                Billing Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Payment Pathway *</Label>
                <Select value={billingInfo.pathway} onValueChange={(value: "self" | "referral") => setBillingInfo({ ...billingInfo, pathway: value, referralProviderId: null })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="self">Self-Pay Patient</SelectItem>
                    <SelectItem value="referral">Referral Patient</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {billingInfo.pathway === "referral" && (
                <div className="space-y-2">
                  <Label>Referring Provider *</Label>
                  <Select 
                    value={billingInfo.referralProviderId?.toString() || ""} 
                    onValueChange={(value) => setBillingInfo({ ...billingInfo, referralProviderId: parseInt(value) })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select referring provider" />
                    </SelectTrigger>
                    <SelectContent>
                      {referralProviders.map((provider: any) => (
                        <SelectItem key={provider.id} value={provider.id.toString()}>
                          <div className="flex items-center">
                            <Building className="w-4 h-4 mr-2" />
                            <div>
                              <div className="font-medium">{provider.name}</div>
                              <div className="text-xs text-slate-gray">
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
            </CardContent>
          </Card>

          {/* Test Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Select Diagnostic Tests</CardTitle>
            </CardHeader>
            <CardContent>
              {/* Debug info */}
              {process.env.NODE_ENV === 'development' && (
                <div className="mb-4 p-2 bg-yellow-50 text-xs">
                  <p>Categories: {testCategories.length} | Tests: {tests.length}</p>
                </div>
              )}
              
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                  {testCategories.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-slate-gray">Loading test categories...</p>
                    </div>
                  ) : tests.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-slate-gray">Loading diagnostic tests...</p>
                    </div>
                  ) : (
                    <Tabs defaultValue={testCategories[0]?.id?.toString() || "1"} className="space-y-4">
                      <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4">
                        {testCategories.slice(0, 4).map((category: any) => (
                          <TabsTrigger key={category.id} value={category.id.toString()}>
                            {category.name}
                          </TabsTrigger>
                        ))}
                      </TabsList>

                      {testCategories.map((category: any) => {
                        const categoryTests = tests.filter((test: any) => test.categoryId === category.id);
                        return (
                          <TabsContent key={category.id} value={category.id.toString()}>
                            <div className="space-y-3">
                              {categoryTests.length === 0 ? (
                                <div className="text-center py-8">
                                  <p className="text-slate-gray">No tests available in this category</p>
                                </div>
                              ) : (
                                categoryTests.map((test: any) => (
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
                                          onCheckedChange={() => handleTestSelection(test.id)}
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
                                          ₦{test.price?.toLocaleString() || '0'}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                ))
                              )}
                            </div>
                          </TabsContent>
                        )
                      })}
                    </Tabs>
                  )}
                </div>

                {/* Order Summary */}
                <div>
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
                              const test = tests.find((t: any) => t.id === testId);
                              return test ? (
                                <div key={test.id} className="flex justify-between text-sm">
                                  <span className="flex-1">{test.name}</span>
                                  <span className="font-medium">₦{test.price?.toLocaleString() || '0'}</span>
                                </div>
                              ) : null;
                            })}
                          </div>
                          
                          <div className="border-t pt-3">
                            <div className="flex justify-between font-medium">
                              <span>Subtotal</span>
                              <span>₦{calculateTotal().toLocaleString()}</span>
                            </div>
                            
                            {billingInfo.pathway === "referral" && calculateCommission() > 0 && (
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
                      
                      <Button 
                        onClick={() => setCurrentStep(3)}
                        disabled={selectedTests.length === 0}
                        className="w-full bg-medical-blue hover:bg-blue-700"
                      >
                        Continue to Scheduling
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
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
                  <p><User className="inline w-3 h-3 mr-1" />{selectedPatient?.firstName} {selectedPatient?.lastName}</p>
                  <p><Phone className="inline w-3 h-3 mr-1" />{selectedPatient?.phone}</p>
                  {selectedPatient?.email && <p><Mail className="inline w-3 h-3 mr-1" />{selectedPatient?.email}</p>}
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
                  const test = tests.find((t: any) => t.id === testId);
                  return test ? (
                    <div key={test.id} className="flex justify-between text-sm">
                      <span>{test.name}</span>
                      <span>₦{test.price?.toLocaleString() || '0'}</span>
                    </div>
                  ) : null;
                })}
              </div>

              <div className="border-t pt-3 space-y-2">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>₦{calculateTotal().toLocaleString()}</span>
                </div>
                
                {billingInfo.pathway === "referral" && calculateCommission() > 0 && (
                  <div className="flex justify-between text-medical-red text-sm">
                    <span>Provider Commission ({referralProviders.find((p: any) => p.id === billingInfo.referralProviderId)?.commissionRate}%)</span>
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
                Tests Successfully Scheduled!
              </h3>
              <p className="text-green-700">
                Patient: {selectedPatient?.firstName} {selectedPatient?.lastName} • Appointment: {new Date(appointmentDetails.scheduledAt).toLocaleString()}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h4 className="font-medium text-gray-900">Patient Details</h4>
                <div className="p-4 bg-gray-50 rounded-lg space-y-2 text-sm">
                  <p><strong>Name:</strong> {selectedPatient?.firstName} {selectedPatient?.lastName}</p>
                  <p><strong>ID:</strong> {selectedPatient?.patientId}</p>
                  <p><strong>Phone:</strong> {selectedPatient?.phone}</p>
                  <p><strong>Pathway:</strong> {billingInfo.pathway === "self" ? "Self-Pay" : "Referral"}</p>
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
                  setSelectedPatient(null);
                  setIsNewPatient(true);
                  setSearchQuery("");
                  setNewPatientData({
                    firstName: "",
                    lastName: "",
                    email: "",
                    phone: "",
                    dateOfBirth: "",
                    gender: "",
                    address: ""
                  });
                  setBillingInfo({
                    pathway: "self",
                    referralProviderId: null
                  });
                  setAppointmentDetails({
                    scheduledAt: "",
                    notes: ""
                  });
                }}
                className="bg-medical-blue hover:bg-blue-700"
              >
                <UserPlus className="mr-2 w-4 h-4" />
                Process Another Patient
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
        </div>
      </div>
    </div>
  );
}