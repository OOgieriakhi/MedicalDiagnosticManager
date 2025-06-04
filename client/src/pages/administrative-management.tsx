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
  Users,
  Building,
  Calendar,
  Clock,
  CheckCircle,
  AlertTriangle,
  FileText,
  UserCheck,
  Award,
  TrendingUp,
  Briefcase,
  Target,
  Activity,
  Shield,
  Eye,
  Download,
  Plus,
  Settings,
  BarChart3,
  PieChart
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Link } from "wouter";

export default function AdministrativeManagement() {
  const { user } = useAuth();
  const [dateRange, setDateRange] = useState("today");
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedDepartment, setSelectedDepartment] = useState("all");

  // Administrative metrics query
  const { data: adminMetrics, isLoading: metricsLoading } = useQuery({
    queryKey: ["/api/admin/metrics", user?.branchId, startDate, endDate],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (user?.branchId) params.append('branchId', user.branchId.toString());
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      
      const response = await fetch(`/api/admin/metrics?${params}`);
      if (!response.ok) throw new Error("Failed to fetch admin metrics");
      return response.json();
    },
    enabled: !!user?.branchId,
    staleTime: 0,
  });

  // Staff performance query
  const { data: staffPerformance } = useQuery({
    queryKey: ["/api/admin/staff-performance", user?.branchId, selectedDepartment, startDate, endDate],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (user?.branchId) params.append('branchId', user.branchId.toString());
      if (selectedDepartment !== "all") params.append('department', selectedDepartment);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      
      const response = await fetch(`/api/admin/staff-performance?${params}`);
      if (!response.ok) throw new Error("Failed to fetch staff performance");
      return response.json();
    },
    enabled: !!user?.branchId,
    staleTime: 0,
  });

  // Operational reports query
  const { data: operationalReports } = useQuery({
    queryKey: ["/api/admin/operational-reports", user?.branchId, startDate, endDate],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (user?.branchId) params.append('branchId', user.branchId.toString());
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      
      const response = await fetch(`/api/admin/operational-reports?${params}`);
      if (!response.ok) throw new Error("Failed to fetch operational reports");
      return response.json();
    },
    enabled: !!user?.branchId,
    staleTime: 0,
  });

  // System alerts query
  const { data: systemAlerts } = useQuery({
    queryKey: ["/api/system-alerts", user?.tenantId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (user?.tenantId) params.append('tenantId', user.tenantId.toString());
      params.append('limit', '20');
      
      const response = await fetch(`/api/system-alerts?${params}`);
      if (!response.ok) throw new Error("Failed to fetch system alerts");
      return response.json();
    },
    enabled: !!user?.tenantId,
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

  const getAlertSeverityColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'high': return 'text-red-600';
      case 'medium': return 'text-yellow-600';
      case 'low': return 'text-blue-600';
      default: return 'text-gray-600';
    }
  };

  const getAlertSeverityBadge = (severity: string) => {
    const variants: Record<string, string> = {
      'high': 'bg-red-100 text-red-800',
      'medium': 'bg-yellow-100 text-yellow-800',
      'low': 'bg-blue-100 text-blue-800'
    };
    
    return variants[severity.toLowerCase()] || 'bg-gray-100 text-gray-800';
  };

  const getDepartmentIcon = (department: string) => {
    switch (department.toLowerCase()) {
      case 'laboratory': return <Activity className="w-4 h-4" />;
      case 'radiology': return <Eye className="w-4 h-4" />;
      case 'pharmacy': return <Shield className="w-4 h-4" />;
      case 'administration': return <Building className="w-4 h-4" />;
      case 'finance': return <BarChart3 className="w-4 h-4" />;
      default: return <Users className="w-4 h-4" />;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN'
    }).format(amount);
  };

  const getPerformanceColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 75) return 'text-blue-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Administrative Management</h1>
          <p className="text-gray-600">Operations oversight, staff management, and system administration</p>
        </div>
        <div className="flex items-center space-x-4">
          <Button variant="outline" className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            System Settings
          </Button>
          <Button variant="outline" className="flex items-center gap-2">
            <Download className="w-4 h-4" />
            Export Reports
          </Button>
          <Button className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            New Task
          </Button>
        </div>
      </div>

      {/* Date Range Filter */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Reporting Period
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
              <Label>Department:</Label>
              <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  <SelectItem value="laboratory">Laboratory</SelectItem>
                  <SelectItem value="radiology">Radiology</SelectItem>
                  <SelectItem value="pharmacy">Pharmacy</SelectItem>
                  <SelectItem value="administration">Administration</SelectItem>
                  <SelectItem value="finance">Finance</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Administrative Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Staff</p>
                <p className="text-2xl font-bold text-blue-600">
                  {metricsLoading ? "..." : (adminMetrics?.activeStaff || 0)}
                </p>
                <p className="text-xs text-blue-600">
                  {adminMetrics?.attendanceRate || 0}% attendance
                </p>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">System Alerts</p>
                <p className="text-2xl font-bold text-red-600">
                  {adminMetrics?.systemAlerts || 0}
                </p>
                <p className="text-xs text-red-600">
                  {adminMetrics?.criticalAlerts || 0} critical
                </p>
              </div>
              <div className="p-3 bg-red-100 rounded-lg">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Overall Performance</p>
                <p className="text-2xl font-bold text-green-600">
                  {adminMetrics?.overallPerformance || 0}%
                </p>
                <p className="text-xs text-green-600">
                  +{adminMetrics?.performanceChange || 0}% vs last period
                </p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Tasks Completed</p>
                <p className="text-2xl font-bold text-purple-600">
                  {adminMetrics?.tasksCompleted || 0}
                </p>
                <p className="text-xs text-purple-600">
                  {adminMetrics?.taskCompletionRate || 0}% completion rate
                </p>
              </div>
              <div className="p-3 bg-purple-100 rounded-lg">
                <CheckCircle className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">System Overview</TabsTrigger>
          <TabsTrigger value="staff">Staff Management</TabsTrigger>
          <TabsTrigger value="operations">Operations</TabsTrigger>
          <TabsTrigger value="alerts">System Alerts</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Department Performance */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building className="w-5 h-5" />
                  Department Performance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {operationalReports?.departmentPerformance?.map((dept: any) => (
                    <div key={dept.department} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-gray-100 rounded-lg">
                          {getDepartmentIcon(dept.department)}
                        </div>
                        <div>
                          <p className="font-medium">{dept.department}</p>
                          <p className="text-sm text-gray-600">{dept.staffCount} staff members</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`text-lg font-bold ${getPerformanceColor(dept.performanceScore)}`}>
                          {dept.performanceScore}%
                        </p>
                        <p className="text-sm text-gray-500">{dept.efficiency}% efficiency</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Key Metrics Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  Key Performance Indicators
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Patient Satisfaction</span>
                    <span className="font-bold text-green-600">{operationalReports?.kpis?.patientSatisfaction || 0}%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Service Quality</span>
                    <span className="font-bold text-blue-600">{operationalReports?.kpis?.serviceQuality || 0}%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Operational Efficiency</span>
                    <span className="font-bold text-purple-600">{operationalReports?.kpis?.operationalEfficiency || 0}%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Cost Management</span>
                    <span className="font-bold text-orange-600">{operationalReports?.kpis?.costManagement || 0}%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Compliance Rate</span>
                    <span className="font-bold text-teal-600">{operationalReports?.kpis?.complianceRate || 0}%</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Service Unit Integration Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5" />
                Service Unit Integration Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Link href="/laboratory-management">
                  <div className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <Activity className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium">Laboratory</p>
                        <p className="text-sm text-green-600">Operational</p>
                      </div>
                    </div>
                  </div>
                </Link>

                <Link href="/radiology-management">
                  <div className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-purple-100 rounded-lg">
                        <Eye className="w-5 h-5 text-purple-600" />
                      </div>
                      <div>
                        <p className="font-medium">Radiology</p>
                        <p className="text-sm text-green-600">Operational</p>
                      </div>
                    </div>
                  </div>
                </Link>

                <Link href="/pharmacy-management">
                  <div className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-green-100 rounded-lg">
                        <Shield className="w-5 h-5 text-green-600" />
                      </div>
                      <div>
                        <p className="font-medium">Pharmacy</p>
                        <p className="text-sm text-green-600">Operational</p>
                      </div>
                    </div>
                  </div>
                </Link>

                <Link href="/financial-management">
                  <div className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-orange-100 rounded-lg">
                        <BarChart3 className="w-5 h-5 text-orange-600" />
                      </div>
                      <div>
                        <p className="font-medium">Finance</p>
                        <p className="text-sm text-green-600">Operational</p>
                      </div>
                    </div>
                  </div>
                </Link>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="staff" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserCheck className="w-5 h-5" />
                Staff Performance Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {staffPerformance?.map((staff: any) => (
                  <div key={staff.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-gray-100 rounded-lg">
                        <Users className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="font-medium">{staff.name}</p>
                        <p className="text-sm text-gray-600">{staff.position} • {staff.department}</p>
                        <p className="text-xs text-gray-500">
                          Employee ID: {staff.employeeId}
                        </p>
                      </div>
                    </div>
                    <div className="text-right flex items-center gap-4">
                      <div>
                        <p className="text-sm text-gray-600">Performance</p>
                        <p className={`font-bold ${getPerformanceColor(staff.performanceScore)}`}>
                          {staff.performanceScore}%
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Attendance</p>
                        <p className="font-medium">{staff.attendanceRate}%</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Tasks</p>
                        <p className="font-medium">{staff.tasksCompleted}/{staff.tasksAssigned}</p>
                      </div>
                      {staff.achievements && staff.achievements.length > 0 && (
                        <div className="p-1 bg-yellow-100 rounded" title="Has achievements">
                          <Award className="w-4 h-4 text-yellow-600" />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="operations" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Daily Operations Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span>Total Patients Served</span>
                    <span className="font-bold">{operationalReports?.dailyOperations?.patientsServed || 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Tests Completed</span>
                    <span className="font-bold">{operationalReports?.dailyOperations?.testsCompleted || 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Average Wait Time</span>
                    <span className="font-bold">{operationalReports?.dailyOperations?.avgWaitTime || 0} mins</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Revenue Generated</span>
                    <span className="font-bold text-green-600">
                      {formatCurrency(operationalReports?.dailyOperations?.revenue || 0)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Quality Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span>Test Accuracy Rate</span>
                    <span className="font-bold text-green-600">{operationalReports?.qualityMetrics?.testAccuracy || 0}%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Report Turnaround</span>
                    <span className="font-bold">{operationalReports?.qualityMetrics?.reportTurnaround || 0} hrs</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Equipment Uptime</span>
                    <span className="font-bold text-blue-600">{operationalReports?.qualityMetrics?.equipmentUptime || 0}%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Error Rate</span>
                    <span className="font-bold text-red-600">{operationalReports?.qualityMetrics?.errorRate || 0}%</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="alerts" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                System Alerts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {systemAlerts?.map((alert: any) => (
                  <div key={alert.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className={`p-2 rounded-lg ${
                        alert.severity === 'high' ? 'bg-red-100' :
                        alert.severity === 'medium' ? 'bg-yellow-100' : 'bg-blue-100'
                      }`}>
                        <AlertTriangle className={`w-4 h-4 ${getAlertSeverityColor(alert.severity)}`} />
                      </div>
                      <div>
                        <p className="font-medium">{alert.title}</p>
                        <p className="text-sm text-gray-600">{alert.message}</p>
                        <p className="text-xs text-gray-500">
                          {new Date(alert.createdAt).toLocaleDateString()} at{' '}
                          {new Date(alert.createdAt).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                    <div className="text-right flex items-center gap-3">
                      <Badge className={getAlertSeverityBadge(alert.severity)}>
                        {alert.severity.toUpperCase()}
                      </Badge>
                      <div>
                        <p className="text-sm text-gray-600">{alert.source}</p>
                        <p className="text-xs text-gray-500">
                          {alert.acknowledged ? 'Acknowledged' : 'Pending'}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}