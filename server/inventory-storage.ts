import { db } from "./db";
import { eq, and, desc, gte, lte, isNull, sql } from "drizzle-orm";
import { 
  inventoryCategories,
  inventoryItems,
  inventoryStock,
  inventoryTransactions
} from "../shared/schema";

export class InventoryStorage {
  // Inventory Categories
  async getInventoryCategories(tenantId: number) {
    const result = await db.execute(sql`
      SELECT * FROM inventory_categories 
      WHERE tenant_id = ${tenantId} AND is_active = true
      ORDER BY name ASC
    `);
    return result.rows;
  }

  async createInventoryCategory(data: any) {
    const result = await db.execute(sql`
      INSERT INTO inventory_categories (tenant_id, name, description, parent_category_id, is_active, created_at, updated_at)
      VALUES (${data.tenantId}, ${data.name}, ${data.description || null}, ${data.parentCategoryId || null}, true, NOW(), NOW())
      RETURNING *
    `);
    return result.rows[0];
  }

  // Inventory Items
  async getInventoryItems(tenantId: number, categoryId?: number) {
    let query = `
      SELECT i.*, c.name as category_name,
             COALESCE(SUM(s.available_quantity), 0) as total_available,
             COALESCE(SUM(s.reserved_quantity), 0) as total_reserved
      FROM inventory_items i
      LEFT JOIN inventory_categories c ON c.id = i.category_id
      LEFT JOIN inventory_stock s ON s.item_id = i.id
      WHERE i.tenant_id = ${tenantId} AND i.is_active = true
    `;
    
    if (categoryId) {
      query += ` AND i.category_id = ${categoryId}`;
    }
    
    query += ` GROUP BY i.id, c.name ORDER BY i.name ASC`;
    
    const result = await db.execute(sql.raw(query));
    return result.rows;
  }

  async createInventoryItem(data: any) {
    // Generate item code
    const itemCode = await this.generateItemCode(data.tenantId, data.categoryId);
    
    const result = await db.execute(sql`
      INSERT INTO inventory_items (
        tenant_id, item_code, name, description, category_id, unit_of_measure,
        minimum_stock, maximum_stock, reorder_level, standard_cost, selling_price,
        is_consumable, requires_serial_number, expiry_tracking, is_active, created_at, updated_at
      ) VALUES (
        ${data.tenantId}, ${itemCode}, ${data.name}, ${data.description || null}, ${data.categoryId},
        ${data.unitOfMeasure}, ${data.minimumStock || 0}, ${data.maximumStock || null}, 
        ${data.reorderLevel || 0}, ${data.standardCost || 0}, ${data.sellingPrice || null},
        ${data.isConsumable !== false}, ${data.requiresSerialNumber === true}, 
        ${data.expiryTracking === true}, true, NOW(), NOW()
      ) RETURNING *
    `);
    return result.rows[0];
  }

  async generateItemCode(tenantId: number, categoryId: number) {
    // Get category prefix
    const categoryResult = await db.execute(sql`
      SELECT name FROM inventory_categories WHERE id = ${categoryId}
    `);
    
    const categoryPrefix = categoryResult.rows[0]?.name?.substring(0, 3).toUpperCase() || 'ITM';
    
    // Get next sequence number
    const countResult = await db.execute(sql`
      SELECT COUNT(*) as count FROM inventory_items 
      WHERE tenant_id = ${tenantId} AND category_id = ${categoryId}
    `);
    
    const nextNum = (parseInt(countResult.rows[0]?.count || '0') + 1).toString().padStart(4, '0');
    return `${categoryPrefix}-${nextNum}`;
  }

