import { db } from "./db";
import { eq, and, sql, desc, asc, like, inArray } from "drizzle-orm";
import * as marketingSchema from "@shared/marketing-schema";

export class MarketingStorage {
  // ==================== MARKETING CAMPAIGNS ====================
  
  async getMarketingCampaigns(tenantId: number, branchId?: number) {
    const query = db
      .select()
      .from(marketingSchema.marketingCampaigns)
      .where(eq(marketingSchema.marketingCampaigns.tenantId, tenantId));

    if (branchId) {
      query.where(and(
        eq(marketingSchema.marketingCampaigns.tenantId, tenantId),
        eq(marketingSchema.marketingCampaigns.branchId, branchId)
      ));
    }

    return await query.orderBy(desc(marketingSchema.marketingCampaigns.createdAt));
  }

  async createMarketingCampaign(data: marketingSchema.InsertMarketingCampaign) {
    const [campaign] = await db
      .insert(marketingSchema.marketingCampaigns)
      .values(data)
      .returning();
    return campaign;
  }

  async updateMarketingCampaign(id: number, data: Partial<marketingSchema.InsertMarketingCampaign>) {
    const [campaign] = await db
      .update(marketingSchema.marketingCampaigns)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(marketingSchema.marketingCampaigns.id, id))
      .returning();
    return campaign;
  }

  async getCampaignPerformance(tenantId: number, campaignId?: number) {
    const whereClause = campaignId 
      ? and(
          eq(marketingSchema.marketingCampaigns.tenantId, tenantId),
          eq(marketingSchema.marketingCampaigns.id, campaignId)
        )
      : eq(marketingSchema.marketingCampaigns.tenantId, tenantId);

    return await db
      .select({
        id: marketingSchema.marketingCampaigns.id,
        campaignName: marketingSchema.marketingCampaigns.campaignName,
        campaignType: marketingSchema.marketingCampaigns.campaignType,
        budget: marketingSchema.marketingCampaigns.budget,
        actualSpend: marketingSchema.marketingCampaigns.actualSpend,
        status: marketingSchema.marketingCampaigns.status,
        targetMetrics: marketingSchema.marketingCampaigns.targetMetrics,
        actualMetrics: marketingSchema.marketingCampaigns.actualMetrics,
        startDate: marketingSchema.marketingCampaigns.startDate,
        endDate: marketingSchema.marketingCampaigns.endDate,
      })
      .from(marketingSchema.marketingCampaigns)
      .where(whereClause);
  }

  // ==================== MARKETING LEADS ====================

  async getMarketingLeads(tenantId: number, branchId?: number, status?: string) {
    let whereClause = eq(marketingSchema.marketingLeads.tenantId, tenantId);
    
    if (branchId) {
      whereClause = and(whereClause, eq(marketingSchema.marketingLeads.branchId, branchId));
    }
    
    if (status) {
      whereClause = and(whereClause, eq(marketingSchema.marketingLeads.status, status));
    }

    return await db
      .select()
      .from(marketingSchema.marketingLeads)
      .where(whereClause)
      .orderBy(desc(marketingSchema.marketingLeads.createdAt));
  }

  async createMarketingLead(data: marketingSchema.InsertMarketingLead) {
    const [lead] = await db
      .insert(marketingSchema.marketingLeads)
      .values(data)
      .returning();
    return lead;
  }

  async updateMarketingLead(id: number, data: Partial<marketingSchema.InsertMarketingLead>) {
    const [lead] = await db
      .update(marketingSchema.marketingLeads)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(marketingSchema.marketingLeads.id, id))
      .returning();
    return lead;
  }

  async getLeadConversionMetrics(tenantId: number, period?: string) {
    return await db.execute(
      sql`SELECT 
        COUNT(*) as total_leads,
        COUNT(CASE WHEN converted_to_patient = true THEN 1 END) as converted_leads,
        COUNT(CASE WHEN status = 'new' THEN 1 END) as new_leads,
        COUNT(CASE WHEN status = 'contacted' THEN 1 END) as contacted_leads,
        COUNT(CASE WHEN status = 'qualified' THEN 1 END) as qualified_leads,
        COUNT(CASE WHEN status = 'lost' THEN 1 END) as lost_leads,
        AVG(lead_score) as average_lead_score,
        lead_source,
        COUNT(*) as leads_by_source
      FROM ${marketingSchema.marketingLeads}
      WHERE tenant_id = ${tenantId}
      GROUP BY lead_source`
    );
  }

  // ==================== INTERNAL MESSAGING SYSTEM ====================

  async getInternalMessages(tenantId: number, userId: number, messageType?: string) {
    let whereClause = and(
      eq(marketingSchema.internalMessages.tenantId, tenantId),
      sql`${userId} = ANY(recipient_ids)`
    );

    if (messageType) {
      whereClause = and(whereClause, eq(marketingSchema.internalMessages.messageType, messageType));
    }

    return await db
      .select()
      .from(marketingSchema.internalMessages)
      .where(whereClause)
      .orderBy(desc(marketingSchema.internalMessages.createdAt));
  }

  async createInternalMessage(data: marketingSchema.InsertInternalMessage) {
    const [message] = await db
      .insert(marketingSchema.internalMessages)
      .values(data)
      .returning();
    return message;
  }

  async markMessageAsRead(messageId: number, userId: number) {
    // Get current message to update readBy array
    const [message] = await db
      .select()
      .from(marketingSchema.internalMessages)
      .where(eq(marketingSchema.internalMessages.id, messageId));

    if (!message) return null;

    const currentReadBy = message.readBy as any[] || [];
    const alreadyRead = currentReadBy.some((read: any) => read.userId === userId);

    if (!alreadyRead) {
      currentReadBy.push({ userId, readAt: new Date() });
      
      const [updatedMessage] = await db
        .update(marketingSchema.internalMessages)
        .set({ 
          readBy: currentReadBy,
          status: 'read'
        })
        .where(eq(marketingSchema.internalMessages.id, messageId))
        .returning();

      return updatedMessage;
    }

    return message;
  }

  async acknowledgeMessage(messageId: number, userId: number) {
    const [message] = await db
      .select()
      .from(marketingSchema.internalMessages)
      .where(eq(marketingSchema.internalMessages.id, messageId));

    if (!message) return null;

    const currentAcknowledgedBy = message.acknowledgedBy as any[] || [];
    const alreadyAcknowledged = currentAcknowledgedBy.some((ack: any) => ack.userId === userId);

    if (!alreadyAcknowledged) {
      currentAcknowledgedBy.push({ userId, acknowledgedAt: new Date() });
      
      const [updatedMessage] = await db
        .update(marketingSchema.internalMessages)
        .set({ 
          acknowledgedBy: currentAcknowledgedBy,
          status: 'acknowledged'
        })
        .where(eq(marketingSchema.internalMessages.id, messageId))
        .returning();

      return updatedMessage;
    }

    return message;
  }

  async completeMessageAction(messageId: number, userId: number, actionDetails?: string) {
    const [updatedMessage] = await db
      .update(marketingSchema.internalMessages)
      .set({ 
        actionCompleted: true,
        actionCompletedBy: userId,
        actionCompletedAt: new Date(),
        actionDetails,
        status: 'completed'
      })
      .where(eq(marketingSchema.internalMessages.id, messageId))
      .returning();

    return updatedMessage;
  }

  async trackMessageAction(data: marketingSchema.InsertMessageAction) {
    const [action] = await db
      .insert(marketingSchema.messageActions)
      .values(data)
      .returning();
    return action;
  }

  // ==================== WORK TASKS MANAGEMENT ====================

  async getWorkTasks(tenantId: number, assignedTo?: number, status?: string, taskType?: string) {
    let whereClause = eq(marketingSchema.workTasks.tenantId, tenantId);

    if (assignedTo) {
      whereClause = and(whereClause, eq(marketingSchema.workTasks.assignedTo, assignedTo));
    }

    if (status) {
      whereClause = and(whereClause, eq(marketingSchema.workTasks.status, status));
    }

    if (taskType) {
      whereClause = and(whereClause, eq(marketingSchema.workTasks.taskType, taskType));
    }

    return await db
      .select()
      .from(marketingSchema.workTasks)
      .where(whereClause)
      .orderBy(desc(marketingSchema.workTasks.createdAt));
  }

  async createWorkTask(data: marketingSchema.InsertWorkTask) {
    const [task] = await db
      .insert(marketingSchema.workTasks)
      .values(data)
      .returning();
    return task;
  }

  async updateWorkTask(id: number, data: Partial<marketingSchema.InsertWorkTask>) {
    const [task] = await db
      .update(marketingSchema.workTasks)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(marketingSchema.workTasks.id, id))
      .returning();
    return task;
  }

  async completeWorkTask(id: number, userId: number, completionNotes?: string) {
    const [task] = await db
      .update(marketingSchema.workTasks)
      .set({
        status: 'completed',
        completedDate: new Date(),
        completionNotes,
        updatedAt: new Date()
      })
      .where(eq(marketingSchema.workTasks.id, id))
      .returning();
    return task;
  }

  async verifyTaskCompletion(id: number, verifiedBy: number) {
    const [task] = await db
      .update(marketingSchema.workTasks)
      .set({
        verifiedBy,
        verifiedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(marketingSchema.workTasks.id, id))
      .returning();
    return task;
  }

  // ==================== MARKETING REPORTS ====================

  async getMarketingReports(tenantId: number, reportType?: string, status?: string) {
    let whereClause = eq(marketingSchema.marketingReports.tenantId, tenantId);

    if (reportType) {
      whereClause = and(whereClause, eq(marketingSchema.marketingReports.reportType, reportType));
    }

    if (status) {
      whereClause = and(whereClause, eq(marketingSchema.marketingReports.status, status));
    }

    return await db
      .select()
      .from(marketingSchema.marketingReports)
      .where(whereClause)
      .orderBy(desc(marketingSchema.marketingReports.createdAt));
  }

  async createMarketingReport(data: marketingSchema.InsertMarketingReport) {
    const [report] = await db
      .insert(marketingSchema.marketingReports)
      .values(data)
      .returning();
    return report;
  }

  async submitMarketingReport(id: number) {
    const [report] = await db
      .update(marketingSchema.marketingReports)
      .set({
        status: 'submitted',
        submittedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(marketingSchema.marketingReports.id, id))
      .returning();
    return report;
  }

  async approveMarketingReport(id: number, approvedBy: number) {
    const [report] = await db
      .update(marketingSchema.marketingReports)
      .set({
        status: 'approved',
        approvedBy,
        approvedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(marketingSchema.marketingReports.id, id))
      .returning();
    return report;
  }

  // ==================== ANALYTICS AND METRICS ====================

  async getMarketingMetrics(tenantId: number, period: string = '30d') {
    const periodClause = period === '7d' 
      ? sql`created_at >= NOW() - INTERVAL '7 days'`
      : period === '30d'
      ? sql`created_at >= NOW() - INTERVAL '30 days'`
      : sql`created_at >= NOW() - INTERVAL '90 days'`;

    const campaignMetrics = await db.execute(
      sql`SELECT 
        COUNT(*) as total_campaigns,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active_campaigns,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_campaigns,
        SUM(CAST(budget AS DECIMAL)) as total_budget,
        SUM(CAST(actual_spend AS DECIMAL)) as total_spend,
        AVG(CAST(budget AS DECIMAL)) as avg_campaign_budget
      FROM ${marketingSchema.marketingCampaigns}
      WHERE tenant_id = ${tenantId} AND ${periodClause}`
    );

    const leadMetrics = await db.execute(
      sql`SELECT 
        COUNT(*) as total_leads,
        COUNT(CASE WHEN converted_to_patient = true THEN 1 END) as converted_leads,
        AVG(lead_score) as avg_lead_score,
        COUNT(CASE WHEN status = 'new' THEN 1 END) as new_leads
      FROM ${marketingSchema.marketingLeads}
      WHERE tenant_id = ${tenantId} AND ${periodClause}`
    );

    return {
      campaigns: campaignMetrics.rows[0],
      leads: leadMetrics.rows[0],
      period
    };
  }

  async getMessageMetrics(tenantId: number, userId?: number) {
    const userClause = userId 
      ? sql`AND ${userId} = ANY(recipient_ids)`
      : sql``;

    return await db.execute(
      sql`SELECT 
        COUNT(*) as total_messages,
        COUNT(CASE WHEN status = 'read' THEN 1 END) as read_messages,
        COUNT(CASE WHEN status = 'acknowledged' THEN 1 END) as acknowledged_messages,
        COUNT(CASE WHEN action_completed = true THEN 1 END) as completed_actions,
        COUNT(CASE WHEN action_required = true AND action_completed = false THEN 1 END) as pending_actions
      FROM ${marketingSchema.internalMessages}
      WHERE tenant_id = ${tenantId} ${userClause}`
    );
  }
}

export const marketingStorage = new MarketingStorage();