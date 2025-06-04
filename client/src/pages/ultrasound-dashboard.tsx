import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  Waves, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  Heart,
  Monitor,
  Calendar,
  Users,
  Camera,
  FileImage,
  Activity,
  Shield,
  Eye,
  Download,
  RefreshCw,
  BarChart3,
  FileText,
  Play,
  Square
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

export default function UltrasoundDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dateRange, setDateRange] = useState("today");
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

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
      queryClient.invalidateQueries({ queryKey: ["/api/ultrasound/studies"] });
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
        imagingType: 'Ultrasound'
      });
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Ultrasound imaging started successfully", variant: "default" });
      queryClient.invalidateQueries({ queryKey: ["/api/ultrasound/studies"] });
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
      toast({ title: "Ultrasound study completed successfully", variant: "default" });
      queryClient.invalidateQueries({ queryKey: ["/api/ultrasound/studies"] });
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
      queryClient.invalidateQueries({ queryKey: ["/api/ultrasound/studies"] });
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

  // Ultrasound metrics query
  const { data: ultrasoundMetrics, isLoading: metricsLoading } = useQuery({
    queryKey: ["/api/ultrasound/metrics", user?.branchId, startDate, endDate],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (user?.branchId) params.append('branchId', user.branchId.toString());
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      
      const response = await fetch(`/api/ultrasound/metrics?${params}`);
      if (!response.ok) throw new Error("Failed to fetch ultrasound metrics");
      return response.json();
    },
    enabled: !!user?.branchId
  });

  // Recent studies query
  const { data: recentStudies, isLoading: studiesLoading } = useQuery({
    queryKey: ["/api/ultrasound/studies", user?.branchId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (user?.branchId) params.append('branchId', user.branchId.toString());
      
      const response = await fetch(`/api/ultrasound/studies?${params}`);
      if (!response.ok) throw new Error("Failed to fetch ultrasound studies");
      return response.json();
    },
    enabled: !!user?.branchId
  });

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
          <p className="text-gray-500">Please log in to access the ultrasound dashboard.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Ultrasound Dashboard</h1>
          <p className="text-gray-600">Manage ultrasound studies and workflow processes</p>
        </div>
        <div className="flex items-center space-x-3">
          <Button variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button className="bg-purple-600 hover:bg-purple-700">
            <Waves className="w-4 h-4 mr-2" />
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
                <p className="text-2xl font-bold text-purple-600">
                  {ultrasoundMetrics?.totalStudies || 0}
                </p>
                <p className="text-xs text-purple-600">
                  {ultrasoundMetrics?.todayStudies || 0} today
                </p>
              </div>
              <div className="p-3 bg-purple-100 rounded-lg">
                <Waves className="w-6 h-6 text-purple-600" />
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
                  {ultrasoundMetrics?.completionRate || 0}%
                </p>
                <p className="text-xs text-green-600">
                  {ultrasoundMetrics?.avgTurnaroundTime || 0}h avg turnaround
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
                  {ultrasoundMetrics?.activeEquipment || 0}/{ultrasoundMetrics?.totalEquipment || 0}
                </p>
                <p className="text-xs text-green-600">
                  {ultrasoundMetrics?.equipmentUtilization || 0}% utilization
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
                <p className="text-2xl font-bold text-blue-600">
                  {ultrasoundMetrics?.qualityScore || 0}%
                </p>
                <p className="text-xs text-blue-600">
                  {ultrasoundMetrics?.retakeRate || 0}% retake rate
                </p>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <Shield className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="workflow" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="workflow">Ultrasound Workflow</TabsTrigger>
          <TabsTrigger value="studies">Recent Studies</TabsTrigger>
          <TabsTrigger value="schedule">Study Schedule</TabsTrigger>
        </TabsList>

        <TabsContent value="workflow" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5" />
                Ultrasound Workflow Management
              </CardTitle>
              <p className="text-sm text-gray-600">
                Manage paid ultrasound requests through the workflow process
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentStudies?.map((study: any) => (
                  <div key={study.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-purple-100 rounded-lg">
                        <Waves className="w-5 h-5 text-purple-600" />
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
                      
                      {study.status === 'scheduled' && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleAction('verify-payment', study)}
                            disabled={verifyPaymentMutation.isPending}
                          >
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Verify Payment
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleAction('start-imaging', study)}
                            disabled={startImagingMutation.isPending}
                          >
                            <Play className="w-4 h-4 mr-1" />
                            Start Ultrasound
                          </Button>
                        </>
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
                    No ultrasound studies found for the selected period
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
                <Heart className="w-5 h-5" />
                Recent Ultrasound Studies
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentStudies?.map((study: any) => (
                  <div key={study.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-gray-100 rounded-lg">
                        <Heart className="w-5 h-5 text-purple-600" />
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
              {currentAction === 'start-imaging' ? 'Start Ultrasound Study' : 'Complete Ultrasound Study'}
            </DialogTitle>
            <DialogDescription>
              {currentAction === 'start-imaging' 
                ? 'Set the expected completion time for this ultrasound study'
                : 'Enter the ultrasound findings and interpretation'
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
                  <Label htmlFor="findings">Ultrasound Findings *</Label>
                  <Textarea
                    id="findings"
                    placeholder="Enter detailed ultrasound findings..."
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
              {currentAction === 'start-imaging' ? 'Start Ultrasound' : 'Complete Study'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}