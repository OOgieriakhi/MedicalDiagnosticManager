import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Calendar, FileText, Activity, Clock, CheckCircle, AlertTriangle } from "lucide-react";
import DashboardMessaging from "@/components/dashboard-messaging";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface UltrasoundStudy {
  id: string;
  patientName: string;
  patientId: string;
  studyType: string;
  scheduledTime: string;
  status: string;
  technician: string;
  priority: string;
  bodyPart: string;
}

export default function UltrasoundDashboard() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  // Fetch ultrasound studies
  const { data: studies = [], isLoading } = useQuery<UltrasoundStudy[]>({
    queryKey: ["/api/ultrasound/studies", selectedDate],
    queryFn: async () => {
      const response = await fetch(`/api/ultrasound/studies?date=${selectedDate}`);
      return response.json();
    },
  });

  // Fetch dashboard metrics
  const { data: metrics } = useQuery({
    queryKey: ["/api/ultrasound/metrics"],
    queryFn: async () => {
      const response = await fetch("/api/ultrasound/metrics");
      return response.json();
    },
  });

  const filteredStudies = studies.filter(study =>
    study.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    study.patientId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    study.studyType.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "default";
      case "in-progress": return "secondary";
      case "scheduled": return "outline";
      case "urgent": return "destructive";
      default: return "outline";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent": return "destructive";
      case "high": return "secondary";
      case "normal": return "outline";
      default: return "outline";
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Ultrasound Department</h1>
          <p className="text-muted-foreground">
            Diagnostic imaging and ultrasound studies management
          </p>
        </div>
        <Button>
          <Calendar className="h-4 w-4 mr-2" />
          Schedule Study
        </Button>
      </div>

      {/* Messages Section */}
      <div className="mb-6">
        <DashboardMessaging maxMessages={3} showCompactView={true} className="bg-white" />
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Studies</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.todayStudies || 0}</div>
            <p className="text-xs text-muted-foreground">
              Scheduled for today
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {metrics?.completedStudies || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Studies completed today
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <Clock className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {metrics?.inProgressStudies || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Currently being performed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Urgent Cases</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {metrics?.urgentStudies || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Requiring immediate attention
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="schedule" className="space-y-6">
        <TabsList>
          <TabsTrigger value="schedule">Study Schedule</TabsTrigger>
          <TabsTrigger value="equipment">Equipment Status</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="schedule" className="space-y-6">
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search studies..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-48"
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Ultrasound Studies</CardTitle>
              <CardDescription>
                Manage and track ultrasound examinations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>Patient</TableHead>
                    <TableHead>Study Type</TableHead>
                    <TableHead>Body Part</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Technician</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStudies.map((study) => (
                    <TableRow key={study.id}>
                      <TableCell className="font-mono">
                        {new Date(study.scheduledTime).toLocaleTimeString([], { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{study.patientName}</p>
                          <p className="text-sm text-muted-foreground">{study.patientId}</p>
                        </div>
                      </TableCell>
                      <TableCell>{study.studyType}</TableCell>
                      <TableCell>{study.bodyPart}</TableCell>
                      <TableCell>
                        <Badge variant={getPriorityColor(study.priority) as "default" | "destructive" | "outline" | "secondary"}>
                          {study.priority}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusColor(study.status) as "default" | "destructive" | "outline" | "secondary"}>
                          {study.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{study.technician}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button size="sm" variant="outline">
                            <FileText className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="outline">
                            Start Study
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

        <TabsContent value="equipment" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Equipment Status</CardTitle>
              <CardDescription>
                Monitor ultrasound equipment status and maintenance
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h3 className="font-medium">Ultrasound Machine #1</h3>
                    <p className="text-sm text-muted-foreground">Phillips HD15</p>
                  </div>
                  <Badge variant="default">Operational</Badge>
                </div>
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h3 className="font-medium">Ultrasound Machine #2</h3>
                    <p className="text-sm text-muted-foreground">GE Logiq E10</p>
                  </div>
                  <Badge variant="secondary">Maintenance Due</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Study Reports</CardTitle>
              <CardDescription>
                Generate and manage ultrasound study reports
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Report management system coming soon</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}