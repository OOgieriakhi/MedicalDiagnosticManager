import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  Clock,
  Users,
  CheckCircle,
  AlertCircle,
  Play,
  Pause,
  SkipForward,
  User,
  Activity,
  Timer,
  Zap,
  TrendingUp,
  Home,
  RefreshCw,
  Bell,
  Calendar,
  ArrowUp,
  ArrowDown,
  MoreVertical
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";

interface QueuePatient {
  id: string;
  patientId: string;
  patientName: string;
  appointmentType: string;
  priority: 'urgent' | 'high' | 'normal' | 'low';
  status: 'waiting' | 'called' | 'in-progress' | 'completed' | 'no-show';
  estimatedWaitTime: number;
  actualWaitTime: number;
  checkedInAt: string;
  calledAt?: string;
  startedAt?: string;
  completedAt?: string;
  department: string;
  doctor: string;
  notes?: string;
  position: number;
  avgServiceTime: number;
}

interface QueueStats {
  totalWaiting: number;
  totalServed: number;
  averageWaitTime: number;
  currentWaitTime: number;
  peakHour: string;
  efficiency: number;
  noShowRate: number;
}

interface Department {
  id: string;
  name: string;
  activeQueues: number;
  totalWaiting: number;
  averageServiceTime: number;
  status: 'active' | 'busy' | 'closed';
}

