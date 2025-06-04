import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Clock, User, FileText, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { format } from "date-fns";

interface UltrasoundStudy {
  id: string;
  testId: number;
  testName: string;
  patientId: number;
  patientName: string;
  price: number;
  status: string;
  scheduledAt: string;
  categoryName: string;
  paymentMethod: string;
}

interface UltrasoundMetrics {
  totalStudies: number;
  completionRate: number;
  avgProcessingTime: number;
  pendingReports: number;
}

export default function UltrasoundDashboard() {
  const [dateRange, setDateRange] = useState<Date | undefined>(new Date());

  const { data: ultrasoundStudies = [], isLoading: studiesLoading } = useQuery<UltrasoundStudy[]>({
    queryKey: ["/api/ultrasound/studies"],
  });

  const { data: metrics = { totalStudies: 0, completionRate: 0, avgProcessingTime: 0, pendingReports: 0 }, isLoading: metricsLoading } = useQuery<UltrasoundMetrics>({
    queryKey: ["/api/ultrasound/metrics"],
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'scheduled': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle2 className="h-4 w-4" />;
      case 'in_progress': return <Clock className="h-4 w-4" />;
      case 'scheduled': return <AlertCircle className="h-4 w-4" />;
      default: return <XCircle className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Ultrasound Services</h1>
          <p className="text-muted-foreground">
            Comprehensive ultrasound workflow management
          </p>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Studies</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{metrics.totalStudies}</div>
            <p className="text-xs text-muted-foreground">
              {metrics.completionRate}% completion rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Studies</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{ultrasoundStudies.filter(s => s.status === 'scheduled').length}</div>
            <p className="text-xs text-muted-foreground">
              Avg wait: {metrics.avgProcessingTime} mins
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Equipment Active</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">3/3</div>
            <p className="text-xs text-muted-foreground">
              85% utilization
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Quality Score</CardTitle>
            <Badge className="bg-purple-100 text-purple-800">
              98%
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">Excellent</div>
            <p className="text-xs text-muted-foreground">
              1% retake rate
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="workflow" className="space-y-4">
        <TabsList>
          <TabsTrigger value="workflow">Ultrasound Workflow</TabsTrigger>
          <TabsTrigger value="equipment">Equipment Status</TabsTrigger>
          <TabsTrigger value="schedule">Study Schedule</TabsTrigger>
          <TabsTrigger value="reports">Quality Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="workflow" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Ultrasound Studies Workflow
              </CardTitle>
              <CardDescription>
                Manage paid ultrasound requests from scheduling to report delivery
              </CardDescription>
            </CardHeader>
            <CardContent>
              {studiesLoading ? (
                <div className="flex items-center justify-center p-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : ultrasoundStudies.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No ultrasound studies</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Paid ultrasound requests will appear here for processing.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {ultrasoundStudies.map((study) => (
                    <div key={study.id} className="border rounded-lg p-4 hover:bg-gray-50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="flex-shrink-0">
                            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                              {getStatusIcon(study.status)}
                            </div>
                          </div>
                          <div>
                            <h3 className="text-sm font-medium text-gray-900">
                              {study.testName}
                            </h3>
                            <p className="text-sm text-gray-500">
                              Patient: {study.patientName} • ₦{study.price.toLocaleString()}
                            </p>
                            <p className="text-xs text-gray-400">
                              Scheduled: {format(new Date(study.scheduledAt), 'PPp')}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge className={getStatusColor(study.status)}>
                            {study.status.replace('_', ' ')}
                          </Badge>
                          <Button size="sm" variant="outline">
                            {study.status === 'scheduled' ? 'Start Study' : 'View Details'}
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="equipment" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Ultrasound Equipment Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { id: 1, name: 'Ultrasound Unit 1', status: 'active', utilization: 85, location: 'Room A' },
                  { id: 2, name: 'Ultrasound Unit 2', status: 'active', utilization: 72, location: 'Room B' },
                  { id: 3, name: 'Doppler Ultrasound', status: 'active', utilization: 90, location: 'Room C' },
                ].map((equipment) => (
                  <div key={equipment.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium">{equipment.name}</h3>
                        <p className="text-sm text-gray-500">{equipment.location}</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge className="bg-green-100 text-green-800">
                          {equipment.status}
                        </Badge>
                        <span className="text-sm text-gray-500">
                          {equipment.utilization}% utilization
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="schedule" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Ultrasound Schedule</CardTitle>
              <CardDescription>
                View and manage ultrasound study appointments
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <Calendar
                    mode="single"
                    selected={dateRange}
                    onSelect={setDateRange}
                    className="rounded-md border"
                  />
                </div>
                <div className="space-y-4">
                  <h3 className="font-medium">Today's Schedule</h3>
                  {ultrasoundStudies.filter(s => s.status === 'scheduled').map((study) => (
                    <div key={study.id} className="border rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-sm">{study.testName}</p>
                          <p className="text-xs text-gray-500">{study.patientName}</p>
                        </div>
                        <p className="text-xs text-gray-500">
                          {format(new Date(study.scheduledAt), 'HH:mm')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Quality Reports</CardTitle>
              <CardDescription>
                Ultrasound service quality metrics and reports
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Study Quality</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Excellent</span>
                        <span>85%</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Good</span>
                        <span>13%</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Retake Required</span>
                        <span>2%</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Patient Satisfaction</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-green-600">4.8/5</div>
                      <p className="text-sm text-gray-500">Average rating</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}