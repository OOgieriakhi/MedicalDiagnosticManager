import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  Workflow, 
  Users, 
  DollarSign, 
  Clock, 
  CheckCircle, 
  AlertTriangle, 
  Activity,
  Heart,
  Scan,
  FileText,
  TrendingUp,
  Calendar,
  Eye
} from "lucide-react";

interface ConsultantReport {
  id: number;
  reportNumber: string;
  patientId: string;
  patientName: string;
  consultantName: string;
  studyType: string;
  priority: string;
  turnaroundTimeHours: number;
  serviceFee: number;
  paymentStatus: string;
  studyDate: string;
  reportReceived: string;
  clinicalInterpretation: string;
}

interface ConsultantMetrics {
  totalReports: number;
  totalRevenue: number;
  avgTurnaroundTime: number;
  completedToday: number;
  pendingReports: number;
  urgentCases: number;
}

export default function ConsultantServices() {
  const [selectedTab, setSelectedTab] = useState("overview");

  // Mock data for demonstration - in production this would come from API
  const consultantReports: ConsultantReport[] = [
    {
      id: 1,
      reportNumber: "IMG-AIS-2025-001",
      patientId: "P-2025-221",
      patientName: "Olumide Adebayo",
      consultantName: "Advanced Imaging Solutions Ltd",
      studyType: "Chest X-ray",
      priority: "normal",
      turnaroundTimeHours: 2,
      serviceFee: 2800,
      paymentStatus: "paid",
      studyDate: "2025-06-08",
      reportReceived: "2025-06-08",
      clinicalInterpretation: "Chest X-ray shows clear bilateral lung fields with normal cardiac silhouette. No acute cardiopulmonary abnormalities."
    },
    {
      id: 2,
      reportNumber: "CARD-HVS-2025-001",
      patientId: "P-2025-222",
      patientName: "Aisha Mohammed",
      consultantName: "Heart & Vascular Specialists",
      studyType: "ECG",
      priority: "normal",
      turnaroundTimeHours: 0.75,
      serviceFee: 3800,
      paymentStatus: "paid",
      studyDate: "2025-06-08",
      reportReceived: "2025-06-08",
      clinicalInterpretation: "12-lead ECG shows sinus rhythm at 78 bpm with occasional premature atrial contractions. QTc interval normal."
    },
    {
      id: 3,
      reportNumber: "IMG-AIS-2025-002",
      patientId: "P-2025-223",
      patientName: "Emeka Okonkwo",
      consultantName: "Advanced Imaging Solutions Ltd",
      studyType: "Abdominal X-ray",
      priority: "urgent",
      turnaroundTimeHours: 3.5,
      serviceFee: 3500,
      paymentStatus: "paid",
      studyDate: "2025-06-08",
      reportReceived: "2025-06-08",
      clinicalInterpretation: "Abdominal X-ray reveals normal bowel gas pattern. No evidence of intestinal obstruction or perforation."
    },
    {
      id: 4,
      reportNumber: "CARD-HVS-2025-002",
      patientId: "P-2025-224",
      patientName: "Blessing Okoro",
      consultantName: "Heart & Vascular Specialists",
      studyType: "Echocardiogram",
      priority: "complex",
      turnaroundTimeHours: 2.5,
      serviceFee: 8125,
      paymentStatus: "paid",
      studyDate: "2025-06-08",
      reportReceived: "2025-06-08",
      clinicalInterpretation: "Transthoracic echocardiogram reveals moderate left ventricular systolic dysfunction with EF 35%."
    },
    {
      id: 5,
      reportNumber: "CARD-HVS-2025-003",
      patientId: "P-2025-226",
      patientName: "Chioma Nwankwo",
      consultantName: "Heart & Vascular Specialists",
      studyType: "ECG",
      priority: "stat",
      turnaroundTimeHours: 0.5,
      serviceFee: 5548,
      paymentStatus: "paid",
      studyDate: "2025-06-08",
      reportReceived: "2025-06-08",
      clinicalInterpretation: "12-lead ECG demonstrates ST elevation in leads II, III, aVF consistent with acute inferior STEMI."
    }
  ];

  const metrics: ConsultantMetrics = {
    totalReports: 10,
    totalRevenue: 43093,
    avgTurnaroundTime: 4.8,
    completedToday: 10,
    pendingReports: 0,
    urgentCases: 2
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'stat':
        return <Badge variant="destructive">STAT</Badge>;
      case 'urgent':
        return <Badge variant="secondary">Urgent</Badge>;
      case 'complex':
        return <Badge variant="outline">Complex</Badge>;
      default:
        return <Badge variant="default">Normal</Badge>;
    }
  };

  const getStudyIcon = (studyType: string) => {
    if (studyType.toLowerCase().includes('ecg') || studyType.toLowerCase().includes('echo')) {
      return <Heart className="w-4 h-4" />;
    }
    return <Scan className="w-4 h-4" />;
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Consultant Services Management</h1>
          <p className="text-muted-foreground">Monitor off-site imaging and cardiology analysis workflow</p>
        </div>
        <Button>
          <FileText className="w-4 h-4 mr-2" />
          Generate Report
        </Button>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Reports</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalReports}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenue Generated</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₦{metrics.totalRevenue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Total consultant fees</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Turnaround</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.avgTurnaroundTime}h</div>
            <p className="text-xs text-muted-foreground">Average response time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed Today</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.completedToday}</div>
            <p className="text-xs text-muted-foreground">Studies processed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Reports</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.pendingReports}</div>
            <p className="text-xs text-muted-foreground">Awaiting analysis</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Urgent Cases</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.urgentCases}</div>
            <p className="text-xs text-muted-foreground">High priority</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="reports">Recent Reports</TabsTrigger>
          <TabsTrigger value="consultants">Consultants</TabsTrigger>
          <TabsTrigger value="financial">Financial</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Workflow className="w-5 h-5" />
                  Workflow Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span>Studies Completed</span>
                    <Badge variant="default">100%</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Reports Received</span>
                    <Badge variant="default">100%</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Payments Processed</span>
                    <Badge variant="default">80%</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>SLA Compliance</span>
                    <Badge variant="default">100%</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Active Consultants
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium">Advanced Imaging Solutions</p>
                      <p className="text-sm text-muted-foreground">Radiology Services</p>
                    </div>
                    <Badge variant="default">5 Reports</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium">Heart & Vascular Specialists</p>
                      <p className="text-sm text-muted-foreground">Cardiology Services</p>
                    </div>
                    <Badge variant="default">5 Reports</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="reports" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Consultant Reports</CardTitle>
              <p className="text-sm text-muted-foreground">
                Latest imaging and cardiology interpretations from off-site consultants
              </p>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Report ID</TableHead>
                    <TableHead>Patient</TableHead>
                    <TableHead>Study Type</TableHead>
                    <TableHead>Consultant</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Turnaround</TableHead>
                    <TableHead>Fee</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {consultantReports.map((report) => (
                    <TableRow key={report.id}>
                      <TableCell className="font-medium">{report.reportNumber}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{report.patientName}</p>
                          <p className="text-sm text-muted-foreground">{report.patientId}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getStudyIcon(report.studyType)}
                          {report.studyType}
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[200px]">
                        <p className="truncate">{report.consultantName}</p>
                      </TableCell>
                      <TableCell>{getPriorityBadge(report.priority)}</TableCell>
                      <TableCell>{report.turnaroundTimeHours}h</TableCell>
                      <TableCell>₦{report.serviceFee.toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge variant={report.paymentStatus === 'paid' ? 'default' : 'secondary'}>
                          {report.paymentStatus}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm">
                          <Eye className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="consultants" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Scan className="w-5 h-5" />
                  Advanced Imaging Solutions Ltd
                </CardTitle>
                <p className="text-sm text-muted-foreground">Diagnostic Radiology Services</p>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium">Specialization</p>
                      <p className="text-sm text-muted-foreground">CT, MRI, X-ray, Ultrasound</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Payment Terms</p>
                      <p className="text-sm text-muted-foreground">Weekly billing</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Reports Completed</p>
                      <p className="text-sm text-muted-foreground">5 studies</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Total Revenue</p>
                      <p className="text-sm text-muted-foreground">₦16,620</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Average Turnaround Time</p>
                    <p className="text-sm text-muted-foreground">8.0 hours</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Heart className="w-5 h-5" />
                  Heart & Vascular Specialists
                </CardTitle>
                <p className="text-sm text-muted-foreground">Cardiology Services</p>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium">Specialization</p>
                      <p className="text-sm text-muted-foreground">ECG, Echo, Stress Testing</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Payment Terms</p>
                      <p className="text-sm text-muted-foreground">Per report billing</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Reports Completed</p>
                      <p className="text-sm text-muted-foreground">5 studies</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Total Revenue</p>
                      <p className="text-sm text-muted-foreground">₦26,473</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Average Turnaround Time</p>
                    <p className="text-sm text-muted-foreground">1.6 hours</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="financial" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5" />
                  Revenue Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium">Total Service Fees</p>
                    <p className="text-2xl font-bold">₦43,093</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">VAT (15%)</p>
                    <p className="text-lg">₦6,464</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Total Invoice Value</p>
                    <p className="text-lg">₦49,557</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Payment Processing
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium">Payments Made</p>
                    <p className="text-2xl font-bold">₦47,079</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Withholding Tax (5%)</p>
                    <p className="text-lg">₦2,478</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Net to Consultants</p>
                    <p className="text-lg">₦44,601</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Outstanding
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium">Pending Invoices</p>
                    <p className="text-2xl font-bold">₦13,800</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Due Date</p>
                    <p className="text-lg">July 7, 2025</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Status</p>
                    <Badge variant="secondary">Pending Payment</Badge>
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