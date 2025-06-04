import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { 
  UserPlus, 
  FileText, 
  Calendar, 
  Receipt, 
  CheckCircle, 
  Clock,
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
  const [testSearchTerm, setTestSearchTerm] = useState("");
  const [isNewPatient, setIsNewPatient] = useState(true);
  
  const [newPatientData, setNewPatientData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    dateOfBirth: "",
    gender: "male",
    address: "",
    nin: ""
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
    queryKey: ["/api/patients/search", searchQuery, user?.branchId],
    queryFn: async () => {
      if (!searchQuery.trim()) return [];
      const response = await fetch(`/api/patients/search?query=${encodeURIComponent(searchQuery)}&branchId=${user?.branchId}`);
      if (!response.ok) throw new Error('Search failed');
      return response.json();
    },
    enabled: false
  });

  // Fetch referral providers
  const { data: referralProviders = [] } = useQuery({
    queryKey: ["/api/referral-providers"],
    enabled: !!user,
  });

  // Fetch tests
  const { data: tests = [] } = useQuery({
    queryKey: ["/api/tests"],
    enabled: !!user,
  });

  // Register new patient mutation
  const registerPatientMutation = useMutation({
    mutationFn: async (patientData: any) => {
      const response = await apiRequest("POST", "/api/patients", patientData);
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
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/patient-tests", data);
      return response.json();
    },
    onSuccess: () => {
      setCurrentWorkflowStep("confirmation");
      setCurrentStep(4);
      toast({
        title: "Tests Scheduled",
        description: "Patient tests have been scheduled successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Scheduling Failed",
        description: error.message || "Failed to schedule tests. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handlePatientSearch = () => {
    if (searchQuery.trim()) {
      searchPatients();
    }
  };

  const handleTestSelection = (testId: number) => {
    setSelectedTests(prev => 
      prev.includes(testId) 
        ? prev.filter(id => id !== testId)
        : [...prev, testId]
    );
  };

  const handleProceedToTests = () => {
    if (!selectedTests.length) {
      toast({
        title: "No Tests Selected",
        description: "Please select at least one test to proceed.",
        variant: "destructive",
      });
      return;
    }

    if (!appointmentDetails.scheduledAt) {
      toast({
        title: "Appointment Time Required",
        description: "Please select a date and time for the appointment.",
        variant: "destructive",
      });
      return;
    }

    setCurrentWorkflowStep("scheduling");
    
    // Create patient test records for each selected test
    const testPromises = selectedTests.map(testId => {
      return apiRequest("POST", "/api/patient-tests", {
        testId: testId,
        patientId: selectedPatient?.id,
        branchId: user?.branchId,
        tenantId: user?.tenantId,
        status: "scheduled",
        scheduledAt: new Date(appointmentDetails.scheduledAt).toISOString(),
        notes: appointmentDetails.notes || ""
      }).then(response => response.json());
    });

    Promise.all(testPromises)
      .then(() => {
        setCurrentWorkflowStep("confirmation");
        setCurrentStep(4);
        toast({
          title: "Tests Scheduled",
          description: "Patient tests have been scheduled successfully.",
        });
      })
      .catch((error) => {
        toast({
          title: "Scheduling Failed",
          description: error.message || "Failed to schedule tests. Please try again.",
          variant: "destructive",
        });
      });
  };

  const calculateTotal = () => {
    return selectedTests.reduce((total, testId) => {
      const test = (tests as any[]).find((t: any) => t.id === testId);
      return total + (test?.price || 0);
    }, 0);
  };

  const calculateCommission = () => {
    if (billingInfo.pathway !== "referral" || !billingInfo.referralProviderId) return 0;
    
    const provider = (referralProviders as any[]).find((p: any) => p.id === billingInfo.referralProviderId);
    const total = calculateTotal();
    return Math.round(total * (provider?.commissionRate || 0) / 100);
  };

  // Filter tests based on search term
  const filteredTests = (tests as any[] || []).filter(test =>
    test.name.toLowerCase().includes(testSearchTerm.toLowerCase()) ||
    test.code.toLowerCase().includes(testSearchTerm.toLowerCase())
  );

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
                <CardContent>
                  <div className="flex gap-2 mb-4">
                    <Input
                      placeholder="Search by name, phone, or patient ID..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="flex-1"
                    />
                    <Button onClick={handlePatientSearch}>Search</Button>
                  </div>
                  
                  {Array.isArray(searchResults) && searchResults.length > 0 && (
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {searchResults.map((patient: any) => (
                        <div
                          key={patient.id}
                          className="p-3 border rounded cursor-pointer hover:bg-gray-50"
                          onClick={() => {
                            setSelectedPatient(patient);
                            setIsNewPatient(false);
                            setCurrentStep(2);
                            setCurrentWorkflowStep("pathway");
                          }}
                        >
                          <div className="font-medium">{patient.firstName} {patient.lastName}</div>
                          <div className="text-sm text-gray-500">ID: {patient.patientId} | Phone: {patient.phone}</div>
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
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="firstName">First Name *</Label>
                      <Input
                        id="firstName"
                        value={newPatientData.firstName}
                        onChange={(e) => setNewPatientData({ ...newPatientData, firstName: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="lastName">Last Name *</Label>
                      <Input
                        id="lastName"
                        value={newPatientData.lastName}
                        onChange={(e) => setNewPatientData({ ...newPatientData, lastName: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={newPatientData.email}
                        onChange={(e) => setNewPatientData({ ...newPatientData, email: e.target.value })}
                        placeholder="patient@example.com"
                      />
                    </div>
                    <div>
                      <Label htmlFor="phone">Phone *</Label>
                      <Input
                        id="phone"
                        value={newPatientData.phone}
                        onChange={(e) => setNewPatientData({ ...newPatientData, phone: e.target.value })}
                        placeholder="+234..."
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="dateOfBirth">Date of Birth</Label>
                      <Input
                        id="dateOfBirth"
                        type="date"
                        value={newPatientData.dateOfBirth}
                        onChange={(e) => setNewPatientData({ ...newPatientData, dateOfBirth: e.target.value })}
                        max={new Date().toISOString().split('T')[0]}
                      />
                    </div>
                    <div>
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
                    <div>
                      <Label htmlFor="nin">NIN (National ID)</Label>
                      <Input
                        id="nin"
                        value={newPatientData.nin}
                        onChange={(e) => setNewPatientData({ ...newPatientData, nin: e.target.value })}
                        placeholder="Enter 11-digit NIN (optional)"
                        maxLength={11}
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="address">Address</Label>
                    <Textarea
                      id="address"
                      value={newPatientData.address}
                      onChange={(e) => setNewPatientData({ ...newPatientData, address: e.target.value })}
                      placeholder="Enter patient's full address"
                      rows={3}
                    />
                  </div>
                  
                  <Button 
                    onClick={() => {
                      registerPatientMutation.mutate({
                        ...newPatientData,
                        tenantId: user?.tenantId,
                        branchId: user?.branchId
                      });
                    }}
                    disabled={!newPatientData.firstName || !newPatientData.lastName || !newPatientData.phone}
                    className="w-full"
                  >
                    Register Patient
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Step 2: Test Selection */}
          {currentStep === 2 && selectedPatient && (
            <div className="space-y-6">
              {/* Patient Info */}
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium">{selectedPatient.firstName} {selectedPatient.lastName}</h3>
                      <p className="text-sm text-gray-500">Patient ID: {selectedPatient.patientId}</p>
                    </div>
                    <Badge variant="outline">Ready for Tests</Badge>
                  </div>
                </CardContent>
              </Card>

              {/* Test Selection */}
              <Card>
                <CardHeader>
                  <CardTitle>Select Diagnostic Tests</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Test Search */}
                    <div>
                      <Input
                        placeholder="Search tests by name or code..."
                        value={testSearchTerm}
                        onChange={(e) => setTestSearchTerm(e.target.value)}
                        className="mb-4"
                      />
                    </div>

                    {/* Available Tests */}
                    <div>
                      <h3 className="font-medium mb-3">Available Tests</h3>
                      {filteredTests.length === 0 ? (
                        <div className="text-center py-8">
                          <p className="text-slate-gray">Loading diagnostic tests...</p>
                        </div>
                      ) : (
                        <div className="max-h-80 overflow-y-auto border rounded-md">
                          {filteredTests.map((test: any) => (
                            <div
                              key={test.id}
                              className={`p-3 cursor-pointer hover:bg-gray-50 border-b last:border-b-0 ${
                                selectedTests.includes(test.id) ? 'bg-blue-50' : ''
                              }`}
                              onClick={() => handleTestSelection(test.id)}
                            >
                              <div className="flex justify-between items-center">
                                <div className="flex items-center space-x-3">
                                  <Checkbox 
                                    checked={selectedTests.includes(test.id)}
                                    onCheckedChange={() => handleTestSelection(test.id)}
                                  />
                                  <div>
                                    <div className="font-medium">{test.name}</div>
                                    <div className="text-sm text-gray-500">Code: {test.code}</div>
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
                                  <div className="font-medium">₦{test.price?.toLocaleString() || '0'}</div>
                                  {selectedTests.includes(test.id) && (
                                    <Badge variant="default" className="text-xs">Selected</Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Selected Tests Summary */}
                    {selectedTests.length > 0 && (
                      <div>
                        <h3 className="font-medium mb-3">Selected Tests ({selectedTests.length})</h3>
                        <div className="space-y-2">
                          {selectedTests.map((testId) => {
                            const test = (tests as any[]).find((t: any) => t.id === testId);
                            if (!test) return null;
                            return (
                              <div key={testId} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                                <span className="font-medium">{test.name}</span>
                                <div className="flex items-center gap-2">
                                  <span>₦{test.price?.toLocaleString() || '0'}</span>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleTestSelection(testId)}
                                  >
                                    Remove
                                  </Button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Order Summary */}
                    {selectedTests.length > 0 && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center">
                            <Receipt className="mr-2 w-4 h-4" />
                            Order Summary
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="space-y-3">
                            {selectedTests.map(testId => {
                              const test = (tests as any[]).find((t: any) => t.id === testId);
                              return test ? (
                                <div key={test.id} className="flex justify-between text-sm">
                                  <span className="flex-1">{test.name}</span>
                                  <span className="font-medium">₦{(test.price || 0).toLocaleString()}</span>
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
                              <div className="flex justify-between text-sm text-red-600">
                                <span>Commission</span>
                                <span>-₦{calculateCommission().toLocaleString()}</span>
                              </div>
                            )}
                            
                            <div className="flex justify-between text-lg font-bold mt-2 pt-2 border-t">
                              <span>Total</span>
                              <span>₦{Math.max(0, calculateTotal() - calculateCommission()).toLocaleString()}</span>
                            </div>
                          </div>
                          
                          <Button 
                            onClick={() => setCurrentStep(3)}
                            disabled={selectedTests.length === 0}
                            className="w-full bg-medical-blue hover:bg-blue-700"
                          >
                            Continue to Scheduling
                          </Button>
                        </CardContent>
                      </Card>
                    )}
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
                  
                  <Button 
                    onClick={handleProceedToTests}
                    disabled={!appointmentDetails.scheduledAt}
                    className="w-full"
                  >
                    Schedule Tests
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Step 4: Confirmation */}
          {currentStep === 4 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <CheckCircle className="mr-2 w-5 h-5 text-green-600" />
                  Appointment Confirmed
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <CheckCircle className="mx-auto w-16 h-16 text-green-600 mb-4" />
                  <h3 className="text-xl font-semibold mb-2">Tests Successfully Scheduled!</h3>
                  <p className="text-gray-600 mb-6">
                    Patient {selectedPatient?.firstName} {selectedPatient?.lastName} has been scheduled for {selectedTests.length} test(s).
                  </p>
                  
                  <Button 
                    onClick={() => {
                      setCurrentStep(1);
                      setCurrentWorkflowStep("registration");
                      setSelectedPatient(null);
                      setSelectedTests([]);
                      setNewPatientData({
                        firstName: "",
                        lastName: "",
                        email: "",
                        phone: "",
                        dateOfBirth: "",
                        gender: "male",
                        address: "",
                        nin: ""
                      });
                      setSearchQuery("");
                      setTestSearchTerm("");
                      setIsNewPatient(true);
                      toast({
                        title: "Ready for Next Patient",
                        description: "System has been reset for the next patient intake.",
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