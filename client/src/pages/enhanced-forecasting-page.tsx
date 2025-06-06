import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { 
  Users, 
  TrendingUp, 
  UserCheck, 
  Package, 
  DollarSign, 
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Clock,
  BarChart3,
  PieChart,
  Activity,
  Target,
  Zap,
  ArrowUp,
  ArrowDown,
  Calendar,
  Brain,
  Lightbulb
} from "lucide-react";

export default function EnhancedForecastingPage() {
  const [selectedOptions, setSelectedOptions] = useState({
    patientVolumeAnalysis: true,
    serviceOptimization: true,
    staffingPredictions: true,
    inventoryForecasting: true,
    marketingROI: true,
    cashFlowAnalysis: true,
    competitorAnalysis: false,
    weatherImpact: false
  });

  // Individual forecasting queries
  const patientVolumeQuery = useQuery({
    queryKey: ['/api/forecasting/enhanced/patient-volume'],
    enabled: selectedOptions.patientVolumeAnalysis
  });

  const serviceOptimizationQuery = useQuery({
    queryKey: ['/api/forecasting/enhanced/service-optimization'],
    enabled: selectedOptions.serviceOptimization
  });

  const staffingQuery = useQuery({
    queryKey: ['/api/forecasting/enhanced/staffing'],
    enabled: selectedOptions.staffingPredictions
  });

  const inventoryQuery = useQuery({
    queryKey: ['/api/forecasting/enhanced/inventory'],
    enabled: selectedOptions.inventoryForecasting
  });

  const marketingQuery = useQuery({
    queryKey: ['/api/forecasting/enhanced/marketing-roi'],
    enabled: selectedOptions.marketingROI
  });

  const cashFlowQuery = useQuery({
    queryKey: ['/api/forecasting/enhanced/cash-flow'],
    enabled: selectedOptions.cashFlowAnalysis
  });

  const isLoading = patientVolumeQuery.isLoading || serviceOptimizationQuery.isLoading || 
                   staffingQuery.isLoading || inventoryQuery.isLoading || 
                   marketingQuery.isLoading || cashFlowQuery.isLoading;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Brain className="h-8 w-8 text-primary" />
            Enhanced AI Analytics
          </h1>
          <p className="text-muted-foreground">
            Advanced machine learning insights and predictive analytics for comprehensive business intelligence
          </p>
        </div>
        <Badge variant="secondary" className="flex items-center gap-1">
          <Zap className="h-4 w-4" />
          AI-Powered
        </Badge>
      </div>

      {/* Analytics Options Panel */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Analytics Configuration
          </CardTitle>
          <CardDescription>
            Select advanced analytics modules to generate comprehensive business insights
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(selectedOptions).map(([key, enabled]) => (
              <Button
                key={key}
                variant={enabled ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedOptions(prev => ({ ...prev, [key]: !enabled }))}
                className="justify-start"
              >
                {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="patient-volume" className="space-y-4">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="patient-volume">Patient Volume</TabsTrigger>
          <TabsTrigger value="service-optimization">Service Optimization</TabsTrigger>
          <TabsTrigger value="staffing">Staffing</TabsTrigger>
          <TabsTrigger value="inventory">Inventory</TabsTrigger>
          <TabsTrigger value="marketing">Marketing ROI</TabsTrigger>
          <TabsTrigger value="cash-flow">Cash Flow</TabsTrigger>
        </TabsList>

        {/* Patient Volume Analysis */}
        <TabsContent value="patient-volume" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Patient Volume Forecasting
              </CardTitle>
              <CardDescription>
                Predictive analytics for patient flow optimization and capacity planning
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-4">
                  <div className="animate-pulse bg-muted h-20 rounded" />
                  <div className="animate-pulse bg-muted h-32 rounded" />
                </div>
              ) : patientVolumeQuery.data ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">Predicted Patients</p>
                            <p className="text-2xl font-bold">{patientVolumeQuery.data.predictedPatients}</p>
                          </div>
                          <TrendingUp className="h-8 w-8 text-green-500" />
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">Average Wait Time</p>
                            <p className="text-2xl font-bold">{patientVolumeQuery.data.waitingTimeOptimization.averageWaitTime}min</p>
                          </div>
                          <Clock className="h-8 w-8 text-blue-500" />
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">Peak Capacity</p>
                            <p className="text-2xl font-bold">{patientVolumeQuery.data.waitingTimeOptimization.peakCapacity}</p>
                          </div>
                          <Activity className="h-8 w-8 text-orange-500" />
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Peak Hours</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {patientVolumeQuery.data.peakHours.map((hour: string, index: number) => (
                            <div key={index} className="flex items-center justify-between p-2 bg-muted rounded">
                              <span className="font-medium">{hour}</span>
                              <Badge variant="secondary">High Traffic</Badge>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Service Demand Forecast</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <div className="flex justify-between items-center">
                            <span>Laboratory</span>
                            <div className="flex items-center gap-2">
                              <Progress value={65} className="w-20" />
                              <span className="text-sm font-medium">{patientVolumeQuery.data.serviceDemand.laboratory}</span>
                            </div>
                          </div>
                          <div className="flex justify-between items-center">
                            <span>Radiology</span>
                            <div className="flex items-center gap-2">
                              <Progress value={25} className="w-20" />
                              <span className="text-sm font-medium">{patientVolumeQuery.data.serviceDemand.radiology}</span>
                            </div>
                          </div>
                          <div className="flex justify-between items-center">
                            <span>Consultation</span>
                            <div className="flex items-center gap-2">
                              <Progress value={35} className="w-20" />
                              <span className="text-sm font-medium">{patientVolumeQuery.data.serviceDemand.consultation}</span>
                            </div>
                          </div>
                          <div className="flex justify-between items-center">
                            <span>ECG</span>
                            <div className="flex items-center gap-2">
                              <Progress value={15} className="w-20" />
                              <span className="text-sm font-medium">{patientVolumeQuery.data.serviceDemand.ecg}</span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">Enable Patient Volume Analysis to view insights</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Service Optimization */}
        <TabsContent value="service-optimization" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Service Optimization Insights
              </CardTitle>
              <CardDescription>
                Performance analysis and optimization opportunities across all service lines
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-4">
                  <div className="animate-pulse bg-muted h-20 rounded" />
                  <div className="animate-pulse bg-muted h-32 rounded" />
                </div>
              ) : serviceOptimizationQuery.data ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                          <CheckCircle className="h-5 w-5 text-green-500" />
                          High-Performing Services
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {serviceOptimizationQuery.data.highPerformingServices.map((service: any, index: number) => (
                            <div key={index} className="p-3 border rounded-lg">
                              <div className="flex justify-between items-start mb-2">
                                <h4 className="font-medium">{service.service}</h4>
                                <Badge variant="secondary">
                                  <ArrowUp className="h-3 w-3 mr-1" />
                                  {service.growth.toFixed(1)}%
                                </Badge>
                              </div>
                              <div className="text-sm text-muted-foreground space-y-1">
                                <p>Revenue: ₦{service.revenue.toLocaleString()}</p>
                                <p>Margin: {(service.profitMargin * 100).toFixed(0)}%</p>
                                <p className="text-xs">{service.recommendation}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                          <AlertTriangle className="h-5 w-5 text-orange-500" />
                          Improvement Opportunities
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {serviceOptimizationQuery.data.underperformingServices.map((service: any, index: number) => (
                            <div key={index} className="p-3 border rounded-lg">
                              <div className="flex justify-between items-start mb-2">
                                <h4 className="font-medium">{service.service}</h4>
                                <Badge variant="destructive">
                                  <TrendingDown className="h-3 w-3 mr-1" />
                                  Optimize
                                </Badge>
                              </div>
                              <div className="text-sm text-muted-foreground space-y-1">
                                <p>Issues: {service.issues.join(', ')}</p>
                                <p>Potential: +₦{service.potentialIncrease.toLocaleString()}</p>
                                <p className="text-xs">{service.improvement}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Lightbulb className="h-5 w-5 text-yellow-500" />
                        Cross-Selling Opportunities
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {serviceOptimizationQuery.data.crossSellingOpportunities.map((opportunity: any, index: number) => (
                          <div key={index} className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border">
                            <h4 className="font-medium mb-2">{opportunity.primaryService}</h4>
                            <p className="text-sm text-muted-foreground mb-2">
                              Bundle with: {opportunity.suggestedBundle.join(', ')}
                            </p>
                            <div className="flex justify-between items-center">
                              <span className="text-sm font-medium">Estimated Uplift</span>
                              <Badge variant="secondary">₦{opportunity.estimatedUplift.toLocaleString()}</Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">Enable Service Optimization to view insights</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Staffing Predictions */}
        <TabsContent value="staffing" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserCheck className="h-5 w-5" />
                Staffing Optimization
              </CardTitle>
              <CardDescription>
                AI-powered workforce planning and performance optimization
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-4">
                  <div className="animate-pulse bg-muted h-20 rounded" />
                  <div className="animate-pulse bg-muted h-32 rounded" />
                </div>
              ) : staffingQuery.data ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">Efficiency Score</p>
                            <p className="text-2xl font-bold">{staffingQuery.data.performanceMetrics.efficiency}%</p>
                          </div>
                          <TrendingUp className="h-8 w-8 text-green-500" />
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">Patient Satisfaction</p>
                            <p className="text-2xl font-bold">{staffingQuery.data.performanceMetrics.patientSatisfaction}%</p>
                          </div>
                          <Users className="h-8 w-8 text-blue-500" />
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">Revenue per Staff</p>
                            <p className="text-2xl font-bold">₦{staffingQuery.data.performanceMetrics.revenuePerStaff.toLocaleString()}</p>
                          </div>
                          <DollarSign className="h-8 w-8 text-green-500" />
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Optimal Staff Levels</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {Object.entries(staffingQuery.data.optimalStaffLevels).map(([department, count]) => (
                            <div key={department} className="flex justify-between items-center p-2 bg-muted rounded">
                              <span className="capitalize">{department}</span>
                              <Badge variant="secondary">{count} staff</Badge>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Training Needs</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {staffingQuery.data.trainingNeeds.map((need: string, index: number) => (
                            <div key={index} className="flex items-center gap-2 p-2 bg-blue-50 rounded">
                              <Target className="h-4 w-4 text-blue-500" />
                              <span className="text-sm">{need}</span>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">Enable Staffing Predictions to view insights</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Inventory Forecasting */}
        <TabsContent value="inventory" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Inventory & Supply Chain Intelligence
              </CardTitle>
              <CardDescription>
                Predictive inventory management and supply chain optimization
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-4">
                  <div className="animate-pulse bg-muted h-20 rounded" />
                  <div className="animate-pulse bg-muted h-32 rounded" />
                </div>
              ) : inventoryQuery.data ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Consumables Demand</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {inventoryQuery.data.consumablesDemand.map((item: any, index: number) => (
                            <div key={index} className="p-3 border rounded-lg">
                              <div className="flex justify-between items-start mb-2">
                                <h4 className="font-medium">{item.item}</h4>
                                <Badge variant={item.currentStock < item.reorderPoint ? "destructive" : "secondary"}>
                                  {item.currentStock} units
                                </Badge>
                              </div>
                              <div className="text-sm text-muted-foreground space-y-1">
                                <p>Predicted Usage: {item.predictedUsage}</p>
                                <p>Reorder Point: {item.reorderPoint}</p>
                                <p>Cost Optimization: {item.costOptimization}%</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Equipment Maintenance</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {inventoryQuery.data.equipmentMaintenance.map((equipment: any, index: number) => (
                            <div key={index} className="p-3 border rounded-lg">
                              <div className="flex justify-between items-start mb-2">
                                <h4 className="font-medium">{equipment.equipment}</h4>
                                <Badge variant="outline">
                                  <Calendar className="h-3 w-3 mr-1" />
                                  {new Date(equipment.nextMaintenance).toLocaleDateString()}
                                </Badge>
                              </div>
                              <div className="text-sm text-muted-foreground space-y-1">
                                <p>Cost: ₦{equipment.estimatedCost.toLocaleString()}</p>
                                <p>Revenue Impact: ₦{equipment.impactOnRevenue.toLocaleString()}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Supplier Optimization</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="text-center p-4 bg-green-50 rounded-lg">
                          <DollarSign className="h-8 w-8 mx-auto mb-2 text-green-500" />
                          <p className="text-lg font-bold">₦{inventoryQuery.data.supplierOptimization.costSavings.toLocaleString()}</p>
                          <p className="text-sm text-muted-foreground">Potential Savings</p>
                        </div>
                        <div className="col-span-2 space-y-2">
                          <h4 className="font-medium">Quality Improvements</h4>
                          {inventoryQuery.data.supplierOptimization.qualityImprovement.map((improvement: string, index: number) => (
                            <div key={index} className="flex items-center gap-2 text-sm">
                              <CheckCircle className="h-4 w-4 text-green-500" />
                              {improvement}
                            </div>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">Enable Inventory Forecasting to view insights</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Marketing ROI */}
        <TabsContent value="marketing" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChart className="h-5 w-5" />
                Marketing ROI Analysis
              </CardTitle>
              <CardDescription>
                Performance analytics and optimization for marketing campaigns and patient acquisition
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-4">
                  <div className="animate-pulse bg-muted h-20 rounded" />
                  <div className="animate-pulse bg-muted h-32 rounded" />
                </div>
              ) : marketingQuery.data ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Channel Performance</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {marketingQuery.data.channelPerformance.map((channel: any, index: number) => (
                            <div key={index} className="p-3 border rounded-lg">
                              <div className="flex justify-between items-start mb-2">
                                <h4 className="font-medium">{channel.channel}</h4>
                                <Badge variant={channel.roi > 150 ? "default" : "secondary"}>
                                  {channel.roi}% ROI
                                </Badge>
                              </div>
                              <div className="text-sm text-muted-foreground space-y-1">
                                <p>Investment: ₦{channel.investment.toLocaleString()}</p>
                                <p>Return: ₦{channel.return.toLocaleString()}</p>
                                <p>Patients Acquired: {channel.patientAcquisition}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Campaign Effectiveness</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {marketingQuery.data.campaignEffectiveness.map((campaign: any, index: number) => (
                            <div key={index} className="p-3 border rounded-lg">
                              <div className="flex justify-between items-start mb-2">
                                <h4 className="font-medium">{campaign.campaign}</h4>
                                <Badge variant="outline">{campaign.retentionRate}% Retention</Badge>
                              </div>
                              <div className="text-sm text-muted-foreground space-y-1">
                                <p>Cost: ₦{campaign.cost.toLocaleString()}</p>
                                <p>Revenue: ₦{campaign.revenue.toLocaleString()}</p>
                                <p>New Patients: {campaign.newPatients}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Seasonal Marketing Strategy</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <h4 className="font-medium mb-3">Best Performing Months</h4>
                          <div className="space-y-2">
                            {marketingQuery.data.seasonalMarketing.bestMonths.map((month: string, index: number) => (
                              <div key={index} className="flex items-center gap-2 p-2 bg-green-50 rounded">
                                <Calendar className="h-4 w-4 text-green-500" />
                                <span>{month}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div>
                          <h4 className="font-medium mb-3">Budget Allocation</h4>
                          <div className="space-y-2">
                            {Object.entries(marketingQuery.data.seasonalMarketing.budgetAllocation).map(([quarter, budget]) => (
                              <div key={quarter} className="flex justify-between items-center p-2 bg-muted rounded">
                                <span>{quarter}</span>
                                <span className="font-medium">₦{(budget as number).toLocaleString()}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">Enable Marketing ROI Analysis to view insights</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Cash Flow Analysis */}
        <TabsContent value="cash-flow" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Cash Flow Intelligence
              </CardTitle>
              <CardDescription>
                Advanced financial forecasting and liquidity analysis for strategic planning
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-4">
                  <div className="animate-pulse bg-muted h-20 rounded" />
                  <div className="animate-pulse bg-muted h-32 rounded" />
                </div>
              ) : cashFlowQuery.data ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">Avg Collection Time</p>
                            <p className="text-2xl font-bold">{cashFlowQuery.data.paymentPatterns.averageCollectionTime} days</p>
                          </div>
                          <Clock className="h-8 w-8 text-blue-500" />
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">Bad Debt Rate</p>
                            <p className="text-2xl font-bold">{cashFlowQuery.data.paymentPatterns.badDebtRate}%</p>
                          </div>
                          <AlertTriangle className="h-8 w-8 text-orange-500" />
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">Min Cash Reserve</p>
                            <p className="text-2xl font-bold">₦{cashFlowQuery.data.liquidityAnalysis.minimumCashReserve.toLocaleString()}</p>
                          </div>
                          <DollarSign className="h-8 w-8 text-green-500" />
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">12-Month Cash Flow Projection</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {cashFlowQuery.data.monthlyProjections.map((projection: any, index: number) => (
                          <div key={index} className="grid grid-cols-5 gap-4 p-2 border-b">
                            <span className="font-medium">{projection.month}</span>
                            <span className="text-green-600">₦{projection.income.toLocaleString()}</span>
                            <span className="text-red-600">₦{projection.expenses.toLocaleString()}</span>
                            <span className={projection.netFlow >= 0 ? "text-green-600" : "text-red-600"}>
                              ₦{projection.netFlow.toLocaleString()}
                            </span>
                            <span className="font-medium">₦{projection.cumulativeBalance.toLocaleString()}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Investment Opportunities</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {cashFlowQuery.data.liquidityAnalysis.investmentOpportunities.map((opportunity: string, index: number) => (
                            <div key={index} className="flex items-center gap-2 p-2 bg-blue-50 rounded">
                              <TrendingUp className="h-4 w-4 text-blue-500" />
                              <span className="text-sm">{opportunity}</span>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Risk Mitigation</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {cashFlowQuery.data.liquidityAnalysis.riskMitigation.map((risk: string, index: number) => (
                            <div key={index} className="flex items-center gap-2 p-2 bg-orange-50 rounded">
                              <AlertTriangle className="h-4 w-4 text-orange-500" />
                              <span className="text-sm">{risk}</span>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">Enable Cash Flow Analysis to view insights</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}