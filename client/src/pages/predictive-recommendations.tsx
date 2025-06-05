import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  Brain,
  TrendingUp,
  Clock,
  Calendar,
  AlertTriangle,
  CheckCircle,
  Target,
  Activity,
  Heart,
  FileText,
  Users,
  Home,
  Zap,
  BarChart3,
  Filter,
  Download,
  RefreshCw
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Link } from "wouter";

interface PredictiveRecommendation {
  id: string;
  patientId: string;
  patientName: string;
  age: number;
  gender: string;
  riskScore: number;
  recommendationType: 'urgent' | 'routine' | 'preventive' | 'monitoring';
  title: string;
  description: string;
  suggestedAction: string;
  timeframe: string;
  confidence: number;
  factors: string[];
  lastTestDate: string;
  nextDueDate: string;
  priority: 'high' | 'medium' | 'low';
  category: 'cardiovascular' | 'diabetes' | 'oncology' | 'general' | 'nephrology' | 'hepatic';
  basedOnTests: string[];
  estimatedCost: number;
}

interface RiskFactor {
  factor: string;
  impact: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  description: string;
}

export default function PredictiveRecommendations() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedTimeframe, setSelectedTimeframe] = useState("30");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedPriority, setSelectedPriority] = useState("all");
  const [selectedPatient, setSelectedPatient] = useState("");
  const [showDetailed, setShowDetailed] = useState(false);
  const [currentRecommendation, setCurrentRecommendation] = useState<PredictiveRecommendation | null>(null);

  // Fetch predictive recommendations
  const { data: recommendations, isLoading: recommendationsLoading, refetch: refetchRecommendations } = useQuery({
    queryKey: ['/api/predictive-recommendations', user?.branchId, selectedTimeframe, selectedCategory, selectedPriority],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (user?.branchId) params.append('branchId', user.branchId.toString());
      params.append('timeframe', selectedTimeframe);
      if (selectedCategory !== 'all') params.append('category', selectedCategory);
      if (selectedPriority !== 'all') params.append('priority', selectedPriority);
      
      const response = await fetch(`/api/predictive-recommendations?${params}`);
      if (!response.ok) throw new Error('Failed to fetch recommendations');
      return response.json() as PredictiveRecommendation[];
    }
  });

  // Fetch analytics data
  const { data: analytics, isLoading: analyticsLoading } = useQuery({
    queryKey: ['/api/predictive-recommendations/analytics', user?.branchId],
    queryFn: async () => {
      const response = await fetch(`/api/predictive-recommendations/analytics?branchId=${user?.branchId}`);
      if (!response.ok) throw new Error('Failed to fetch analytics');
      return response.json();
    }
  });

  // Generate new recommendations
  const generateRecommendations = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/predictive-recommendations/generate', {
        branchId: user?.branchId
      });
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Recommendations updated successfully", variant: "default" });
      refetchRecommendations();
    },
    onError: () => {
      toast({ title: "Failed to generate recommendations", variant: "destructive" });
    }
  });

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'urgent': return 'bg-red-500';
      case 'routine': return 'bg-blue-500';
      case 'preventive': return 'bg-green-500';
      case 'monitoring': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'cardiovascular': return <Heart className="w-4 h-4" />;
      case 'diabetes': return <Activity className="w-4 h-4" />;
      case 'oncology': return <Target className="w-4 h-4" />;
      case 'nephrology': return <FileText className="w-4 h-4" />;
      default: return <Brain className="w-4 h-4" />;
    }
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
            <h1 className="text-2xl font-bold text-gray-900">Predictive Follow-up Recommendations</h1>
            <p className="text-sm text-gray-600">AI-powered personalized patient care insights</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => refetchRecommendations()}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button 
            onClick={() => generateRecommendations.mutate()}
            disabled={generateRecommendations.isPending}
          >
            <Brain className="w-4 h-4 mr-2" />
            Generate New Insights
          </Button>
        </div>
      </div>

      {/* Analytics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Recommendations</p>
                <p className="text-2xl font-bold text-blue-600">
                  {analytics?.totalRecommendations || 0}
                </p>
                <p className="text-xs text-blue-600">
                  {analytics?.newToday || 0} new today
                </p>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <Brain className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">High Priority</p>
                <p className="text-2xl font-bold text-red-600">
                  {analytics?.highPriority || 0}
                </p>
                <p className="text-xs text-red-600">
                  Urgent attention needed
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
                <p className="text-sm font-medium text-gray-600">Average Risk Score</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {analytics?.avgRiskScore || 0}%
                </p>
                <p className="text-xs text-yellow-600">
                  Across all patients
                </p>
              </div>
              <div className="p-3 bg-yellow-100 rounded-lg">
                <TrendingUp className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Success Rate</p>
                <p className="text-2xl font-bold text-green-600">
                  {analytics?.successRate || 0}%
                </p>
                <p className="text-xs text-green-600">
                  Followed recommendations
                </p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filters & Controls
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label>Timeframe</Label>
              <Select value={selectedTimeframe} onValueChange={setSelectedTimeframe}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">Next 7 days</SelectItem>
                  <SelectItem value="30">Next 30 days</SelectItem>
                  <SelectItem value="90">Next 90 days</SelectItem>
                  <SelectItem value="180">Next 6 months</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Category</Label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="cardiovascular">Cardiovascular</SelectItem>
                  <SelectItem value="diabetes">Diabetes</SelectItem>
                  <SelectItem value="oncology">Oncology</SelectItem>
                  <SelectItem value="nephrology">Nephrology</SelectItem>
                  <SelectItem value="hepatic">Hepatic</SelectItem>
                  <SelectItem value="general">General</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Priority</Label>
              <Select value={selectedPriority} onValueChange={setSelectedPriority}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priorities</SelectItem>
                  <SelectItem value="high">High Priority</SelectItem>
                  <SelectItem value="medium">Medium Priority</SelectItem>
                  <SelectItem value="low">Low Priority</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Patient Search</Label>
              <Input
                placeholder="Search by patient name..."
                value={selectedPatient}
                onChange={(e) => setSelectedPatient(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recommendations List */}
      <Card>
        <CardHeader>
          <CardTitle>Personalized Recommendations</CardTitle>
        </CardHeader>
        <CardContent>
          {recommendationsLoading ? (
            <div className="text-center py-8">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-gray-400" />
              <p className="text-gray-600">Loading recommendations...</p>
            </div>
          ) : (
            <div className="space-y-4">
              {recommendations?.filter(rec => 
                selectedPatient === "" || rec.patientName.toLowerCase().includes(selectedPatient.toLowerCase())
              ).map((recommendation) => (
                <Card key={recommendation.id} className="border-l-4" style={{ borderLeftColor: getTypeColor(recommendation.recommendationType) }}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          {getCategoryIcon(recommendation.category)}
                          <h3 className="font-semibold text-gray-900">{recommendation.title}</h3>
                          <Badge className={getPriorityColor(recommendation.priority)}>
                            {recommendation.priority} priority
                          </Badge>
                          <Badge variant="outline">
                            {recommendation.confidence}% confidence
                          </Badge>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
                          <div>
                            <p className="text-sm text-gray-600">Patient</p>
                            <p className="font-medium">{recommendation.patientName}</p>
                            <p className="text-xs text-gray-500">{recommendation.age}y, {recommendation.gender}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Risk Score</p>
                            <div className="flex items-center gap-2">
                              <Progress value={recommendation.riskScore} className="w-16" />
                              <span className="text-sm font-medium">{recommendation.riskScore}%</span>
                            </div>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Due Date</p>
                            <p className="font-medium">{new Date(recommendation.nextDueDate).toLocaleDateString()}</p>
                            <p className="text-xs text-gray-500">{recommendation.timeframe}</p>
                          </div>
                        </div>
                        
                        <p className="text-gray-700 mb-2">{recommendation.description}</p>
                        <p className="text-sm text-blue-600 mb-3">
                          <strong>Suggested Action:</strong> {recommendation.suggestedAction}
                        </p>
                        
                        <div className="flex flex-wrap gap-1 mb-3">
                          {recommendation.factors.map((factor, index) => (
                            <Badge key={index} variant="secondary" className="text-xs">
                              {factor}
                            </Badge>
                          ))}
                        </div>
                        
                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <span>Based on: {recommendation.basedOnTests.join(', ')}</span>
                          <span>Est. Cost: ${recommendation.estimatedCost}</span>
                        </div>
                      </div>
                      
                      <div className="ml-4 flex flex-col gap-2">
                        <Button 
                          size="sm" 
                          onClick={() => {
                            setCurrentRecommendation(recommendation);
                            setShowDetailed(true);
                          }}
                        >
                          View Details
                        </Button>
                        <Button size="sm" variant="outline">
                          Schedule
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              
              {recommendations?.length === 0 && (
                <div className="text-center py-8">
                  <Brain className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                  <p className="text-gray-600">No recommendations found for the selected criteria.</p>
                  <Button 
                    className="mt-4" 
                    onClick={() => generateRecommendations.mutate()}
                    disabled={generateRecommendations.isPending}
                  >
                    Generate Recommendations
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}