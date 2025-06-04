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
  FileText
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
    mutationFn: async ({ studyId, findings, interpretation, recommendation }: any) => {
      const testId = studyId.replace('pt-', '');
      const response = await apiRequest('POST', `/api/patient-tests/${testId}/complete-imaging`, {
        findings,
        interpretation,
        recommendation
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
        recommendation 
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
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Radiology Management</h1>
          <p className="text-gray-600">Manage imaging studies and workflow processes</p>
        </div>
        <div className="flex items-center space-x-3">
          <Button variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button className="bg-blue-600 hover:bg-blue-700">
            <Camera className="w-4 h-4 mr-2" />
            New Study
          </Button>
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
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="workflow">Imaging Workflow</TabsTrigger>
          <TabsTrigger value="studies">Recent Studies</TabsTrigger>
          <TabsTrigger value="equipment">Equipment Status</TabsTrigger>
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
                {recentStudies?.map((study: any) => (
                  <div key={study.id} className="flex items-center justify-between p-4 border rounded-lg">
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
                      
                      {(study.status === 'scheduled' || !study.paymentVerified) && (
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
                ))}
                
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
                {recentStudies?.map((study: any) => (
                  <div key={study.id} className="flex items-center justify-between p-4 border rounded-lg">
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
                ))}
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