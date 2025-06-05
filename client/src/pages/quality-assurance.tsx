import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { 
  Shield, 
  CheckCircle, 
  AlertTriangle, 
  ClipboardCheck, 
  FileText,
  Settings,
  Target,
  TrendingUp,
  Users,
  Calendar,
  BarChart3,
  Search
} from "lucide-react";

interface QualityControlTest {
  id: number;
  testName: string;
  department: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  status: 'passed' | 'failed' | 'pending';
  lastPerformed: string;
  nextDue: string;
  performedBy: string;
  results: string;
  acceptanceCriteria: string;
}

interface CalibrationRecord {
  id: number;
  equipmentId: number;
  equipmentName: string;
  calibrationDate: string;
  nextCalibrationDue: string;
  calibratedBy: string;
  certificateNumber: string;
  status: 'valid' | 'expired' | 'due_soon';
  results: string;
}

interface IncidentReport {
  id: number;
  incidentType: 'equipment_failure' | 'procedure_deviation' | 'safety_issue' | 'quality_issue';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  reportedBy: string;
  reportedDate: string;
  status: 'open' | 'investigating' | 'resolved' | 'closed';
  rootCause?: string;
  correctiveActions?: string;
  assignedTo?: string;
}

interface QualityMetrics {
  testAccuracy: number;
  equipmentUptime: number;
  incidentRate: number;
  complianceScore: number;
  customerSatisfaction: number;
}

