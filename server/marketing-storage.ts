import { db } from "./db";
import { eq, and, sql, desc, asc, like, inArray } from "drizzle-orm";
import { 
  marketingCampaigns, 
  marketingLeads, 
  internalMessages, 
  messageActions, 
  marketingReports, 
  workTasks,
  type InsertMarketingCampaign,
  type InsertMarketingLead,
  type InsertInternalMessage,
  type InsertMessageAction,
  type InsertMarketingReport,
  type InsertWorkTask
} from "@shared/schema";

export class MarketingStorage {
  // ==================== MARKETING CAMPAIGNS ====================
  
  async getMarketingCampaigns(tenantId: number, branchId?: number) {
    let whereClause = eq(marketingCampaigns.tenantId, tenantId);
    
    if (branchId) {
      whereClause = and(
        eq(marketingCampaigns.tenantId, tenantId),
        eq(marketingCampaigns.branchId, branchId)
      );
    }

    return await db
      .select()
      .from(marketingCampaigns)
      .where(whereClause)
      .orderBy(desc(marketingCampaigns.createdAt));
  }

  async createMarketingCampaign(data: InsertMarketingCampaign) {
    const [campaign] = await db
      .insert(marketingCampaigns)
      .values(data)
      .returning();
    return campaign;
  }

