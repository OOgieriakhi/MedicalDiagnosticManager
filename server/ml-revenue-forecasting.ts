import { pool } from "./db";

interface RevenueForecastData {
  date: string;
  revenue: number;
  transactionCount: number;
  averageTransaction: number;
  paymentMethodDistribution: {
    cash: number;
    pos: number;
    transfer: number;
  };
  serviceCategories: {
    laboratory: number;
    radiology: number;
    ecg: number;
    consultation: number;
    general: number;
  };
  dayOfWeek: number;
  monthOfYear: number;
  isWeekend: boolean;
  isHoliday: boolean;
}

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

class RevenueForecasting {
  
  /**
   * Get historical revenue data for analysis
   */
  async getHistoricalData(tenantId: number, branchId?: number, months: number = 12): Promise<RevenueForecastData[]> {
    let query = `
      SELECT 
        DATE(transaction_time) as date,
        SUM(CAST(amount AS DECIMAL)) as revenue,
        COUNT(*) as transaction_count,
        AVG(CAST(amount AS DECIMAL)) as average_transaction,
        SUM(CASE WHEN payment_method = 'cash' THEN CAST(amount AS DECIMAL) ELSE 0 END) as cash_revenue,
        SUM(CASE WHEN payment_method = 'pos' THEN CAST(amount AS DECIMAL) ELSE 0 END) as pos_revenue,
        SUM(CASE WHEN payment_method = 'transfer' THEN CAST(amount AS DECIMAL) ELSE 0 END) as transfer_revenue,
        SUM(CASE WHEN receipt_number LIKE '%LAB%' OR receipt_number LIKE '%RCP-2025%' THEN CAST(amount AS DECIMAL) ELSE 0 END) as laboratory_revenue,
        SUM(CASE WHEN receipt_number LIKE '%RAD%' THEN CAST(amount AS DECIMAL) ELSE 0 END) as radiology_revenue,
        SUM(CASE WHEN receipt_number LIKE '%ECG%' THEN CAST(amount AS DECIMAL) ELSE 0 END) as ecg_revenue,
        SUM(CASE WHEN receipt_number LIKE '%CONS%' THEN CAST(amount AS DECIMAL) ELSE 0 END) as consultation_revenue,
        EXTRACT(DOW FROM transaction_time) as day_of_week,
        EXTRACT(MONTH FROM transaction_time) as month_of_year
      FROM daily_transactions 
      WHERE tenant_id = $1 
        AND verification_status = 'verified'
        AND transaction_time >= CURRENT_DATE - INTERVAL '${months} months'
    `;

    const params = [tenantId];
    let paramIndex = 2;

    if (branchId) {
      query += ` AND branch_id = $${paramIndex}`;
      params.push(branchId);
      paramIndex++;
    }

    query += ` GROUP BY DATE(transaction_time), EXTRACT(DOW FROM transaction_time), EXTRACT(MONTH FROM transaction_time)
               ORDER BY DATE(transaction_time)`;

    const result = await pool.query(query, params);
    
    return result.rows.map(row => ({
      date: row.date,
      revenue: parseFloat(row.revenue),
      transactionCount: parseInt(row.transaction_count),
      averageTransaction: parseFloat(row.average_transaction),
      paymentMethodDistribution: {
        cash: parseFloat(row.cash_revenue),
        pos: parseFloat(row.pos_revenue),
        transfer: parseFloat(row.transfer_revenue)
      },
      serviceCategories: {
        laboratory: parseFloat(row.laboratory_revenue),
        radiology: parseFloat(row.radiology_revenue),
        ecg: parseFloat(row.ecg_revenue),
        consultation: parseFloat(row.consultation_revenue),
        general: parseFloat(row.revenue) - parseFloat(row.laboratory_revenue) - 
                parseFloat(row.radiology_revenue) - parseFloat(row.ecg_revenue) - parseFloat(row.consultation_revenue)
      },
      dayOfWeek: parseInt(row.day_of_week),
      monthOfYear: parseInt(row.month_of_year),
      isWeekend: parseInt(row.day_of_week) === 0 || parseInt(row.day_of_week) === 6,
      isHoliday: false // Can be enhanced with holiday detection
    }));
  }

