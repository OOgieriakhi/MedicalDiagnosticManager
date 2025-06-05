import { pgTable, serial, text, integer, boolean, timestamp, decimal, json } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// Training Modules - Core learning units
export const trainingModules = pgTable("training_modules", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  department: text("department").notNull(), // laboratory, radiology, ultrasound, cardiology, pharmacy, nursing, physiotherapy
  difficulty: text("difficulty").notNull().default("beginner"), // beginner, intermediate, advanced
  estimatedDuration: integer("estimated_duration").notNull(), // minutes
  prerequisites: json("prerequisites").$type<number[]>().default([]), // Module IDs required before this one
  objectives: json("objectives").$type<string[]>().notNull(), // Learning objectives
  isActive: boolean("is_active").notNull().default(true),
  tenantId: integer("tenant_id").notNull(),
  createdBy: integer("created_by").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Training Scenarios - Realistic case studies and simulations
export const trainingScenarios = pgTable("training_scenarios", {
  id: serial("id").primaryKey(),
  moduleId: integer("module_id").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  scenarioType: text("scenario_type").notNull(), // patient_case, equipment_malfunction, emergency_protocol, quality_control
  difficulty: text("difficulty").notNull().default("beginner"),
  patientProfile: json("patient_profile").$type<{
    age: number;
    gender: string;
    symptoms: string[];
    medicalHistory: string[];
    vitals?: { [key: string]: string };
  }>(),
  requiredActions: json("required_actions").$type<{
    action: string;
    sequence: number;
    isOptional: boolean;
    points: number;
  }[]>().notNull(),
  learningPoints: json("learning_points").$type<string[]>().notNull(),
  commonMistakes: json("common_mistakes").$type<string[]>().default([]),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// User Training Progress
export const userTrainingProgress = pgTable("user_training_progress", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  moduleId: integer("module_id").notNull(),
  status: text("status").notNull().default("not_started"), // not_started, in_progress, completed, failed
  currentScenarioId: integer("current_scenario_id"),
  progressPercentage: integer("progress_percentage").notNull().default(0),
  totalTimeSpent: integer("total_time_spent").notNull().default(0), // minutes
  attemptsCount: integer("attempts_count").notNull().default(0),
  bestScore: integer("best_score").default(0),
  certificateEarned: boolean("certificate_earned").notNull().default(false),
  certificateIssuedAt: timestamp("certificate_issued_at"),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  lastAccessedAt: timestamp("last_accessed_at").notNull().defaultNow(),
});

// Training Sessions - Individual simulation runs
export const trainingSessions = pgTable("training_sessions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  scenarioId: integer("scenario_id").notNull(),
  sessionMode: text("session_mode").notNull().default("guided"), // guided, assessment, free_practice
  status: text("status").notNull().default("active"), // active, completed, abandoned
  score: integer("score").default(0),
  maxScore: integer("max_score").notNull(),
  timeSpent: integer("time_spent").notNull().default(0), // minutes
  actionsPerformed: json("actions_performed").$type<{
    action: string;
    timestamp: string;
    isCorrect: boolean;
    points: number;
    feedback?: string;
  }[]>().default([]),
  mistakesMade: json("mistakes_made").$type<{
    mistake: string;
    timestamp: string;
    correctionGiven: string;
  }[]>().default([]),
  hintsUsed: integer("hints_used").notNull().default(0),
  startedAt: timestamp("started_at").notNull().defaultNow(),
  completedAt: timestamp("completed_at"),
});

// Training Assessments - Formal evaluations
export const trainingAssessments = pgTable("training_assessments", {
  id: serial("id").primaryKey(),
  moduleId: integer("module_id").notNull(),
  userId: integer("user_id").notNull(),
  assessmentType: text("assessment_type").notNull(), // quiz, practical, comprehensive
  questions: json("questions").$type<{
    id: number;
    question: string;
    type: "multiple_choice" | "true_false" | "scenario_based";
    options?: string[];
    correctAnswer: string | number;
    points: number;
    explanation: string;
  }[]>().notNull(),
  userAnswers: json("user_answers").$type<{
    questionId: number;
    answer: string | number;
    isCorrect: boolean;
    pointsEarned: number;
  }[]>().default([]),
  totalScore: integer("total_score").notNull(),
  maxScore: integer("max_score").notNull(),
  passingScore: integer("passing_score").notNull(),
  passed: boolean("passed").notNull().default(false),
  timeLimit: integer("time_limit"), // minutes
  timeSpent: integer("time_spent"), // minutes
  attemptsAllowed: integer("attempts_allowed").notNull().default(3),
  attemptNumber: integer("attempt_number").notNull().default(1),
  startedAt: timestamp("started_at").notNull().defaultNow(),
  submittedAt: timestamp("submitted_at"),
});

// Training Certificates
export const trainingCertificates = pgTable("training_certificates", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  moduleId: integer("module_id").notNull(),
  certificateNumber: text("certificate_number").notNull().unique(),
  level: text("level").notNull(), // basic, intermediate, advanced, expert
  finalScore: integer("final_score").notNull(),
  validFrom: timestamp("valid_from").notNull().defaultNow(),
  validUntil: timestamp("valid_until"), // For certifications that expire
  issuedBy: integer("issued_by").notNull(),
  verificationCode: text("verification_code").notNull(),
  creditsEarned: integer("credits_earned").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  issuedAt: timestamp("issued_at").notNull().defaultNow(),
});

