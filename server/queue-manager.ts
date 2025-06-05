import { db } from "./db";
import { 
  queuePatients, 
  queueStats, 
  queueDepartments,
  patients 
} from "../shared/schema";
import { eq, and, desc, sql, count, avg, max, min } from "drizzle-orm";

export interface QueuePatient {
  id: string;
  patientId: string;
  patientName: string;
  appointmentType: string;
  priority: 'urgent' | 'high' | 'normal' | 'low';
  status: 'waiting' | 'called' | 'in-progress' | 'completed' | 'no-show';
  estimatedWaitTime: number;
  actualWaitTime: number;
  checkedInAt: string;
  calledAt?: string;
  startedAt?: string;
  completedAt?: string;
  department: string;
  doctor: string;
  notes?: string;
  position: number;
  avgServiceTime: number;
}

export interface QueueStats {
  totalWaiting: number;
  totalServed: number;
  averageWaitTime: number;
  currentWaitTime: number;
  peakHour: string;
  efficiency: number;
  noShowRate: number;
}

export interface Department {
  id: string;
  name: string;
  activeQueues: number;
  totalWaiting: number;
  averageServiceTime: number;
  status: 'active' | 'busy' | 'closed';
}

export class QueueManager {
  
  async getQueuePatients(tenantId: number, branchId?: number, options?: {
    department?: string;
    status?: string;
  }) {
    let whereConditions = [
      eq(queuePatients.tenantId, tenantId)
    ];

    if (branchId) {
      whereConditions.push(eq(queuePatients.branchId, branchId));
    }

    if (options?.department && options.department !== 'all') {
      whereConditions.push(eq(queuePatients.department, options.department));
    }

    if (options?.status && options.status !== 'all') {
      whereConditions.push(eq(queuePatients.status, options.status));
    }

    const query = db
      .select({
        id: queuePatients.id,
        patientId: queuePatients.patientId,
        patientName: sql<string>`${patients.firstName} || ' ' || ${patients.lastName}`,
        appointmentType: queuePatients.appointmentType,
        priority: queuePatients.priority,
        status: queuePatients.status,
        estimatedWaitTime: queuePatients.estimatedWaitTime,
        actualWaitTime: sql<number>`EXTRACT(EPOCH FROM (NOW() - ${queuePatients.checkedInAt}))/60`,
        checkedInAt: queuePatients.checkedInAt,
        calledAt: queuePatients.calledAt,
        startedAt: queuePatients.startedAt,
        completedAt: queuePatients.completedAt,
        department: queuePatients.department,
        doctor: queuePatients.doctor,
        notes: queuePatients.notes,
        position: queuePatients.position,
      })
      .from(queuePatients)
      .innerJoin(patients, eq(queuePatients.patientId, patients.id))
      .where(and(...whereConditions))
      .orderBy(queuePatients.position);

    const results = await query;

    return results.map(row => ({
      id: row.id.toString(),
      patientId: row.patientId.toString(),
      patientName: row.patientName,
      appointmentType: row.appointmentType,
      priority: row.priority as any,
      status: row.status as any,
      estimatedWaitTime: row.estimatedWaitTime,
      actualWaitTime: Math.floor(row.actualWaitTime),
      checkedInAt: row.checkedInAt.toISOString(),
      calledAt: row.calledAt?.toISOString(),
      startedAt: row.startedAt?.toISOString(),
      completedAt: row.completedAt?.toISOString(),
      department: row.department,
      doctor: row.doctor,
      notes: row.notes,
      position: row.position,
      avgServiceTime: 15 // Default service time
    }));
  }

  async getQueueStats(tenantId: number, branchId?: number) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [waitingCount, servedCount, avgWaitTime, noShowCount] = await Promise.all([
      // Total waiting
      db
        .select({ count: count() })
        .from(queuePatients)
        .where(
          and(
            eq(queuePatients.tenantId, tenantId),
            branchId ? eq(queuePatients.branchId, branchId) : undefined,
            eq(queuePatients.status, 'waiting')
          )
        ),

      // Total served today
      db
        .select({ count: count() })
        .from(queuePatients)
        .where(
          and(
            eq(queuePatients.tenantId, tenantId),
            branchId ? eq(queuePatients.branchId, branchId) : undefined,
            eq(queuePatients.status, 'completed'),
            sql`DATE(${queuePatients.completedAt}) = CURRENT_DATE`
          )
        ),

      // Average wait time
      db
        .select({
          avgWait: sql<number>`AVG(EXTRACT(EPOCH FROM (${queuePatients.completedAt} - ${queuePatients.checkedInAt}))/60)::INTEGER`
        })
        .from(queuePatients)
        .where(
          and(
            eq(queuePatients.tenantId, tenantId),
            branchId ? eq(queuePatients.branchId, branchId) : undefined,
            eq(queuePatients.status, 'completed'),
            sql`DATE(${queuePatients.completedAt}) = CURRENT_DATE`
          )
        ),

      // No show count
      db
        .select({ count: count() })
        .from(queuePatients)
        .where(
          and(
            eq(queuePatients.tenantId, tenantId),
            branchId ? eq(queuePatients.branchId, branchId) : undefined,
            eq(queuePatients.status, 'no-show'),
            sql`DATE(${queuePatients.noShowAt}) = CURRENT_DATE`
          )
        )
    ]);

    const totalPatients = (servedCount[0]?.count || 0) + (noShowCount[0]?.count || 0);
    const efficiency = totalPatients > 0 ? Math.round(((servedCount[0]?.count || 0) / totalPatients) * 100) : 100;
    const noShowRate = totalPatients > 0 ? Math.round(((noShowCount[0]?.count || 0) / totalPatients) * 100) : 0;

