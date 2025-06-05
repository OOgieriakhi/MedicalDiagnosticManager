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
import { MessageNotification } from "@/components/message-notification";
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
  Printer,
  Send,
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
  const [resultValues, setResultValues] = useState<Record<number, string>>({});
  const [scientistSignature, setScientistSignature] = useState('');

  // Helper function to get test stage-based background color
  const getTestStageColor = (test: any) => {
    if (test.status === "reported_and_saved") return "bg-emerald-50 border-emerald-200";
    if (test.status === "completed") return "bg-green-50 border-green-200";
    if (test.status === "in_progress") return "bg-yellow-50 border-yellow-200";
    if (test.status === "specimen_collected") return "bg-blue-50 border-blue-200";
    if (test.paymentVerified) return "bg-purple-50 border-purple-200";
    return "bg-white border-gray-200";
  };

  const [showReportPreview, setShowReportPreview] = useState(false);
  const [specimenType, setSpecimenType] = useState("");
  const [expectedHours, setExpectedHours] = useState("");
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [processingTests, setProcessingTests] = useState<Set<number>>(new Set());
  const [completedActions, setCompletedActions] = useState<Set<string>>(new Set());

  // Function to interpret result value
  const interpretResult = (parameter: any, value: string) => {
    const numericValue = parseFloat(value);
    if (isNaN(numericValue)) return { status: "text", flag: "" };

    if (parameter.normalRangeMin !== null && parameter.normalRangeMax !== null) {
      if (numericValue < parameter.normalRangeMin) {
        return { status: "low", flag: "L" };
      } else if (numericValue > parameter.normalRangeMax) {
        return { status: "high", flag: "H" };
      } else {
        return { status: "normal", flag: "N" };
      }
    }
    return { status: "normal", flag: "N" };
  };

  // Generate automated interpretation
  const generateInterpretation = (parameters: any[]) => {
    if (!parameters) return "";

    const abnormalResults = parameters
      .filter((param: any) => {
        const value = resultValues[param.id];
        if (!value) return false;
        const interpretation = interpretResult(param, value);
        return interpretation.status === "high" || interpretation.status === "low";
      })
      .map((param: any) => {
        const value = resultValues[param.id];
        const interpretation = interpretResult(param, value);
        return `${param.parameterName}: ${value} ${param.unit} (${interpretation.flag})`;
      });

    if (abnormalResults.length === 0) {
      return "All parameters are within normal limits.";
    } else {
      return `Abnormal findings: ${abnormalResults.join(", ")}. Further clinical correlation is recommended.`;
    }
  };

  // Query for test parameters (structured reporting)
  const { data: testParameters, isLoading: parametersLoading } = useQuery({
    queryKey: ["/api/test-parameters", selectedTest?.testId],
    queryFn: async () => {
      if (!selectedTest?.testId) return [];
      const response = await fetch(`/api/test-parameters/${selectedTest.testId}`);
      if (!response.ok) throw new Error("Failed to fetch test parameters");
      return response.json();
    },
    enabled: !!selectedTest?.testId,
  });

  // Query for laboratory workflow metrics
  const { data: labMetrics, isLoading: metricsLoading, refetch: refetchMetrics } = useQuery({
    queryKey: ["/api/laboratory/metrics", user?.branchId, startDate, endDate],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (user?.branchId) params.append('branchId', user.branchId.toString());
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      
      console.log('Frontend metrics query:', { branchId: user?.branchId, startDate, endDate, url: `/api/laboratory/metrics?${params}` });
      
      const response = await fetch(`/api/laboratory/metrics?${params}`);
      if (!response.ok) throw new Error("Failed to fetch lab metrics");
      return response.json();
    },
    enabled: !!user?.branchId,
    refetchOnWindowFocus: false,
    staleTime: 0, // Always refetch when query key changes
  });

  // Query for laboratory tests - only show paid requests
  const { data: labTests, isLoading: labTestsLoading } = useQuery({
    queryKey: ["/api/patient-tests", user?.branchId, "paid", startDate, endDate],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('branchId', user?.branchId?.toString() || '');
      params.append('paidOnly', 'true');
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      
      console.log('Frontend tests query:', { branchId: user?.branchId, startDate, endDate, url: `/api/patient-tests?${params}` });
      
      const response = await fetch(`/api/patient-tests?${params}`);
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
    staleTime: 0, // Always refetch when query key changes
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
        updatedBy: user?.id,
        scientistSignature: scientistSignature || user?.username || 'Scientist'
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

  // Save test results for later processing (printing, WhatsApp, email)
  const saveTestResultsMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", `/api/patient-tests/${data.testId}/save-results`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/patient-tests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/laboratory/metrics"] });
      refetchMetrics();
      setShowResultDialog(false);
      setTestResults("");
      setTestNotes("");
      setResultValues({});
      setSelectedTest(null);
      toast({
        title: "Results Saved",
        description: "Test results have been saved for later processing (printing, WhatsApp, or email).",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Save Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Workflow management mutations
  const verifyPaymentMutation = useMutation({
    mutationFn: async (testId: number) => {
      setProcessingTests(prev => new Set(prev).add(testId));
      const response = await apiRequest("POST", `/api/patient-tests/${testId}/verify-payment`);
      return response.json();
    },
    onSuccess: (_, testId) => {
      setProcessingTests(prev => {
        const newSet = new Set(prev);
        newSet.delete(testId);
        return newSet;
      });
      setCompletedActions(prev => new Set(prev).add(`payment-${testId}`));
      
      setTimeout(() => {
        setCompletedActions(prev => {
          const newSet = new Set(prev);
          newSet.delete(`payment-${testId}`);
          return newSet;
        });
      }, 2000);
      
      queryClient.invalidateQueries({ queryKey: ["/api/patient-tests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/laboratory/metrics"] });
      refetchMetrics();
      toast({
        title: "Payment Verified",
        description: "Payment has been verified successfully.",
      });
    },
    onError: (error: any, testId) => {
      setProcessingTests(prev => {
        const newSet = new Set(prev);
        newSet.delete(testId);
        return newSet;
      });
      toast({
        title: "Error",
        description: error.message || "Failed to verify payment",
        variant: "destructive",
      });
    },
  });

  const collectSpecimenMutation = useMutation({
    mutationFn: async ({ testId, specimenType }: { testId: number; specimenType: string }) => {
      setProcessingTests(prev => new Set(prev).add(testId));
      const response = await apiRequest("POST", `/api/patient-tests/${testId}/collect-specimen`, { specimenType });
      return response.json();
    },
    onSuccess: (_, { testId }) => {
      setProcessingTests(prev => {
        const newSet = new Set(prev);
        newSet.delete(testId);
        return newSet;
      });
      setCompletedActions(prev => new Set(prev).add(`specimen-${testId}`));
      
      setTimeout(() => {
        setCompletedActions(prev => {
          const newSet = new Set(prev);
          newSet.delete(`specimen-${testId}`);
          return newSet;
        });
      }, 2000);
      
      queryClient.invalidateQueries({ queryKey: ["/api/patient-tests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/laboratory/metrics"] });
      refetchMetrics();
      toast({
        title: "Specimen Collected",
        description: "Specimen has been collected successfully.",
      });
      setSpecimenType("");
    },
    onError: (error: any, { testId }) => {
      setProcessingTests(prev => {
        const newSet = new Set(prev);
        newSet.delete(testId);
        return newSet;
      });
      toast({
        title: "Error",
        description: error.message || "Failed to collect specimen",
        variant: "destructive",
      });
    },
  });

  const startProcessingMutation = useMutation({
    mutationFn: async ({ testId, expectedHours }: { testId: number; expectedHours: number }) => {
      setProcessingTests(prev => new Set(prev).add(testId));
      const response = await apiRequest("POST", `/api/patient-tests/${testId}/start-processing`, { expectedHours });
      return response.json();
    },
    onSuccess: (_, { testId }) => {
      setProcessingTests(prev => {
        const newSet = new Set(prev);
        newSet.delete(testId);
        return newSet;
      });
      setCompletedActions(prev => new Set(prev).add(`processing-${testId}`));
      
      setTimeout(() => {
        setCompletedActions(prev => {
          const newSet = new Set(prev);
          newSet.delete(`processing-${testId}`);
          return newSet;
        });
      }, 2000);
      
      queryClient.invalidateQueries({ queryKey: ["/api/patient-tests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/laboratory/metrics"] });
      refetchMetrics();
      toast({
        title: "Processing Started",
        description: "Test processing has been started successfully.",
      });
      setExpectedHours("");
    },
    onError: (error: any, { testId }) => {
      setProcessingTests(prev => {
        const newSet = new Set(prev);
        newSet.delete(testId);
        return newSet;
      });
      toast({
        title: "Error",
        description: error.message || "Failed to start processing",
        variant: "destructive",
      });
    },
  });

  // Complete test mutation with structured results
  const completeStructuredTestMutation = useMutation({
    mutationFn: async () => {
      if (!selectedTest || !testParameters) return;
      
      const structuredResults = testParameters.map((param: any) => ({
        parameterId: param.id,
        value: resultValues[param.id] || "",
        numericValue: parseFloat(resultValues[param.id] || "0") || null,
        ...interpretResult(param, resultValues[param.id] || "")
      }));

      const response = await apiRequest("POST", `/api/patient-tests/${selectedTest.id}/complete-structured`, {
        structuredResults,
        additionalNotes: testNotes,
        interpretation: generateInterpretation(testParameters)
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/patient-tests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/laboratory/metrics"] });
      refetchMetrics();
      toast({
        title: "Test Completed",
        description: "Test results have been saved and report is ready for review.",
      });
      setShowResultDialog(false);
      setResultValues({});
      setTestNotes("");
      setShowReportPreview(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to complete test",
        variant: "destructive",
      });
    },
  });

  // Legacy complete test mutation for fallback
  const completeTestMutation = useMutation({
    mutationFn: async ({ testId, results, notes }: { testId: number; results: string; notes?: string }) => {
      setProcessingTests(prev => new Set(prev).add(testId));
      const response = await apiRequest("POST", `/api/patient-tests/${testId}/complete`, { results, notes });
      return response.json();
    },
    onSuccess: (_, { testId }) => {
      setProcessingTests(prev => {
        const newSet = new Set(prev);
        newSet.delete(testId);
        return newSet;
      });
      setCompletedActions(prev => new Set(prev).add(`completed-${testId}`));
      
      setTimeout(() => {
        setCompletedActions(prev => {
          const newSet = new Set(prev);
          newSet.delete(`completed-${testId}`);
          return newSet;
        });
      }, 2000);
      
      queryClient.invalidateQueries({ queryKey: ["/api/patient-tests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/laboratory/metrics"] });
      refetchMetrics();
      toast({
        title: "Test Completed",
        description: "Test has been completed successfully.",
      });
      setShowResultDialog(false);
      setTestResults("");
      setTestNotes("");
    },
    onError: (error: any, { testId }) => {
      setProcessingTests(prev => {
        const newSet = new Set(prev);
        newSet.delete(testId);
        return newSet;
      });
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
      case "reported_and_saved": return "secondary";
      case "in_progress": return "secondary";
      case "pending": return "outline";
      case "rejected": return "destructive";
      default: return "outline";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed": return <CheckCircle className="w-4 h-4" />;
      case "reported_and_saved": return <FileText className="w-4 h-4" />;
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

  const handlePrintReport = async (test: any) => {
    try {
      // Create a new window for printing the report
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        toast({
          title: "Print blocked",
          description: "Please allow popups to print reports.",
          variant: "destructive",
        });
        return;
      }

      // Get test parameters if needed
      let testParameters = [];
      if (test.testId) {
        try {
          const paramsResponse = await apiRequest("GET", `/api/test-parameters/${test.testId}`);
          if (paramsResponse.ok) {
            testParameters = await paramsResponse.json();
          }
        } catch (error) {
          console.warn("Could not fetch test parameters:", error);
        }
      }

      // Create the HTML content for the report
      const reportHTML = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Laboratory Report - ${test.patientName}</title>
          <style>
            @media print {
              @page { margin: 1in; }
              body { margin: 0; }
            }
            body {
              font-family: Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 800px;
              margin: 0 auto;
              padding: 20px;
            }
            .header {
              text-align: center;
              border-bottom: 2px solid #0066cc;
              padding-bottom: 20px;
              margin-bottom: 30px;
            }
            .logo {
              font-size: 24px;
              font-weight: bold;
              color: #0066cc;
              margin-bottom: 5px;
            }
            .subtitle {
              color: #666;
              font-size: 14px;
            }
            .report-title {
              font-size: 20px;
              font-weight: bold;
              margin: 20px 0;
              text-align: center;
              text-decoration: underline;
            }
            .section {
              margin: 20px 0;
              border: 1px solid #ddd;
              border-radius: 8px;
              padding: 15px;
            }
            .section-title {
              font-weight: bold;
              font-size: 16px;
              color: #0066cc;
              margin-bottom: 10px;
              border-bottom: 1px solid #eee;
              padding-bottom: 5px;
            }
            .info-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 10px;
            }
            .info-item {
              display: flex;
              margin-bottom: 8px;
            }
            .info-label {
              font-weight: bold;
              min-width: 120px;
              color: #555;
            }
            .info-value {
              flex: 1;
            }
            .results-table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 10px;
            }
            .results-table th,
            .results-table td {
              border: 1px solid #ddd;
              padding: 8px;
              text-align: left;
            }
            .results-table th {
              background-color: #f8f9fa;
              font-weight: bold;
            }
            .status-badge {
              padding: 4px 8px;
              border-radius: 4px;
              font-size: 12px;
              font-weight: bold;
            }
            .status-completed {
              background-color: #d4edda;
              color: #155724;
            }
            .footer {
              margin-top: 40px;
              padding-top: 20px;
              border-top: 1px solid #ddd;
              text-align: center;
              font-size: 12px;
              color: #666;
            }
            .signature-section {
              margin-top: 40px;
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 40px;
            }
            .signature-box {
              text-align: center;
              border-top: 1px solid #333;
              padding-top: 10px;
              margin-top: 60px;
            }
            @media print {
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="logo">Orient Medical Diagnostic Centre</div>
            <div class="subtitle">Advanced Medical Laboratory Services</div>
            <div class="subtitle">Phone: +234-XXX-XXXX | Email: info@orientmedical.ng</div>
          </div>

          <div class="report-title">LABORATORY REPORT</div>

          <div class="section">
            <div class="section-title">Patient Information</div>
            <div class="info-grid">
              <div class="info-item">
                <span class="info-label">Patient Name:</span>
                <span class="info-value">${test.patientName || 'N/A'}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Patient ID:</span>
                <span class="info-value">${test.patientIdCode || 'N/A'}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Test Date:</span>
                <span class="info-value">${test.scheduledAt ? new Date(test.scheduledAt).toLocaleDateString() : 'N/A'}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Report Date:</span>
                <span class="info-value">${new Date().toLocaleDateString()}</span>
              </div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">Test Information</div>
            <div class="info-grid">
              <div class="info-item">
                <span class="info-label">Test Name:</span>
                <span class="info-value">${test.testName || 'N/A'}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Test Code:</span>
                <span class="info-value">${test.testCode || 'N/A'}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Category:</span>
                <span class="info-value">${test.category || 'N/A'}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Status:</span>
                <span class="info-value">
                  <span class="status-badge status-completed">${test.status === 'reported_and_saved' ? 'Completed' : test.status}</span>
                </span>
              </div>
            </div>
          </div>

          ${test.results ? `
          <div class="section">
            <div class="section-title">Test Results</div>
            <div style="white-space: pre-wrap; padding: 10px; background-color: #f8f9fa; border-radius: 4px;">
              ${test.results}
            </div>
          </div>
          ` : ''}

          ${testParameters && testParameters.length > 0 ? `
          <div class="section">
            <div class="section-title">Test Parameters</div>
            <table class="results-table">
              <thead>
                <tr>
                  <th>Parameter</th>
                  <th>Result</th>
                  <th>Reference Range</th>
                  <th>Unit</th>
                </tr>
              </thead>
              <tbody>
                ${testParameters.map(param => `
                  <tr>
                    <td>${param.parameterName}</td>
                    <td>${param.resultValue || '-'}</td>
                    <td>${param.referenceRange || '-'}</td>
                    <td>${param.unit || '-'}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
          ` : ''}

          ${test.notes ? `
          <div class="section">
            <div class="section-title">Clinical Notes</div>
            <div style="white-space: pre-wrap; padding: 10px; background-color: #f8f9fa; border-radius: 4px;">
              ${test.notes}
            </div>
          </div>
          ` : ''}

          <div class="signature-section">
            <div>
              <div class="signature-box">
                <div>Laboratory Technician</div>
              </div>
            </div>
            <div>
              <div class="signature-box">
                <div>Medical Consultant</div>
              </div>
            </div>
          </div>

          <div class="footer">
            <p>This report is computer-generated and does not require a signature.</p>
            <p>Report generated on ${new Date().toLocaleString()}</p>
            <p>Orient Medical Diagnostic Centre - Advanced Medical Laboratory Services</p>
          </div>

          <script>
            window.onload = function() {
              window.print();
              window.onafterprint = function() {
                window.close();
              };
            }
          </script>
        </body>
        </html>
      `;

      // Write the content to the new window and trigger print
      printWindow.document.write(reportHTML);
      printWindow.document.close();

      toast({
        title: "Report Ready",
        description: "Print dialog opened for the test report.",
      });

    } catch (error) {
      console.error("Print error:", error);
      toast({
        title: "Print Error",
        description: "Unable to generate print preview.",
        variant: "destructive",
      });
    }
  };

  const filteredTests = (labTests || []).filter((test: any) => {
    const matchesSearch = test.testName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         test.patientName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         test.testCode?.toLowerCase().includes(searchTerm.toLowerCase());
    

    
    // Handle actual test statuses used in the system
    let matchesStatus = false;
    if (statusFilter === "all") {
      matchesStatus = true;
    } else if (statusFilter === "payment_verification") {
      // Tests that need payment verification - paid but not yet verified by lab staff
      matchesStatus = test.paymentStatus === "paid" && test.paymentVerified !== true;
    } else if (statusFilter === "specimen_collection") {
      // Tests with verified payment but no specimen collected yet
      matchesStatus = test.paymentVerified === true && test.specimenCollected !== true;
    } else if (statusFilter === "in_progress") {
      // Tests that are actively being processed
      matchesStatus = test.status === "processing" || test.processingStarted === true;
    } else if (statusFilter === "completed") {
      // Tests that are completed or reported
      matchesStatus = test.status === "completed" || test.status === "reported_and_saved";
    } else if (statusFilter === "pending") {
      // Any other pending states
      matchesStatus = test.status === "pending" || test.status === "scheduled";
    } else {
      // Direct status match
      matchesStatus = test.status === statusFilter;
    }
    
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
        <MessageNotification />
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
                      <SelectItem value="payment_verification">Awaiting Payment Verification</SelectItem>
                      <SelectItem value="specimen_collection">Awaiting Specimen Collection</SelectItem>
                      <SelectItem value="in_progress">In Processing</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="pending">Other Pending</SelectItem>
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
                <Card 
                  key={test.id} 
                  className={`hover:shadow-md transition-all duration-300 border ${getTestStageColor(test)} ${
                    processingTests.has(test.id) ? 'ring-2 ring-blue-200 shadow-lg' : ''
                  } ${
                    completedActions.has(`payment-${test.id}`) || 
                    completedActions.has(`specimen-${test.id}`) || 
                    completedActions.has(`processing-${test.id}`) || 
                    completedActions.has(`completed-${test.id}`) 
                      ? 'ring-2 ring-green-300 shadow-lg' : ''
                  }`}
                >
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
                            className={`border-blue-300 text-blue-600 transition-all duration-200 ${
                              processingTests.has(test.id) ? 'animate-pulse bg-blue-50' : ''
                            } ${
                              completedActions.has(`payment-${test.id}`) ? 'bg-green-100 border-green-400 text-green-700' : ''
                            }`}
                            onClick={() => verifyPaymentMutation.mutate(test.id)}
                            disabled={processingTests.has(test.id)}
                          >
                            {processingTests.has(test.id) ? (
                              <div className="w-4 h-4 mr-1 animate-spin rounded-full border-2 border-blue-300 border-t-blue-600"></div>
                            ) : completedActions.has(`payment-${test.id}`) ? (
                              <CheckCircle className="w-4 h-4 mr-1" />
                            ) : (
                              <CreditCard className="w-4 h-4 mr-1" />
                            )}
                            {processingTests.has(test.id) ? "Verifying..." : 
                             completedActions.has(`payment-${test.id}`) ? "Verified!" : "Verify Payment"}
                          </Button>
                        )}
                        
                        {/* Specimen Collection Step */}
                        {test.paymentVerified && !test.specimenCollected && (
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className={`border-green-300 text-green-600 transition-all duration-200 ${
                                  processingTests.has(test.id) ? 'animate-pulse bg-green-50' : ''
                                } ${
                                  completedActions.has(`specimen-${test.id}`) ? 'bg-green-100 border-green-400 text-green-700' : ''
                                }`}
                                disabled={processingTests.has(test.id)}
                              >
                                <Syringe className="w-4 h-4 mr-1" />
                                {processingTests.has(test.id) ? 'Collecting...' : 'Collect Specimen'}
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
                                className={`border-yellow-300 text-yellow-600 transition-all duration-200 ${
                                  processingTests.has(test.id) ? 'animate-pulse bg-yellow-50' : ''
                                } ${
                                  completedActions.has(`processing-${test.id}`) ? 'bg-yellow-100 border-yellow-400 text-yellow-700' : ''
                                }`}
                                disabled={processingTests.has(test.id)}
                              >
                                <Play className="w-4 h-4 mr-1" />
                                {processingTests.has(test.id) ? 'Starting...' : 'Start Processing'}
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
                            className={`border-purple-300 text-purple-600 transition-all duration-200 ${
                              processingTests.has(test.id) ? 'animate-pulse bg-purple-50' : ''
                            } ${
                              completedActions.has(`completed-${test.id}`) ? 'bg-purple-100 border-purple-400 text-purple-700' : ''
                            }`}
                            onClick={() => {
                              setSelectedTest(test);
                              setShowResultDialog(true);
                            }}
                            disabled={processingTests.has(test.id)}
                          >
                            <FileCheck className="w-4 h-4 mr-1" />
                            {processingTests.has(test.id) ? 'Completing...' : 'Complete Test'}
                          </Button>
                        )}
                        
                        {/* View Results for Completed Tests */}
                        {(test.status === "completed" || test.status === "reported_and_saved") && (
                          <div className="flex gap-2">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => {
                                setSelectedTest(test);
                                setShowResultDialog(true);
                                // Pre-populate fields for viewing/editing
                                if (test.results) setTestResults(test.results);
                                if (test.notes) setTestNotes(test.notes);
                                if (test.scientistSignature) setScientistSignature(test.scientistSignature);
                              }}
                            >
                              <FileText className="w-4 h-4 mr-1" />
                              {test.status === "reported_and_saved" ? "View Report" : "View Results"}
                            </Button>
                            {test.status === "reported_and_saved" && (
                              <div className="flex gap-1">
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => handlePrintReport(test)}
                                  className="text-blue-600 border-blue-300"
                                >
                                  <Printer className="w-4 h-4" />
                                </Button>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => {
                                    toast({
                                      title: "Send Report",
                                      description: "Report sharing functionality requires configuration.",
                                    });
                                  }}
                                  className="text-green-600 border-green-300"
                                >
                                  <Send className="w-4 h-4" />
                                </Button>
                              </div>
                            )}
                          </div>
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

              <div className="space-y-6">
                {/* Structured Parameters Section */}
                {testParameters && testParameters.length > 0 ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label className="text-lg font-semibold">Laboratory Parameters</Label>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowReportPreview(!showReportPreview)}
                      >
                        {showReportPreview ? "Hide Preview" : "Preview Report"}
                      </Button>
                    </div>
                    
                    <div className="grid gap-4 max-h-96 overflow-y-auto">
                      {testParameters.map((param: any) => {
                        const value = resultValues[param.id] || "";
                        const interpretation = value ? interpretResult(param, value) : { status: "normal", flag: "" };
                        
                        return (
                          <div key={param.id} className="border rounded-lg p-4 space-y-2">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-medium">{param.parameterName}</p>
                                <p className="text-sm text-gray-600">
                                  Code: {param.parameterCode} 
                                  {param.normalRangeMin !== null && param.normalRangeMax !== null && (
                                    <span className="ml-2">
                                      Normal: {param.normalRangeMin}-{param.normalRangeMax} {param.unit}
                                    </span>
                                  )}
                                  {param.normalRangeText && (
                                    <span className="ml-2">Normal: {param.normalRangeText}</span>
                                  )}
                                </p>
                              </div>
                              {interpretation.flag && (
                                <Badge 
                                  variant={interpretation.status === "high" ? "destructive" : 
                                          interpretation.status === "low" ? "secondary" : "default"}
                                  className="ml-2"
                                >
                                  {interpretation.flag}
                                </Badge>
                              )}
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <Input
                                placeholder={`Enter ${param.parameterName.toLowerCase()} value`}
                                value={value}
                                onChange={(e) => setResultValues(prev => ({
                                  ...prev,
                                  [param.id]: e.target.value
                                }))}
                                className={`flex-1 ${
                                  interpretation.status === "high" ? "border-red-300 bg-red-50" :
                                  interpretation.status === "low" ? "border-yellow-300 bg-yellow-50" :
                                  value ? "border-green-300 bg-green-50" : ""
                                }`}
                              />
                              {param.unit && (
                                <span className="text-sm text-gray-500 min-w-fit">{param.unit}</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Automated Interpretation Preview */}
                    {showReportPreview && (
                      <div className="border rounded-lg p-4 bg-gray-50">
                        <h4 className="font-semibold mb-2">Consolidated Report Preview</h4>
                        <p className="text-sm mb-4">{generateInterpretation(testParameters)}</p>
                        
                        {/* Scientist Signature Section */}
                        <div className="border-t pt-4 mt-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium">Report Signed By:</p>
                              <p className="text-lg font-semibold text-blue-600">{user?.username || 'Scientist'}</p>
                              <p className="text-xs text-gray-500">Medical Laboratory Scientist</p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm text-gray-600">Digital Signature</p>
                              <p className="text-xs text-gray-500">{new Date().toLocaleString()}</p>
                            </div>
                          </div>
                        </div>
                        
                        {/* Report Preview Action Buttons */}
                        <div className="flex justify-end gap-2 mt-4 pt-4 border-t">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowReportPreview(false)}
                          >
                            Close Preview
                          </Button>
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => {
                              if (testParameters && testParameters.length > 0) {
                                saveTestResultsMutation.mutate({
                                  testId: selectedTest?.id,
                                  parameterResults: resultValues,
                                  notes: testNotes,
                                  scientistSignature: user?.username || 'Scientist',
                                  saveForLater: true
                                });
                              }
                            }}
                            disabled={
                              saveTestResultsMutation.isPending || 
                              Object.keys(resultValues).length === 0 ||
                              testParameters.some((param: any) => !resultValues[param.id]?.trim())
                            }
                          >
                            {saveTestResultsMutation.isPending ? "Saving..." : "Save Report"}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : parametersLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full"></div>
                    <span className="ml-2">Loading test parameters...</span>
                  </div>
                ) : (
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
                  </div>
                )}

                <div>
                  <Label htmlFor="notes">Additional Notes</Label>
                  <Textarea
                    id="notes"
                    placeholder="Any additional observations or clinical notes..."
                    value={testNotes}
                    onChange={(e) => setTestNotes(e.target.value)}
                    rows={3}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="scientist-signature">Scientist Signature *</Label>
                  <Input
                    id="scientist-signature"
                    placeholder="Enter scientist name for report authentication..."
                    value={scientistSignature}
                    onChange={(e) => setScientistSignature(e.target.value)}
                    className="mt-1"
                  />
                </div>
              </div>

              <div className="flex justify-between gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowResultDialog(false);
                    setTestResults("");
                    setTestNotes("");
                    setResultValues({});
                    setShowReportPreview(false);
                    setSelectedTest(null);
                  }}
                >
                  Cancel
                </Button>
                
                <div className="flex gap-2">
                  {/* Show Save Results Button only for non-completed tests */}
                  {(selectedTest?.status !== "completed" && selectedTest?.status !== "reported_and_saved") && (
                    <Button
                      variant="secondary"
                      onClick={() => {
                        if (testParameters && testParameters.length > 0) {
                          saveTestResultsMutation.mutate({
                            testId: selectedTest?.id,
                            parameterResults: resultValues,
                            notes: testNotes,
                            scientistSignature: scientistSignature || user?.username || 'Laboratory Scientist',
                            saveForLater: true
                          });
                        } else {
                          saveTestResultsMutation.mutate({
                            testId: selectedTest?.id,
                            results: testResults,
                            notes: testNotes,
                            scientistSignature: scientistSignature || user?.username || 'Laboratory Scientist',
                            saveForLater: true
                          });
                        }
                      }}
                      disabled={
                        saveTestResultsMutation.isPending || 
                        (testParameters && testParameters.length > 0 ? 
                          Object.keys(resultValues).length === 0 ||
                          testParameters.some((param: any) => !resultValues[param.id]?.trim()) :
                          !testResults.trim())
                      }
                    >
                      {saveTestResultsMutation.isPending ? "Saving..." : "Save Results"}
                    </Button>
                  )}

                  {/* Show different buttons based on test status */}
                  {selectedTest?.status === "reported_and_saved" ? (
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={async () => {
                          // Generate and download PDF report
                          try {
                            const response = await apiRequest("POST", "/api/generate-lab-report", {
                              testId: selectedTest?.id
                            });
                            
                            if (response.ok) {
                              const blob = await response.blob();
                              const url = window.URL.createObjectURL(blob);
                              const a = document.createElement('a');
                              a.href = url;
                              a.download = `Lab-Report-${selectedTest?.patient?.firstName}-${selectedTest?.patient?.lastName}-${new Date().toISOString().split('T')[0]}.pdf`;
                              document.body.appendChild(a);
                              a.click();
                              window.URL.revokeObjectURL(url);
                              document.body.removeChild(a);
                              
                              toast({
                                title: "Report Generated",
                                description: "Laboratory report has been downloaded successfully.",
                              });
                            }
                          } catch (error) {
                            toast({
                              title: "Report Generation Failed",
                              description: "Unable to generate the laboratory report.",
                              variant: "destructive",
                            });
                          }
                        }}
                      >
                        Download Report
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          // WhatsApp send functionality - would need WhatsApp API integration
                          toast({
                            title: "WhatsApp Integration Required",
                            description: "WhatsApp API needs to be configured for sending reports.",
                            variant: "destructive",
                          });
                        }}
                      >
                        Send via WhatsApp
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          // Email send functionality - would need email service integration
                          toast({
                            title: "Email Integration Required",
                            description: "Email service needs to be configured for sending reports.",
                            variant: "destructive",
                          });
                        }}
                      >
                        Send via Email
                      </Button>
                    </div>
                  ) : (
                    <>
                      {/* Show Complete buttons only for non-completed tests */}
                      {(selectedTest?.status !== "completed" && selectedTest?.status !== "reported_and_saved") && (
                        <>
                          {testParameters && testParameters.length > 0 ? (
                            <Button
                              onClick={() => completeStructuredTestMutation.mutate()}
                              disabled={
                                completeStructuredTestMutation.isPending || 
                                Object.keys(resultValues).length === 0 ||
                                testParameters.some((param: any) => !resultValues[param.id]?.trim()) ||
                                !scientistSignature.trim()
                              }
                            >
                              {completeStructuredTestMutation.isPending ? "Generating Report..." : "Complete & Generate Report"}
                            </Button>
                          ) : (
                            <Button
                              onClick={() => {
                                if (selectedTest && testResults.trim() && scientistSignature.trim()) {
                                  completeTestMutation.mutate({
                                    testId: selectedTest.id,
                                    results: testResults,
                                    notes: testNotes,
                                    scientistSignature: scientistSignature || user?.username || 'Laboratory Scientist'
                                  });
                                }
                              }}
                              disabled={completeTestMutation.isPending || !testResults.trim() || !scientistSignature.trim()}
                            >
                              {completeTestMutation.isPending ? "Completing..." : "Complete Test"}
                            </Button>
                          )}
                        </>
                      )}
                      
                      {/* Show view-only message for completed tests */}
                      {(selectedTest?.status === "completed" || selectedTest?.status === "reported_and_saved") && (
                        <div className="text-center text-gray-600 py-2">
                          <p className="text-sm">This test has been completed and finalized.</p>
                          <p className="text-xs">You are viewing the final report.</p>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}