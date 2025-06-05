import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  Heart, 
  Activity, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  Monitor,
  Zap,
  Users,
  FileText,
  Eye,
  Download,
  RefreshCw,
  Play,
  Square,
  Home,
  ArrowLeft
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Link } from "wouter";

export default function CardiologyUnit() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dateRange, setDateRange] = useState("today");
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedProcedure, setSelectedProcedure] = useState("all");

  // Workflow state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [currentAction, setCurrentAction] = useState<string>('');
  const [currentStudy, setCurrentStudy] = useState<any>(null);
  const [findings, setFindings] = useState('');
  const [interpretation, setInterpretation] = useState('');
  const [recommendation, setRecommendation] = useState('');
  const [expectedHours, setExpectedHours] = useState('2');
  const [cardiologistSignature, setCardiologistSignature] = useState('');

  // Helper function to get procedure stage-based background color
  const getProcedureStageColor = (procedure: any) => {
    if (procedure.status === "reported_and_saved") return "bg-emerald-50 border-emerald-200";
    if (procedure.status === "completed") return "bg-green-50 border-green-200";
    if (procedure.status === "in_progress") return "bg-yellow-50 border-yellow-200";
    if (procedure.status === "scheduled") return "bg-blue-50 border-blue-200";
    if (procedure.paymentVerified) return "bg-purple-50 border-purple-200";
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
      queryClient.invalidateQueries({ queryKey: ["/api/cardiology/studies"] });
    },
    onError: (error: any) => {
      toast({ title: "Failed to verify payment", description: error.message, variant: "destructive" });
    }
  });

  const startProcedureMutation = useMutation({
    mutationFn: async ({ studyId, expectedHours }: { studyId: string; expectedHours: string }) => {
      const testId = studyId.replace('pt-', '');
      const response = await apiRequest('POST', `/api/patient-tests/${testId}/start-imaging`, {
        expectedHours: parseInt(expectedHours),
        imagingType: 'Cardiology'
      });
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Cardiology procedure started successfully", variant: "default" });
      queryClient.invalidateQueries({ queryKey: ["/api/cardiology/studies"] });
      setDialogOpen(false);
    },
    onError: (error: any) => {
      toast({ title: "Failed to start procedure", description: error.message, variant: "destructive" });
    }
  });

  const completeProcedureMutation = useMutation({
    mutationFn: async ({ studyId, findings, interpretation, recommendation, cardiologistSignature }: any) => {
      const testId = studyId.replace('pt-', '');
      const response = await apiRequest('POST', `/api/patient-tests/${testId}/complete-imaging`, {
        findings,
        interpretation,
        recommendation,
        cardiologistSignature: cardiologistSignature || user?.username || 'Cardiologist'
      });
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Cardiology procedure completed successfully", variant: "default" });
      queryClient.invalidateQueries({ queryKey: ["/api/cardiology/studies"] });
      setDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({ title: "Failed to complete procedure", description: error.message, variant: "destructive" });
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
      queryClient.invalidateQueries({ queryKey: ["/api/cardiology/studies"] });
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
    setCardiologistSignature('');
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
    if (currentAction === 'start-procedure') {
      startProcedureMutation.mutate({ studyId: currentStudy.id, expectedHours });
    } else if (currentAction === 'complete-procedure') {
      completeProcedureMutation.mutate({ 
        studyId: currentStudy.id, 
        findings, 
        interpretation, 
        recommendation,
        cardiologistSignature
      });
    }
  };

  // Cardiology metrics query
  const { data: cardiologyMetrics, isLoading: metricsLoading } = useQuery({
    queryKey: ["/api/cardiology/metrics", user?.branchId, startDate, endDate],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (user?.branchId) params.append('branchId', user.branchId.toString());
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      
      const response = await fetch(`/api/cardiology/metrics?${params}`);
      if (!response.ok) throw new Error("Failed to fetch cardiology metrics");
      return response.json();
    },
    enabled: !!user?.branchId
  });

  // Recent studies query
  const { data: recentStudies, isLoading: studiesLoading } = useQuery({
    queryKey: ["/api/cardiology/studies", user?.branchId, selectedProcedure],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (user?.branchId) params.append('branchId', user.branchId.toString());
      if (selectedProcedure !== 'all') params.append('procedure', selectedProcedure);
      
      const response = await fetch(`/api/cardiology/studies?${params}`);
      if (!response.ok) throw new Error("Failed to fetch cardiology studies");
      return response.json();
    },
    enabled: !!user?.branchId
  });

  const getProcedureIcon = (procedureName: string) => {
    if (procedureName?.toLowerCase().includes('echo') || procedureName?.toLowerCase().includes('echocardiogram')) {
      return <Heart className="w-5 h-5 text-red-600" />;
    } else if (procedureName?.toLowerCase().includes('ecg') || procedureName?.toLowerCase().includes('ekg')) {
      return <Activity className="w-5 h-5 text-blue-600" />;
    } else if (procedureName?.toLowerCase().includes('stress')) {
      return <Zap className="w-5 h-5 text-orange-600" />;
    }
    return <Heart className="w-5 h-5 text-red-600" />;
  };

  const getStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'completed': return "bg-green-100 text-green-800";
      case 'in_progress': case 'in progress': return "bg-blue-100 text-blue-800";
      case 'scheduled': return "bg-yellow-100 text-yellow-800";
      case 'payment_verified': return "bg-purple-100 text-purple-800";
      case 'cancelled': return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  if (!user) {
    return (
      <div className="p-6">
        <div className="text-center">
          <p className="text-gray-500">Please log in to access the cardiology unit.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header with Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/">
            <Button variant="outline" size="sm">
              <Home className="w-4 h-4 mr-2" />
              Home
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Cardiology Unit</h1>
            <p className="text-gray-600">Manage echocardiography, ECG, and cardiac procedures</p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <Button variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button className="bg-red-600 hover:bg-red-700">
            <Heart className="w-4 h-4 mr-2" />
            New Procedure
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Procedures</p>
                <p className="text-2xl font-bold text-red-600">
                  {cardiologyMetrics?.totalProcedures || 0}
                </p>
                <p className="text-xs text-red-600">
                  {cardiologyMetrics?.todayProcedures || 0} today
                </p>
              </div>
              <div className="p-3 bg-red-100 rounded-lg">
                <Heart className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">ECG Studies</p>
                <p className="text-2xl font-bold text-blue-600">
                  {cardiologyMetrics?.ecgStudies || 0}
                </p>
                <p className="text-xs text-blue-600">
                  {cardiologyMetrics?.ecgToday || 0} today
                </p>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <Activity className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Echo Studies</p>
                <p className="text-2xl font-bold text-purple-600">
                  {cardiologyMetrics?.echoStudies || 0}
                </p>
                <p className="text-xs text-purple-600">
                  {cardiologyMetrics?.echoToday || 0} today
                </p>
              </div>
              <div className="p-3 bg-purple-100 rounded-lg">
                <Monitor className="w-6 h-6 text-purple-600" />
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
                  {cardiologyMetrics?.completionRate || 0}%
                </p>
                <p className="text-xs text-green-600">
                  {cardiologyMetrics?.avgTurnaroundTime || 0}h avg time
                </p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="workflow" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="workflow">Cardiology Workflow</TabsTrigger>
          <TabsTrigger value="procedures">Recent Procedures</TabsTrigger>
          <TabsTrigger value="ecg">ECG Studies</TabsTrigger>
          <TabsTrigger value="echo">Echo Studies</TabsTrigger>
        </TabsList>

        <TabsContent value="workflow" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5" />
                Cardiology Workflow Management
              </CardTitle>
              <p className="text-sm text-gray-600">
                Manage paid cardiology procedures through the workflow process
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentStudies?.map((study: any) => (
                  <div key={study.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-red-100 rounded-lg">
                        {getProcedureIcon(study.testName)}
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
                      <Badge className={getStatusBadge(study.status)}>
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
                          onClick={() => handleAction('start-procedure', study)}
                          disabled={startProcedureMutation.isPending}
                        >
                          <Play className="w-4 h-4 mr-1" />
                          Start Procedure
                        </Button>
                      )}
                      
                      {study.status === 'in_progress' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleAction('complete-procedure', study)}
                          disabled={completeProcedureMutation.isPending}
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
                    No cardiology procedures found for the selected period
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="procedures" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Heart className="w-5 h-5" />
                Recent Cardiology Procedures
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentStudies?.map((study: any) => (
                  <div key={study.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-gray-100 rounded-lg">
                        {getProcedureIcon(study.testName)}
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

        <TabsContent value="ecg" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5" />
                ECG Studies
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentStudies?.filter(study => 
                  study.testName?.toLowerCase().includes('ecg') || 
                  study.testName?.toLowerCase().includes('ekg')
                ).map((study: any) => (
                  <div key={study.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <Activity className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium">{study.testName}</p>
                        <p className="text-sm text-gray-600">{study.patientName} • {study.patientId}</p>
                        <p className="text-xs text-gray-500">
                          {new Date(study.scheduledAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <Badge className={getStatusBadge(study.status)}>
                      {study.status?.toUpperCase() || 'SCHEDULED'}
                    </Badge>
                  </div>
                ))}
                
                {(!recentStudies?.filter(study => 
                  study.testName?.toLowerCase().includes('ecg') || 
                  study.testName?.toLowerCase().includes('ekg')
                ).length) && (
                  <div className="text-center py-8 text-gray-500">
                    No ECG studies found
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="echo" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Monitor className="w-5 h-5" />
                Echocardiography Studies
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentStudies?.filter(study => 
                  study.testName?.toLowerCase().includes('echo')
                ).map((study: any) => (
                  <div key={study.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-purple-100 rounded-lg">
                        <Monitor className="w-5 h-5 text-purple-600" />
                      </div>
                      <div>
                        <p className="font-medium">{study.testName}</p>
                        <p className="text-sm text-gray-600">{study.patientName} • {study.patientId}</p>
                        <p className="text-xs text-gray-500">
                          {new Date(study.scheduledAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <Badge className={getStatusBadge(study.status)}>
                      {study.status?.toUpperCase() || 'SCHEDULED'}
                    </Badge>
                  </div>
                ))}
                
                {(!recentStudies?.filter(study => 
                  study.testName?.toLowerCase().includes('echo')
                ).length) && (
                  <div className="text-center py-8 text-gray-500">
                    No echocardiography studies found
                  </div>
                )}
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
              {currentAction === 'start-procedure' ? 'Start Cardiology Procedure' : 'Complete Cardiology Procedure'}
            </DialogTitle>
            <DialogDescription>
              {currentAction === 'start-procedure' 
                ? 'Set the expected completion time for this cardiology procedure'
                : 'Enter the procedure findings and interpretation'
              }
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {currentAction === 'start-procedure' ? (
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
                  <Label htmlFor="findings">Procedure Findings *</Label>
                  <Textarea
                    id="findings"
                    placeholder="Enter detailed procedure findings..."
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
                (currentAction === 'complete-procedure' && !findings.trim()) ||
                startProcedureMutation.isPending ||
                completeProcedureMutation.isPending
              }
            >
              {currentAction === 'start-procedure' ? 'Start Procedure' : 'Complete Procedure'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}