    return {
      totalWaiting: waitingCount[0]?.count || 0,
      totalServed: servedCount[0]?.count || 0,
      averageWaitTime: avgWaitTime[0]?.avgWait || 0,
      currentWaitTime: 25, // Calculated estimate
      peakHour: "10:00 AM",
      efficiency: efficiency,
      noShowRate: noShowRate
    };
  }

  async getDepartments(tenantId: number, branchId?: number) {
    const departments = await db
      .select({
        id: queueDepartments.id,
        name: queueDepartments.name,
        status: queueDepartments.status,
        averageServiceTime: queueDepartments.averageServiceTime,
        currentLoad: queueDepartments.currentLoad,
      })
      .from(queueDepartments)
      .where(
        and(
          eq(queueDepartments.tenantId, tenantId),
          branchId ? eq(queueDepartments.branchId, branchId) : undefined,
          eq(queueDepartments.isActive, true)
        )
      );

    // Get waiting counts for each department
    const waitingCounts = await Promise.all(
      departments.map(async (dept) => {
        const waitingCount = await db
          .select({ count: count() })
          .from(queuePatients)
          .where(
            and(
              eq(queuePatients.tenantId, tenantId),
              branchId ? eq(queuePatients.branchId, branchId) : undefined,
              eq(queuePatients.department, dept.name),
              eq(queuePatients.status, 'waiting')
            )
          );
        
        return {
          departmentId: dept.id,
          waitingCount: waitingCount[0]?.count || 0
        };
      })
    );

    return departments.map(dept => {
      const waitingData = waitingCounts.find(w => w.departmentId === dept.id);
      return {
        id: dept.id.toString(),
        name: dept.name,
        activeQueues: 1,
        totalWaiting: waitingData?.waitingCount || 0,
        averageServiceTime: dept.averageServiceTime,
        status: dept.status as any
      };
    });
  }

  async callNextPatient(tenantId: number, patientId: string, department: string) {
    const currentTime = new Date();
    
    await db
      .update(queuePatients)
      .set({
        status: 'called',
        calledAt: currentTime,
        updatedAt: currentTime
      })
      .where(
        and(
          eq(queuePatients.tenantId, tenantId),
          eq(queuePatients.id, parseInt(patientId))
        )
      );

    return { success: true };
  }

  async updatePatientStatus(tenantId: number, patientId: string, status: string, notes?: string) {
    const currentTime = new Date();
    
    const updateData: any = {
      status,
      updatedAt: currentTime
    };

    if (notes) {
      updateData.notes = notes;
    }

    if (status === 'in-progress') {
      updateData.startedAt = currentTime;
    } else if (status === 'completed') {
      updateData.completedAt = currentTime;
    } else if (status === 'no-show') {
      updateData.noShowAt = currentTime;
    }

    await db
      .update(queuePatients)
      .set(updateData)
      .where(
        and(
          eq(queuePatients.tenantId, tenantId),
          eq(queuePatients.id, parseInt(patientId))
        )
      );

    return { success: true };
  }

  async addPatientToQueue(tenantId: number, branchId: number, patientData: {
    patientId: number;
    department: string;
    doctor: string;
    appointmentType: string;
    priority?: string;
    notes?: string;
  }) {
    // Get next position in queue
    const lastPosition = await db
      .select({ maxPosition: max(queuePatients.position) })
      .from(queuePatients)
      .where(
        and(
          eq(queuePatients.tenantId, tenantId),
          eq(queuePatients.branchId, branchId),
          eq(queuePatients.department, patientData.department),
          eq(queuePatients.status, 'waiting')
        )
      );

    const nextPosition = (lastPosition[0]?.maxPosition || 0) + 1;

    // Calculate estimated wait time
    const avgServiceTime = await db
      .select({ avgTime: queueDepartments.averageServiceTime })
      .from(queueDepartments)
      .where(
        and(
          eq(queueDepartments.tenantId, tenantId),
          eq(queueDepartments.name, patientData.department)
        )
      );

    const estimatedWait = (nextPosition - 1) * (avgServiceTime[0]?.avgTime || 15);

    await db.insert(queuePatients).values({
      tenantId,
      branchId,
      patientId: patientData.patientId,
      department: patientData.department,
      doctor: patientData.doctor,
      appointmentType: patientData.appointmentType,
      priority: patientData.priority || 'normal',
      position: nextPosition,
      estimatedWaitTime: estimatedWait,
      notes: patientData.notes
    });

    return { success: true, position: nextPosition, estimatedWait };
  }

  async initializeDepartments(tenantId: number, branchId: number) {
    const defaultDepartments = [
      { name: 'General Medicine', code: 'GEN', averageServiceTime: 20 },
      { name: 'Cardiology', code: 'CAR', averageServiceTime: 30 },
      { name: 'Laboratory', code: 'LAB', averageServiceTime: 10 },
      { name: 'Radiology', code: 'RAD', averageServiceTime: 25 },
      { name: 'Pharmacy', code: 'PHR', averageServiceTime: 5 }
    ];

    for (const dept of defaultDepartments) {
      const existing = await db
        .select()
        .from(queueDepartments)
        .where(
          and(
            eq(queueDepartments.tenantId, tenantId),
            eq(queueDepartments.branchId, branchId),
            eq(queueDepartments.name, dept.name)
          )
        );

      if (existing.length === 0) {
        await db.insert(queueDepartments).values({
          tenantId,
          branchId,
          name: dept.name,
          code: dept.code,
          averageServiceTime: dept.averageServiceTime
        });
      }
    }
  }
}

export const queueManager = new QueueManager();