export default function QualityAssurance() {
  const { toast } = useToast();
  const [selectedTab, setSelectedTab] = useState("quality-control");
  const [selectedDepartment, setSelectedDepartment] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");

  // Fetch quality control tests
  const { data: qualityTests = [], isLoading: testsLoading } = useQuery<QualityControlTest[]>({
    queryKey: ["/api/quality/control-tests", selectedDepartment],
    queryFn: async () => {
      const response = await fetch(`/api/quality/control-tests?department=${selectedDepartment}`);
      return response.json();
    },
  });

  // Fetch calibration records
  const { data: calibrationRecords = [], isLoading: calibrationLoading } = useQuery<CalibrationRecord[]>({
    queryKey: ["/api/quality/calibrations"],
  });

  // Fetch incident reports
  const { data: incidentReports = [], isLoading: incidentsLoading } = useQuery<IncidentReport[]>({
    queryKey: ["/api/quality/incidents"],
  });

  // Fetch quality metrics
  const { data: qualityMetrics, isLoading: metricsLoading } = useQuery<QualityMetrics>({
    queryKey: ["/api/quality/metrics"],
  });

  // Create quality control test mutation
  const createQCTestMutation = useMutation({
    mutationFn: async (testData: Partial<QualityControlTest>) => {
      return apiRequest("POST", "/api/quality/control-tests", testData);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Quality control test created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/quality/control-tests"] });
    },
  });

  // Record calibration mutation
  const recordCalibrationMutation = useMutation({
    mutationFn: async (calibrationData: Partial<CalibrationRecord>) => {
      return apiRequest("POST", "/api/quality/calibrations", calibrationData);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Calibration record saved successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/quality/calibrations"] });
    },
  });

  // Create incident report mutation
  const createIncidentMutation = useMutation({
    mutationFn: async (incidentData: Partial<IncidentReport>) => {
      return apiRequest("POST", "/api/quality/incidents", incidentData);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Incident report created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/quality/incidents"] });
    },
  });

  const filteredTests = qualityTests.filter(test =>
    test.testName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    test.department.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'passed':
      case 'valid':
      case 'resolved':
        return 'default';
      case 'failed':
      case 'expired':
      case 'critical':
        return 'destructive';
      case 'pending':
      case 'due_soon':
      case 'investigating':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'low':
        return 'default';
      case 'medium':
        return 'secondary';
      case 'high':
        return 'destructive';
      case 'critical':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Quality Assurance</h1>
          <p className="text-muted-foreground">
            Comprehensive quality management and compliance monitoring
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog>
            <DialogTrigger asChild>
              <Button>
                <FileText className="w-4 h-4 mr-2" />
                New Incident Report
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create Incident Report</DialogTitle>
                <DialogDescription>
                  Report quality issues, equipment failures, or safety incidents
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Incident Type</label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="equipment_failure">Equipment Failure</SelectItem>
                        <SelectItem value="procedure_deviation">Procedure Deviation</SelectItem>
                        <SelectItem value="safety_issue">Safety Issue</SelectItem>
                        <SelectItem value="quality_issue">Quality Issue</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Severity</label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select severity" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="critical">Critical</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">Description</label>
                  <Textarea placeholder="Describe the incident in detail..." className="mt-1" />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline">Cancel</Button>
                  <Button>Submit Report</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Quality Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Test Accuracy</p>
                <p className="text-2xl font-bold text-green-600">
                  {qualityMetrics?.testAccuracy || 98.5}%
                </p>
              </div>
              <Target className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Equipment Uptime</p>
                <p className="text-2xl font-bold text-blue-600">
                  {qualityMetrics?.equipmentUptime || 99.2}%
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Incident Rate</p>
                <p className="text-2xl font-bold text-orange-600">
                  {qualityMetrics?.incidentRate || 0.8}/1000
                </p>
              </div>
              <AlertTriangle className="w-8 h-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Compliance Score</p>
                <p className="text-2xl font-bold text-purple-600">
                  {qualityMetrics?.complianceScore || 96.8}%
                </p>
              </div>
              <Shield className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Customer Satisfaction</p>
                <p className="text-2xl font-bold text-indigo-600">
                  {qualityMetrics?.customerSatisfaction || 4.7}/5.0
                </p>
              </div>
              <Users className="w-8 h-8 text-indigo-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="quality-control">Quality Control</TabsTrigger>
          <TabsTrigger value="calibrations">Calibrations</TabsTrigger>
          <TabsTrigger value="incidents">Incident Reports</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="quality-control" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Quality Control Tests</CardTitle>
                  <CardDescription>
                    Monitor and manage quality control testing procedures
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      placeholder="Search tests..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 w-64"
                    />
                  </div>
                  <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                    <SelectTrigger className="w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Departments</SelectItem>
                      <SelectItem value="laboratory">Laboratory</SelectItem>
                      <SelectItem value="radiology">Radiology</SelectItem>
                      <SelectItem value="pharmacy">Pharmacy</SelectItem>
                      <SelectItem value="cardiology">Cardiology</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Test Name</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Frequency</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last Performed</TableHead>
                    <TableHead>Next Due</TableHead>
                    <TableHead>Performed By</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTests.map((test) => (
                    <TableRow key={test.id}>
                      <TableCell className="font-medium">{test.testName}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{test.department}</Badge>
                      </TableCell>
                      <TableCell>{test.frequency}</TableCell>
                      <TableCell>
                        <Badge variant={getStatusColor(test.status)}>
                          {test.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{new Date(test.lastPerformed).toLocaleDateString()}</TableCell>
                      <TableCell>{new Date(test.nextDue).toLocaleDateString()}</TableCell>
                      <TableCell>{test.performedBy}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline">
                            <ClipboardCheck className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="outline">
                            <FileText className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="calibrations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Equipment Calibrations</CardTitle>
              <CardDescription>
                Track equipment calibration schedules and certificates
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Equipment</TableHead>
                    <TableHead>Last Calibration</TableHead>
                    <TableHead>Next Due</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Certificate</TableHead>
                    <TableHead>Calibrated By</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {calibrationRecords.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell className="font-medium">{record.equipmentName}</TableCell>
                      <TableCell>{new Date(record.calibrationDate).toLocaleDateString()}</TableCell>
                      <TableCell>{new Date(record.nextCalibrationDue).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Badge variant={getStatusColor(record.status)}>
                          {record.status.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell>{record.certificateNumber}</TableCell>
                      <TableCell>{record.calibratedBy}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline">
                            <Calendar className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="outline">
                            <FileText className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="incidents" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Incident Reports</CardTitle>
              <CardDescription>
                Track and manage quality incidents and corrective actions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Severity</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Reported By</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {incidentReports.map((incident) => (
                    <TableRow key={incident.id}>
                      <TableCell>
                        <Badge variant="outline">
                          {incident.incidentType.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getSeverityColor(incident.severity)}>
                          {incident.severity}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-xs truncate">
                        {incident.description}
                      </TableCell>
                      <TableCell>{incident.reportedBy}</TableCell>
                      <TableCell>{new Date(incident.reportedDate).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Badge variant={getStatusColor(incident.status)}>
                          {incident.status.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline">
                            <FileText className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="outline">
                            <Settings className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Quality Trends</CardTitle>
                <CardDescription>
                  Monthly quality performance indicators
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-center justify-center text-muted-foreground">
                  <BarChart3 className="w-16 h-16 mb-4" />
                  <p>Quality trend charts will be displayed here</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Compliance Status</CardTitle>
                <CardDescription>
                  Regulatory compliance monitoring
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span>ISO 15189 Compliance</span>
                    <Badge variant="default">98.5%</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>CLIA Requirements</span>
                    <Badge variant="default">100%</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>CAP Accreditation</span>
                    <Badge variant="default">96.8%</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Internal QC Standards</span>
                    <Badge variant="default">99.2%</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}