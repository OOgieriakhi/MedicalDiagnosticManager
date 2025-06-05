import { db } from "./db";
import { eq, and, desc } from "drizzle-orm";
import { 
  trainingModules, 
  trainingScenarios, 
  userTrainingProgress, 
  trainingSessions, 
  trainingAssessments, 
  trainingCertificates 
} from "@shared/training-schema";
import type {
  TrainingModule,
  InsertTrainingModule,
  TrainingScenario,
  InsertTrainingScenario,
  UserTrainingProgress,
  InsertUserTrainingProgress,
  TrainingSession,
  InsertTrainingSession,
  TrainingAssessment,
  InsertTrainingAssessment,
  TrainingCertificate,
  InsertTrainingCertificate,
} from "@shared/training-schema";

export interface ITrainingStorage {
  // Training Modules
  getTrainingModules(filters?: { department?: string; difficulty?: string }): Promise<TrainingModule[]>;
  getTrainingModule(id: number): Promise<TrainingModule | undefined>;
  createTrainingModule(module: InsertTrainingModule): Promise<TrainingModule>;
  updateTrainingModule(id: number, updates: Partial<InsertTrainingModule>): Promise<TrainingModule | undefined>;
  
  // Training Scenarios
  getTrainingScenarios(moduleId?: number): Promise<TrainingScenario[]>;
  getTrainingScenario(id: number): Promise<TrainingScenario | undefined>;
  createTrainingScenario(scenario: InsertTrainingScenario): Promise<TrainingScenario>;
  
  // User Progress
  getUserTrainingProgress(userId: number, moduleId?: number): Promise<UserTrainingProgress[]>;
  createOrUpdateProgress(progress: InsertUserTrainingProgress): Promise<UserTrainingProgress>;
  
  // Training Sessions
  getTrainingSessions(userId: number, scenarioId?: number): Promise<TrainingSession[]>;
  createTrainingSession(session: InsertTrainingSession): Promise<TrainingSession>;
  updateTrainingSession(id: number, updates: Partial<InsertTrainingSession>): Promise<TrainingSession | undefined>;
  
  // Assessments
  getTrainingAssessments(userId: number, moduleId?: number): Promise<TrainingAssessment[]>;
  createTrainingAssessment(assessment: InsertTrainingAssessment): Promise<TrainingAssessment>;
  
  // Certificates
  getUserCertificates(userId: number): Promise<TrainingCertificate[]>;
  createTrainingCertificate(certificate: InsertTrainingCertificate): Promise<TrainingCertificate>;
}

export class DatabaseTrainingStorage implements ITrainingStorage {
  async getTrainingModules(filters?: { department?: string; difficulty?: string }): Promise<TrainingModule[]> {
    let query = db.select().from(trainingModules).where(eq(trainingModules.isActive, true));
    
    if (filters?.department) {
      query = query.where(eq(trainingModules.department, filters.department));
    }
    
    if (filters?.difficulty) {
      query = query.where(eq(trainingModules.difficulty, filters.difficulty));
    }
    
    return await query.orderBy(trainingModules.createdAt);
  }

  async getTrainingModule(id: number): Promise<TrainingModule | undefined> {
    const [module] = await db.select().from(trainingModules).where(eq(trainingModules.id, id));
    return module || undefined;
  }

  async createTrainingModule(module: InsertTrainingModule): Promise<TrainingModule> {
    const [created] = await db.insert(trainingModules).values(module).returning();
    return created;
  }

  async updateTrainingModule(id: number, updates: Partial<InsertTrainingModule>): Promise<TrainingModule | undefined> {
    const [updated] = await db
      .update(trainingModules)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(trainingModules.id, id))
      .returning();
    return updated || undefined;
  }

  async getTrainingScenarios(moduleId?: number): Promise<TrainingScenario[]> {
    let query = db.select().from(trainingScenarios).where(eq(trainingScenarios.isActive, true));
    
    if (moduleId) {
      query = query.where(eq(trainingScenarios.moduleId, moduleId));
    }
    
    return await query.orderBy(trainingScenarios.createdAt);
  }

  async getTrainingScenario(id: number): Promise<TrainingScenario | undefined> {
    const [scenario] = await db.select().from(trainingScenarios).where(eq(trainingScenarios.id, id));
    return scenario || undefined;
  }

  async createTrainingScenario(scenario: InsertTrainingScenario): Promise<TrainingScenario> {
    const [created] = await db.insert(trainingScenarios).values(scenario).returning();
    return created;
  }

  async getUserTrainingProgress(userId: number, moduleId?: number): Promise<UserTrainingProgress[]> {
    let query = db.select().from(userTrainingProgress).where(eq(userTrainingProgress.userId, userId));
    
    if (moduleId) {
      query = query.where(eq(userTrainingProgress.moduleId, moduleId));
    }
    
    return await query.orderBy(desc(userTrainingProgress.lastAccessedAt));
  }

  async createOrUpdateProgress(progress: InsertUserTrainingProgress): Promise<UserTrainingProgress> {
    // Check if progress record exists
    const existing = await db
      .select()
      .from(userTrainingProgress)
      .where(
        and(
          eq(userTrainingProgress.userId, progress.userId),
          eq(userTrainingProgress.moduleId, progress.moduleId)
        )
      );

    if (existing.length > 0) {
      const [updated] = await db
        .update(userTrainingProgress)
        .set({ ...progress, lastAccessedAt: new Date() })
        .where(eq(userTrainingProgress.id, existing[0].id))
        .returning();
      return updated;
    } else {
      const [created] = await db.insert(userTrainingProgress).values(progress).returning();
      return created;
    }
  }

  async getTrainingSessions(userId: number, scenarioId?: number): Promise<TrainingSession[]> {
    let query = db.select().from(trainingSessions).where(eq(trainingSessions.userId, userId));
    
    if (scenarioId) {
      query = query.where(eq(trainingSessions.scenarioId, scenarioId));
    }
    
    return await query.orderBy(desc(trainingSessions.startedAt));
  }

  async createTrainingSession(session: InsertTrainingSession): Promise<TrainingSession> {
    const [created] = await db.insert(trainingSessions).values(session).returning();
    return created;
  }

  async updateTrainingSession(id: number, updates: Partial<InsertTrainingSession>): Promise<TrainingSession | undefined> {
    const [updated] = await db
      .update(trainingSessions)
      .set(updates)
      .where(eq(trainingSessions.id, id))
      .returning();
    return updated || undefined;
  }

  async getTrainingAssessments(userId: number, moduleId?: number): Promise<TrainingAssessment[]> {
    let query = db.select().from(trainingAssessments).where(eq(trainingAssessments.userId, userId));
    
    if (moduleId) {
      query = query.where(eq(trainingAssessments.moduleId, moduleId));
    }
    
    return await query.orderBy(desc(trainingAssessments.startedAt));
  }

  async createTrainingAssessment(assessment: InsertTrainingAssessment): Promise<TrainingAssessment> {
    const [created] = await db.insert(trainingAssessments).values(assessment).returning();
    return created;
  }

  async getUserCertificates(userId: number): Promise<TrainingCertificate[]> {
    return await db
      .select()
      .from(trainingCertificates)
      .where(and(
        eq(trainingCertificates.userId, userId),
        eq(trainingCertificates.isActive, true)
      ))
      .orderBy(desc(trainingCertificates.issuedAt));
  }

  async createTrainingCertificate(certificate: InsertTrainingCertificate): Promise<TrainingCertificate> {
    const [created] = await db.insert(trainingCertificates).values(certificate).returning();
    return created;
  }
}

export const trainingStorage = new DatabaseTrainingStorage();