import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  BarChart3
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Link } from "wouter";

export default function RadiologyManagement() {
  const { user } = useAuth();
  const [dateRange, setDateRange] = useState("today");
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedModality, setSelectedModality] = useState("all");

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
    enabled: !!user?.branchId,
    staleTime: 0,
  });

  // Equipment status query
  const { data: equipmentStatus } = useQuery({
    queryKey: ["/api/radiology/equipment", user?.branchId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (user?.branchId) params.append('branchId', user.branchId.toString());
      
      const response = await fetch(`/api/radiology/equipment?${params}`);
      if (!response.ok) throw new Error("Failed to fetch equipment status");
      return response.json();
    },
    enabled: !!user?.branchId,
  });

  // Recent studies query
  const { data: recentStudies } = useQuery({
    queryKey: ["/api/radiology/studies", user?.branchId, selectedModality, startDate, endDate],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (user?.branchId) params.append('branchId', user.branchId.toString());
      if (selectedModality !== "all") params.append('modality', selectedModality);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      params.append('limit', '50');
      
      const response = await fetch(`/api/radiology/studies?${params}`);
      if (!response.ok) throw new Error("Failed to fetch studies");
      return response.json();
    },
    enabled: !!user?.branchId,
    staleTime: 0,
  });

  const handleDateRangeChange = (range: string) => {
    setDateRange(range);
    const today = new Date();
    
    switch (range) {
      case "today":
        setStartDate(today.toISOString().split('T')[0]);
        setEndDate(today.toISOString().split('T')[0]);
        break;
      case "yesterday":
        const yesterday = new Date(today);
        yesterday.setDate(today.getDate() - 1);
        setStartDate(yesterday.toISOString().split('T')[0]);
        setEndDate(yesterday.toISOString().split('T')[0]);
        break;
      case "week":
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - 7);
        setStartDate(weekStart.toISOString().split('T')[0]);
        setEndDate(today.toISOString().split('T')[0]);
        break;
      case "month":
        const monthStart = new Date(today);
        monthStart.setDate(1);
        setStartDate(monthStart.toISOString().split('T')[0]);
        setEndDate(today.toISOString().split('T')[0]);
        break;
    }
  };

  const getModalityIcon = (modality: string) => {
    switch (modality.toLowerCase()) {
      case 'xray': return <Image className="w-4 h-4" />;
      case 'ct': return <Scan className="w-4 h-4" />;
      case 'mri': return <Monitor className="w-4 h-4" />;
      case 'ultrasound': return <Activity className="w-4 h-4" />;
      case 'mammography': return <Heart className="w-4 h-4" />;
      default: return <Camera className="w-4 h-4" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      'pending': 'bg-yellow-100 text-yellow-800',
      'in-progress': 'bg-blue-100 text-blue-800',
      'completed': 'bg-green-100 text-green-800',
      'reported': 'bg-purple-100 text-purple-800',
      'cancelled': 'bg-red-100 text-red-800'
    };
    
    return variants[status.toLowerCase()] || 'bg-gray-100 text-gray-800';
  };

  const getEquipmentStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'operational': return 'text-green-600';
      case 'maintenance': return 'text-yellow-600';
      case 'offline': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/">
            <Button variant="outline" size="sm" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Dashboard
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Radiology Management</h1>
            <p className="text-gray-600">Medical imaging workflow and equipment management</p>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <Button variant="outline" className="flex items-center gap-2">
            <RefreshCw className="w-4 h-4" />
            Sync PACS
          </Button>
          <Button variant="outline" className="flex items-center gap-2">
            <Download className="w-4 h-4" />
            Export Report
          </Button>
          <Button className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Schedule Study
          </Button>
        </div>
      </div>

      {/* Date Range Filter */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Study Period
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Label>Quick Range:</Label>
              <Select value={dateRange} onValueChange={handleDateRangeChange}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="yesterday">Yesterday</SelectItem>
                  <SelectItem value="week">Last 7 Days</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                  <SelectItem value="custom">Custom Range</SelectItem>
                </SelectContent>
              </Select>
            </div>
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
            <div className="flex items-center gap-2">
              <Label>Modality:</Label>
              <Select value={selectedModality} onValueChange={setSelectedModality}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Modalities</SelectItem>
                  <SelectItem value="xray">X-Ray</SelectItem>
                  <SelectItem value="ct">CT Scan</SelectItem>
                  <SelectItem value="mri">MRI</SelectItem>
                  <SelectItem value="ultrasound">Ultrasound</SelectItem>
                  <SelectItem value="mammography">Mammography</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Radiology Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Studies</p>
                <p className="text-2xl font-bold text-blue-600">
                  {metricsLoading ? "..." : (radiologyMetrics?.totalStudies || 0)}
                </p>
                <p className="text-xs text-blue-600">
                  {radiologyMetrics?.completionRate || 0}% completion rate
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
                <p className="text-sm font-medium text-gray-600">Pending Studies</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {radiologyMetrics?.pendingStudies || 0}
                </p>
                <p className="text-xs text-yellow-600">
                  Avg wait: {radiologyMetrics?.averageWaitTime || 0} mins
                </p>
              </div>
              <div className="p-3 bg-yellow-100 rounded-lg">
                <Clock className="w-6 h-6 text-yellow-600" />
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
      <Tabs defaultValue="studies" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="studies">Recent Studies</TabsTrigger>
          <TabsTrigger value="equipment">Equipment Status</TabsTrigger>
          <TabsTrigger value="schedule">Study Schedule</TabsTrigger>
          <TabsTrigger value="reports">Quality Reports</TabsTrigger>
        </TabsList>

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
                        {getModalityIcon(study.modality)}
                      </div>
                      <div>
                        <p className="font-medium">{study.studyDescription}</p>
                        <p className="text-sm text-gray-600">{study.patientName} • {study.patientId}</p>
                        <p className="text-xs text-gray-500">
                          {new Date(study.studyDate).toLocaleDateString()} at{' '}
                          {new Date(study.studyDate).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                    <div className="text-right flex items-center gap-3">
                      <div>
                        <p className="text-sm font-medium">{study.modality}</p>
                        <p className="text-xs text-gray-500">Series: {study.seriesCount}</p>
                      </div>
                      <Badge className={getStatusBadge(study.status)}>
                        {study.status.toUpperCase()}
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {equipmentStatus?.map((equipment: any) => (
              <Card key={equipment.id}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {getModalityIcon(equipment.modality)}
                    {equipment.name}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Status:</span>
                      <span className={`font-medium ${getEquipmentStatusColor(equipment.status)}`}>
                        {equipment.status}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Today's Studies:</span>
                      <span className="font-medium">{equipment.todayStudies}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Utilization:</span>
                      <span className="font-medium">{equipment.utilization}%</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Last Maintenance:</span>
                      <span className="text-sm">{new Date(equipment.lastMaintenance).toLocaleDateString()}</span>
                    </div>
                    {equipment.status === 'maintenance' && (
                      <div className="mt-3 p-2 bg-yellow-50 rounded border border-yellow-200">
                        <p className="text-xs text-yellow-800">{equipment.maintenanceNote}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="schedule" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Today's Study Schedule
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {radiologyMetrics?.todaySchedule?.map((appointment: any, index: number) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded">
                    <div className="flex items-center gap-3">
                      <div className="text-center">
                        <p className="text-sm font-medium">{appointment.time}</p>
                        <p className="text-xs text-gray-500">{appointment.duration}min</p>
                      </div>
                      <div>
                        <p className="font-medium">{appointment.patientName}</p>
                        <p className="text-sm text-gray-600">{appointment.studyType}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="p-1 bg-gray-100 rounded">
                        {getModalityIcon(appointment.modality)}
                      </div>
                      <Badge variant="outline">{appointment.room}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Image Quality Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span>Acceptable Quality Rate</span>
                    <span className="font-bold text-green-600">{radiologyMetrics?.qualityMetrics?.acceptableRate || 0}%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Retake Rate</span>
                    <span className="font-bold text-red-600">{radiologyMetrics?.qualityMetrics?.retakeRate || 0}%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Artifact Rate</span>
                    <span className="font-bold text-yellow-600">{radiologyMetrics?.qualityMetrics?.artifactRate || 0}%</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Radiation Dose Monitoring</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span>Average Dose (mGy)</span>
                    <span className="font-bold">{radiologyMetrics?.doseMetrics?.averageDose || 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Dose Alerts</span>
                    <span className="font-bold text-orange-600">{radiologyMetrics?.doseMetrics?.alerts || 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Compliance Rate</span>
                    <span className="font-bold text-green-600">{radiologyMetrics?.doseMetrics?.complianceRate || 0}%</span>
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