  async updateMarketingCampaign(id: number, data: Partial<InsertMarketingCampaign>) {
    const [campaign] = await db
      .update(marketingCampaigns)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(marketingCampaigns.id, id))
      .returning();
    return campaign;
  }

  async getCampaignPerformance(tenantId: number, campaignId?: number) {
    const whereClause = campaignId 
      ? and(
          eq(marketingCampaigns.tenantId, tenantId),
          eq(marketingCampaigns.id, campaignId)
        )
      : eq(marketingCampaigns.tenantId, tenantId);

    return await db
      .select({
        id: marketingCampaigns.id,
        campaignName: marketingCampaigns.campaignName,
        budget: marketingCampaigns.budget,
        actualSpend: marketingCampaigns.actualSpend,
        status: marketingCampaigns.status,
        startDate: marketingCampaigns.startDate,
        endDate: marketingCampaigns.endDate,
        roi: sql<number>`CASE WHEN ${marketingCampaigns.actualSpend} > 0 THEN 
          ((${marketingCampaigns.budget} - ${marketingCampaigns.actualSpend}) / ${marketingCampaigns.actualSpend}) * 100 
          ELSE 0 END`,
        spendRate: sql<number>`CASE WHEN ${marketingCampaigns.budget} > 0 THEN 
          (${marketingCampaigns.actualSpend} / ${marketingCampaigns.budget}) * 100 
          ELSE 0 END`
      })
      .from(marketingCampaigns)
      .where(whereClause);
  }

  // ==================== MARKETING LEADS ====================
  
  async getMarketingLeads(tenantId: number, branchId?: number, status?: string) {
    let whereClause = eq(marketingLeads.tenantId, tenantId);
    
    if (branchId && status) {
      whereClause = and(
        eq(marketingLeads.tenantId, tenantId),
        eq(marketingLeads.branchId, branchId),
        eq(marketingLeads.status, status)
      );
    } else if (branchId) {
      whereClause = and(
        eq(marketingLeads.tenantId, tenantId),
        eq(marketingLeads.branchId, branchId)
      );
    } else if (status) {
      whereClause = and(
        eq(marketingLeads.tenantId, tenantId),
        eq(marketingLeads.status, status)
      );
    }

    return await db
      .select()
      .from(marketingLeads)
      .where(whereClause)
      .orderBy(desc(marketingLeads.createdAt));
  }

  async createMarketingLead(data: InsertMarketingLead) {
    const [lead] = await db
      .insert(marketingLeads)
      .values(data)
      .returning();
    return lead;
  }

  async updateMarketingLead(id: number, data: Partial<InsertMarketingLead>) {
    const [lead] = await db
      .update(marketingLeads)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(marketingLeads.id, id))
      .returning();
    return lead;
  }

  async getLeadConversionMetrics(tenantId: number, period?: string) {
    return await db
      .select({
        totalLeads: sql<number>`COUNT(*)`,
        convertedLeads: sql<number>`COUNT(CASE WHEN status = 'converted' THEN 1 END)`,
        conversionRate: sql<number>`ROUND(
          (COUNT(CASE WHEN status = 'converted' THEN 1 END)::float / COUNT(*)) * 100, 2
        )`,
        avgLeadScore: sql<number>`AVG(lead_score)`
      })
      .from(marketingLeads)
      .where(eq(marketingLeads.tenantId, tenantId));
  }

  // ==================== INTERNAL MESSAGING ====================
  
  async getInternalMessages(tenantId: number, userId: number, messageType?: string) {
    let whereClause = and(
      eq(internalMessages.tenantId, tenantId),
      sql`jsonb_array_elements_text(${internalMessages.recipientIds}::jsonb) = ${userId}::text`
    );
    
    if (messageType) {
      whereClause = and(
        eq(internalMessages.tenantId, tenantId),
        eq(internalMessages.messageType, messageType),
        sql`jsonb_array_elements_text(${internalMessages.recipientIds}::jsonb) = ${userId}::text`
      );
    }

    return await db
      .select()
      .from(internalMessages)
      .where(whereClause)
      .orderBy(desc(internalMessages.createdAt));
  }

  async createInternalMessage(data: InsertInternalMessage) {
    const [message] = await db
      .insert(internalMessages)
      .values(data)
      .returning();
    return message;
  }

  async markMessageAsRead(messageId: number, userId: number) {
    const [message] = await db
      .update(internalMessages)
      .set({
        readBy: sql`COALESCE(${internalMessages.readBy}, '{}'::jsonb) || jsonb_build_object(${userId}::text, NOW())`
      })
      .where(eq(internalMessages.id, messageId))
      .returning();
    return message;
  }

  async acknowledgeMessage(messageId: number, userId: number) {
    const [message] = await db
      .update(internalMessages)
      .set({
        acknowledgedBy: sql`COALESCE(${internalMessages.acknowledgedBy}, '{}'::jsonb) || jsonb_build_object(${userId}::text, NOW())`
      })
      .where(eq(internalMessages.id, messageId))
      .returning();
    return message;
  }

  async completeMessageAction(messageId: number, userId: number, actionDetails?: string) {
    const [message] = await db
      .update(internalMessages)
      .set({
        actionCompleted: true,
        actionCompletedBy: userId,
        actionCompletedAt: new Date(),
        actionDetails: actionDetails || null
      })
      .where(eq(internalMessages.id, messageId))
      .returning();
    return message;
  }

  async trackMessageAction(data: InsertMessageAction) {
    const [action] = await db
      .insert(messageActions)
      .values(data)
      .returning();
    return action;
  }

  // ==================== WORK TASKS ====================
  
  async getWorkTasks(tenantId: number, assignedTo?: number, status?: string, taskType?: string) {
    let whereClause = eq(workTasks.tenantId, tenantId);
    
    if (assignedTo && status && taskType) {
      whereClause = and(
        eq(workTasks.tenantId, tenantId),
        eq(workTasks.assignedTo, assignedTo),
        eq(workTasks.status, status),
        eq(workTasks.taskType, taskType)
      );
    } else if (assignedTo && status) {
      whereClause = and(
        eq(workTasks.tenantId, tenantId),
        eq(workTasks.assignedTo, assignedTo),
        eq(workTasks.status, status)
      );
    } else if (assignedTo) {
      whereClause = and(
        eq(workTasks.tenantId, tenantId),
        eq(workTasks.assignedTo, assignedTo)
      );
    } else if (status) {
      whereClause = and(
        eq(workTasks.tenantId, tenantId),
        eq(workTasks.status, status)
      );
    }

    return await db
      .select()
      .from(workTasks)
      .where(whereClause)
      .orderBy(desc(workTasks.createdAt));
  }

  async createWorkTask(data: InsertWorkTask) {
    const [task] = await db
      .insert(workTasks)
      .values(data)
      .returning();
    return task;
  }

  async updateWorkTask(id: number, data: Partial<InsertWorkTask>) {
    const [task] = await db
      .update(workTasks)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(workTasks.id, id))
      .returning();
    return task;
  }

  async completeWorkTask(id: number, userId: number, completionNotes?: string) {
    const [task] = await db
      .update(workTasks)
      .set({
        status: 'completed',
        completedDate: new Date(),
        completionNotes: completionNotes || null,
        updatedAt: new Date()
      })
      .where(eq(workTasks.id, id))
      .returning();
    return task;
  }

  async verifyTaskCompletion(id: number, verifiedBy: number) {
    const [task] = await db
      .update(workTasks)
      .set({
        status: 'verified',
        verifiedBy: verifiedBy,
        verifiedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(workTasks.id, id))
      .returning();
    return task;
  }

  // ==================== MARKETING REPORTS ====================
  
  async getMarketingReports(tenantId: number, reportType?: string, status?: string) {
    let whereClause = eq(marketingReports.tenantId, tenantId);
    
    if (reportType && status) {
      whereClause = and(
        eq(marketingReports.tenantId, tenantId),
        eq(marketingReports.reportType, reportType),
        eq(marketingReports.status, status)
      );
    } else if (reportType) {
      whereClause = and(
        eq(marketingReports.tenantId, tenantId),
        eq(marketingReports.reportType, reportType)
      );
    } else if (status) {
      whereClause = and(
        eq(marketingReports.tenantId, tenantId),
        eq(marketingReports.status, status)
      );
    }

    return await db
      .select()
      .from(marketingReports)
      .where(whereClause)
      .orderBy(desc(marketingReports.createdAt));
  }

  async createMarketingReport(data: InsertMarketingReport) {
    const [report] = await db
      .insert(marketingReports)
      .values(data)
      .returning();
    return report;
  }

  async submitMarketingReport(id: number) {
    const [report] = await db
      .update(marketingReports)
      .set({
        status: 'submitted',
        submittedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(marketingReports.id, id))
      .returning();
    return report;
  }

  async approveMarketingReport(id: number, approvedBy: number) {
    const [report] = await db
      .update(marketingReports)
      .set({
        status: 'approved',
        approvedBy: approvedBy,
        approvedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(marketingReports.id, id))
      .returning();
    return report;
  }

  // ==================== MARKETING METRICS ====================
  
  async getMarketingMetrics(tenantId: number, period: string = '30d') {
    const campaigns = await db
      .select({
        totalCampaigns: sql<number>`COUNT(*)`,
        activeCampaigns: sql<number>`COUNT(CASE WHEN status = 'active' THEN 1 END)`,
        totalBudget: sql<number>`SUM(budget)`,
        totalSpend: sql<number>`SUM(actual_spend)`
      })
      .from(marketingCampaigns)
      .where(eq(marketingCampaigns.tenantId, tenantId));

    const leads = await db
      .select({
        totalLeads: sql<number>`COUNT(*)`,
        convertedLeads: sql<number>`COUNT(CASE WHEN status = 'converted' THEN 1 END)`,
        avgLeadScore: sql<number>`AVG(lead_score)`
      })
      .from(marketingLeads)
      .where(eq(marketingLeads.tenantId, tenantId));

    return {
      campaigns: campaigns[0] || { totalCampaigns: 0, activeCampaigns: 0, totalBudget: 0, totalSpend: 0 },
      leads: leads[0] || { totalLeads: 0, convertedLeads: 0, avgLeadScore: 0 }
    };
  }

  async getMessageMetrics(tenantId: number, userId?: number) {
    let whereClause = eq(internalMessages.tenantId, tenantId);
    
    if (userId) {
      whereClause = and(
        eq(internalMessages.tenantId, tenantId),
        sql`jsonb_array_elements_text(${internalMessages.recipientIds}::jsonb) = ${userId}::text`
      );
    }

    return await db
      .select({
        totalMessages: sql<number>`COUNT(*)`,
        unreadMessages: sql<number>`COUNT(CASE WHEN ${internalMessages.readBy} IS NULL THEN 1 END)`,
        actionRequired: sql<number>`COUNT(CASE WHEN ${internalMessages.actionRequired} = true AND ${internalMessages.actionCompleted} = false THEN 1 END)`,
        completedActions: sql<number>`COUNT(CASE WHEN ${internalMessages.actionCompleted} = true THEN 1 END)`
      })
      .from(internalMessages)
      .where(whereClause);
  }
}

export const marketingStorage = new MarketingStorage();