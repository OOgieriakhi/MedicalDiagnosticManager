import { db } from "./db";
import { sql } from "drizzle-orm";

export class InventoryConsumptionService {
  
  /**
   * Automatically consume inventory items when a test is completed
   * Based on international medical laboratory standards
   */
  async consumeItemsForCompletedTest(
    testId: number,
    patientTestId: number,
    patientId: number,
    branchId: number,
    tenantId: number,
    performedBy: number
  ) {
    try {
      // Get consumption templates for this test
      const consumptionTemplates = await db.execute(sql`
        SELECT * FROM test_consumption_templates 
        WHERE test_id = ${testId} AND tenant_id = ${tenantId}
      `);

      if (consumptionTemplates.rows.length === 0) {
        console.log(`No consumption templates found for test ID: ${testId}`);
        return { success: true, consumedItems: [] };
      }

      const consumedItems = [];

      for (const template of consumptionTemplates.rows) {
        // Check current stock level
        const currentStock = await db.execute(sql`
          SELECT available_quantity FROM inventory_stock 
          WHERE item_id = ${template.item_id} 
            AND branch_id = ${branchId} 
            AND tenant_id = ${tenantId}
        `);

        const availableQty = currentStock.rows[0]?.available_quantity || 0;
        const requiredQty = parseFloat(template.standard_quantity);

        if (availableQty < requiredQty) {
          throw new Error(`Insufficient stock for item ID: ${template.item_id}. Required: ${requiredQty}, Available: ${availableQty}`);
        }

        // Record consumption transaction
        await db.execute(sql`
          INSERT INTO inventory_transactions (
            tenant_id, branch_id, item_id, transaction_type, quantity,
            reference_type, reference_id, cost_center, consumption_reason,
            patient_id, test_id, performed_by, notes, transaction_date
          ) VALUES (
            ${tenantId}, ${branchId}, ${template.item_id}, 'consumption', ${-Math.abs(requiredQty)},
            'patient_test', ${patientTestId}, ${template.cost_center}, 'test_procedure',
            ${patientId}, ${testId}, ${performedBy}, 
            'Automatic consumption for test completion - Test ID: ' || ${testId} || ', Patient Test ID: ' || ${patientTestId},
            NOW()
          )
        `);

        // Update stock levels
        await db.execute(sql`
          UPDATE inventory_stock 
          SET available_quantity = available_quantity - ${requiredQty},
              updated_at = NOW()
          WHERE item_id = ${template.item_id} 
            AND branch_id = ${branchId} 
            AND tenant_id = ${tenantId}
        `);

        consumedItems.push({
          itemId: template.item_id,
          quantity: requiredQty,
          costCenter: template.cost_center
        });
      }

      console.log(`Successfully consumed ${consumedItems.length} item types for test ID: ${testId}`);
      return { success: true, consumedItems };

    } catch (error) {
      console.error('Error consuming items for completed test:', error);
      throw error;
    }
  }

  /**
   * Initiate monthly stock count procedure
   */
  async initiateMonthlyStockCount(
    tenantId: number,
    branchId: number,
    countedBy: number,
    countMethod: 'full_count' | 'cycle_count' | 'spot_check' = 'full_count'
  ) {
    try {
      const currentDate = new Date();
      const countPeriod = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;

      // Check if stock count already exists for this period
      const existingCount = await db.query.monthlyStockCounts.findFirst({
        where: and(
          eq(sql`monthly_stock_counts.tenant_id`, tenantId),
          eq(sql`monthly_stock_counts.branch_id`, branchId),
          eq(sql`monthly_stock_counts.count_period`, countPeriod)
        )
      });

      if (existingCount && existingCount.status !== 'scheduled') {
        throw new Error(`Stock count already ${existingCount.status} for period ${countPeriod}`);
      }

      // Create stock count record
      const stockCountId = await db.execute(sql`
        INSERT INTO monthly_stock_counts (
          tenant_id, branch_id, count_period, count_date, 
          status, counted_by, count_method, started_at
        ) VALUES (
          ${tenantId}, ${branchId}, ${countPeriod}, ${currentDate},
          'in_progress', ${countedBy}, ${countMethod}, ${currentDate}
        ) RETURNING id
      `);

      return { 
        success: true, 
        stockCountId: stockCountId.rows[0]?.id,
        countPeriod,
        message: `Monthly stock count initiated for ${countPeriod}`
      };

    } catch (error) {
      console.error('Error initiating monthly stock count:', error);
      throw error;
    }
  }

