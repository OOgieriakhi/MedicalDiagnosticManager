import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Award, Star, Trophy, Users, TrendingUp, Medal, Target, CheckCircle } from "lucide-react";

// Form schemas
const badgeDefinitionSchema = z.object({
  name: z.string().min(1, "Badge name is required"),
  description: z.string().min(1, "Description is required"),
  icon: z.string().min(1, "Icon is required"),
  backgroundColor: z.string().min(1, "Background color is required"),
  criteria: z.string().min(1, "Criteria is required"),
  targetValue: z.number().min(1, "Target value must be at least 1"),
  category: z.string().min(1, "Category is required")
});

const recognitionEventSchema = z.object({
  recipientId: z.number().min(1, "Recipient is required"),
  eventType: z.string().min(1, "Event type is required"),
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required")
});

const performanceMetricSchema = z.object({
  userId: z.number().min(1, "User is required"),
  metricType: z.string().min(1, "Metric type is required"),
  value: z.number().min(0, "Value must be non-negative"),
  period: z.string().min(1, "Period is required")
});

export default function StaffRecognition() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedPeriod, setSelectedPeriod] = useState("month");

  // Queries
  const { data: badgeDefinitions = [] } = useQuery({
    queryKey: ["/api/badge-definitions"],
    enabled: !!user
  });

  const { data: userAchievements = [] } = useQuery({
    queryKey: ["/api/staff-achievements", user?.id],
    enabled: !!user
  });

  const { data: badgeSummary } = useQuery({
    queryKey: ["/api/staff-badge-summary", user?.id],
    enabled: !!user
  });

  const { data: leaderboard = [] } = useQuery({
    queryKey: ["/api/leaderboard", selectedPeriod],
    enabled: !!user
  });

  const { data: recognitionEvents = [] } = useQuery({
    queryKey: ["/api/recognition-events"],
    enabled: !!user
  });

  const { data: performanceMetrics = [] } = useQuery({
    queryKey: ["/api/performance-metrics", user?.id, selectedPeriod],
    enabled: !!user
  });

  // Mutations
  const createBadgeMutation = useMutation({
    mutationFn: async (data: z.infer<typeof badgeDefinitionSchema>) => {
      const res = await apiRequest("POST", "/api/badge-definitions", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/badge-definitions"] });
      toast({ title: "Badge created successfully" });
    }
  });

  const createRecognitionMutation = useMutation({
    mutationFn: async (data: z.infer<typeof recognitionEventSchema>) => {
      const res = await apiRequest("POST", "/api/recognition-events", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/recognition-events"] });
      toast({ title: "Recognition event created successfully" });
    }
  });

  const recordMetricMutation = useMutation({
    mutationFn: async (data: z.infer<typeof performanceMetricSchema>) => {
      const res = await apiRequest("POST", "/api/performance-metrics", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/performance-metrics"] });
      toast({ title: "Performance metric recorded successfully" });
    }
  });

  // Forms
  const badgeForm = useForm<z.infer<typeof badgeDefinitionSchema>>({
    resolver: zodResolver(badgeDefinitionSchema),
    defaultValues: {
      name: "",
      description: "",
      icon: "Award",
      backgroundColor: "#3B82F6",
      criteria: "",
      targetValue: 1,
      category: "performance"
    }
  });

  const recognitionForm = useForm<z.infer<typeof recognitionEventSchema>>({
    resolver: zodResolver(recognitionEventSchema),
    defaultValues: {
      recipientId: 0,
      eventType: "peer_recognition",
      title: "",
      description: ""
    }
  });

  const metricForm = useForm<z.infer<typeof performanceMetricSchema>>({
    resolver: zodResolver(performanceMetricSchema),
    defaultValues: {
      userId: user?.id || 0,
      metricType: "patients_processed",
      value: 0,
      period: "daily"
    }
  });

  const getIconComponent = (iconName: string) => {
    const icons = {
      Award, Star, Trophy, Users, TrendingUp, Medal, Target, CheckCircle
    };
    const IconComponent = icons[iconName as keyof typeof icons] || Award;
    return <IconComponent className="w-4 h-4" />;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Staff Recognition</h2>
          <p className="text-muted-foreground">
            Track achievements, recognize excellence, and boost team morale
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="badges">Badges</TabsTrigger>
          <TabsTrigger value="recognition">Recognition</TabsTrigger>
          <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
          <TabsTrigger value="metrics">Metrics</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Badges</CardTitle>
                <Award className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{badgeSummary?.totalBadges || 0}</div>
                <p className="text-xs text-muted-foreground">
                  +{badgeSummary?.completedBadges || 0} completed
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Completed Badges</CardTitle>
                <Trophy className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{badgeSummary?.completedBadges || 0}</div>
                <p className="text-xs text-muted-foreground">
                  {badgeSummary?.totalBadges ? 
                    Math.round((badgeSummary.completedBadges / badgeSummary.totalBadges) * 100) : 0}% completion rate
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">In Progress</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{badgeSummary?.inProgressBadges || 0}</div>
                <p className="text-xs text-muted-foreground">
                  Working towards completion
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Recognition Events</CardTitle>
                <Star className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{recognitionEvents.length}</div>
                <p className="text-xs text-muted-foreground">
                  This month
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Recent Achievements</CardTitle>
                <CardDescription>Your latest badge progress</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {userAchievements.slice(0, 5).map((achievement: any) => (
                  <div key={achievement.id} className="flex items-center space-x-4">
                    <div 
                      className="w-8 h-8 rounded-full flex items-center justify-center text-white"
                      style={{ backgroundColor: achievement.badgeColor }}
                    >
                      {getIconComponent(achievement.badgeIcon)}
                    </div>
                    <div className="flex-1 space-y-1">
                      <p className="text-sm font-medium">{achievement.badgeName}</p>
                      <Progress 
                        value={achievement.isCompleted ? 100 : (parseInt(achievement.progress) / achievement.targetValue) * 100} 
                        className="h-2"
                      />
                    </div>
                    <Badge variant={achievement.isCompleted ? "default" : "secondary"}>
                      {achievement.isCompleted ? "Completed" : 
                        `${achievement.progress}/${achievement.targetValue}`}
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recent Recognition</CardTitle>
                <CardDescription>Latest team recognitions</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {recognitionEvents.slice(0, 5).map((event: any) => (
                  <div key={event.id} className="flex items-start space-x-4">
                    <Star className="w-5 h-5 text-yellow-500 mt-0.5" />
                    <div className="flex-1 space-y-1">
                      <p className="text-sm font-medium">{event.title}</p>
                      <p className="text-xs text-muted-foreground">{event.description}</p>
                      <p className="text-xs text-muted-foreground">
                        From {event.nominatorName} to {event.recipientName}
                      </p>
                    </div>
                    <Badge variant={event.isApproved ? "default" : "secondary"}>
                      {event.isApproved ? "Approved" : "Pending"}
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="badges" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium">Badge System</h3>
            {user?.role === 'admin' && (
              <Dialog>
                <DialogTrigger asChild>
                  <Button>Create Badge</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New Badge</DialogTitle>
                    <DialogDescription>
                      Define a new achievement badge for staff recognition
                    </DialogDescription>
                  </DialogHeader>
                  <Form {...badgeForm}>
                    <form onSubmit={badgeForm.handleSubmit((data) => createBadgeMutation.mutate(data))} className="space-y-4">
                      <FormField
                        control={badgeForm.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Badge Name</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter badge name" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={badgeForm.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Description</FormLabel>
                            <FormControl>
                              <Textarea placeholder="Enter badge description" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={badgeForm.control}
                          name="icon"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Icon</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select icon" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="Award">Award</SelectItem>
                                  <SelectItem value="Star">Star</SelectItem>
                                  <SelectItem value="Trophy">Trophy</SelectItem>
                                  <SelectItem value="Medal">Medal</SelectItem>
                                  <SelectItem value="Target">Target</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={badgeForm.control}
                          name="category"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Category</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select category" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="performance">Performance</SelectItem>
                                  <SelectItem value="teamwork">Teamwork</SelectItem>
                                  <SelectItem value="leadership">Leadership</SelectItem>
                                  <SelectItem value="innovation">Innovation</SelectItem>
                                  <SelectItem value="service">Service</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={badgeForm.control}
                        name="targetValue"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Target Value</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                placeholder="Enter target value" 
                                {...field}
                                onChange={e => field.onChange(parseInt(e.target.value))}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={badgeForm.control}
                        name="criteria"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Criteria</FormLabel>
                            <FormControl>
                              <Textarea placeholder="Enter achievement criteria" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <Button type="submit" disabled={createBadgeMutation.isPending}>
                        {createBadgeMutation.isPending ? "Creating..." : "Create Badge"}
                      </Button>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {badgeDefinitions.map((badge: any) => (
              <Card key={badge.id}>
                <CardHeader>
                  <div className="flex items-center space-x-2">
                    <div 
                      className="w-8 h-8 rounded-full flex items-center justify-center text-white"
                      style={{ backgroundColor: badge.backgroundColor }}
                    >
                      {getIconComponent(badge.icon)}
                    </div>
                    <div>
                      <CardTitle className="text-base">{badge.name}</CardTitle>
                      <Badge variant="outline">{badge.category}</Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-2">{badge.description}</p>
                  <p className="text-xs text-muted-foreground">
                    Target: {badge.targetValue} • Criteria: {badge.criteria}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="recognition" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium">Recognition Events</h3>
            <Dialog>
              <DialogTrigger asChild>
                <Button>Create Recognition</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Recognition Event</DialogTitle>
                  <DialogDescription>
                    Recognize a team member's outstanding contribution
                  </DialogDescription>
                </DialogHeader>
                <Form {...recognitionForm}>
                  <form onSubmit={recognitionForm.handleSubmit((data) => createRecognitionMutation.mutate(data))} className="space-y-4">
                    <FormField
                      control={recognitionForm.control}
                      name="recipientId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Recipient</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              placeholder="Enter recipient user ID" 
                              {...field}
                              onChange={e => field.onChange(parseInt(e.target.value))}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={recognitionForm.control}
                      name="eventType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Recognition Type</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select recognition type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="peer_recognition">Peer Recognition</SelectItem>
                              <SelectItem value="manager_recognition">Manager Recognition</SelectItem>
                              <SelectItem value="customer_compliment">Customer Compliment</SelectItem>
                              <SelectItem value="achievement">Achievement</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={recognitionForm.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Title</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter recognition title" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={recognitionForm.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description</FormLabel>
                          <FormControl>
                            <Textarea placeholder="Describe the recognition details" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button type="submit" disabled={createRecognitionMutation.isPending}>
                      {createRecognitionMutation.isPending ? "Creating..." : "Create Recognition"}
                    </Button>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>

          <div className="space-y-4">
            {recognitionEvents.map((event: any) => (
              <Card key={event.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Star className="w-5 h-5 text-yellow-500" />
                      <div>
                        <CardTitle className="text-base">{event.title}</CardTitle>
                        <CardDescription>
                          {event.nominatorName} recognized {event.recipientName}
                        </CardDescription>
                      </div>
                    </div>
                    <Badge variant={event.isApproved ? "default" : "secondary"}>
                      {event.isApproved ? "Approved" : "Pending"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-2">{event.description}</p>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Type: {event.eventType.replace('_', ' ')}</span>
                    <span>{new Date(event.createdAt).toLocaleDateString()}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="leaderboard" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium">Team Leaderboard</h3>
            <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Select period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
                <SelectItem value="quarter">This Quarter</SelectItem>
                <SelectItem value="year">This Year</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-4">
            {leaderboard.map((member: any, index: number) => (
              <Card key={member.userId}>
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium">{member.username}</p>
                      <p className="text-sm text-muted-foreground">
                        {member.recentAchievements} recent achievements
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">{member.totalPoints || 0} points</p>
                    <p className="text-sm text-muted-foreground">
                      {member.completedBadges || 0} badges
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="metrics" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium">Performance Metrics</h3>
            <Dialog>
              <DialogTrigger asChild>
                <Button>Record Metric</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Record Performance Metric</DialogTitle>
                  <DialogDescription>
                    Log a performance metric for tracking progress
                  </DialogDescription>
                </DialogHeader>
                <Form {...metricForm}>
                  <form onSubmit={metricForm.handleSubmit((data) => recordMetricMutation.mutate(data))} className="space-y-4">
                    <FormField
                      control={metricForm.control}
                      name="metricType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Metric Type</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select metric type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="patients_processed">Patients Processed</SelectItem>
                              <SelectItem value="tests_completed">Tests Completed</SelectItem>
                              <SelectItem value="customer_satisfaction">Customer Satisfaction</SelectItem>
                              <SelectItem value="efficiency_score">Efficiency Score</SelectItem>
                              <SelectItem value="revenue_generated">Revenue Generated</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={metricForm.control}
                      name="value"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Value</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              placeholder="Enter metric value" 
                              {...field}
                              onChange={e => field.onChange(parseFloat(e.target.value))}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={metricForm.control}
                      name="period"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Period</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select period" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="daily">Daily</SelectItem>
                              <SelectItem value="weekly">Weekly</SelectItem>
                              <SelectItem value="monthly">Monthly</SelectItem>
                              <SelectItem value="quarterly">Quarterly</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button type="submit" disabled={recordMetricMutation.isPending}>
                      {recordMetricMutation.isPending ? "Recording..." : "Record Metric"}
                    </Button>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {performanceMetrics.map((metric: any) => (
              <Card key={metric.id}>
                <CardHeader>
                  <CardTitle className="text-base">
                    {metric.metricType.replace('_', ' ').toUpperCase()}
                  </CardTitle>
                  <CardDescription>{metric.period}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{metric.value}</div>
                  <p className="text-xs text-muted-foreground">
                    {new Date(metric.createdAt).toLocaleDateString()}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}