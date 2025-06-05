import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  TrendingUp, 
  Users, 
  MessageSquare,
  CheckCircle,
  Clock,
  Target,
  BarChart3,
  Send,
  Eye,
  Plus,
  Filter,
  Calendar,
  Mail,
  Phone,
  MapPin,
  Star,
  AlertTriangle,
  FileText,
  Download,
  Megaphone,
  UserCheck,
  Activity,
  Zap,
  Award,
  CheckSquare,
  MessageCircle,
  Bell,
  Archive,
  Reply,
  Forward
} from "lucide-react";

interface MarketingCampaign {
  id: number;
  campaignName: string;
  campaignType: string;
  description: string;
  budget: string;
  actualSpend: string;
  status: string;
  startDate: string;
  endDate: string;
  targetMetrics: any;
  actualMetrics: any;
}

interface MarketingLead {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  leadSource: string;
  serviceInterest: string;
  leadScore: number;
  status: string;
  createdAt: string;
}

interface InternalMessage {
  id: number;
  messageType: string;
  subject: string;
  content: string;
  priority: string;
  status: string;
  senderId: number;
  recipientIds: number[];
  readBy: any[];
  acknowledgedBy: any[];
  actionRequired: boolean;
  actionCompleted: boolean;
  dueDate?: string;
  createdAt: string;
}

interface WorkTask {
  id: number;
  taskTitle: string;
  taskDescription: string;
  taskType: string;
  priority: string;
  status: string;
  assignedTo: number;
  dueDate?: string;
  estimatedHours?: string;
  actualHours?: string;
  createdAt: string;
}