  /**
   * Record individual item count during stock counting
   */
  async recordItemCount(
    stockCountId: number,
    itemId: number,
    countedQuantity: number,
    countedBy: number,
    batchNumber?: string,
    expiryDate?: Date,
    location?: string,
    conditionNotes?: string
  ) {
    try {
      // Get current system quantity
      const systemStock = await db.query.inventoryStock.findFirst({
        where: eq(inventoryStock.itemId, itemId)
      });

      if (!systemStock) {
        throw new Error(`No system stock record found for item ID: ${itemId}`);
      }

      const variance = countedQuantity - systemStock.availableQuantity;
      const valueVariance = variance * (systemStock.averageCost || 0);

      // Record count detail
      await db.execute(sql`
        INSERT INTO stock_count_details (
          stock_count_id, item_id, system_quantity, counted_quantity, variance,
          unit_cost, value_variance, batch_number, expiry_date, location,
          condition_notes, counted_by, adjustment_required
        ) VALUES (
          ${stockCountId}, ${itemId}, ${systemStock.availableQuantity}, ${countedQuantity},
          ${variance}, ${systemStock.averageCost || 0}, ${valueVariance}, ${batchNumber},
          ${expiryDate}, ${location}, ${conditionNotes}, ${countedBy}, ${Math.abs(variance) > 0}
        )
      `);

      return {
        success: true,
        variance,
        valueVariance,
        adjustmentRequired: Math.abs(variance) > 0
      };

    } catch (error) {
      console.error('Error recording item count:', error);
      throw error;
    }
  }

  /**
   * Complete stock count and generate adjustment transactions
   */
  async completeStockCount(stockCountId: number, verifiedBy: number) {
    try {
      // Get all count details with variances
      const countDetails = await db.execute(sql`
        SELECT * FROM stock_count_details 
        WHERE stock_count_id = ${stockCountId} AND adjustment_required = true
      `);

      const adjustmentTransactions = [];

      for (const detail of countDetails.rows) {
        if (detail.variance !== 0) {
          // Create adjustment transaction
          await db.insert(inventoryTransactions).values({
            tenantId: 1, // Should be passed as parameter
            branchId: 1, // Should be passed as parameter
            itemId: detail.item_id,
            transactionType: 'adjustment',
            quantity: detail.variance,
            referenceType: 'stock_count',
            referenceId: stockCountId,
            notes: `Stock count adjustment - System: ${detail.system_quantity}, Counted: ${detail.counted_quantity}, Variance: ${detail.variance}`,
            performedBy: verifiedBy,
            approvedBy: verifiedBy
          });

          // Update stock levels
          await db
            .update(inventoryStock)
            .set({
              availableQuantity: detail.counted_quantity,
              lastStockCheck: new Date(),
              updatedAt: new Date()
            })
            .where(eq(inventoryStock.itemId, detail.item_id));

          adjustmentTransactions.push({
            itemId: detail.item_id,
            variance: detail.variance,
            valueVariance: detail.value_variance
          });
        }
      }

      // Update stock count status
      await db.execute(sql`
        UPDATE monthly_stock_counts 
        SET status = 'completed', verified_by = ${verifiedBy}, 
            verified_at = ${new Date()}, completed_at = ${new Date()},
            total_discrepancies = ${adjustmentTransactions.length},
            total_value_variance = ${adjustmentTransactions.reduce((sum, adj) => sum + adj.valueVariance, 0)}
        WHERE id = ${stockCountId}
      `);

      return {
        success: true,
        adjustmentTransactions,
        totalDiscrepancies: adjustmentTransactions.length,
        message: `Stock count completed with ${adjustmentTransactions.length} adjustments`
      };

    } catch (error) {
      console.error('Error completing stock count:', error);
      throw error;
    }
  }

  /**
   * Get low stock alerts based on reorder levels
   */
  async getLowStockAlerts(tenantId: number, branchId: number) {
    try {
      const lowStockItems = await db.execute(sql`
        SELECT 
          ii.id,
          ii.item_code,
          ii.name,
          ii.reorder_level,
          ii.minimum_stock,
          is.available_quantity,
          ic.name as category_name
        FROM inventory_items ii
        JOIN inventory_stock is ON ii.id = is.item_id
        JOIN inventory_categories ic ON ii.category_id = ic.id
        WHERE ii.tenant_id = ${tenantId} 
          AND is.branch_id = ${branchId}
          AND is.available_quantity <= ii.reorder_level
          AND ii.is_active = true
        ORDER BY (is.available_quantity - ii.reorder_level) ASC
      `);

      return {
        success: true,
        lowStockItems: lowStockItems.rows,
        totalLowStockItems: lowStockItems.rows.length
      };

    } catch (error) {
      console.error('Error getting low stock alerts:', error);
      throw error;
    }
  }
}

export const inventoryConsumptionService = new InventoryConsumptionService();