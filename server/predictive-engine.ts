import { db } from "./db";
import { 
  predictiveRecommendations, 
  recommendationAnalytics, 
  patientRiskProfiles,
  patients,
  patientTests,
  testCategories,
  branches 
} from "../shared/schema";
import { eq, and, gte, lte, desc, sql, count } from "drizzle-orm";

export interface PredictiveRecommendation {
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

export class PredictiveEngine {
  
  async getPredictiveRecommendations(tenantId: number, branchId?: number, options?: {
    timeframe?: string;
    category?: string;
    priority?: string;
  }) {
    const timeframeDays = parseInt(options?.timeframe || '30');
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + timeframeDays);

    let query = db
      .select({
        id: predictiveRecommendations.id,
        patientId: predictiveRecommendations.patientId,
        patientName: sql<string>`${patients.firstName} || ' ' || ${patients.lastName}`,
        age: sql<number>`EXTRACT(YEAR FROM AGE(${patients.dateOfBirth}))`,
        gender: patients.gender,
        riskScore: predictiveRecommendations.riskScore,
        recommendationType: predictiveRecommendations.recommendationType,
        title: predictiveRecommendations.title,
        description: predictiveRecommendations.description,
        suggestedAction: predictiveRecommendations.suggestedAction,
        timeframe: predictiveRecommendations.timeframe,
        confidence: predictiveRecommendations.confidence,
        factors: predictiveRecommendations.factors,
        lastTestDate: predictiveRecommendations.lastTestDate,
        nextDueDate: predictiveRecommendations.nextDueDate,
        priority: predictiveRecommendations.priority,
        category: predictiveRecommendations.category,
        basedOnTests: predictiveRecommendations.basedOnTests,
        estimatedCost: predictiveRecommendations.estimatedCost,
      })
      .from(predictiveRecommendations)
      .innerJoin(patients, eq(predictiveRecommendations.patientId, patients.id))
      .where(
        and(
          eq(predictiveRecommendations.tenantId, tenantId),
          branchId ? eq(predictiveRecommendations.branchId, branchId) : undefined,
          eq(predictiveRecommendations.status, 'active'),
          lte(predictiveRecommendations.nextDueDate, futureDate)
        )
      );

    if (options?.category && options.category !== 'all') {
      query = query.where(eq(predictiveRecommendations.category, options.category));
    }

    if (options?.priority && options.priority !== 'all') {
      query = query.where(eq(predictiveRecommendations.priority, options.priority));
    }

    const results = await query.orderBy(desc(predictiveRecommendations.riskScore));

    return results.map(row => ({
      id: row.id.toString(),
      patientId: row.patientId.toString(),
      patientName: row.patientName,
      age: row.age,
      gender: row.gender,
      riskScore: row.riskScore,
      recommendationType: row.recommendationType as any,
      title: row.title,
      description: row.description,
      suggestedAction: row.suggestedAction,
      timeframe: row.timeframe,
      confidence: row.confidence,
      factors: Array.isArray(row.factors) ? row.factors : [],
      lastTestDate: row.lastTestDate?.toISOString() || '',
      nextDueDate: row.nextDueDate.toISOString(),
      priority: row.priority as any,
      category: row.category as any,
      basedOnTests: Array.isArray(row.basedOnTests) ? row.basedOnTests : [],
      estimatedCost: parseFloat(row.estimatedCost?.toString() || '0'),
    }));
  }

  async getAnalytics(tenantId: number, branchId?: number) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [totalStats, priorityStats, todayStats, successStats] = await Promise.all([
      // Total recommendations
      db
        .select({ count: count() })
        .from(predictiveRecommendations)
        .where(
          and(
            eq(predictiveRecommendations.tenantId, tenantId),
            branchId ? eq(predictiveRecommendations.branchId, branchId) : undefined,
            eq(predictiveRecommendations.status, 'active')
          )
        ),

      // Priority breakdown
      db
        .select({
          priority: predictiveRecommendations.priority,
          count: count()
        })
        .from(predictiveRecommendations)
        .where(
          and(
            eq(predictiveRecommendations.tenantId, tenantId),
            branchId ? eq(predictiveRecommendations.branchId, branchId) : undefined,
            eq(predictiveRecommendations.status, 'active')
          )
        )
        .groupBy(predictiveRecommendations.priority),

      // Today's new recommendations
      db
        .select({ count: count() })
        .from(predictiveRecommendations)
        .where(
          and(
            eq(predictiveRecommendations.tenantId, tenantId),
            branchId ? eq(predictiveRecommendations.branchId, branchId) : undefined,
            gte(predictiveRecommendations.generatedAt, today)
          )
        ),

      // Success rate (completed vs total)
      db
        .select({
          status: predictiveRecommendations.status,
          count: count()
        })
        .from(predictiveRecommendations)
        .where(
          and(
            eq(predictiveRecommendations.tenantId, tenantId),
            branchId ? eq(predictiveRecommendations.branchId, branchId) : undefined
          )
        )
        .groupBy(predictiveRecommendations.status)
    ]);