export default function MarketingManagement() {
  const { toast } = useToast();
  const [selectedTab, setSelectedTab] = useState("campaigns");
  const [showMessageForm, setShowMessageForm] = useState(false);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [messageFilters, setMessageFilters] = useState({ type: "all", status: "all" });

  // Fetch marketing campaigns
  const { data: campaigns = [], isLoading: campaignsLoading } = useQuery<MarketingCampaign[]>({
    queryKey: ["/api/marketing/campaigns"],
  });

  // Fetch marketing leads
  const { data: leads = [], isLoading: leadsLoading } = useQuery<MarketingLead[]>({
    queryKey: ["/api/marketing/leads"],
  });

  // Fetch internal messages
  const { data: messages = [], isLoading: messagesLoading } = useQuery<InternalMessage[]>({
    queryKey: ["/api/messages", messageFilters.type, messageFilters.status],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (messageFilters.type !== "all") params.append("messageType", messageFilters.type);
      if (messageFilters.status !== "all") params.append("status", messageFilters.status);
      
      const response = await fetch(`/api/messages?${params}`);
      return response.json();
    },
  });

  // Fetch work tasks
  const { data: tasks = [], isLoading: tasksLoading } = useQuery<WorkTask[]>({
    queryKey: ["/api/tasks"],
  });

  // Fetch marketing metrics
  const { data: metrics } = useQuery({
    queryKey: ["/api/marketing/metrics"],
  });

  // Fetch staff members for recipient selection
  const { data: staffMembers = [] } = useQuery({
    queryKey: ["/api/users"],
  });

  // Message mutations
  const markAsReadMutation = useMutation({
    mutationFn: async (messageId: number) => {
      return await apiRequest("PATCH", `/api/messages/${messageId}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
      toast({ title: "Message marked as read" });
    },
  });

  const acknowledgeMutation = useMutation({
    mutationFn: async (messageId: number) => {
      return await apiRequest("PATCH", `/api/messages/${messageId}/acknowledge`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
      toast({ title: "Message acknowledged" });
    },
  });

  const completeActionMutation = useMutation({
    mutationFn: async ({ messageId, actionDetails }: { messageId: number; actionDetails: string }) => {
      return await apiRequest("PATCH", `/api/messages/${messageId}/complete`, { actionDetails });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
      toast({ title: "Action completed successfully" });
    },
  });

  // Task mutations
  const completeTaskMutation = useMutation({
    mutationFn: async ({ taskId, completionNotes }: { taskId: number; completionNotes: string }) => {
      return await apiRequest("PATCH", `/api/tasks/${taskId}/complete`, { completionNotes });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      toast({ title: "Task completed successfully" });
    },
  });

  const createMessageMutation = useMutation({
    mutationFn: async (messageData: any) => {
      return await apiRequest("POST", "/api/messages", messageData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
      setShowMessageForm(false);
      toast({ title: "Message sent successfully" });
    },
  });

  const createTaskMutation = useMutation({
    mutationFn: async (taskData: any) => {
      return await apiRequest("POST", "/api/tasks", taskData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      setShowTaskForm(false);
      toast({ title: "Task created successfully" });
    },
  });

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
      case 'completed': return 'bg-green-100 text-green-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'active': return 'bg-blue-100 text-blue-800';
      case 'converted': return 'bg-green-100 text-green-800';
      case 'lost': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatCurrency = (amount: string | number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
    }).format(Number(amount));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              Marketing & Communications Center
            </h1>
            <p className="text-lg text-gray-600">
              Campaign management, lead tracking, and enterprise messaging
            </p>
          </div>
          
          <div className="flex items-center space-x-4">
            <Button onClick={() => setShowMessageForm(true)} className="bg-blue-600 hover:bg-blue-700">
              <MessageSquare className="h-4 w-4 mr-2" />
              New Message
            </Button>
            <Button onClick={() => setShowTaskForm(true)} variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              New Task
            </Button>
          </div>
        </div>

        {/* Quick Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm font-medium">Active Campaigns</p>
                  <p className="text-3xl font-bold">{campaigns.filter(c => c.status === 'active').length}</p>
                </div>
                <Megaphone className="h-12 w-12 text-blue-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-sm font-medium">New Leads</p>
                  <p className="text-3xl font-bold">{leads.filter(l => l.status === 'new').length}</p>
                </div>
                <UserCheck className="h-12 w-12 text-green-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-orange-500 to-orange-600 text-white border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-orange-100 text-sm font-medium">Pending Actions</p>
                  <p className="text-3xl font-bold">
                    {messages.filter(m => m.actionRequired && !m.actionCompleted).length}
                  </p>
                </div>
                <AlertTriangle className="h-12 w-12 text-orange-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100 text-sm font-medium">Open Tasks</p>
                  <p className="text-3xl font-bold">
                    {tasks.filter(t => t.status !== 'completed').length}
                  </p>
                </div>
                <CheckSquare className="h-12 w-12 text-purple-200" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-6">
        <TabsList className="grid grid-cols-5 w-full max-w-3xl mx-auto">
          <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
          <TabsTrigger value="leads">Leads</TabsTrigger>
          <TabsTrigger value="messages">Messages</TabsTrigger>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* Marketing Campaigns Tab */}
        <TabsContent value="campaigns" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Megaphone className="h-5 w-5 mr-2 text-blue-600" />
                Marketing Campaigns
              </CardTitle>
            </CardHeader>
            <CardContent>
              {campaignsLoading ? (
                <div className="flex items-center justify-center p-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : campaigns.length === 0 ? (
                <div className="text-center p-8">
                  <Megaphone className="h-16 w-16 mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-600">No campaigns found. Create your first marketing campaign.</p>
                  <Button className="mt-4">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Campaign
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {campaigns.map((campaign) => (
                    <div key={campaign.id} className="border rounded-lg p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="text-lg font-semibold">{campaign.campaignName}</h3>
                          <p className="text-sm text-gray-600">{campaign.campaignType}</p>
                        </div>
                        <Badge className={getStatusColor(campaign.status)}>
                          {campaign.status}
                        </Badge>
                      </div>
                      
                      <p className="text-gray-700 mb-4">{campaign.description}</p>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <p className="text-sm text-gray-600">Budget</p>
                          <p className="font-medium">{formatCurrency(campaign.budget)}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Spent</p>
                          <p className="font-medium">{formatCurrency(campaign.actualSpend)}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Start Date</p>
                          <p className="font-medium">{new Date(campaign.startDate).toLocaleDateString()}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">End Date</p>
                          <p className="font-medium">{new Date(campaign.endDate).toLocaleDateString()}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Marketing Leads Tab */}
        <TabsContent value="leads" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Users className="h-5 w-5 mr-2 text-green-600" />
                Marketing Leads
              </CardTitle>
            </CardHeader>
            <CardContent>
              {leadsLoading ? (
                <div className="flex items-center justify-center p-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
                </div>
              ) : leads.length === 0 ? (
                <div className="text-center p-8">
                  <Users className="h-16 w-16 mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-600">No leads found. Start capturing leads from your campaigns.</p>
                  <Button className="mt-4">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Lead
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {leads.map((lead) => (
                    <div key={lead.id} className="border rounded-lg p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="text-lg font-semibold">
                            {lead.firstName} {lead.lastName}
                          </h3>
                          <p className="text-sm text-gray-600">{lead.leadSource}</p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge className={getStatusColor(lead.status)}>
                            {lead.status}
                          </Badge>
                          <div className="flex items-center">
                            <Star className="h-4 w-4 text-yellow-500 mr-1" />
                            <span className="text-sm font-medium">{lead.leadScore}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="flex items-center">
                          <Mail className="h-4 w-4 text-gray-400 mr-2" />
                          <span className="text-sm">{lead.email}</span>
                        </div>
                        <div className="flex items-center">
                          <Phone className="h-4 w-4 text-gray-400 mr-2" />
                          <span className="text-sm">{lead.phone}</span>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Interest</p>
                          <p className="font-medium">{lead.serviceInterest}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Created</p>
                          <p className="font-medium">{new Date(lead.createdAt).toLocaleDateString()}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Messages Tab */}
        <TabsContent value="messages" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center">
                  <MessageSquare className="h-5 w-5 mr-2 text-blue-600" />
                  Internal Messages
                </CardTitle>
                <div className="flex items-center space-x-2">
                  <Select value={messageFilters.type} onValueChange={(value) => 
                    setMessageFilters(prev => ({ ...prev, type: value }))
                  }>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="task">Tasks</SelectItem>
                      <SelectItem value="announcement">Announcements</SelectItem>
                      <SelectItem value="alert">Alerts</SelectItem>
                      <SelectItem value="request">Requests</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Select value={messageFilters.status} onValueChange={(value) => 
                    setMessageFilters(prev => ({ ...prev, status: value }))
                  }>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="sent">Sent</SelectItem>
                      <SelectItem value="read">Read</SelectItem>
                      <SelectItem value="acknowledged">Acknowledged</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {messagesLoading ? (
                <div className="flex items-center justify-center p-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center p-8">
                  <MessageSquare className="h-16 w-16 mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-600">No messages found. Start communicating with your team.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((message) => (
                    <div key={message.id} className="border rounded-lg p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-2">
                          <Badge className={getPriorityColor(message.priority)}>
                            {message.priority}
                          </Badge>
                          <Badge variant="outline">{message.messageType}</Badge>
                          <Badge className={getStatusColor(message.status)}>
                            {message.status}
                          </Badge>
                        </div>
                        <div className="flex items-center space-x-2">
                          {message.actionRequired && !message.actionCompleted && (
                            <Badge className="bg-red-100 text-red-800">
                              Action Required
                            </Badge>
                          )}
                          <span className="text-sm text-gray-500">
                            {new Date(message.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      
                      <h3 className="text-lg font-semibold mb-2">{message.subject}</h3>
                      <p className="text-gray-700 mb-4">{message.content}</p>
                      
                      {message.dueDate && (
                        <div className="flex items-center mb-4">
                          <Calendar className="h-4 w-4 text-gray-400 mr-2" />
                          <span className="text-sm">Due: {new Date(message.dueDate).toLocaleDateString()}</span>
                        </div>
                      )}
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <span className="text-sm text-gray-600">
                            Read by: {message.readBy?.length || 0} people
                          </span>
                          <span className="text-sm text-gray-600">
                            Acknowledged: {message.acknowledgedBy?.length || 0} people
                          </span>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => markAsReadMutation.mutate(message.id)}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            Mark Read
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => acknowledgeMutation.mutate(message.id)}
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Acknowledge
                          </Button>
                          {message.actionRequired && !message.actionCompleted && (
                            <Button 
                              size="sm"
                              onClick={() => {
                                const actionDetails = prompt("Enter completion details:");
                                if (actionDetails) {
                                  completeActionMutation.mutate({ 
                                    messageId: message.id, 
                                    actionDetails 
                                  });
                                }
                              }}
                            >
                              <CheckSquare className="h-4 w-4 mr-1" />
                              Complete Action
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tasks Tab */}
        <TabsContent value="tasks" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <CheckSquare className="h-5 w-5 mr-2 text-purple-600" />
                Work Tasks
              </CardTitle>
            </CardHeader>
            <CardContent>
              {tasksLoading ? (
                <div className="flex items-center justify-center p-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                </div>
              ) : tasks.length === 0 ? (
                <div className="text-center p-8">
                  <CheckSquare className="h-16 w-16 mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-600">No tasks found. Create tasks to manage work efficiently.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {tasks.map((task) => (
                    <div key={task.id} className="border rounded-lg p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="text-lg font-semibold">{task.taskTitle}</h3>
                          <p className="text-sm text-gray-600">{task.taskType}</p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge className={getPriorityColor(task.priority)}>
                            {task.priority}
                          </Badge>
                          <Badge className={getStatusColor(task.status)}>
                            {task.status}
                          </Badge>
                        </div>
                      </div>
                      
                      <p className="text-gray-700 mb-4">{task.taskDescription}</p>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                        {task.dueDate && (
                          <div>
                            <p className="text-sm text-gray-600">Due Date</p>
                            <p className="font-medium">{new Date(task.dueDate).toLocaleDateString()}</p>
                          </div>
                        )}
                        {task.estimatedHours && (
                          <div>
                            <p className="text-sm text-gray-600">Estimated Hours</p>
                            <p className="font-medium">{task.estimatedHours}h</p>
                          </div>
                        )}
                        {task.actualHours && (
                          <div>
                            <p className="text-sm text-gray-600">Actual Hours</p>
                            <p className="font-medium">{task.actualHours}h</p>
                          </div>
                        )}
                        <div>
                          <p className="text-sm text-gray-600">Created</p>
                          <p className="font-medium">{new Date(task.createdAt).toLocaleDateString()}</p>
                        </div>
                      </div>
                      
                      {task.status !== 'completed' && (
                        <div className="flex items-center justify-end">
                          <Button 
                            size="sm"
                            onClick={() => {
                              const notes = prompt("Enter completion notes:");
                              if (notes) {
                                completeTaskMutation.mutate({ 
                                  taskId: task.id, 
                                  completionNotes: notes 
                                });
                              }
                            }}
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Mark Complete
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <BarChart3 className="h-5 w-5 mr-2 text-blue-600" />
                  Campaign Performance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Total Budget Utilized</span>
                    <span className="font-medium">68%</span>
                  </div>
                  <Progress value={68} className="h-2" />
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Lead Conversion Rate</span>
                    <span className="font-medium">12.5%</span>
                  </div>
                  <Progress value={12.5} className="h-2" />
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm">ROI Achievement</span>
                    <span className="font-medium">145%</span>
                  </div>
                  <Progress value={100} className="h-2" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Activity className="h-5 w-5 mr-2 text-green-600" />
                  Communication Metrics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Message Response Rate</span>
                    <span className="font-medium">92%</span>
                  </div>
                  <Progress value={92} className="h-2" />
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Task Completion Rate</span>
                    <span className="font-medium">85%</span>
                  </div>
                  <Progress value={85} className="h-2" />
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Average Response Time</span>
                    <span className="font-medium">2.3 hours</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Message Form Modal */}
      {showMessageForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Send New Message</h3>
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.target as HTMLFormElement);
              const selectedRecipients = formData.get('recipients');
              const recipientIds = selectedRecipients === 'all' 
                ? staffMembers.map((staff: any) => staff.id)
                : [parseInt(selectedRecipients as string)];
              
              createMessageMutation.mutate({
                messageType: formData.get('messageType'),
                subject: formData.get('subject'),
                content: formData.get('content'),
                priority: formData.get('priority'),
                recipientIds,
                actionRequired: formData.get('actionRequired') === 'on',
              });
            }}>
              <div className="space-y-4">
                <Select name="messageType" defaultValue="announcement">
                  <SelectTrigger>
                    <SelectValue placeholder="Message Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="task">Task</SelectItem>
                    <SelectItem value="announcement">Announcement</SelectItem>
                    <SelectItem value="alert">Alert</SelectItem>
                    <SelectItem value="request">Request</SelectItem>
                  </SelectContent>
                </Select>
                
                
                <Select name="recipients" defaultValue="all" required>
                  <SelectTrigger>
                    <SelectValue placeholder="Send to" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Send to All Staff</SelectItem>
                    {staffMembers.map((staff: any) => (
                      <SelectItem key={staff.id} value={staff.id.toString()}>
                        {staff.username}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <Input name="subject" placeholder="Subject" required />
                <Textarea name="content" placeholder="Message content" required />
                
                <Select name="priority" defaultValue="normal">
                  <SelectTrigger>
                    <SelectValue placeholder="Priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
                
                <label className="flex items-center space-x-2">
                  <input type="checkbox" name="actionRequired" />
                  <span className="text-sm">Action Required</span>
                </label>
              </div>
              
              <div className="flex justify-end space-x-2 mt-6">
                <Button type="button" variant="outline" onClick={() => setShowMessageForm(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  <Send className="h-4 w-4 mr-2" />
                  Send Message
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Task Form Modal */}
      {showTaskForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Create New Task</h3>
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.target as HTMLFormElement);
              createTaskMutation.mutate({
                taskTitle: formData.get('taskTitle'),
                taskDescription: formData.get('taskDescription'),
                taskType: formData.get('taskType'),
                priority: formData.get('priority'),
                assignedTo: 1, // Simplified for demo
                dueDate: formData.get('dueDate'),
                estimatedHours: formData.get('estimatedHours'),
              });
            }}>
              <div className="space-y-4">
                <Input name="taskTitle" placeholder="Task Title" required />
                <Textarea name="taskDescription" placeholder="Task Description" required />
                
                <Select name="taskType" defaultValue="marketing">
                  <SelectTrigger>
                    <SelectValue placeholder="Task Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="marketing">Marketing</SelectItem>
                    <SelectItem value="administrative">Administrative</SelectItem>
                    <SelectItem value="clinical">Clinical</SelectItem>
                    <SelectItem value="financial">Financial</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                  </SelectContent>
                </Select>
                
                <Select name="priority" defaultValue="normal">
                  <SelectTrigger>
                    <SelectValue placeholder="Priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
                
                <Input name="dueDate" type="date" placeholder="Due Date" />
                <Input name="estimatedHours" type="number" placeholder="Estimated Hours" step="0.5" />
              </div>
              
              <div className="flex justify-end space-x-2 mt-6">
                <Button type="button" variant="outline" onClick={() => setShowTaskForm(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Task
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}