  /**
   * Calculate moving averages for trend analysis
   */
  calculateMovingAverage(data: number[], window: number): number[] {
    const result: number[] = [];
    for (let i = 0; i < data.length; i++) {
      if (i < window - 1) {
        result.push(data[i]);
      } else {
        const sum = data.slice(i - window + 1, i + 1).reduce((a, b) => a + b, 0);
        result.push(sum / window);
      }
    }
    return result;
  }

  /**
   * Detect seasonal patterns in revenue data
   */
  detectSeasonalPatterns(data: RevenueForecastData[]): { pattern: string; strength: number } {
    const monthlyAverages: { [key: number]: number[] } = {};
    
    data.forEach(record => {
      if (!monthlyAverages[record.monthOfYear]) {
        monthlyAverages[record.monthOfYear] = [];
      }
      monthlyAverages[record.monthOfYear].push(record.revenue);
    });

    const monthlyMeans = Object.keys(monthlyAverages).map(month => {
      const revenues = monthlyAverages[parseInt(month)];
      return revenues.reduce((a, b) => a + b, 0) / revenues.length;
    });

    const overallMean = monthlyMeans.reduce((a, b) => a + b, 0) / monthlyMeans.length;
    const variance = monthlyMeans.reduce((sum, mean) => sum + Math.pow(mean - overallMean, 2), 0) / monthlyMeans.length;
    const strength = Math.sqrt(variance) / overallMean;

    let pattern = 'stable';
    if (strength > 0.2) {
      const maxMonth = monthlyMeans.indexOf(Math.max(...monthlyMeans)) + 1;
      const minMonth = monthlyMeans.indexOf(Math.min(...monthlyMeans)) + 1;
      
      if (maxMonth >= 6 && maxMonth <= 8) pattern = 'summer_peak';
      else if (maxMonth >= 11 || maxMonth <= 2) pattern = 'holiday_peak';
      else if (maxMonth >= 3 && maxMonth <= 5) pattern = 'spring_peak';
      else pattern = 'irregular';
    }

    return { pattern, strength };
  }

  /**
   * Simple linear regression for trend analysis
   */
  linearRegression(x: number[], y: number[]): { slope: number; intercept: number; r2: number } {
    const n = x.length;
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0);
    const sumYY = y.reduce((sum, yi) => sum + yi * yi, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // Calculate R-squared
    const meanY = sumY / n;
    const ssRes = y.reduce((sum, yi, i) => sum + Math.pow(yi - (slope * x[i] + intercept), 2), 0);
    const ssTot = y.reduce((sum, yi) => sum + Math.pow(yi - meanY, 2), 0);
    const r2 = 1 - (ssRes / ssTot);

    return { slope, intercept, r2 };
  }

  /**
   * Generate revenue forecast for next period
   */
  async generateForecast(tenantId: number, branchId?: number, daysAhead: number = 30): Promise<ForecastResult> {
    const historicalData = await this.getHistoricalData(tenantId, branchId);
    
    if (historicalData.length < 30) {
      throw new Error('Insufficient historical data for accurate forecasting. Need at least 30 days of data.');
    }

    // Prepare data for analysis
    const revenues = historicalData.map(d => d.revenue);
    const dates = historicalData.map((_, index) => index);
    
    // Calculate trends
    const ma7 = this.calculateMovingAverage(revenues, 7);
    const ma30 = this.calculateMovingAverage(revenues, 30);
    const regression = this.linearRegression(dates, revenues);
    const seasonal = this.detectSeasonalPatterns(historicalData);

    // Generate prediction
    const lastIndex = dates[dates.length - 1];
    const predictedRevenue = regression.slope * (lastIndex + daysAhead) + regression.intercept;
    
    // Apply seasonal adjustment
    const currentMonth = new Date().getMonth() + 1;
    const seasonalFactor = this.getSeasonalFactor(seasonal.pattern, currentMonth);
    const adjustedPrediction = predictedRevenue * seasonalFactor;

    // Calculate confidence based on R-squared and data consistency
    const recentVariability = this.calculateVariability(revenues.slice(-30));
    const confidence = Math.max(0.4, Math.min(0.95, regression.r2 * (1 - recentVariability)));

    // Determine trend
    const recentTrend = ma7[ma7.length - 1] > ma30[ma30.length - 1];
    const overallTrend = regression.slope > 0;
    let trend: 'increasing' | 'decreasing' | 'stable' = 'stable';
    
    if (Math.abs(regression.slope) > revenues[revenues.length - 1] * 0.001) {
      trend = regression.slope > 0 ? 'increasing' : 'decreasing';
    }

    // Generate insights and recommendations
    const insights = this.generateInsights(historicalData, regression, seasonal);
    const recommendations = this.generateRecommendations(trend, seasonal, confidence);
    const riskFactors = this.identifyRiskFactors(historicalData, confidence);

    return {
      predictedRevenue: Math.max(0, adjustedPrediction),
      confidence,
      trend,
      seasonalPattern: seasonal.pattern,
      riskFactors,
      recommendations,
      keyInsights: insights
    };
  }