    const priorityMap = priorityStats.reduce((acc, stat) => {
      acc[stat.priority] = stat.count;
      return acc;
    }, {} as Record<string, number>);

    const statusMap = successStats.reduce((acc, stat) => {
      acc[stat.status] = stat.count;
      return acc;
    }, {} as Record<string, number>);

    const totalCompleted = statusMap.completed || 0;
    const totalAll = Object.values(statusMap).reduce((sum, count) => sum + count, 0);

    // Calculate average risk score
    const avgRiskResult = await db
      .select({
        avgRisk: sql<number>`AVG(${predictiveRecommendations.riskScore})::INTEGER`
      })
      .from(predictiveRecommendations)
      .where(
        and(
          eq(predictiveRecommendations.tenantId, tenantId),
          branchId ? eq(predictiveRecommendations.branchId, branchId) : undefined,
          eq(predictiveRecommendations.status, 'active')
        )
      );

    return {
      totalRecommendations: totalStats[0]?.count || 0,
      newToday: todayStats[0]?.count || 0,
      highPriority: priorityMap.high || 0,
      mediumPriority: priorityMap.medium || 0,
      lowPriority: priorityMap.low || 0,
      avgRiskScore: avgRiskResult[0]?.avgRisk || 0,
      successRate: totalAll > 0 ? Math.round((totalCompleted / totalAll) * 100) : 0
    };
  }

  async generateRecommendations(tenantId: number, branchId: number) {
    // Get all patients for the branch
    const patientsData = await db
      .select()
      .from(patients)
      .where(
        and(
          eq(patients.tenantId, tenantId),
          eq(patients.branchId, branchId)
        )
      );

    const recommendations = [];

    for (const patient of patientsData) {
      const patientRecommendations = await this.analyzePatientForRecommendations(
        patient, 
        tenantId, 
        branchId
      );
      recommendations.push(...patientRecommendations);
    }

    // Insert recommendations into database
    if (recommendations.length > 0) {
      await db.insert(predictiveRecommendations).values(recommendations);
    }

    return { generated: recommendations.length };
  }

  private async analyzePatientForRecommendations(patient: any, tenantId: number, branchId: number) {
    const recommendations = [];
    const currentDate = new Date();
    const age = this.calculateAge(patient.dateOfBirth);

    // Get patient's test history
    const testHistory = await db
      .select({
        testName: testCategories.name,
        completedAt: patientTests.completedAt,
        results: patientTests.results
      })
      .from(patientTests)
      .innerJoin(testCategories, eq(patientTests.testCategoryId, testCategories.id))
      .where(eq(patientTests.patientId, patient.id))
      .orderBy(desc(patientTests.completedAt));

    // Cardiovascular risk assessment
    if (age >= 40 || patient.gender === 'male' && age >= 35) {
      const lastCardioTest = testHistory.find(test => 
        ['ECG', 'Echocardiogram', 'Stress Test', 'Lipid Profile'].some(cardioTest => 
          test.testName.toLowerCase().includes(cardioTest.toLowerCase())
        )
      );

      if (!lastCardioTest || this.daysSince(lastCardioTest.completedAt) > 365) {
        recommendations.push({
          tenantId,
          branchId,
          patientId: patient.id,
          recommendationType: age >= 50 ? 'urgent' : 'routine',
          category: 'cardiovascular',
          title: 'Cardiovascular Screening Recommended',
          description: `Patient ${patient.firstName} ${patient.lastName} is due for cardiovascular screening based on age and risk factors.`,
          suggestedAction: 'Schedule ECG, Lipid Profile, and Blood Pressure monitoring',
          riskScore: this.calculateCardiovascularRisk(patient, testHistory),
          confidence: 85,
          priority: age >= 60 ? 'high' : 'medium',
          timeframe: 'Within 30 days',
          nextDueDate: new Date(currentDate.getTime() + 30 * 24 * 60 * 60 * 1000),
          lastTestDate: lastCardioTest?.completedAt || null,
          factors: ['Age factor', 'Gender risk', 'No recent cardiovascular screening'],
          basedOnTests: ['Previous test history analysis'],
          estimatedCost: 150.00,
          aiModelVersion: '1.0'
        });
      }
    }

    // Diabetes screening
    if (age >= 35 || (age >= 25 && this.hasDiabetesRiskFactors(patient))) {
      const lastDiabetesTest = testHistory.find(test => 
        ['glucose', 'hba1c', 'diabetes'].some(diabetesTest => 
          test.testName.toLowerCase().includes(diabetesTest.toLowerCase())
        )
      );

      if (!lastDiabetesTest || this.daysSince(lastDiabetesTest.completedAt) > 365) {
        recommendations.push({
          tenantId,
          branchId,
          patientId: patient.id,
          recommendationType: 'preventive',
          category: 'diabetes',
          title: 'Diabetes Screening Due',
          description: `Annual diabetes screening recommended for ${patient.firstName} ${patient.lastName}.`,
          suggestedAction: 'Schedule Fasting Blood Glucose and HbA1c tests',
          riskScore: this.calculateDiabetesRisk(patient, testHistory),
          confidence: 90,
          priority: 'medium',
          timeframe: 'Within 60 days',
          nextDueDate: new Date(currentDate.getTime() + 60 * 24 * 60 * 60 * 1000),
          lastTestDate: lastDiabetesTest?.completedAt || null,
          factors: ['Age factor', 'Preventive care schedule'],
          basedOnTests: ['Diabetes screening guidelines'],
          estimatedCost: 75.00,
          aiModelVersion: '1.0'
        });
      }
    }

    // General health checkup
    const lastGeneralTest = testHistory.find(test => 
      ['complete blood count', 'cbc', 'comprehensive'].some(generalTest => 
        test.testName.toLowerCase().includes(generalTest.toLowerCase())
      )
    );

    if (!lastGeneralTest || this.daysSince(lastGeneralTest.completedAt) > 365) {
      recommendations.push({
        tenantId,
        branchId,
        patientId: patient.id,
        recommendationType: 'routine',
        category: 'general',
        title: 'Annual Health Checkup',
        description: `${patient.firstName} ${patient.lastName} is due for annual comprehensive health screening.`,
        suggestedAction: 'Schedule Complete Blood Count, Basic Metabolic Panel, and Vital Signs check',
        riskScore: 30,
        confidence: 95,
        priority: 'low',
        timeframe: 'Within 90 days',
        nextDueDate: new Date(currentDate.getTime() + 90 * 24 * 60 * 60 * 1000),
        lastTestDate: lastGeneralTest?.completedAt || null,
        factors: ['Annual preventive care'],
        basedOnTests: ['Preventive care guidelines'],
        estimatedCost: 120.00,
        aiModelVersion: '1.0'
      });
    }

    return recommendations;
  }

  private calculateAge(dateOfBirth: Date): number {
    const today = new Date();
    let age = today.getFullYear() - dateOfBirth.getFullYear();
    const monthDiff = today.getMonth() - dateOfBirth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dateOfBirth.getDate())) {
      age--;
    }
    
    return age;
  }

  private daysSince(date: Date): number {
    const today = new Date();
    const diffTime = Math.abs(today.getTime() - date.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  private calculateCardiovascularRisk(patient: any, testHistory: any[]): number {
    let riskScore = 20; // Base risk
    
    const age = this.calculateAge(patient.dateOfBirth);
    if (age >= 60) riskScore += 30;
    else if (age >= 50) riskScore += 20;
    else if (age >= 40) riskScore += 10;
    
    if (patient.gender === 'male') riskScore += 10;
    
    // Check for elevated lipid results
    const lipidTests = testHistory.filter(test => 
      test.testName.toLowerCase().includes('lipid')
    );
    
    if (lipidTests.length > 0) {
      // Simplified risk assessment based on test history
      riskScore += 15;
    }
    
    return Math.min(riskScore, 95);
  }

  private calculateDiabetesRisk(patient: any, testHistory: any[]): number {
    let riskScore = 15; // Base risk
    
    const age = this.calculateAge(patient.dateOfBirth);
    if (age >= 45) riskScore += 25;
    else if (age >= 35) riskScore += 15;
    
    // Check for previous elevated glucose
    const glucoseTests = testHistory.filter(test => 
      test.testName.toLowerCase().includes('glucose')
    );
    
    if (glucoseTests.length > 0) {
      riskScore += 20;
    }
    
    return Math.min(riskScore, 90);
  }

  private hasDiabetesRiskFactors(patient: any): boolean {
    // Simplified risk factor assessment
    // In a real implementation, this would check for obesity, family history, etc.
    return false;
  }

  async updateRecommendationStatus(
    recommendationId: number, 
    status: string, 
    userId: number, 
    notes?: string
  ) {
    const updateData: any = {
      status,
      updatedAt: new Date()
    };

    if (status === 'scheduled') {
      updateData.scheduledBy = userId;
      updateData.scheduledAt = new Date();
    } else if (status === 'completed') {
      updateData.completedBy = userId;
      updateData.completedAt = new Date();
      if (notes) updateData.followUpNotes = notes;
    } else if (status === 'dismissed') {
      updateData.dismissedBy = userId;
      updateData.dismissedAt = new Date();
      if (notes) updateData.dismissalReason = notes;
    }

    await db
      .update(predictiveRecommendations)
      .set(updateData)
      .where(eq(predictiveRecommendations.id, recommendationId));

    return { success: true };
  }
}

export const predictiveEngine = new PredictiveEngine();