  // Inventory Stock Management
  async getInventoryStock(tenantId: number, branchId: number, itemId?: number) {
    let query = `
      SELECT s.*, i.name as item_name, i.item_code, i.unit_of_measure,
             i.minimum_stock, i.reorder_level, c.name as category_name,
             CASE 
               WHEN s.available_quantity <= i.reorder_level THEN 'low_stock'
               WHEN s.available_quantity <= i.minimum_stock THEN 'critical'
               ELSE 'adequate'
             END as stock_status
      FROM inventory_stock s
      JOIN inventory_items i ON i.id = s.item_id
      LEFT JOIN inventory_categories c ON c.id = i.category_id
      WHERE s.tenant_id = ${tenantId} AND s.branch_id = ${branchId}
    `;
    
    if (itemId) {
      query += ` AND s.item_id = ${itemId}`;
    }
    
    query += ` ORDER BY i.name ASC`;
    
    const result = await db.execute(sql.raw(query));
    return result.rows;
  }

  async updateInventoryStock(tenantId: number, branchId: number, itemId: number, transaction: any) {
    // Get current stock
    const stockResult = await db.execute(sql`
      SELECT * FROM inventory_stock 
      WHERE tenant_id = ${tenantId} AND branch_id = ${branchId} AND item_id = ${itemId}
    `);
    
    let currentStock = stockResult.rows[0];
    
    if (!currentStock) {
      // Create new stock record
      await db.execute(sql`
        INSERT INTO inventory_stock (tenant_id, branch_id, item_id, available_quantity, reserved_quantity, on_order_quantity, average_cost, updated_at)
        VALUES (${tenantId}, ${branchId}, ${itemId}, 0, 0, 0, 0, NOW())
      `);
      
      const newStockResult = await db.execute(sql`
        SELECT * FROM inventory_stock 
        WHERE tenant_id = ${tenantId} AND branch_id = ${branchId} AND item_id = ${itemId}
      `);
      currentStock = newStockResult.rows[0];
    }
    
    // Calculate new quantities based on transaction type
    let newAvailable = currentStock.available_quantity;
    let newReserved = currentStock.reserved_quantity;
    let newOnOrder = currentStock.on_order_quantity;
    let newAverageCost = parseFloat(currentStock.average_cost);
    
    switch (transaction.transactionType) {
      case 'in':
        newAvailable += transaction.quantity;
        // Weighted average cost calculation
        const totalCost = (currentStock.available_quantity * newAverageCost) + (transaction.quantity * transaction.unitCost);
        const totalQuantity = currentStock.available_quantity + transaction.quantity;
        newAverageCost = totalQuantity > 0 ? totalCost / totalQuantity : transaction.unitCost;
        break;
        
      case 'out':
        newAvailable -= transaction.quantity;
        break;
        
      case 'transfer':
        // Handle transfer logic (out from source, in to destination)
        newAvailable -= transaction.quantity;
        break;
        
      case 'adjustment':
        newAvailable = transaction.quantity; // Set absolute quantity
        break;
        
      case 'reserved':
        newReserved += transaction.quantity;
        newAvailable -= transaction.quantity;
        break;
        
      case 'unreserved':
        newReserved -= transaction.quantity;
        newAvailable += transaction.quantity;
        break;
    }
    
    // Update stock
    await db.execute(sql`
      UPDATE inventory_stock 
      SET available_quantity = ${newAvailable},
          reserved_quantity = ${newReserved},
          on_order_quantity = ${newOnOrder},
          average_cost = ${newAverageCost},
          updated_at = NOW()
      WHERE tenant_id = ${tenantId} AND branch_id = ${branchId} AND item_id = ${itemId}
    `);
    
    return { newAvailable, newReserved, newOnOrder, newAverageCost };
  }

