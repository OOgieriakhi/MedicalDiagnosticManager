import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { 
  GraduationCap, 
  Play, 
  Pause, 
  CheckCircle, 
  Clock, 
  Target, 
  TrendingUp,
  Award,
  AlertCircle,
  Users,
  BookOpen,
  Zap,
  Brain,
  Settings
} from "lucide-react";
import { Link } from "wouter";

interface TrainingModule {
  id: number;
  title: string;
  description: string;
  department: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedDuration: number;
  prerequisites: number[];
  objectives: string[];
  isActive: boolean;
  progressPercentage?: number;
  certificateEarned?: boolean;
}

interface TrainingScenario {
  id: number;
  moduleId: number;
  title: string;
  description: string;
  scenarioType: 'patient_case' | 'equipment_malfunction' | 'emergency_protocol' | 'quality_control';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  patientProfile?: {
    age: number;
    gender: string;
    symptoms: string[];
    medicalHistory: string[];
    vitals?: { [key: string]: string };
  };
  requiredActions: {
    action: string;
    sequence: number;
    isOptional: boolean;
    points: number;
  }[];
  learningPoints: string[];
  commonMistakes: string[];
}

interface TrainingSession {
  id: number;
  scenarioId: number;
  sessionMode: 'guided' | 'assessment' | 'free_practice';
  status: 'active' | 'completed' | 'abandoned';
  score: number;
  maxScore: number;
  timeSpent: number;
  actionsPerformed: {
    action: string;
    timestamp: string;
    isCorrect: boolean;
    points: number;
    feedback?: string;
  }[];
  mistakesMade: {
    mistake: string;
    timestamp: string;
    correctionGiven: string;
  }[];
  hintsUsed: number;
}

