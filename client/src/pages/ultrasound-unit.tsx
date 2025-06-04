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
  Monitor,
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
  FileImage,
  Eye,
  BarChart3
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Link } from "wouter";

export default function UltrasoundUnit() {
  const { user } = useAuth();
  const [dateRange, setDateRange] = useState("today");
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  // Ultrasound metrics query
  const { data: ultrasoundMetrics, isLoading: metricsLoading } = useQuery({
    queryKey: ['/api/ultrasound/metrics', dateRange, startDate, endDate],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (dateRange !== 'custom') {
        params.append('range', dateRange);
      } else {
        params.append('startDate', startDate);
        params.append('endDate', endDate);
      }
      
      const response = await fetch(`/api/ultrasound/metrics?${params}`, {
        headers: { 'Cache-Control': 'no-cache' }
      });
      if (!response.ok) throw new Error('Failed to fetch ultrasound metrics');
      return response.json();
    }
  });

  // Ultrasound studies query
  const { data: ultrasoundStudies, isLoading: studiesLoading } = useQuery({
    queryKey: ['/api/ultrasound/studies', selectedCategory, searchTerm],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedCategory !== 'all') params.append('category', selectedCategory);
      if (searchTerm) params.append('search', searchTerm);
      
      const response = await fetch(`/api/ultrasound/studies?${params}`, {
        headers: { 'Cache-Control': 'no-cache' }
      });
      if (!response.ok) throw new Error('Failed to fetch ultrasound studies');
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
            <h1 className="text-3xl font-bold text-gray-900">Ultrasound Unit</h1>
            <p className="text-gray-600">Ultrasound imaging services, studies, and equipment management</p>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <Button variant="outline" className="flex items-center gap-2">
            <RefreshCw className="w-4 h-4" />
            Sync Equipment
          </Button>
          <Button className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Schedule Study
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
            <CardTitle className="text-sm font-medium">Total Studies</CardTitle>
            <Monitor className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metricsLoading ? '...' : ultrasoundMetrics?.totalStudies || '0'}
            </div>
            <p className="text-xs text-muted-foreground">
              +12% from last period
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed Studies</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {metricsLoading ? '...' : ultrasoundMetrics?.completedStudies || '0'}
            </div>
            <p className="text-xs text-muted-foreground">
              98% completion rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Studies</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {metricsLoading ? '...' : ultrasoundMetrics?.pendingStudies || '0'}
            </div>
            <p className="text-xs text-muted-foreground">
              Avg wait: 15 mins
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Equipment Status</CardTitle>
            <Activity className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {metricsLoading ? '...' : ultrasoundMetrics?.activeEquipment || '0'}
            </div>
            <p className="text-xs text-muted-foreground">
              5/6 units active
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="studies" className="space-y-6">
        <TabsList>
          <TabsTrigger value="studies">Current Studies</TabsTrigger>
          <TabsTrigger value="equipment">Equipment</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
          <TabsTrigger value="protocols">Protocols</TabsTrigger>
        </TabsList>

        <TabsContent value="studies" className="space-y-6">
          {/* Search and Filter */}
          <Card>
            <CardContent className="p-4">
              <form onSubmit={handleSearch} className="flex items-center gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      placeholder="Search by patient name, study ID, or type..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Study Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Studies</SelectItem>
                    <SelectItem value="abdominal">Abdominal</SelectItem>
                    <SelectItem value="pelvic">Pelvic</SelectItem>
                    <SelectItem value="obstetric">Obstetric</SelectItem>
                    <SelectItem value="vascular">Vascular</SelectItem>
                    <SelectItem value="cardiac">Cardiac</SelectItem>
                  </SelectContent>
                </Select>
                <Button type="submit" variant="outline" size="sm">
                  <Filter className="w-4 h-4" />
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Studies List */}
          <Card>
            <CardHeader>
              <CardTitle>Ultrasound Studies</CardTitle>
            </CardHeader>
            <CardContent>
              {studiesLoading ? (
                <div className="text-center py-8">Loading studies...</div>
              ) : (
                <div className="space-y-4">
                  {ultrasoundStudies?.map((study: any) => (
                    <div key={study.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-4">
                        <FileImage className="w-8 h-8 text-blue-600" />
                        <div>
                          <h3 className="font-medium">{study.patientName}</h3>
                          <p className="text-sm text-gray-600">{study.studyType} - {study.studyDate}</p>
                          <p className="text-xs text-gray-500">ID: {study.studyId}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <Badge variant={
                          study.status === 'completed' ? 'default' :
                          study.status === 'in-progress' ? 'secondary' :
                          'outline'
                        }>
                          {study.status}
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
                      No ultrasound studies found
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="equipment" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Ultrasound Equipment Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { id: 'US-001', name: 'GE Voluson E10', status: 'active', room: 'Room 1' },
                  { id: 'US-002', name: 'Philips EPIQ Elite', status: 'active', room: 'Room 2' },
                  { id: 'US-003', name: 'Siemens Acuson', status: 'maintenance', room: 'Room 3' },
                  { id: 'US-004', name: 'Samsung RS85', status: 'active', room: 'Room 4' },
                  { id: 'US-005', name: 'Canon Aplio i800', status: 'active', room: 'Room 5' },
                  { id: 'US-006', name: 'Mindray DC-70', status: 'offline', room: 'Room 6' }
                ].map((equipment) => (
                  <div key={equipment.id} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-medium">{equipment.name}</h3>
                      <Badge variant={
                        equipment.status === 'active' ? 'default' :
                        equipment.status === 'maintenance' ? 'secondary' :
                        'destructive'
                      }>
                        {equipment.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600">{equipment.room}</p>
                    <p className="text-xs text-gray-500">ID: {equipment.id}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Ultrasound Reports</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-gray-500">
                Report generation and management coming soon
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="protocols" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Imaging Protocols</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-gray-500">
                Protocol management coming soon
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}