  /**
   * Generate monthly forecasts for the next year
   */
  async generateMonthlyForecasts(tenantId: number, branchId?: number): Promise<MonthlyForecast[]> {
    const historicalData = await this.getHistoricalData(tenantId, branchId);
    const monthlyForecasts: MonthlyForecast[] = [];

    // Group data by month for pattern analysis
    const monthlyData: { [key: number]: RevenueForecastData[] } = {};
    historicalData.forEach(record => {
      if (!monthlyData[record.monthOfYear]) {
        monthlyData[record.monthOfYear] = [];
      }
      monthlyData[record.monthOfYear].push(record);
    });

    // Calculate base growth rate
    const revenues = historicalData.map(d => d.revenue);
    const dates = historicalData.map((_, index) => index);
    const regression = this.linearRegression(dates, revenues);
    const monthlyGrowthRate = (regression.slope * 30) / (revenues.reduce((a, b) => a + b, 0) / revenues.length);

    for (let month = 1; month <= 12; month++) {
      const currentDate = new Date();
      const targetMonth = new Date(currentDate.getFullYear(), month - 1, 1);
      
      // Calculate base prediction from historical average
      const monthData = monthlyData[month] || [];
      const baseRevenue = monthData.length > 0 
        ? monthData.reduce((sum, d) => sum + d.revenue, 0) / monthData.length
        : revenues.reduce((a, b) => a + b, 0) / revenues.length;

      // Apply growth trend
      const monthsFromNow = (targetMonth.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24 * 30);
      const trendAdjustment = 1 + (monthlyGrowthRate * monthsFromNow);
      const predictedRevenue = baseRevenue * Math.max(0.5, trendAdjustment);

      // Calculate payment method breakdown based on historical patterns
      const totalHistoricalRevenue = historicalData.reduce((sum, d) => sum + d.revenue, 0);
      const cashRatio = historicalData.reduce((sum, d) => sum + d.paymentMethodDistribution.cash, 0) / totalHistoricalRevenue;
      const posRatio = historicalData.reduce((sum, d) => sum + d.paymentMethodDistribution.pos, 0) / totalHistoricalRevenue;
      const transferRatio = historicalData.reduce((sum, d) => sum + d.paymentMethodDistribution.transfer, 0) / totalHistoricalRevenue;

      // Estimate transaction count
      const avgTransactionValue = historicalData.reduce((sum, d) => sum + d.averageTransaction, 0) / historicalData.length;
      const expectedTransactions = Math.round(predictedRevenue / avgTransactionValue);

      // Calculate confidence (decreases with distance)
      const confidence = Math.max(0.4, 0.8 - (Math.abs(monthsFromNow) * 0.05));

      monthlyForecasts.push({
        month: targetMonth.toLocaleString('default', { month: 'long', year: 'numeric' }),
        predictedRevenue,
        confidence,
        breakdown: {
          cash: predictedRevenue * cashRatio,
          pos: predictedRevenue * posRatio,
          transfer: predictedRevenue * transferRatio
        },
        expectedTransactions,
        growthRate: monthlyGrowthRate * 100
      });
    }

    return monthlyForecasts;
  }

  private getSeasonalFactor(pattern: string, month: number): number {
    const factors: { [key: string]: number[] } = {
      'summer_peak': [0.9, 0.9, 0.95, 1.0, 1.05, 1.1, 1.15, 1.1, 1.0, 0.95, 0.9, 0.85],
      'holiday_peak': [1.1, 1.0, 0.95, 0.9, 0.9, 0.9, 0.9, 0.9, 0.95, 1.0, 1.1, 1.2],
      'spring_peak': [0.9, 0.9, 1.1, 1.15, 1.1, 1.0, 0.95, 0.9, 0.9, 0.95, 1.0, 1.0],
      'stable': [1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0]
    };

    return factors[pattern]?.[month - 1] || 1.0;
  }