export default function WaitingRoomQueue() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedDepartment, setSelectedDepartment] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(30);

  // Real-time queue data
  const { data: queueData, isLoading: queueLoading, refetch: refetchQueue } = useQuery({
    queryKey: ['/api/queue/patients', user?.branchId, selectedDepartment, selectedStatus],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (user?.branchId) params.append('branchId', user.branchId.toString());
      if (selectedDepartment !== 'all') params.append('department', selectedDepartment);
      if (selectedStatus !== 'all') params.append('status', selectedStatus);
      
      const response = await fetch(`/api/queue/patients?${params}`);
      if (!response.ok) throw new Error('Failed to fetch queue data');
      return response.json() as QueuePatient[];
    },
    refetchInterval: autoRefresh ? refreshInterval * 1000 : false
  });

  // Queue statistics
  const { data: queueStats, isLoading: statsLoading } = useQuery({
    queryKey: ['/api/queue/stats', user?.branchId],
    queryFn: async () => {
      const response = await fetch(`/api/queue/stats?branchId=${user?.branchId}`);
      if (!response.ok) throw new Error('Failed to fetch queue stats');
      return response.json() as QueueStats;
    },
    refetchInterval: autoRefresh ? refreshInterval * 1000 : false
  });

  // Department data
  const { data: departments, isLoading: departmentsLoading } = useQuery({
    queryKey: ['/api/queue/departments', user?.branchId],
    queryFn: async () => {
      const response = await fetch(`/api/queue/departments?branchId=${user?.branchId}`);
      if (!response.ok) throw new Error('Failed to fetch departments');
      return response.json() as Department[];
    }
  });

  // Call next patient
  const callNext = useMutation({
    mutationFn: async (data: { patientId: string; department: string }) => {
      const response = await apiRequest('POST', '/api/queue/call-next', data);
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Patient called successfully", variant: "default" });
      refetchQueue();
      queryClient.invalidateQueries({ queryKey: ['/api/queue/stats'] });
    },
    onError: () => {
      toast({ title: "Failed to call patient", variant: "destructive" });
    }
  });

  // Update patient status
  const updateStatus = useMutation({
    mutationFn: async (data: { patientId: string; status: string; notes?: string }) => {
      const response = await apiRequest('PUT', `/api/queue/patients/${data.patientId}/status`, {
        status: data.status,
        notes: data.notes
      });
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Status updated successfully", variant: "default" });
      refetchQueue();
      queryClient.invalidateQueries({ queryKey: ['/api/queue/stats'] });
    },
    onError: () => {
      toast({ title: "Failed to update status", variant: "destructive" });
    }
  });

  // Auto-refresh toggle
  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(() => {
        refetchQueue();
      }, refreshInterval * 1000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshInterval, refetchQueue]);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'normal': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'low': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'waiting': return 'bg-yellow-100 text-yellow-800';
      case 'called': return 'bg-blue-100 text-blue-800';
      case 'in-progress': return 'bg-green-100 text-green-800';
      case 'completed': return 'bg-gray-100 text-gray-800';
      case 'no-show': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'waiting': return <Clock className="w-4 h-4" />;
      case 'called': return <Bell className="w-4 h-4" />;
      case 'in-progress': return <Activity className="w-4 h-4" />;
      case 'completed': return <CheckCircle className="w-4 h-4" />;
      case 'no-show': return <AlertCircle className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  const formatTime = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
            <Home className="w-5 h-5" />
            <span>Home</span>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Waiting Room Queue Management</h1>
            <p className="text-sm text-gray-600">Real-time patient queue tracking and management</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant={autoRefresh ? "default" : "outline"} 
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            {autoRefresh ? <Pause className="w-4 h-4 mr-2" /> : <Play className="w-4 h-4 mr-2" />}
            Auto Refresh
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => refetchQueue()}
            disabled={queueLoading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${queueLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Currently Waiting</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {queueStats?.totalWaiting || 0}
                  </p>
                  <p className="text-xs text-blue-600">
                    patients in queue
                  </p>
                </div>
                <div className="p-3 bg-blue-100 rounded-lg">
                  <Users className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Average Wait Time</p>
                  <p className="text-2xl font-bold text-orange-600">
                    {formatTime(queueStats?.averageWaitTime || 0)}
                  </p>
                  <p className="text-xs text-orange-600">
                    current average
                  </p>
                </div>
                <div className="p-3 bg-orange-100 rounded-lg">
                  <Timer className="w-6 h-6 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Patients Served</p>
                  <p className="text-2xl font-bold text-green-600">
                    {queueStats?.totalServed || 0}
                  </p>
                  <p className="text-xs text-green-600">
                    today
                  </p>
                </div>
                <div className="p-3 bg-green-100 rounded-lg">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Queue Efficiency</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {queueStats?.efficiency || 0}%
                  </p>
                  <p className="text-xs text-purple-600">
                    operational efficiency
                  </p>
                </div>
                <div className="p-3 bg-purple-100 rounded-lg">
                  <TrendingUp className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Department Status */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Department Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {departments?.map((dept) => (
              <motion.div
                key={dept.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
                className="p-4 border rounded-lg hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium text-sm">{dept.name}</h3>
                  <Badge variant={dept.status === 'active' ? 'default' : dept.status === 'busy' ? 'destructive' : 'secondary'}>
                    {dept.status}
                  </Badge>
                </div>
                <div className="space-y-1 text-xs text-gray-600">
                  <div className="flex justify-between">
                    <span>Waiting:</span>
                    <span className="font-medium">{dept.totalWaiting}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Avg Service:</span>
                    <span className="font-medium">{formatTime(dept.averageServiceTime)}</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Filters and Controls */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Queue Management Controls</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Department</label>
              <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  <SelectItem value="general">General Medicine</SelectItem>
                  <SelectItem value="cardiology">Cardiology</SelectItem>
                  <SelectItem value="laboratory">Laboratory</SelectItem>
                  <SelectItem value="radiology">Radiology</SelectItem>
                  <SelectItem value="pharmacy">Pharmacy</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Status Filter</label>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="waiting">Waiting</SelectItem>
                  <SelectItem value="called">Called</SelectItem>
                  <SelectItem value="in-progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Refresh Interval</label>
              <Select value={refreshInterval.toString()} onValueChange={(value) => setRefreshInterval(parseInt(value))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10 seconds</SelectItem>
                  <SelectItem value="30">30 seconds</SelectItem>
                  <SelectItem value="60">1 minute</SelectItem>
                  <SelectItem value="300">5 minutes</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Queue List */}
      <Card>
        <CardHeader>
          <CardTitle>Current Queue</CardTitle>
        </CardHeader>
        <CardContent>
          {queueLoading ? (
            <div className="text-center py-8">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-gray-400" />
              <p className="text-gray-600">Loading queue data...</p>
            </div>
          ) : (
            <div className="space-y-4">
              <AnimatePresence>
                {queueData?.map((patient, index) => (
                  <motion.div
                    key={patient.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.3, delay: index * 0.1 }}
                    className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-full">
                          <span className="text-lg font-bold text-blue-600">#{patient.position}</span>
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">{patient.patientName}</h3>
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <span>{patient.appointmentType}</span>
                            <span>•</span>
                            <span>{patient.department}</span>
                            <span>•</span>
                            <span>Dr. {patient.doctor}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <Badge className={getPriorityColor(patient.priority)}>
                            {patient.priority}
                          </Badge>
                          <div className="flex items-center gap-1 mt-1">
                            {getStatusIcon(patient.status)}
                            <Badge className={getStatusColor(patient.status)}>
                              {patient.status}
                            </Badge>
                          </div>
                        </div>
                        
                        <div className="text-right text-sm">
                          <p className="text-gray-600">Est. Wait: <span className="font-medium">{formatTime(patient.estimatedWaitTime)}</span></p>
                          <p className="text-gray-600">Waiting: <span className="font-medium">{formatTime(patient.actualWaitTime)}</span></p>
                        </div>
                        
                        <div className="flex flex-col gap-2">
                          <Button 
                            size="sm" 
                            onClick={() => callNext.mutate({ patientId: patient.id, department: patient.department })}
                            disabled={patient.status !== 'waiting' || callNext.isPending}
                          >
                            {patient.status === 'waiting' ? 'Call Next' : 'Called'}
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => updateStatus.mutate({ patientId: patient.id, status: 'in-progress' })}
                            disabled={patient.status === 'completed' || updateStatus.isPending}
                          >
                            Start Service
                          </Button>
                        </div>
                      </div>
                    </div>
                    
                    {patient.notes && (
                      <div className="mt-3 pt-3 border-t">
                        <p className="text-sm text-gray-600">
                          <strong>Notes:</strong> {patient.notes}
                        </p>
                      </div>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
              
              {queueData?.length === 0 && (
                <div className="text-center py-8">
                  <Users className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                  <p className="text-gray-600">No patients in queue for the selected criteria.</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}