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
  Heart,
  Activity,
  Clock,
  CheckCircle,
  AlertTriangle,
  Users,
  Calendar,
  Search,
  Filter,
  RefreshCw,
  Download,
  FileText,
  Eye,
  BarChart3,
  Zap,
  Monitor
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Link } from "wouter";

export default function CardiologyUnit() {
  const { user } = useAuth();
  const [dateRange, setDateRange] = useState("today");
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  // Cardiology metrics query
  const { data: cardiologyMetrics, isLoading: metricsLoading } = useQuery({
    queryKey: ['/api/cardiology/metrics', dateRange, startDate, endDate],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (dateRange !== 'custom') {
        params.append('range', dateRange);
      } else {
        params.append('startDate', startDate);
        params.append('endDate', endDate);
      }
      
      const response = await fetch(`/api/cardiology/metrics?${params}`, {
        headers: { 'Cache-Control': 'no-cache' }
      });
      if (!response.ok) throw new Error('Failed to fetch cardiology metrics');
      return response.json();
    }
  });

  // Cardiology procedures query
  const { data: cardiologyProcedures, isLoading: proceduresLoading } = useQuery({
    queryKey: ['/api/cardiology/procedures', selectedCategory, searchTerm],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedCategory !== 'all') params.append('category', selectedCategory);
      if (searchTerm) params.append('search', searchTerm);
      
      const response = await fetch(`/api/cardiology/procedures?${params}`, {
        headers: { 'Cache-Control': 'no-cache' }
      });
      if (!response.ok) throw new Error('Failed to fetch cardiology procedures');
      return response.json();
    }
  });

  const handleDateRangeChange = (value: string) => {
    setDateRange(value);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // Search functionality will be triggered by the query dependency
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
            <h1 className="text-3xl font-bold text-gray-900">Cardiology Unit</h1>
            <p className="text-gray-600">ECG, Echocardiography, and cardiac diagnostic services</p>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <Button variant="outline" className="flex items-center gap-2">
            <RefreshCw className="w-4 h-4" />
            Sync Equipment
          </Button>
          <Button className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Schedule Procedure
          </Button>
        </div>
      </div>

      {/* Date Range Filter */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Label>Date Range:</Label>
              <Select value={dateRange} onValueChange={handleDateRangeChange}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">This Week</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {dateRange === 'custom' && (
              <div className="flex items-center gap-2">
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-40"
                />
                <span>to</span>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-40"
                />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Procedures</CardTitle>
            <Heart className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metricsLoading ? '...' : cardiologyMetrics?.totalProcedures || '0'}
            </div>
            <p className="text-xs text-muted-foreground">
              +8% from last period
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">ECG Studies</CardTitle>
            <Zap className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {metricsLoading ? '...' : cardiologyMetrics?.ecgStudies || '0'}
            </div>
            <p className="text-xs text-muted-foreground">
              Normal: 85%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Echocardiograms</CardTitle>
            <Monitor className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {metricsLoading ? '...' : cardiologyMetrics?.echoStudies || '0'}
            </div>
            <p className="text-xs text-muted-foreground">
              Avg duration: 45 mins
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Reports</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {metricsLoading ? '...' : cardiologyMetrics?.pendingReports || '0'}
            </div>
            <p className="text-xs text-muted-foreground">
              Avg TAT: 2 hours
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="procedures" className="space-y-6">
        <TabsList>
          <TabsTrigger value="procedures">Current Procedures</TabsTrigger>
          <TabsTrigger value="ecg">ECG Center</TabsTrigger>
          <TabsTrigger value="echo">Echo Lab</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="procedures" className="space-y-6">
          {/* Search and Filter */}
          <Card>
            <CardContent className="p-4">
              <form onSubmit={handleSearch} className="flex items-center gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      placeholder="Search by patient name, procedure ID, or type..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Procedure Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Procedures</SelectItem>
                    <SelectItem value="ecg">ECG</SelectItem>
                    <SelectItem value="echo">Echocardiogram</SelectItem>
                    <SelectItem value="stress-test">Stress Test</SelectItem>
                    <SelectItem value="holter">Holter Monitor</SelectItem>
                  </SelectContent>
                </Select>
                <Button type="submit" variant="outline" size="sm">
                  <Filter className="w-4 h-4" />
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Procedures List */}
          <Card>
            <CardHeader>
              <CardTitle>Cardiology Procedures</CardTitle>
            </CardHeader>
            <CardContent>
              {proceduresLoading ? (
                <div className="text-center py-8">Loading procedures...</div>
              ) : (
                <div className="space-y-4">
                  {cardiologyProcedures?.map((procedure: any) => (
                    <div key={procedure.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-4">
                        <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
                          <Heart className="w-4 h-4 text-red-600" />
                        </div>
                        <div>
                          <h3 className="font-medium">{procedure.patientName}</h3>
                          <p className="text-sm text-gray-600">{procedure.procedureType} - {procedure.scheduledTime}</p>
                          <p className="text-xs text-gray-500">ID: {procedure.procedureId}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <Badge variant={
                          procedure.status === 'completed' ? 'default' :
                          procedure.status === 'in-progress' ? 'secondary' :
                          'outline'
                        }>
                          {procedure.status}
                        </Badge>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm">
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button variant="outline" size="sm">
                            <Download className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  )) || (
                    <div className="text-center py-8 text-gray-500">
                      No cardiology procedures found
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ecg" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>ECG Center</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <Zap className="w-5 h-5 text-blue-600" />
                      <div>
                        <p className="text-sm font-medium">ECGs Today</p>
                        <p className="text-2xl font-bold">24</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      <div>
                        <p className="text-sm font-medium">Completed</p>
                        <p className="text-2xl font-bold">20</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 text-yellow-600" />
                      <div>
                        <p className="text-sm font-medium">Abnormal</p>
                        <p className="text-2xl font-bold">3</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
              
              <div className="space-y-4">
                <h3 className="font-medium">Recent ECG Studies</h3>
                {[
                  { id: 'ECG-001', patient: 'John Doe', time: '10:30 AM', result: 'Normal' },
                  { id: 'ECG-002', patient: 'Jane Smith', time: '11:15 AM', result: 'Abnormal' },
                  { id: 'ECG-003', patient: 'Bob Johnson', time: '12:00 PM', result: 'Normal' }
                ].map((ecg) => (
                  <div key={ecg.id} className="flex items-center justify-between p-3 border rounded">
                    <div>
                      <p className="font-medium">{ecg.patient}</p>
                      <p className="text-sm text-gray-600">{ecg.time} - {ecg.id}</p>
                    </div>
                    <Badge variant={ecg.result === 'Normal' ? 'default' : 'destructive'}>
                      {ecg.result}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="echo" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Echocardiography Lab</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <Monitor className="w-5 h-5 text-purple-600" />
                      <div>
                        <p className="text-sm font-medium">Echos Today</p>
                        <p className="text-2xl font-bold">8</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      <div>
                        <p className="text-sm font-medium">Completed</p>
                        <p className="text-2xl font-bold">6</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <Clock className="w-5 h-5 text-yellow-600" />
                      <div>
                        <p className="text-sm font-medium">In Progress</p>
                        <p className="text-2xl font-bold">2</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
              
              <div className="space-y-4">
                <h3 className="font-medium">Scheduled Echocardiograms</h3>
                {[
                  { id: 'ECHO-001', patient: 'Mary Wilson', time: '2:00 PM', type: '2D Echo' },
                  { id: 'ECHO-002', patient: 'David Lee', time: '3:00 PM', type: 'Stress Echo' },
                  { id: 'ECHO-003', patient: 'Sarah Brown', time: '4:00 PM', type: '2D Echo' }
                ].map((echo) => (
                  <div key={echo.id} className="flex items-center justify-between p-3 border rounded">
                    <div>
                      <p className="font-medium">{echo.patient}</p>
                      <p className="text-sm text-gray-600">{echo.time} - {echo.type}</p>
                    </div>
                    <Badge variant="outline">{echo.id}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Cardiology Reports</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-gray-500">
                Report management and interpretation coming soon
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}