export default function TrainingSimulation() {
  const { toast } = useToast();
  const [selectedDepartment, setSelectedDepartment] = useState<string>("frontdesk");
  const [activeSession, setActiveSession] = useState<TrainingSession | null>(null);
  const [currentScenario, setCurrentScenario] = useState<TrainingScenario | null>(null);
  const [simulationMode, setSimulationMode] = useState<'guided' | 'assessment' | 'free_practice'>('guided');
  const [currentStep, setCurrentStep] = useState(0);
  const [sessionTimer, setSessionTimer] = useState(0);
  const [isSessionActive, setIsSessionActive] = useState(false);

  // Fetch training modules by department
  const { data: modules = [] } = useQuery<TrainingModule[]>({
    queryKey: ["/api/training/modules", selectedDepartment],
    queryFn: async () => {
      const response = await fetch(`/api/training/modules?department=${selectedDepartment}`);
      return response.json();
    },
  });

  // Fetch user's training progress
  const { data: userProgress = [] } = useQuery({
    queryKey: ["/api/training/progress"],
  });

  // Start training session mutation
  const startSessionMutation = useMutation({
    mutationFn: async ({ scenarioId, mode }: { scenarioId: number; mode: string }) => {
      const response = await apiRequest("POST", "/api/training/sessions", {
        scenarioId,
        sessionMode: mode,
      });
      return response.json();
    },
    onSuccess: (session) => {
      setActiveSession(session);
      setIsSessionActive(true);
      setCurrentStep(0);
      toast({
        title: "Training Session Started",
        description: "Interactive simulation is now active",
      });
    },
  });

  // Handle starting a training module
  const handleStartModule = async (moduleId: number) => {
    try {
      // Get scenarios for this module
      const scenariosResponse = await fetch(`/api/training/scenarios/${moduleId}`);
      if (!scenariosResponse.ok) {
        throw new Error('Failed to fetch scenarios');
      }
      const scenarios = await scenariosResponse.json();
      
      if (scenarios.length === 0) {
        toast({
          title: "No Scenarios Available",
          description: "This module doesn't have any training scenarios yet.",
          variant: "destructive",
        });
        return;
      }

      // Start with the first scenario
      const firstScenario = scenarios[0];
      setCurrentScenario(firstScenario);
      
      // Start the training session
      startSessionMutation.mutate({
        scenarioId: firstScenario.id,
        mode: simulationMode,
      });
    } catch (error: any) {
      console.error('Error starting module:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to start training module",
        variant: "destructive",
      });
    }
  };

  // Timer effect for active sessions
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isSessionActive) {
      interval = setInterval(() => {
        setSessionTimer(prev => prev + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isSessionActive]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleCompleteStep = () => {
    if (currentStep < (currentScenario?.requiredActions.length || 0) - 1) {
      setCurrentStep(currentStep + 1);
      toast({
        title: "Step Completed",
        description: `Good work! Moving to step ${currentStep + 2}`,
      });
    }
  };

  const handleFinishSession = async () => {
    if (!activeSession) return;
    
    try {
      await apiRequest("PATCH", `/api/training/sessions/${activeSession.id}`, {
        status: 'completed',
        completedAt: new Date().toISOString(),
      });
      
      setActiveSession(null);
      setCurrentScenario(null);
      setIsSessionActive(false);
      setCurrentStep(0);
      setSessionTimer(0);
      
      toast({
        title: "Training Completed",
        description: "Congratulations! You've completed this training module.",
      });
      
      // Refresh progress data
      progressQuery.refetch();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to complete session",
        variant: "destructive",
      });
    }
  };

  const handleEndSession = async () => {
    if (!activeSession) return;
    
    try {
      await apiRequest("PATCH", `/api/training/sessions/${activeSession.id}`, {
        status: 'abandoned',
        completedAt: new Date().toISOString(),
      });
      
      setActiveSession(null);
      setCurrentScenario(null);
      setIsSessionActive(false);
      setCurrentStep(0);
      setSessionTimer(0);
      
      toast({
        title: "Session Ended",
        description: "Training session has been ended",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to end session",
        variant: "destructive",
      });
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'bg-green-100 text-green-800';
      case 'intermediate': return 'bg-yellow-100 text-yellow-800';
      case 'advanced': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getScenarioIcon = (type: string) => {
    switch (type) {
      case 'patient_case': return <Users className="h-4 w-4" />;
      case 'equipment_malfunction': return <Settings className="h-4 w-4" />;
      case 'emergency_protocol': return <AlertCircle className="h-4 w-4" />;
      case 'quality_control': return <Target className="h-4 w-4" />;
      default: return <BookOpen className="h-4 w-4" />;
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Interactive Training Simulation</h1>
          <p className="text-muted-foreground">
            Develop skills through realistic scenarios and guided practice sessions
          </p>
        </div>
        <Link href="/">
          <Button variant="outline">
            <GraduationCap className="h-4 w-4 mr-2" />
            Back to Home
          </Button>
        </Link>
      </div>

      {/* Active Session Monitor */}
      {isSessionActive && activeSession && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Play className="h-5 w-5 text-blue-600" />
                <CardTitle className="text-blue-900">Active Training Session</CardTitle>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 text-sm text-blue-700">
                  <Clock className="h-4 w-4" />
                  {formatTime(sessionTimer)}
                </div>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => setIsSessionActive(false)}
                >
                  <Pause className="h-4 w-4 mr-1" />
                  Pause
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm font-medium text-blue-900">Current Score</p>
                <p className="text-2xl font-bold text-blue-600">
                  {activeSession.score}/{activeSession.maxScore}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-blue-900">Progress</p>
                <Progress 
                  value={(currentStep / (currentScenario?.requiredActions.length || 1)) * 100} 
                  className="mt-1"
                />
              </div>
              <div>
                <p className="text-sm font-medium text-blue-900">Hints Used</p>
                <p className="text-2xl font-bold text-blue-600">{activeSession.hintsUsed}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="modules" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="modules">Training Modules</TabsTrigger>
          <TabsTrigger value="scenarios">Practice Scenarios</TabsTrigger>
          <TabsTrigger value="progress">My Progress</TabsTrigger>
          <TabsTrigger value="certificates">Certificates</TabsTrigger>
        </TabsList>

        {/* Training Modules Tab */}
        <TabsContent value="modules" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Training Modules</CardTitle>
                  <CardDescription>
                    Structured learning paths for professional development
                  </CardDescription>
                </div>
                <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="frontdesk">Front Desk / Reception</SelectItem>
                    <SelectItem value="laboratory">Laboratory</SelectItem>
                    <SelectItem value="radiology">Radiology</SelectItem>
                    <SelectItem value="ultrasound">Ultrasound</SelectItem>
                    <SelectItem value="cardiology">Cardiology</SelectItem>
                    <SelectItem value="pharmacy">Pharmacy</SelectItem>
                    <SelectItem value="nursing">Nursing</SelectItem>
                    <SelectItem value="physiotherapy">Physiotherapy</SelectItem>
                    <SelectItem value="administrative">Administrative</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {modules.map((module) => (
                  <Card key={module.id} className="cursor-pointer hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <BookOpen className="h-5 w-5 text-blue-600" />
                          <Badge className={getDifficultyColor(module.difficulty)}>
                            {module.difficulty}
                          </Badge>
                        </div>
                        {module.certificateEarned && (
                          <Award className="h-5 w-5 text-yellow-500" />
                        )}
                      </div>
                      <CardTitle className="text-lg">{module.title}</CardTitle>
                      <CardDescription className="text-sm">
                        {module.description}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Duration:</span>
                          <span>{module.estimatedDuration} minutes</span>
                        </div>
                        
                        {module.progressPercentage !== undefined && (
                          <div>
                            <div className="flex items-center justify-between text-sm mb-1">
                              <span className="text-muted-foreground">Progress:</span>
                              <span>{module.progressPercentage}%</span>
                            </div>
                            <Progress value={module.progressPercentage} className="h-2" />
                          </div>
                        )}

                        <div className="space-y-2">
                          <p className="text-sm font-medium">Learning Objectives:</p>
                          <ul className="text-xs text-muted-foreground space-y-1">
                            {module.objectives.slice(0, 2).map((objective, index) => (
                              <li key={index}>• {objective}</li>
                            ))}
                            {module.objectives.length > 2 && (
                              <li>• +{module.objectives.length - 2} more...</li>
                            )}
                          </ul>
                        </div>

                        <Button 
                          className="w-full" 
                          size="sm"
                          onClick={() => handleStartModule(module.id)}
                          disabled={startSessionMutation.isPending}
                        >
                          {startSessionMutation.isPending ? 'Starting...' : 
                           module.progressPercentage ? 'Continue' : 'Start'} Module
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Practice Scenarios Tab */}
        <TabsContent value="scenarios" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Interactive Scenarios</CardTitle>
              <CardDescription>
                Practice with realistic case studies and simulations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Sample scenarios - these would come from the API */}
                <Card className="cursor-pointer hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                      <Users className="h-5 w-5 text-green-600" />
                      <Badge className="bg-green-100 text-green-800">Patient Case</Badge>
                      <Badge className="bg-yellow-100 text-yellow-800">Intermediate</Badge>
                    </div>
                    <CardTitle className="text-lg">CBC Analysis Challenge</CardTitle>
                    <CardDescription>
                      Analyze abnormal blood work and recommend follow-up tests
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="text-sm">
                        <p className="font-medium">Patient Profile:</p>
                        <p className="text-muted-foreground">45-year-old female, fatigue, pale complexion</p>
                      </div>
                      
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          onClick={() => {
                            setSimulationMode('guided');
                            // startSessionMutation.mutate({ scenarioId: 1, mode: 'guided' });
                          }}
                        >
                          <Brain className="h-4 w-4 mr-1" />
                          Guided
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => {
                            setSimulationMode('assessment');
                            // startSessionMutation.mutate({ scenarioId: 1, mode: 'assessment' });
                          }}
                        >
                          <Target className="h-4 w-4 mr-1" />
                          Assessment
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => {
                            setSimulationMode('free_practice');
                            // startSessionMutation.mutate({ scenarioId: 1, mode: 'free_practice' });
                          }}
                        >
                          <Zap className="h-4 w-4 mr-1" />
                          Free Practice
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="cursor-pointer hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                      <Settings className="h-5 w-5 text-orange-600" />
                      <Badge className="bg-orange-100 text-orange-800">Equipment</Badge>
                      <Badge className="bg-red-100 text-red-800">Advanced</Badge>
                    </div>
                    <CardTitle className="text-lg">Analyzer Calibration</CardTitle>
                    <CardDescription>
                      Troubleshoot and recalibrate laboratory analyzer
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="text-sm">
                        <p className="font-medium">Scenario:</p>
                        <p className="text-muted-foreground">Quality control failures, inconsistent results</p>
                      </div>
                      
                      <div className="flex gap-2">
                        <Button size="sm">
                          <Brain className="h-4 w-4 mr-1" />
                          Guided
                        </Button>
                        <Button size="sm" variant="outline">
                          <Target className="h-4 w-4 mr-1" />
                          Assessment
                        </Button>
                        <Button size="sm" variant="outline">
                          <Zap className="h-4 w-4 mr-1" />
                          Free Practice
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Progress Tab */}
        <TabsContent value="progress" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Modules Completed</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">12/18</div>
                <p className="text-xs text-muted-foreground">67% completion rate</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Average Score</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">87%</div>
                <p className="text-xs text-muted-foreground">
                  <TrendingUp className="h-3 w-3 inline mr-1" />
                  +5% from last month
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Training Hours</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">42.5h</div>
                <p className="text-xs text-muted-foreground">This quarter</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Certificates</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">8</div>
                <p className="text-xs text-muted-foreground">Active certifications</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Recent Training Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <div className="flex-1">
                    <p className="font-medium">Blood Chemistry Analysis</p>
                    <p className="text-sm text-muted-foreground">Completed with 94% score</p>
                  </div>
                  <span className="text-sm text-muted-foreground">2 hours ago</span>
                </div>
                
                <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                  <Play className="h-5 w-5 text-blue-600" />
                  <div className="flex-1">
                    <p className="font-medium">Urinalysis Procedures</p>
                    <p className="text-sm text-muted-foreground">In progress - 60% complete</p>
                  </div>
                  <span className="text-sm text-muted-foreground">Started today</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Certificates Tab */}
        <TabsContent value="certificates" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>My Certificates</CardTitle>
              <CardDescription>
                Professional certifications earned through training completion
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="border border-yellow-200">
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                      <Award className="h-6 w-6 text-yellow-600" />
                      <Badge className="bg-yellow-100 text-yellow-800">Advanced</Badge>
                    </div>
                    <CardTitle className="text-lg">Laboratory Quality Control</CardTitle>
                    <CardDescription>
                      Certificate #LAB-QC-2024-001
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Issued:</span>
                        <span>March 15, 2024</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Valid Until:</span>
                        <span>March 15, 2025</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Final Score:</span>
                        <span className="font-medium">96%</span>
                      </div>
                    </div>
                    <Button size="sm" className="w-full mt-3">
                      Download Certificate
                    </Button>
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