import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { 
  Search, 
  TestTube, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  Home,
  Beaker as Flask,
  Microscope,
  Activity,
  FileText,
  Calendar,
  User,
  Beaker,
  Target,
  XCircle,
  CreditCard,
  Syringe,
  Play,
  FileCheck
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Link } from "wouter";

export default function LaboratoryManagement() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedTest, setSelectedTest] = useState<any>(null);
  const [showResultDialog, setShowResultDialog] = useState(false);
  const [testResults, setTestResults] = useState("");
  const [testNotes, setTestNotes] = useState("");
  const [specimenType, setSpecimenType] = useState("");
  const [expectedHours, setExpectedHours] = useState("");
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

  // Query for laboratory workflow metrics
  const { data: labMetrics, isLoading: metricsLoading } = useQuery({
    queryKey: ["/api/laboratory/metrics", user?.branchId, startDate, endDate],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      const response = await fetch(`/api/laboratory/metrics?${params}`);
      if (!response.ok) throw new Error("Failed to fetch lab metrics");
      return response.json();
    },
    enabled: !!user?.branchId,
  });

  // Query for laboratory tests - only show paid requests
  const { data: labTests, isLoading: labTestsLoading } = useQuery({
    queryKey: ["/api/patient-tests", user?.branchId, "paid"],
    queryFn: async () => {
      const response = await fetch(`/api/patient-tests?branchId=${user?.branchId}&paidOnly=true`);
      if (!response.ok) throw new Error("Failed to fetch lab tests");
      const allTests = await response.json();
      // Filter for laboratory-related categories
      return allTests.filter((test: any) => 
        test.category?.toLowerCase().includes('blood') ||
        test.category?.toLowerCase().includes('laboratory') ||
        test.category?.toLowerCase().includes('urine') ||
        test.category?.toLowerCase().includes('chemistry') ||
        test.category?.toLowerCase().includes('microbiology') ||
        test.category?.toLowerCase().includes('pathology')
      );
    },
    enabled: !!user?.branchId,
  });

  // Query for test categories
  const { data: testCategories } = useQuery({
    queryKey: ["/api/test-categories", user?.tenantId],
    queryFn: async () => {
      const response = await fetch(`/api/test-categories?tenantId=${user?.tenantId}`);
      if (!response.ok) throw new Error("Failed to fetch categories");
      return response.json();
    },
    enabled: !!user?.tenantId,
  });

  // Update test results mutation
  const updateTestResultsMutation = useMutation({
    mutationFn: async ({ testId, results, notes, status }: { testId: number; results: string; notes: string; status: string }) => {
      const response = await apiRequest("PATCH", `/api/patient-tests/${testId}/results`, {
        results,
        notes,
        status,
        updatedBy: user?.id
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/patient-tests"] });
      toast({
        title: "Test Results Updated",
        description: "Laboratory test results have been successfully updated.",
      });
      setShowResultDialog(false);
      setTestResults("");
      setTestNotes("");
      setSelectedTest(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Update Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Workflow management mutations
  const verifyPaymentMutation = useMutation({
    mutationFn: async (testId: number) => {
      const response = await apiRequest("POST", `/api/patient-tests/${testId}/verify-payment`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/patient-tests"] });
      toast({
        title: "Payment Verified",
        description: "Payment has been verified successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to verify payment",
        variant: "destructive",
      });
    },
  });

  const collectSpecimenMutation = useMutation({
    mutationFn: async ({ testId, specimenType }: { testId: number; specimenType: string }) => {
      const response = await apiRequest("POST", `/api/patient-tests/${testId}/collect-specimen`, { specimenType });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/patient-tests"] });
      toast({
        title: "Specimen Collected",
        description: "Specimen has been collected successfully.",
      });
      setSpecimenType("");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to collect specimen",
        variant: "destructive",
      });
    },
  });

  const startProcessingMutation = useMutation({
    mutationFn: async ({ testId, expectedHours }: { testId: number; expectedHours: number }) => {
      const response = await apiRequest("POST", `/api/patient-tests/${testId}/start-processing`, { expectedHours });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/patient-tests"] });
      toast({
        title: "Processing Started",
        description: "Test processing has been started successfully.",
      });
      setExpectedHours("");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to start processing",
        variant: "destructive",
      });
    },
  });

  const completeTestMutation = useMutation({
    mutationFn: async ({ testId, results, notes }: { testId: number; results: string; notes?: string }) => {
      const response = await apiRequest("POST", `/api/patient-tests/${testId}/complete`, { results, notes });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/patient-tests"] });
      toast({
        title: "Test Completed",
        description: "Test has been completed successfully.",
      });
      setShowResultDialog(false);
      setTestResults("");
      setTestNotes("");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to complete test",
        variant: "destructive",
      });
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "default";
      case "in_progress": return "secondary";
      case "pending": return "outline";
      case "rejected": return "destructive";
      default: return "outline";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed": return <CheckCircle className="w-4 h-4" />;
      case "in_progress": return <Clock className="w-4 h-4" />;
      case "pending": return <AlertCircle className="w-4 h-4" />;
      default: return <TestTube className="w-4 h-4" />;
    }
  };

  const getPriorityColor = (requiresConsultant: boolean, duration: number) => {
    if (requiresConsultant) return "text-red-600";
    if (duration > 120) return "text-orange-600";
    return "text-green-600";
  };

  const filteredTests = (labTests || []).filter((test: any) => {
    const matchesSearch = test.testName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         test.patientName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         test.testCode?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || test.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleUpdateResults = () => {
    if (!selectedTest || !testResults.trim()) {
      toast({
        title: "Missing Information",
        description: "Please enter test results before updating.",
        variant: "destructive",
      });
      return;
    }

    updateTestResultsMutation.mutate({
      testId: selectedTest.id,
      results: testResults,
      notes: testNotes,
      status: "completed"
    });
  };

  const getLabStats = () => {
    if (!labTests) return { total: 0, pending: 0, inProgress: 0, completed: 0 };
    
    return {
      total: labTests.length,
      pending: labTests.filter((test: any) => test.status === "pending").length,
      inProgress: labTests.filter((test: any) => test.status === "in_progress").length,
      completed: labTests.filter((test: any) => test.status === "completed").length,
    };
  };

  const stats = getLabStats();

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
              <Flask className="w-8 h-8 text-blue-600" />
              Laboratory Management
            </h1>
            <p className="text-gray-600">Manage laboratory tests, results, and quality control</p>
          </div>
        </div>
      </div>

      {/* Laboratory Workflow Metrics Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <div className="p-2 bg-blue-100 rounded-lg">
                <CreditCard className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Awaiting Payment Verification</p>
                <p className="text-2xl font-bold text-blue-600">
                  {metricsLoading ? "..." : labMetrics?.awaitingPaymentVerification || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <div className="p-2 bg-green-100 rounded-lg">
                <Syringe className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Awaiting Specimen Collection</p>
                <p className="text-2xl font-bold text-green-600">
                  {metricsLoading ? "..." : labMetrics?.awaitingSpecimenCollection || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Beaker className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">In Processing</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {metricsLoading ? "..." : labMetrics?.inProcessing || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <div className="p-2 bg-purple-100 rounded-lg">
                <FileCheck className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Completed Today</p>
                <p className="text-2xl font-bold text-purple-600">
                  {metricsLoading ? "..." : labMetrics?.completedToday || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <div className="p-2 bg-gray-100 rounded-lg">
                <TestTube className="w-5 h-5 text-gray-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Total Requests</p>
                <p className="text-2xl font-bold text-gray-600">
                  {metricsLoading ? "..." : labMetrics?.totalRequests || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Date Filter */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Date Range Filter
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Label htmlFor="startDate">From:</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-40"
              />
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor="endDate">To:</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-40"
              />
            </div>
            <Button 
              onClick={() => {
                setStartDate(new Date().toISOString().split('T')[0]);
                setEndDate(new Date().toISOString().split('T')[0]);
              }}
              variant="outline"
            >
              Today
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Tests</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              </div>
              <TestTube className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending</p>
                <p className="text-2xl font-bold text-orange-600">{stats.pending}</p>
              </div>
              <Clock className="w-8 h-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">In Progress</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.inProgress}</p>
              </div>
              <Activity className="w-8 h-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Completed</p>
                <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="tests" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="tests" className="flex items-center gap-2">
            <Microscope className="w-4 h-4" />
            Test Management
          </TabsTrigger>
          <TabsTrigger value="quality" className="flex items-center gap-2">
            <Target className="w-4 h-4" />
            Quality Control
          </TabsTrigger>
          <TabsTrigger value="reports" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Lab Reports
          </TabsTrigger>
        </TabsList>

        {/* Test Management Tab */}
        <TabsContent value="tests" className="space-y-6">
          {/* Payment Verification Alert */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-2 text-blue-800">
              <AlertCircle className="w-5 h-5" />
              <h3 className="font-semibold">Payment Verification Required</h3>
            </div>
            <p className="text-blue-700 text-sm mt-1">
              Lab staff must verify payment completion before collecting specimens for processing. 
              Only tests with "PAID" status can proceed to specimen collection.
            </p>
          </div>
          {/* Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex gap-4 items-end">
                <div className="flex-1">
                  <Label htmlFor="search">Search Tests</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="search"
                      placeholder="Search by test name, patient, or code..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="status">Status Filter</Label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Test List */}
          <div className="grid gap-4">
            {labTestsLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : filteredTests.length === 0 ? (
              <Card>
                <CardContent className="pt-6 text-center">
                  <TestTube className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No laboratory tests found</p>
                </CardContent>
              </Card>
            ) : (
              filteredTests.map((test: any) => (
                <Card key={test.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <Beaker className="w-5 h-5 text-blue-600" />
                          <h3 className="font-semibold text-lg">{test.testName}</h3>
                          <Badge variant={getStatusColor(test.status)}>
                            {getStatusIcon(test.status)}
                            <span className="ml-1 capitalize">{test.status?.replace('_', ' ')}</span>
                          </Badge>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <p className="text-gray-500">Patient</p>
                            <p className="font-medium">{test.patientName}</p>
                          </div>
                          <div>
                            <p className="text-gray-500">Test Code</p>
                            <p className="font-medium">{test.testCode}</p>
                          </div>
                          <div>
                            <p className="text-gray-500">Ordered</p>
                            <p className="font-medium">{new Date(test.createdAt).toLocaleDateString()}</p>
                          </div>
                          <div>
                            <p className="text-gray-500">Duration</p>
                            <p className={`font-medium ${getPriorityColor(test.requiresConsultant, test.duration)}`}>
                              {test.duration} min
                            </p>
                          </div>
                        </div>

                        {test.description && (
                          <p className="text-gray-600 mt-2 text-sm">{test.description}</p>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2 ml-4">
                        {/* Payment Verification Step */}
                        {!test.paymentVerified && test.paymentStatus === "paid" && (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="border-blue-300 text-blue-600"
                            onClick={() => verifyPaymentMutation.mutate(test.id)}
                            disabled={verifyPaymentMutation.isPending}
                          >
                            <CreditCard className="w-4 h-4 mr-1" />
                            {verifyPaymentMutation.isPending ? "Verifying..." : "Verify Payment"}
                          </Button>
                        )}
                        
                        {/* Specimen Collection Step */}
                        {test.paymentVerified && !test.specimenCollected && (
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="border-green-300 text-green-600"
                              >
                                <Syringe className="w-4 h-4 mr-1" />
                                Collect Specimen
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Collect Specimen</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div>
                                  <Label htmlFor="specimenType">Specimen Type</Label>
                                  <Select value={specimenType} onValueChange={setSpecimenType}>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select specimen type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="blood">Blood</SelectItem>
                                      <SelectItem value="urine">Urine</SelectItem>
                                      <SelectItem value="stool">Stool</SelectItem>
                                      <SelectItem value="saliva">Saliva</SelectItem>
                                      <SelectItem value="tissue">Tissue</SelectItem>
                                      <SelectItem value="other">Other</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                <Button 
                                  onClick={() => {
                                    if (specimenType) {
                                      collectSpecimenMutation.mutate({ testId: test.id, specimenType });
                                    }
                                  }}
                                  disabled={!specimenType || collectSpecimenMutation.isPending}
                                  className="w-full"
                                >
                                  {collectSpecimenMutation.isPending ? "Collecting..." : "Confirm Collection"}
                                </Button>
                              </div>
                            </DialogContent>
                          </Dialog>
                        )}
                        
                        {/* Processing Step */}
                        {test.specimenCollected && !test.processingStarted && (
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="border-yellow-300 text-yellow-600"
                              >
                                <Play className="w-4 h-4 mr-1" />
                                Start Processing
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Start Test Processing</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div>
                                  <Label htmlFor="expectedHours">Expected Turnaround Time (Hours)</Label>
                                  <Input
                                    id="expectedHours"
                                    type="number"
                                    min="1"
                                    max="168"
                                    value={expectedHours}
                                    onChange={(e) => setExpectedHours(e.target.value)}
                                    placeholder="Enter expected hours"
                                  />
                                </div>
                                <Button 
                                  onClick={() => {
                                    if (expectedHours && parseInt(expectedHours) > 0) {
                                      startProcessingMutation.mutate({ testId: test.id, expectedHours: parseInt(expectedHours) });
                                    }
                                  }}
                                  disabled={!expectedHours || parseInt(expectedHours) <= 0 || startProcessingMutation.isPending}
                                  className="w-full"
                                >
                                  {startProcessingMutation.isPending ? "Starting..." : "Start Processing"}
                                </Button>
                              </div>
                            </DialogContent>
                          </Dialog>
                        )}
                        
                        {/* Complete Test Step */}
                        {test.processingStarted && test.status !== "completed" && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-green-300 text-green-600"
                            onClick={() => {
                              setSelectedTest(test);
                              setShowResultDialog(true);
                            }}
                          >
                            <FileCheck className="w-4 h-4 mr-1" />
                            Complete Test
                          </Button>
                        )}
                        
                        {/* View Results */}
                        {test.status === "completed" && (
                          <Button variant="outline" size="sm">
                            <FileText className="w-4 h-4 mr-1" />
                            View Results
                          </Button>
                        )}
                        
                        {/* Payment Status Indicator */}
                        <div className="ml-2">
                          {test.paymentStatus === "paid" ? (
                            <div className="flex items-center text-green-600 text-xs">
                              <CheckCircle className="w-4 h-4 mr-1" />
                              PAID
                            </div>
                          ) : (
                            <div className="flex items-center text-red-600 text-xs">
                              <XCircle className="w-4 h-4 mr-1" />
                              UNPAID
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        {/* Quality Control Tab */}
        <TabsContent value="quality" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5" />
                Quality Control Dashboard
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-green-600">98.5%</div>
                  <div className="text-sm text-gray-600">Accuracy Rate</div>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">24h</div>
                  <div className="text-sm text-gray-600">Avg. Turnaround</div>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-orange-600">3</div>
                  <div className="text-sm text-gray-600">Pending Reviews</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent Quality Metrics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center p-3 border rounded">
                  <div>
                    <p className="font-medium">Daily Calibration Check</p>
                    <p className="text-sm text-gray-600">Chemistry Analyzer - Unit 1</p>
                  </div>
                  <Badge variant="default">Passed</Badge>
                </div>
                <div className="flex justify-between items-center p-3 border rounded">
                  <div>
                    <p className="font-medium">Temperature Monitoring</p>
                    <p className="text-sm text-gray-600">Refrigeration Units</p>
                  </div>
                  <Badge variant="default">Normal</Badge>
                </div>
                <div className="flex justify-between items-center p-3 border rounded">
                  <div>
                    <p className="font-medium">Proficiency Testing</p>
                    <p className="text-sm text-gray-600">Hematology Panel</p>
                  </div>
                  <Badge variant="secondary">Pending</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Lab Reports Tab */}
        <TabsContent value="reports" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Laboratory Reports
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button variant="outline" className="h-20 flex-col">
                  <Calendar className="w-6 h-6 mb-2" />
                  Daily Lab Summary
                </Button>
                <Button variant="outline" className="h-20 flex-col">
                  <Activity className="w-6 h-6 mb-2" />
                  Performance Metrics
                </Button>
                <Button variant="outline" className="h-20 flex-col">
                  <Target className="w-6 h-6 mb-2" />
                  Quality Reports
                </Button>
                <Button variant="outline" className="h-20 flex-col">
                  <TestTube className="w-6 h-6 mb-2" />
                  Test Volume Analysis
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Test Results Dialog */}
      <Dialog open={showResultDialog} onOpenChange={setShowResultDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Update Test Results</DialogTitle>
          </DialogHeader>
          
          {selectedTest && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded">
                <div>
                  <p className="text-sm text-gray-600">Test</p>
                  <p className="font-medium">{selectedTest.testName}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Patient</p>
                  <p className="font-medium">{selectedTest.patientName}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Test Code</p>
                  <p className="font-medium">{selectedTest.testCode}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Duration</p>
                  <p className="font-medium">{selectedTest.duration} minutes</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="results">Test Results *</Label>
                  <Textarea
                    id="results"
                    placeholder="Enter detailed test results..."
                    value={testResults}
                    onChange={(e) => setTestResults(e.target.value)}
                    rows={8}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="notes">Additional Notes</Label>
                  <Textarea
                    id="notes"
                    placeholder="Any additional observations or notes..."
                    value={testNotes}
                    onChange={(e) => setTestNotes(e.target.value)}
                    rows={3}
                    className="mt-1"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowResultDialog(false);
                    setTestResults("");
                    setTestNotes("");
                    setSelectedTest(null);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    if (selectedTest && testResults.trim()) {
                      completeTestMutation.mutate({
                        testId: selectedTest.id,
                        results: testResults,
                        notes: testNotes
                      });
                    }
                  }}
                  disabled={completeTestMutation.isPending || !testResults.trim()}
                >
                  {completeTestMutation.isPending ? "Completing..." : "Complete Test"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}