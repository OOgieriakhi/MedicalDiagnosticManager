import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  User,
  Clock,
  CheckCircle,
  AlertCircle,
  FileText,
  Activity,
  Calendar,
  Search,
  Filter,
  MapPin,
  ArrowRight,
  Play,
  Pause,
  RotateCcw,
  Download,
  Eye,
  Stethoscope,
  TestTube,
  CreditCard,
  Receipt
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Link } from "wouter";
import { format } from "date-fns";

interface JourneyStep {
  id: string;
  name: string;
  status: 'completed' | 'current' | 'pending' | 'delayed';
  timestamp?: string;
  duration?: number;
  notes?: string;
  staff?: string;
  location?: string;
}

interface PatientJourney {
  patientId: number;
  patientName: string;
  testName: string;
  status: string;
  startedAt: string;
  expectedCompletion?: string;
  currentStep: string;
  steps: JourneyStep[];
  priority: 'normal' | 'urgent' | 'stat';
  alerts?: string[];
}

export default function PatientJourneyVisualization() {
  const { user } = useAuth();
  const [selectedPatient, setSelectedPatient] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"timeline" | "kanban">("timeline");

  // Fetch active patient journeys
  const { data: journeys, isLoading } = useQuery({
    queryKey: ['/api/patient-journeys', statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.append('status', statusFilter);
      
      const response = await fetch(`/api/patient-journeys?${params}`, {
        headers: { 'Cache-Control': 'no-cache' }
      });
      if (!response.ok) throw new Error('Failed to fetch patient journeys');
      return response.json();
    }
  });

  // Fetch detailed journey for selected patient
  const { data: selectedJourney } = useQuery({
    queryKey: ['/api/patient-journeys', selectedPatient],
    queryFn: async () => {
      if (!selectedPatient) return null;
      const response = await fetch(`/api/patient-journeys/${selectedPatient}`, {
        headers: { 'Cache-Control': 'no-cache' }
      });
      if (!response.ok) throw new Error('Failed to fetch patient journey details');
      return response.json();
    },
    enabled: !!selectedPatient
  });

  const filteredJourneys = journeys?.filter((journey: PatientJourney) =>
    journey.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    journey.testName.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'processing': return 'bg-blue-100 text-blue-800';
      case 'scheduled': return 'bg-gray-100 text-gray-800';
      case 'delayed': return 'bg-red-100 text-red-800';
      case 'payment_verified': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'stat': return 'bg-red-500 text-white';
      case 'urgent': return 'bg-orange-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const getStepIcon = (stepId: string, status: string) => {
    const iconProps = { className: "w-4 h-4" };
    
    switch (stepId) {
      case 'registration':
        return <User {...iconProps} />;
      case 'payment':
        return <CreditCard {...iconProps} />;
      case 'specimen_collection':
        return <TestTube {...iconProps} />;
      case 'processing':
        return <Activity {...iconProps} />;
      case 'analysis':
        return <Stethoscope {...iconProps} />;
      case 'results':
        return <FileText {...iconProps} />;
      case 'report_delivery':
        return <Receipt {...iconProps} />;
      default:
        return status === 'completed' ? <CheckCircle {...iconProps} /> : <Clock {...iconProps} />;
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/">
            <Button variant="outline" size="sm" className="flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Dashboard
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Patient Journey Visualization</h1>
            <p className="text-gray-600">Track patients through their complete diagnostic workflow</p>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <Button variant="outline" className="flex items-center gap-2">
            <Download className="w-4 h-4" />
            Export Data
          </Button>
          <Button className="flex items-center gap-2">
            <Eye className="w-4 h-4" />
            Real-time Monitor
          </Button>
        </div>
      </div>

      {/* Filters and Controls */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search by patient name or test..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 w-64"
                />
              </div>
              
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Journeys</SelectItem>
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                  <SelectItem value="payment_verified">Payment Verified</SelectItem>
                  <SelectItem value="processing">Processing</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="delayed">Delayed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant={viewMode === "timeline" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("timeline")}
              >
                Timeline View
              </Button>
              <Button
                variant={viewMode === "kanban" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("kanban")}
              >
                Kanban View
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Journey Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-600" />
              <div>
                <p className="text-sm font-medium">Active Journeys</p>
                <p className="text-2xl font-bold">
                  {journeys?.filter((j: PatientJourney) => j.status !== 'completed').length || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-600" />
              <div>
                <p className="text-sm font-medium">Delayed</p>
                <p className="text-2xl font-bold text-red-600">
                  {journeys?.filter((j: PatientJourney) => j.status === 'delayed').length || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-yellow-600" />
              <div>
                <p className="text-sm font-medium">Processing</p>
                <p className="text-2xl font-bold">
                  {journeys?.filter((j: PatientJourney) => j.status === 'processing').length || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <div>
                <p className="text-sm font-medium">Completed Today</p>
                <p className="text-2xl font-bold">
                  {journeys?.filter((j: PatientJourney) => {
                    const today = new Date().toDateString();
                    return j.status === 'completed' && new Date(j.startedAt).toDateString() === today;
                  }).length || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-purple-600" />
              <div>
                <p className="text-sm font-medium">Avg. Duration</p>
                <p className="text-2xl font-bold">4.2h</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as "timeline" | "kanban")}>
        <TabsContent value="timeline" className="space-y-4">
          {isLoading ? (
            <div className="text-center py-8">Loading patient journeys...</div>
          ) : (
            <div className="space-y-4">
              {filteredJourneys.map((journey: PatientJourney) => (
                <Card key={journey.patientId} className="cursor-pointer hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-4">
                        <div>
                          <h3 className="font-semibold text-lg">{journey.patientName}</h3>
                          <p className="text-gray-600">{journey.testName}</p>
                        </div>
                        <div className="flex gap-2">
                          <Badge className={getStatusColor(journey.status)}>
                            {journey.status.replace('_', ' ').toUpperCase()}
                          </Badge>
                          {journey.priority !== 'normal' && (
                            <Badge className={getPriorityColor(journey.priority)}>
                              {journey.priority.toUpperCase()}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-500">Started</p>
                        <p className="font-medium">{format(new Date(journey.startedAt), 'MMM dd, HH:mm')}</p>
                        {journey.expectedCompletion && (
                          <p className="text-xs text-gray-400">
                            Expected: {format(new Date(journey.expectedCompletion), 'HH:mm')}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Journey Timeline */}
                    <div className="flex items-center gap-2 overflow-x-auto">
                      {journey.steps.map((step, index) => (
                        <div key={step.id} className="flex items-center">
                          <div className={`flex flex-col items-center min-w-24 p-2 rounded ${
                            step.status === 'completed' ? 'bg-green-50' :
                            step.status === 'current' ? 'bg-blue-50' :
                            step.status === 'delayed' ? 'bg-red-50' :
                            'bg-gray-50'
                          }`}>
                            <div className={`p-2 rounded-full ${
                              step.status === 'completed' ? 'bg-green-500 text-white' :
                              step.status === 'current' ? 'bg-blue-500 text-white' :
                              step.status === 'delayed' ? 'bg-red-500 text-white' :
                              'bg-gray-300 text-gray-600'
                            }`}>
                              {getStepIcon(step.id, step.status)}
                            </div>
                            <p className="text-xs font-medium mt-1 text-center">{step.name}</p>
                            {step.timestamp && (
                              <p className="text-xs text-gray-500">
                                {format(new Date(step.timestamp), 'HH:mm')}
                              </p>
                            )}
                            {step.duration && (
                              <p className="text-xs text-gray-400">{step.duration}min</p>
                            )}
                          </div>
                          {index < journey.steps.length - 1 && (
                            <ArrowRight className="w-4 h-4 text-gray-400 mx-2" />
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Alerts */}
                    {journey.alerts && journey.alerts.length > 0 && (
                      <div className="mt-4 p-3 bg-yellow-50 rounded border border-yellow-200">
                        <div className="flex items-center gap-2">
                          <AlertCircle className="w-4 h-4 text-yellow-600" />
                          <span className="text-sm font-medium text-yellow-800">Alerts:</span>
                        </div>
                        <ul className="text-sm text-yellow-700 mt-1">
                          {journey.alerts.map((alert, index) => (
                            <li key={index}>• {alert}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div className="flex justify-end mt-4">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm" onClick={() => setSelectedPatient(journey.patientId)}>
                            <Eye className="w-4 h-4 mr-2" />
                            View Details
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-4xl">
                          <DialogHeader>
                            <DialogTitle>Patient Journey Details - {journey.patientName}</DialogTitle>
                          </DialogHeader>
                          {selectedJourney && (
                            <div className="space-y-4">
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <h4 className="font-medium mb-2">Journey Information</h4>
                                  <div className="space-y-1 text-sm">
                                    <p><span className="font-medium">Test:</span> {selectedJourney.testName}</p>
                                    <p><span className="font-medium">Started:</span> {format(new Date(selectedJourney.startedAt), 'PPpp')}</p>
                                    <p><span className="font-medium">Current Step:</span> {selectedJourney.currentStep}</p>
                                    <p><span className="font-medium">Status:</span> 
                                      <Badge className={`ml-2 ${getStatusColor(selectedJourney.status)}`}>
                                        {selectedJourney.status.replace('_', ' ').toUpperCase()}
                                      </Badge>
                                    </p>
                                  </div>
                                </div>
                                <div>
                                  <h4 className="font-medium mb-2">Performance Metrics</h4>
                                  <div className="space-y-1 text-sm">
                                    <p><span className="font-medium">Total Duration:</span> {selectedJourney.totalDuration || 'In progress'}</p>
                                    <p><span className="font-medium">Efficiency Score:</span> {selectedJourney.efficiencyScore || 'N/A'}</p>
                                    <p><span className="font-medium">SLA Status:</span> 
                                      <span className={selectedJourney.slaStatus === 'on-time' ? 'text-green-600' : 'text-red-600'}>
                                        {selectedJourney.slaStatus || 'On track'}
                                      </span>
                                    </p>
                                  </div>
                                </div>
                              </div>

                              <div>
                                <h4 className="font-medium mb-2">Detailed Timeline</h4>
                                <div className="space-y-2">
                                  {selectedJourney.steps.map((step: JourneyStep) => (
                                    <div key={step.id} className="flex items-center gap-4 p-3 border rounded">
                                      <div className={`p-2 rounded-full ${
                                        step.status === 'completed' ? 'bg-green-500 text-white' :
                                        step.status === 'current' ? 'bg-blue-500 text-white' :
                                        step.status === 'delayed' ? 'bg-red-500 text-white' :
                                        'bg-gray-300 text-gray-600'
                                      }`}>
                                        {getStepIcon(step.id, step.status)}
                                      </div>
                                      <div className="flex-1">
                                        <h5 className="font-medium">{step.name}</h5>
                                        {step.notes && <p className="text-sm text-gray-600">{step.notes}</p>}
                                        {step.staff && <p className="text-xs text-gray-500">Staff: {step.staff}</p>}
                                        {step.location && <p className="text-xs text-gray-500">Location: {step.location}</p>}
                                      </div>
                                      <div className="text-right">
                                        {step.timestamp && (
                                          <p className="text-sm font-medium">
                                            {format(new Date(step.timestamp), 'PPpp')}
                                          </p>
                                        )}
                                        {step.duration && (
                                          <p className="text-xs text-gray-500">{step.duration} minutes</p>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          )}
                        </DialogContent>
                      </Dialog>
                    </div>
                  </CardContent>
                </Card>
              ))}
              
              {filteredJourneys.length === 0 && (
                <div className="text-center py-12">
                  <User className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No patient journeys found</h3>
                  <p className="text-gray-500">
                    {searchQuery ? 'Try adjusting your search criteria' : 'Patient journeys will appear here once tests are scheduled'}
                  </p>
                </div>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="kanban" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {['scheduled', 'payment_verified', 'processing', 'completed'].map((status) => (
              <Card key={status}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">
                    {status.replace('_', ' ').toUpperCase()}
                    <Badge variant="secondary" className="ml-2">
                      {filteredJourneys.filter((j: PatientJourney) => j.status === status).length}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {filteredJourneys
                    .filter((j: PatientJourney) => j.status === status)
                    .map((journey: PatientJourney) => (
                      <div key={journey.patientId} className="p-3 border rounded bg-white shadow-sm">
                        <h4 className="font-medium text-sm">{journey.patientName}</h4>
                        <p className="text-xs text-gray-600">{journey.testName}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {format(new Date(journey.startedAt), 'MMM dd, HH:mm')}
                        </p>
                        {journey.priority !== 'normal' && (
                          <Badge className={`${getPriorityColor(journey.priority)} text-xs mt-1`}>
                            {journey.priority.toUpperCase()}
                          </Badge>
                        )}
                      </div>
                    ))}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}