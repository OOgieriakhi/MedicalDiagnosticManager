import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { MessageNotification } from "@/components/message-notification";
import { 
  Zap, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  Image,
  Monitor,
  Calendar,
  Users,
  Camera,
  Scan,
  FileImage,
  Activity,
  Heart,
  Shield,
  Eye,
  Download,
  RefreshCw,
  BarChart3,
  FileText,
  Home
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Link } from "wouter";

export default function RadiologyManagement() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dateRange, setDateRange] = useState("today");
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedModality, setSelectedModality] = useState("all");

  // Workflow state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [currentAction, setCurrentAction] = useState<string>('');
  const [currentStudy, setCurrentStudy] = useState<any>(null);
  const [findings, setFindings] = useState('');
  const [interpretation, setInterpretation] = useState('');
  const [recommendation, setRecommendation] = useState('');
  const [expectedHours, setExpectedHours] = useState('2');
  const [radiologistSignature, setRadiologistSignature] = useState('');

  // Helper function to get study stage-based background color
  const getStudyStageColor = (study: any) => {
    if (study.status === "reported_and_saved") return "bg-emerald-50 border-emerald-200";
    if (study.status === "completed") return "bg-green-50 border-green-200";
    if (study.status === "in_progress") return "bg-yellow-50 border-yellow-200";
    if (study.status === "scheduled") return "bg-blue-50 border-blue-200";
    if (study.paymentVerified) return "bg-purple-50 border-purple-200";
    return "bg-white border-gray-200";
  };

  // Workflow mutations
  const verifyPaymentMutation = useMutation({
    mutationFn: async (studyId: string) => {
      const testId = studyId.replace('pt-', '');
      const response = await apiRequest('POST', `/api/patient-tests/${testId}/verify-payment`);
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Payment verified successfully", variant: "default" });
      queryClient.invalidateQueries({ queryKey: ["/api/radiology/studies"] });
    },
    onError: (error: any) => {
      toast({ title: "Failed to verify payment", description: error.message, variant: "destructive" });
    }
  });

  const startImagingMutation = useMutation({
    mutationFn: async ({ studyId, expectedHours }: { studyId: string; expectedHours: string }) => {
      const testId = studyId.replace('pt-', '');
      const response = await apiRequest('POST', `/api/patient-tests/${testId}/start-imaging`, {
        expectedHours: parseInt(expectedHours),
        imagingType: 'Radiology'
      });
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Radiology imaging started successfully", variant: "default" });
      queryClient.invalidateQueries({ queryKey: ["/api/radiology/studies"] });
      setDialogOpen(false);
    },
    onError: (error: any) => {
      toast({ title: "Failed to start imaging", description: error.message, variant: "destructive" });
    }
  });

  const completeImagingMutation = useMutation({
    mutationFn: async ({ studyId, findings, interpretation, recommendation, radiologistSignature }: any) => {
      const testId = studyId.replace('pt-', '');
      const response = await apiRequest('POST', `/api/patient-tests/${testId}/complete-imaging`, {
        findings,
        interpretation,
        recommendation,
        radiologistSignature: radiologistSignature || user?.username || 'Radiologist'
      });
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Radiology study completed successfully", variant: "default" });
      queryClient.invalidateQueries({ queryKey: ["/api/radiology/studies"] });
      setDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({ title: "Failed to complete study", description: error.message, variant: "destructive" });
    }
  });

  const releaseReportMutation = useMutation({
    mutationFn: async (studyId: string) => {
      const testId = studyId.replace('pt-', '');
      const response = await apiRequest('POST', `/api/patient-tests/${testId}/release-report`, {
        releaseTo: 'patient',
        releaseMethod: 'digital'
      });
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Report released successfully", variant: "default" });
      queryClient.invalidateQueries({ queryKey: ["/api/radiology/studies"] });
    },
    onError: (error: any) => {
      toast({ title: "Failed to release report", description: error.message, variant: "destructive" });
    }
  });

  const resetForm = () => {
    setFindings('');
    setInterpretation('');
    setRecommendation('');
    setExpectedHours('2');
    setRadiologistSignature('');
    setCurrentStudy(null);
    setCurrentAction('');
  };

  const handleAction = (action: string, study: any) => {
    setCurrentAction(action);
    setCurrentStudy(study);
    if (action === 'verify-payment') {
      verifyPaymentMutation.mutate(study.id);
    } else if (action === 'release-report') {
      releaseReportMutation.mutate(study.id);
    } else {
      setDialogOpen(true);
    }
  };

  const handleDialogSubmit = () => {
    if (currentAction === 'start-imaging') {
      startImagingMutation.mutate({ studyId: currentStudy.id, expectedHours });
    } else if (currentAction === 'complete-imaging') {
      completeImagingMutation.mutate({ 
        studyId: currentStudy.id, 
        findings, 
        interpretation, 
        recommendation,
        radiologistSignature
      });
    }
  };

  // Radiology metrics query
  const { data: radiologyMetrics, isLoading: metricsLoading } = useQuery({
    queryKey: ["/api/radiology/metrics", user?.branchId, startDate, endDate],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (user?.branchId) params.append('branchId', user.branchId.toString());
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      
      const response = await fetch(`/api/radiology/metrics?${params}`);
      if (!response.ok) throw new Error("Failed to fetch radiology metrics");
      return response.json();
    },
    enabled: !!user?.branchId
  });

  // Recent studies query
  const { data: recentStudies, isLoading: studiesLoading } = useQuery({
    queryKey: ["/api/radiology/studies", user?.branchId, selectedModality],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (user?.branchId) params.append('branchId', user.branchId.toString());
      if (selectedModality !== 'all') params.append('modality', selectedModality);
      
      const response = await fetch(`/api/radiology/studies?${params}`);
      if (!response.ok) throw new Error("Failed to fetch radiology studies");
      return response.json();
    },
    enabled: !!user?.branchId
  });

  // Equipment status query
  const { data: equipmentStatus, isLoading: equipmentLoading } = useQuery({
    queryKey: ["/api/radiology/equipment", user?.branchId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (user?.branchId) params.append('branchId', user.branchId.toString());
      
      const response = await fetch(`/api/radiology/equipment?${params}`);
      if (!response.ok) throw new Error("Failed to fetch equipment status");
      return response.json();
    },
    enabled: !!user?.branchId
  });

  const getModalityIcon = (modality: string) => {
    switch (modality?.toLowerCase()) {
      case 'ct': case 'ct scan': return <Scan className="w-5 h-5 text-blue-600" />;
      case 'x-ray': return <Image className="w-5 h-5 text-green-600" />;
      case 'ultrasound': return <Heart className="w-5 h-5 text-purple-600" />;
      case 'mri': return <Monitor className="w-5 h-5 text-red-600" />;
      default: return <FileImage className="w-5 h-5 text-gray-600" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'completed': return "bg-green-100 text-green-800";
      case 'in_progress': case 'in progress': return "bg-blue-100 text-blue-800";
      case 'scheduled': return "bg-yellow-100 text-yellow-800";
      case 'cancelled': return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  if (!user) {
    return (
      <div className="p-6">
        <div className="text-center">
          <p className="text-gray-500">Please log in to access the radiology management system.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/">
            <Button variant="outline" size="sm">
              <Home className="w-4 h-4 mr-2" />
              Home
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Radiology Management</h1>
            <p className="text-gray-600">Manage imaging studies and workflow processes</p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <MessageNotification />
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => {
              queryClient.invalidateQueries({ queryKey: ["/api/radiology/metrics"] });
              queryClient.invalidateQueries({ queryKey: ["/api/radiology/studies"] });
              queryClient.invalidateQueries({ queryKey: ["/api/radiology/equipment"] });
              toast({ title: "Data refreshed successfully", variant: "default" });
            }}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Dialog>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700">
                <Camera className="w-4 h-4 mr-2" />
                New Study
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Schedule New Radiology Study</DialogTitle>
                <DialogDescription>
                  Create a new radiology study request for a patient.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="patientSearch">Patient</Label>
                  <Input
                    id="patientSearch"
                    placeholder="Search for patient by name or ID..."
                  />
                </div>
                <div>
                  <Label htmlFor="studyType">Study Type</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select study type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="xray">X-Ray</SelectItem>
                      <SelectItem value="ct">CT Scan</SelectItem>
                      <SelectItem value="mri">MRI</SelectItem>
                      <SelectItem value="ultrasound">Ultrasound</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="priority">Priority</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="routine">Routine</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                      <SelectItem value="stat">STAT</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="notes">Clinical Notes</Label>
                  <Textarea
                    id="notes"
                    placeholder="Enter clinical indication and notes..."
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline">Cancel</Button>
                <Button>Schedule Study</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Studies</p>
                <p className="text-2xl font-bold text-blue-600">
                  {radiologyMetrics?.totalStudies || 0}
                </p>
                <p className="text-xs text-blue-600">
                  {radiologyMetrics?.todayStudies || 0} today
                </p>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <FileImage className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Completion Rate</p>
                <p className="text-2xl font-bold text-green-600">
                  {radiologyMetrics?.completionRate || 0}%
                </p>
                <p className="text-xs text-green-600">
                  {radiologyMetrics?.avgTurnaroundTime || 0}h avg turnaround
                </p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Equipment Active</p>
                <p className="text-2xl font-bold text-green-600">
                  {radiologyMetrics?.activeEquipment || 0}/{radiologyMetrics?.totalEquipment || 0}
                </p>
                <p className="text-xs text-green-600">
                  {radiologyMetrics?.equipmentUtilization || 0}% utilization
                </p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <Monitor className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Quality Score</p>
                <p className="text-2xl font-bold text-purple-600">
                  {radiologyMetrics?.qualityScore || 0}%
                </p>
                <p className="text-xs text-purple-600">
                  {radiologyMetrics?.retakeRate || 0}% retake rate
                </p>
              </div>
              <div className="p-3 bg-purple-100 rounded-lg">
                <Shield className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="workflow" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="workflow">Imaging Workflow</TabsTrigger>
          <TabsTrigger value="studies">Recent Studies</TabsTrigger>
          <TabsTrigger value="equipment">Equipment Status</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
          <TabsTrigger value="schedule">Study Schedule</TabsTrigger>
        </TabsList>

        <TabsContent value="workflow" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5" />
                Imaging Workflow Management
              </CardTitle>
              <p className="text-sm text-gray-600">
                Manage paid imaging requests through the workflow process
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentStudies?.map((study: any) => {
                  // Get background color based on workflow status
                  const getBackgroundColor = () => {
                    if (study.status === 'scheduled' && !study.paymentVerified) {
                      return 'bg-red-50 border-red-200'; // Payment pending - red
                    } else if (study.status === 'scheduled' && study.paymentVerified) {
                      return 'bg-blue-50 border-blue-200'; // Payment verified - blue
                    } else if (study.status === 'in_progress' || study.status === 'processing') {
                      return 'bg-yellow-50 border-yellow-200'; // In progress - yellow
                    } else if (study.status === 'completed' || study.status === 'reported') {
                      return 'bg-green-50 border-green-200'; // Completed - green
                    }
                    return 'bg-gray-50 border-gray-200'; // Default - gray
                  };

                  return (
                  <div key={study.id} className={`flex items-center justify-between p-4 border rounded-lg ${getBackgroundColor()}`}>
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <Eye className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium">{study.testName}</p>
                        <p className="text-sm text-gray-600">{study.patientName} • {study.patientId}</p>
                        <p className="text-xs text-gray-500">
                          Scheduled: {new Date(study.scheduledAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={study.status === 'scheduled' ? 'secondary' : study.status === 'in_progress' ? 'default' : 'outline'}>
                        {study.status?.replace('_', ' ').toUpperCase() || 'SCHEDULED'}
                      </Badge>
                      
                      {study.status === 'scheduled' && !study.paymentVerified && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleAction('verify-payment', study)}
                          disabled={verifyPaymentMutation.isPending}
                        >
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Verify Payment
                        </Button>
                      )}
                      
                      {study.paymentVerified && study.status === 'scheduled' && (
                        <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">
                          Payment Verified
                        </Badge>
                      )}
                      
                      {(study.status === 'payment_verified' || (study.status === 'scheduled' && study.paymentVerified)) && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleAction('start-imaging', study)}
                          disabled={startImagingMutation.isPending}
                        >
                          <Camera className="w-4 h-4 mr-1" />
                          Start Imaging
                        </Button>
                      )}
                      
                      {study.status === 'in_progress' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleAction('complete-imaging', study)}
                          disabled={completeImagingMutation.isPending}
                        >
                          <FileText className="w-4 h-4 mr-1" />
                          Complete Study
                        </Button>
                      )}
                      
                      {study.status === 'completed' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleAction('release-report', study)}
                          disabled={releaseReportMutation.isPending}
                        >
                          <Download className="w-4 h-4 mr-1" />
                          Release Report
                        </Button>
                      )}
                    </div>
                  </div>
                  );
                })}
                
                {(!recentStudies || recentStudies.length === 0) && (
                  <div className="text-center py-8 text-gray-500">
                    No imaging studies found for the selected period
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="studies" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileImage className="w-5 h-5" />
                Recent Imaging Studies
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentStudies?.map((study: any) => {
                  // Get background color based on workflow status
                  const getBackgroundColor = () => {
                    if (study.status === 'scheduled' && !study.paymentVerified) {
                      return 'bg-red-50 border-red-200'; // Payment pending - red
                    } else if (study.status === 'scheduled' && study.paymentVerified) {
                      return 'bg-blue-50 border-blue-200'; // Payment verified - blue
                    } else if (study.status === 'in_progress' || study.status === 'processing') {
                      return 'bg-yellow-50 border-yellow-200'; // In progress - yellow
                    } else if (study.status === 'completed' || study.status === 'reported') {
                      return 'bg-green-50 border-green-200'; // Completed - green
                    }
                    return 'bg-gray-50 border-gray-200'; // Default - gray
                  };

                  return (
                  <div key={study.id} className={`flex items-center justify-between p-4 border rounded-lg ${getBackgroundColor()}`}>
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-gray-100 rounded-lg">
                        {getModalityIcon(study.categoryName)}
                      </div>
                      <div>
                        <p className="font-medium">{study.testName}</p>
                        <p className="text-sm text-gray-600">{study.patientName} • {study.patientId}</p>
                        <p className="text-xs text-gray-500">
                          {new Date(study.scheduledAt).toLocaleDateString()} at{' '}
                          {new Date(study.scheduledAt).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                    <div className="text-right flex items-center gap-3">
                      <div>
                        <p className="text-sm font-medium">{study.categoryName}</p>
                        <p className="text-xs text-gray-500">₦{study.price?.toLocaleString()}</p>
                      </div>
                      <Badge className={getStatusBadge(study.status)}>
                        {study.status?.toUpperCase() || 'SCHEDULED'}
                      </Badge>
                      <Button variant="outline" size="sm">
                        <Eye className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )})}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="equipment" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Equipment Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {equipmentStatus?.map((equipment: any) => (
                  <div key={equipment.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          <Monitor className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-medium">{equipment.name}</p>
                          <p className="text-sm text-gray-600">{equipment.model}</p>
                        </div>
                      </div>
                      <Badge 
                        variant={equipment.status === 'active' ? 'default' : 'secondary'}
                      >
                        {equipment.status}
                      </Badge>
                    </div>
                    <div className="text-sm text-gray-600">
                      <p>Location: {equipment.location}</p>
                      <p>Utilization: {equipment.utilization}%</p>
                      <p>Last Service: {new Date(equipment.lastService).toLocaleDateString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports" className="space-y-6">
          {/* Report Generation Controls */}
          <Card>
            <CardHeader>
              <CardTitle>Generate Radiology Reports</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="reportType">Report Type</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select report type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily Imaging Summary</SelectItem>
                      <SelectItem value="weekly">Weekly Performance</SelectItem>
                      <SelectItem value="monthly">Monthly Analysis</SelectItem>
                      <SelectItem value="modality">Modality Performance</SelectItem>
                      <SelectItem value="radiologist">Radiologist Productivity</SelectItem>
                      <SelectItem value="equipment">Equipment Utilization</SelectItem>
                      <SelectItem value="turnaround">Turnaround Time Analysis</SelectItem>
                      <SelectItem value="quality">Quality Assurance</SelectItem>
                      <SelectItem value="revenue">Revenue Analysis</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="startDate">Start Date</Label>
                  <Input type="date" />
                </div>
                <div>
                  <Label htmlFor="endDate">End Date</Label>
                  <Input type="date" />
                </div>
              </div>
              <div className="flex gap-2">
                <Button className="flex items-center gap-2">
                  <BarChart3 className="w-4 h-4" />
                  Generate Report
                </Button>
                <Button variant="outline" className="flex items-center gap-2">
                  <Download className="w-4 h-4" />
                  Export PDF
                </Button>
                <Button variant="outline" className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Export Excel
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Report Preview */}
          <Card>
            <CardHeader>
              <CardTitle>Report Preview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Summary Statistics */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <h3 className="text-sm font-medium text-blue-700">Total Studies</h3>
                    <p className="text-2xl font-bold text-blue-900">{radiologyMetrics?.totalStudies || 0}</p>
                    <p className="text-xs text-blue-600">This period</p>
                  </div>
                  <div className="p-4 bg-green-50 rounded-lg">
                    <h3 className="text-sm font-medium text-green-700">Completion Rate</h3>
                    <p className="text-2xl font-bold text-green-900">{radiologyMetrics?.completionRate || 0}%</p>
                    <p className="text-xs text-green-600">Target: 95%</p>
                  </div>
                  <div className="p-4 bg-yellow-50 rounded-lg">
                    <h3 className="text-sm font-medium text-yellow-700">Avg Turnaround</h3>
                    <p className="text-2xl font-bold text-yellow-900">{radiologyMetrics?.avgTurnaroundTime || 0}h</p>
                    <p className="text-xs text-yellow-600">Target: 1h</p>
                  </div>
                  <div className="p-4 bg-purple-50 rounded-lg">
                    <h3 className="text-sm font-medium text-purple-700">Quality Score</h3>
                    <p className="text-2xl font-bold text-purple-900">{radiologyMetrics?.qualityScore || 0}%</p>
                    <p className="text-xs text-purple-600">Target: 98%</p>
                  </div>
                </div>

                {/* Modality Distribution */}
                <div className="border rounded-lg p-4">
                  <h3 className="font-medium mb-4">Imaging Modality Distribution</h3>
                  <div className="space-y-2">
                    {[
                      { modality: 'X-Ray', count: 125, percentage: 60, icon: '📷' },
                      { modality: 'CT Scan', count: 35, percentage: 17, icon: '🔍' },
                      { modality: 'Ultrasound', count: 28, percentage: 13, icon: '🫀' },
                      { modality: 'MRI', count: 15, percentage: 7, icon: '🧲' },
                      { modality: 'Mammography', count: 6, percentage: 3, icon: '🎯' }
                    ].map((modality) => (
                      <div key={modality.modality} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span>{modality.icon}</span>
                          <span className="text-sm">{modality.modality}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-600">{modality.count} studies</span>
                          <div className="w-24 bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-blue-600 h-2 rounded-full" 
                              style={{ width: `${modality.percentage}%` }}
                            ></div>
                          </div>
                          <span className="text-sm font-medium">{modality.percentage}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Equipment Performance */}
                <div className="border rounded-lg p-4">
                  <h3 className="font-medium mb-4">Equipment Performance</h3>
                  <div className="space-y-2">
                    {[
                      { equipment: 'X-Ray Machine 1', utilization: 95, uptime: 99, status: 'Excellent' },
                      { equipment: 'CT Scanner', utilization: 78, uptime: 97, status: 'Good' },
                      { equipment: 'MRI Unit', utilization: 65, uptime: 95, status: 'Good' },
                      { equipment: 'Ultrasound Unit', utilization: 88, uptime: 100, status: 'Excellent' },
                      { equipment: 'Mammography Unit', utilization: 45, uptime: 92, status: 'Maintenance' }
                    ].map((equipment) => (
                      <div key={equipment.equipment} className="flex items-center justify-between">
                        <span className="text-sm">{equipment.equipment}</span>
                        <div className="flex items-center gap-4">
                          <div className="text-xs">
                            <span className="text-gray-600">Utilization: </span>
                            <span className="font-medium">{equipment.utilization}%</span>
                          </div>
                          <div className="text-xs">
                            <span className="text-gray-600">Uptime: </span>
                            <span className="font-medium">{equipment.uptime}%</span>
                          </div>
                          <div className="w-20 bg-gray-200 rounded-full h-2">
                            <div 
                              className={`h-2 rounded-full ${
                                equipment.utilization >= 80 ? 'bg-green-600' :
                                equipment.utilization >= 60 ? 'bg-yellow-600' : 'bg-red-600'
                              }`}
                              style={{ width: `${equipment.utilization}%` }}
                            ></div>
                          </div>
                          <Badge variant={
                            equipment.status === 'Excellent' ? 'default' :
                            equipment.status === 'Good' ? 'secondary' : 'outline'
                          }>
                            {equipment.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Radiologist Performance */}
                <div className="border rounded-lg p-4">
                  <h3 className="font-medium mb-4">Radiologist Performance</h3>
                  <div className="space-y-2">
                    {[
                      { name: 'Dr. Sarah Johnson', studies: 45, avgTime: '18min', accuracy: 98 },
                      { name: 'Dr. Michael Chen', studies: 38, avgTime: '22min', accuracy: 96 },
                      { name: 'Dr. Emily Rodriguez', studies: 42, avgTime: '19min', accuracy: 97 },
                      { name: 'Dr. Ahmed Hassan', studies: 35, avgTime: '25min', accuracy: 95 }
                    ].map((radiologist) => (
                      <div key={radiologist.name} className="flex items-center justify-between">
                        <span className="text-sm font-medium">{radiologist.name}</span>
                        <div className="flex items-center gap-4 text-xs">
                          <span>{radiologist.studies} studies</span>
                          <span>Avg: {radiologist.avgTime}</span>
                          <span>Accuracy: {radiologist.accuracy}%</span>
                          <div className="w-16 bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-green-600 h-2 rounded-full" 
                              style={{ width: `${radiologist.accuracy}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Weekly Trends */}
                <div className="border rounded-lg p-4">
                  <h3 className="font-medium mb-4">Weekly Performance Trends</h3>
                  <div className="text-center py-8 text-gray-500">
                    <BarChart3 className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                    Interactive charts will be displayed here
                    <br />
                    <span className="text-xs">Studies volume, turnaround times, equipment utilization over time</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="schedule" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Study Schedule</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-gray-500">
                Study scheduling functionality coming soon
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Workflow Action Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {currentAction === 'start-imaging' ? 'Start Imaging Study' : 'Complete Imaging Study'}
            </DialogTitle>
            <DialogDescription>
              {currentAction === 'start-imaging' 
                ? 'Set the expected completion time for this imaging study'
                : 'Enter the imaging findings and interpretation'
              }
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {currentAction === 'start-imaging' ? (
              <div className="space-y-2">
                <Label htmlFor="expectedHours">Expected Hours to Complete</Label>
                <Select value={expectedHours} onValueChange={setExpectedHours}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select expected hours" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 hour</SelectItem>
                    <SelectItem value="2">2 hours</SelectItem>
                    <SelectItem value="4">4 hours</SelectItem>
                    <SelectItem value="8">8 hours</SelectItem>
                    <SelectItem value="24">24 hours</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="findings">Imaging Findings *</Label>
                  <Textarea
                    id="findings"
                    placeholder="Enter detailed imaging findings..."
                    value={findings}
                    onChange={(e) => setFindings(e.target.value)}
                    rows={4}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="interpretation">Interpretation</Label>
                  <Textarea
                    id="interpretation"
                    placeholder="Enter clinical interpretation..."
                    value={interpretation}
                    onChange={(e) => setInterpretation(e.target.value)}
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="recommendation">Recommendation</Label>
                  <Textarea
                    id="recommendation"
                    placeholder="Enter clinical recommendations..."
                    value={recommendation}
                    onChange={(e) => setRecommendation(e.target.value)}
                    rows={2}
                  />
                </div>
              </>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleDialogSubmit}
              disabled={
                (currentAction === 'complete-imaging' && !findings.trim()) ||
                startImagingMutation.isPending ||
                completeImagingMutation.isPending
              }
            >
              {currentAction === 'start-imaging' ? 'Start Imaging' : 'Complete Study'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}