  private calculateVariability(data: number[]): number {
    const mean = data.reduce((a, b) => a + b, 0) / data.length;
    const variance = data.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) / data.length;
    return Math.sqrt(variance) / mean;
  }

  private generateInsights(data: RevenueForecastData[], regression: any, seasonal: any): string[] {
    const insights: string[] = [];
    
    // Revenue trend insight
    if (Math.abs(regression.slope) > 100) {
      const direction = regression.slope > 0 ? 'increasing' : 'decreasing';
      const dailyChange = Math.abs(regression.slope).toLocaleString('en-NG', { style: 'currency', currency: 'NGN' });
      insights.push(`Revenue is ${direction} by approximately ${dailyChange} per day`);
    }

    // Seasonal insight
    if (seasonal.strength > 0.2) {
      insights.push(`Strong seasonal pattern detected: ${seasonal.pattern.replace('_', ' ')}`);
    }

    // Weekend performance
    const weekendData = data.filter(d => d.isWeekend);
    const weekdayData = data.filter(d => !d.isWeekend);
    if (weekendData.length > 0 && weekdayData.length > 0) {
      const weekendAvg = weekendData.reduce((sum, d) => sum + d.revenue, 0) / weekendData.length;
      const weekdayAvg = weekdayData.reduce((sum, d) => sum + d.revenue, 0) / weekdayData.length;
      const difference = ((weekendAvg - weekdayAvg) / weekdayAvg * 100).toFixed(1);
      
      if (Math.abs(parseFloat(difference)) > 10) {
        const performance = parseFloat(difference) > 0 ? 'higher' : 'lower';
        insights.push(`Weekend revenue is ${Math.abs(parseFloat(difference))}% ${performance} than weekdays`);
      }
    }

    // Payment method trends
    const totalRevenue = data.reduce((sum, d) => sum + d.revenue, 0);
    const cashPercent = (data.reduce((sum, d) => sum + d.paymentMethodDistribution.cash, 0) / totalRevenue * 100).toFixed(1);
    const posPercent = (data.reduce((sum, d) => sum + d.paymentMethodDistribution.pos, 0) / totalRevenue * 100).toFixed(1);
    
    insights.push(`Payment distribution: ${cashPercent}% cash, ${posPercent}% POS, ${(100 - parseFloat(cashPercent) - parseFloat(posPercent)).toFixed(1)}% transfer`);

    return insights;
  }

  private generateRecommendations(trend: string, seasonal: any, confidence: number): string[] {
    const recommendations: string[] = [];

    if (trend === 'decreasing') {
      recommendations.push('Consider implementing promotional campaigns to boost revenue');
      recommendations.push('Review service pricing and customer satisfaction metrics');
    } else if (trend === 'increasing') {
      recommendations.push('Plan for increased capacity to handle growing demand');
      recommendations.push('Consider expanding popular services');
    }

    if (seasonal.strength > 0.3) {
      recommendations.push('Develop seasonal marketing strategies to maximize peak periods');
      recommendations.push('Prepare inventory and staffing for seasonal variations');
    }

    if (confidence < 0.6) {
      recommendations.push('Increase data collection consistency for better forecasting accuracy');
      recommendations.push('Monitor external factors affecting revenue patterns');
    }

    recommendations.push('Regularly review and update forecasting models with new data');

    return recommendations;
  }

  private identifyRiskFactors(data: RevenueForecastData[], confidence: number): string[] {
    const risks: string[] = [];

    // High variability
    const revenues = data.map(d => d.revenue);
    const variability = this.calculateVariability(revenues);
    if (variability > 0.3) {
      risks.push('High revenue variability may affect forecast accuracy');
    }

    // Low confidence
    if (confidence < 0.6) {
      risks.push('Low confidence in predictions due to irregular patterns');
    }

    // Insufficient data
    if (data.length < 90) {
      risks.push('Limited historical data may impact forecast reliability');
    }

    // Recent performance issues
    const recentData = data.slice(-30);
    const olderData = data.slice(-60, -30);
    if (recentData.length > 0 && olderData.length > 0) {
      const recentAvg = recentData.reduce((sum, d) => sum + d.revenue, 0) / recentData.length;
      const olderAvg = olderData.reduce((sum, d) => sum + d.revenue, 0) / olderData.length;
      if (recentAvg < olderAvg * 0.9) {
        risks.push('Recent revenue decline detected');
      }
    }

    return risks;
  }
}

export const revenueForecasting = new RevenueForecasting();