  // Inventory Transactions
  async createInventoryTransaction(data: any) {
    // Record the transaction
    const result = await db.execute(sql`
      INSERT INTO inventory_transactions (
        tenant_id, branch_id, item_id, transaction_type, reference_type, reference_id,
        quantity, unit_cost, total_cost, batch_number, expiry_date, serial_numbers,
        notes, performed_by, created_at
      ) VALUES (
        ${data.tenantId}, ${data.branchId}, ${data.itemId}, ${data.transactionType},
        ${data.referenceType || null}, ${data.referenceId || null}, ${data.quantity},
        ${data.unitCost || null}, ${data.totalCost || null}, ${data.batchNumber || null},
        ${data.expiryDate || null}, ${data.serialNumbers ? JSON.stringify(data.serialNumbers) : null},
        ${data.notes || null}, ${data.performedBy}, NOW()
      ) RETURNING *
    `);
    
    const transaction = result.rows[0];
    
    // Update stock levels
    await this.updateInventoryStock(data.tenantId, data.branchId, data.itemId, data);
    
    return transaction;
  }

  async getInventoryTransactions(tenantId: number, branchId?: number, itemId?: number, limit = 50) {
    let query = `
      SELECT t.*, i.name as item_name, i.item_code, u.username as performed_by_username
      FROM inventory_transactions t
      JOIN inventory_items i ON i.id = t.item_id
      LEFT JOIN users u ON u.id = t.performed_by
      WHERE t.tenant_id = ${tenantId}
    `;
    
    if (branchId) {
      query += ` AND t.branch_id = ${branchId}`;
    }
    
    if (itemId) {
      query += ` AND t.item_id = ${itemId}`;
    }
    
    query += ` ORDER BY t.created_at DESC LIMIT ${limit}`;
    
    const result = await db.execute(sql.raw(query));
    return result.rows;
  }

  // Low Stock Alerts
  async getLowStockItems(tenantId: number, branchId?: number) {
    let query = `
      SELECT s.*, i.name as item_name, i.item_code, i.unit_of_measure,
             i.minimum_stock, i.reorder_level, c.name as category_name
      FROM inventory_stock s
      JOIN inventory_items i ON i.id = s.item_id
      LEFT JOIN inventory_categories c ON c.id = i.category_id
      WHERE s.tenant_id = ${tenantId} 
        AND i.is_active = true
        AND s.available_quantity <= i.reorder_level
    `;
    
    if (branchId) {
      query += ` AND s.branch_id = ${branchId}`;
    }
    
    query += ` ORDER BY s.available_quantity ASC`;
    
    const result = await db.execute(sql.raw(query));
    return result.rows;
  }

  // Expiring Items
  async getExpiringItems(tenantId: number, branchId?: number, daysAhead = 30) {
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + daysAhead);
    
    let query = `
      SELECT t.*, i.name as item_name, i.item_code, i.unit_of_measure,
             s.available_quantity, c.name as category_name
      FROM inventory_transactions t
      JOIN inventory_items i ON i.id = t.item_id
      LEFT JOIN inventory_stock s ON s.item_id = t.item_id AND s.tenant_id = t.tenant_id AND s.branch_id = t.branch_id
      LEFT JOIN inventory_categories c ON c.id = i.category_id
      WHERE t.tenant_id = ${tenantId}
        AND t.expiry_date IS NOT NULL
        AND t.expiry_date <= '${expiryDate.toISOString().split('T')[0]}'
        AND i.expiry_tracking = true
        AND i.is_active = true
    `;
    
    if (branchId) {
      query += ` AND t.branch_id = ${branchId}`;
    }
    
    query += ` ORDER BY t.expiry_date ASC`;
    
    const result = await db.execute(sql.raw(query));
    return result.rows;
  }

  // Inventory Valuation
  async getInventoryValuation(tenantId: number, branchId?: number) {
    let query = `
      SELECT 
        SUM(s.available_quantity * s.average_cost) as total_value,
        COUNT(DISTINCT s.item_id) as total_items,
        SUM(s.available_quantity) as total_quantity
      FROM inventory_stock s
      JOIN inventory_items i ON i.id = s.item_id
      WHERE s.tenant_id = ${tenantId} AND i.is_active = true
    `;
    
    if (branchId) {
      query += ` AND s.branch_id = ${branchId}`;
    }
    
    const result = await db.execute(sql.raw(query));
    return result.rows[0];
  }
}

export const inventoryStorage = new InventoryStorage();