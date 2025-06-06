import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TrendingUp, TrendingDown, Calendar, AlertTriangle, Target, Brain, Lightbulb } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from "recharts";

interface ForecastResult {
  predictedRevenue: number;
  confidence: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  seasonalPattern: string;
  riskFactors: string[];
  recommendations: string[];
  keyInsights: string[];
}

interface MonthlyForecast {
  month: string;
  predictedRevenue: number;
  confidence: number;
  breakdown: {
    cash: number;
    pos: number;
    transfer: number;
  };
  expectedTransactions: number;
  growthRate: number;
}

interface RevenueForecastingProps {
  branchId?: number;
}

export function RevenueForecasting({ branchId }: RevenueForecastingProps) {
  const [forecastDays, setForecastDays] = useState<string>("30");
  const [selectedTimeframe, setSelectedTimeframe] = useState<string>("monthly");

  // Fetch revenue forecast
  const { data: forecast, isLoading: forecastLoading } = useQuery({
    queryKey: ['forecast', 'revenue', 'predict', forecastDays, branchId],
    queryFn: () => fetch(`/api/forecasting/revenue/predict?daysAhead=${forecastDays}${branchId ? `&branchId=${branchId}` : ''}`).then(res => res.json())
  });

  // Fetch monthly forecasts
  const { data: monthlyForecasts, isLoading: monthlyLoading } = useQuery({
    queryKey: ['forecast', 'revenue', 'monthly', branchId],
    queryFn: () => fetch(`/api/forecasting/revenue/monthly${branchId ? `?branchId=${branchId}` : ''}`).then(res => res.json())
  });

  // Fetch historical data for visualization
  const { data: historicalData, isLoading: historicalLoading } = useQuery({
    queryKey: ['forecast', 'revenue', 'historical', branchId],
    queryFn: () => fetch(`/api/forecasting/revenue/historical${branchId ? `?branchId=${branchId}` : ''}`).then(res => res.json())
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'increasing':
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'decreasing':
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      default:
        return <Target className="h-4 w-4 text-blue-500" />;
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return "bg-green-100 text-green-800";
    if (confidence >= 0.6) return "bg-yellow-100 text-yellow-800";
    return "bg-red-100 text-red-800";
  };

  const formatConfidence = (confidence: number) => {
    return `${(confidence * 100).toFixed(0)}%`;
  };

  // Prepare chart data
  const chartData = historicalData?.map((item: any) => ({
    date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    revenue: item.revenue,
    transactions: item.transactionCount,
    avgTransaction: item.averageTransaction
  })) || [];

  const monthlyChartData = monthlyForecasts?.map((forecast: MonthlyForecast) => ({
    month: forecast.month.split(' ')[0],
    predicted: forecast.predictedRevenue,
    confidence: forecast.confidence * 100,
    cash: forecast.breakdown.cash,
    pos: forecast.breakdown.pos,
    transfer: forecast.breakdown.transfer,
    transactions: forecast.expectedTransactions
  })) || [];

  if (forecastLoading || monthlyLoading || historicalLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="space-y-2">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-gray-200 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-purple-600" />
          <h2 className="text-xl font-semibold">AI Revenue Forecasting</h2>
        </div>
        
        <div className="flex gap-3">
          <Select value={forecastDays} onValueChange={setForecastDays}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">7 Days</SelectItem>
              <SelectItem value="14">14 Days</SelectItem>
              <SelectItem value="30">30 Days</SelectItem>
              <SelectItem value="60">60 Days</SelectItem>
              <SelectItem value="90">90 Days</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={selectedTimeframe} onValueChange={setSelectedTimeframe}>
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">Daily</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Key Forecast Metrics */}
      {forecast && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Predicted Revenue</CardTitle>
              {getTrendIcon(forecast.trend)}
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(forecast.predictedRevenue)}</div>
              <p className="text-xs text-muted-foreground">
                Next {forecastDays} days
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Confidence Level</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatConfidence(forecast.confidence)}</div>
              <Badge className={getConfidenceColor(forecast.confidence)}>
                {forecast.confidence >= 0.8 ? 'High' : forecast.confidence >= 0.6 ? 'Medium' : 'Low'}
              </Badge>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Trend Direction</CardTitle>
              {getTrendIcon(forecast.trend)}
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold capitalize">{forecast.trend}</div>
              <p className="text-xs text-muted-foreground">
                Current trajectory
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Seasonal Pattern</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold capitalize">{forecast.seasonalPattern.replace('_', ' ')}</div>
              <p className="text-xs text-muted-foreground">
                Pattern detected
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Forecast Visualization */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Historical Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Historical Revenue Trend</CardTitle>
            <CardDescription>Past performance and patterns</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis tickFormatter={(value) => `₦${(value / 1000).toFixed(0)}k`} />
                <Tooltip 
                  formatter={(value: any, name: string) => [
                    name === 'revenue' ? formatCurrency(value) : value,
                    name === 'revenue' ? 'Revenue' : name === 'transactions' ? 'Transactions' : 'Avg Transaction'
                  ]}
                />
                <Legend />
                <Line type="monotone" dataKey="revenue" stroke="#8884d8" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Monthly Forecasts */}
        <Card>
          <CardHeader>
            <CardTitle>Monthly Revenue Forecast</CardTitle>
            <CardDescription>12-month revenue predictions</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={monthlyChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis tickFormatter={(value) => `₦${(value / 1000).toFixed(0)}k`} />
                <Tooltip 
                  formatter={(value: any, name: string) => [
                    name === 'predicted' ? formatCurrency(value) : `${value}%`,
                    name === 'predicted' ? 'Predicted Revenue' : 'Confidence'
                  ]}
                />
                <Legend />
                <Area type="monotone" dataKey="predicted" stackId="1" stroke="#8884d8" fill="#8884d8" fillOpacity={0.6} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* AI Insights and Recommendations */}
      {forecast && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Key Insights */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="h-4 w-4 text-yellow-500" />
                Key Insights
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {forecast.keyInsights.map((insight, index) => (
                  <div key={index} className="flex items-start gap-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                    <p className="text-sm text-gray-700">{insight}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Recommendations */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-4 w-4 text-green-500" />
                Recommendations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {forecast.recommendations.map((recommendation, index) => (
                  <div key={index} className="flex items-start gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                    <p className="text-sm text-gray-700">{recommendation}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Risk Factors */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-500" />
                Risk Factors
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {forecast.riskFactors.length > 0 ? forecast.riskFactors.map((risk, index) => (
                  <div key={index} className="flex items-start gap-2">
                    <div className="w-2 h-2 bg-red-500 rounded-full mt-2 flex-shrink-0"></div>
                    <p className="text-sm text-gray-700">{risk}</p>
                  </div>
                )) : (
                  <p className="text-sm text-gray-500">No significant risk factors detected</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Payment Method Forecast Breakdown */}
      {monthlyForecasts && (
        <Card>
          <CardHeader>
            <CardTitle>Payment Method Forecast Breakdown</CardTitle>
            <CardDescription>Predicted distribution across payment methods</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={monthlyChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis tickFormatter={(value) => `₦${(value / 1000).toFixed(0)}k`} />
                <Tooltip 
                  formatter={(value: any) => [formatCurrency(value), 'Revenue']}
                />
                <Legend />
                <Area type="monotone" dataKey="cash" stackId="1" stroke="#ffc658" fill="#ffc658" />
                <Area type="monotone" dataKey="pos" stackId="1" stroke="#8884d8" fill="#8884d8" />
                <Area type="monotone" dataKey="transfer" stackId="1" stroke="#82ca9d" fill="#82ca9d" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}