// Training Analytics - Performance metrics and insights
export const trainingAnalytics = pgTable("training_analytics", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  department: text("department").notNull(),
  metricType: text("metric_type").notNull(), // completion_rate, average_score, time_efficiency, skill_level
  metricValue: decimal("metric_value", { precision: 8, scale: 2 }).notNull(),
  period: text("period").notNull(), // daily, weekly, monthly, quarterly
  date: timestamp("date").notNull(),
  tenantId: integer("tenant_id").notNull(),
  branchId: integer("branch_id").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Relations
export const trainingModulesRelations = relations(trainingModules, ({ many }) => ({
  scenarios: many(trainingScenarios),
  userProgress: many(userTrainingProgress),
  assessments: many(trainingAssessments),
  certificates: many(trainingCertificates),
}));

export const trainingScenariosRelations = relations(trainingScenarios, ({ one, many }) => ({
  module: one(trainingModules, { fields: [trainingScenarios.moduleId], references: [trainingModules.id] }),
  sessions: many(trainingSessions),
}));

export const userTrainingProgressRelations = relations(userTrainingProgress, ({ one }) => ({
  module: one(trainingModules, { fields: [userTrainingProgress.moduleId], references: [trainingModules.id] }),
}));

export const trainingSessionsRelations = relations(trainingSessions, ({ one }) => ({
  scenario: one(trainingScenarios, { fields: [trainingSessions.scenarioId], references: [trainingScenarios.id] }),
}));

export const trainingAssessmentsRelations = relations(trainingAssessments, ({ one }) => ({
  module: one(trainingModules, { fields: [trainingAssessments.moduleId], references: [trainingModules.id] }),
}));

export const trainingCertificatesRelations = relations(trainingCertificates, ({ one }) => ({
  module: one(trainingModules, { fields: [trainingCertificates.moduleId], references: [trainingModules.id] }),
}));

// Types for frontend use
export type TrainingModule = typeof trainingModules.$inferSelect;
export type InsertTrainingModule = typeof trainingModules.$inferInsert;
export type TrainingScenario = typeof trainingScenarios.$inferSelect;
export type InsertTrainingScenario = typeof trainingScenarios.$inferInsert;
export type UserTrainingProgress = typeof userTrainingProgress.$inferSelect;
export type InsertUserTrainingProgress = typeof userTrainingProgress.$inferInsert;
export type TrainingSession = typeof trainingSessions.$inferSelect;
export type InsertTrainingSession = typeof trainingSessions.$inferInsert;
export type TrainingAssessment = typeof trainingAssessments.$inferSelect;
export type InsertTrainingAssessment = typeof trainingAssessments.$inferInsert;
export type TrainingCertificate = typeof trainingCertificates.$inferSelect;
export type InsertTrainingCertificate = typeof trainingCertificates.$inferInsert;
export type TrainingAnalytics = typeof trainingAnalytics.$inferSelect;
export type InsertTrainingAnalytics = typeof trainingAnalytics.$inferInsert;