import { db } from "./db";
import { eq, and } from "drizzle-orm";

// Approval configuration interface for different currencies and organizational structures
export interface ApprovalThresholds {
  id?: number;
  tenantId: number;
  branchId: number;
  currency: string;
  managerThreshold: number;     // Requires branch manager approval
  financeThreshold: number;     // Requires finance manager approval
  ceoThreshold: number;         // Requires CEO/director approval
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ApprovalRole {
  id?: number;
  tenantId: number;
  branchId: number;
  userId: number;
  role: string;
  maxApprovalAmount: number;
  isActive: boolean;
  createdAt?: Date;
}

export class ApprovalConfigService {
  
  /**
   * Get approval thresholds for a specific tenant/branch
   */
  async getApprovalThresholds(tenantId: number, branchId: number): Promise<ApprovalThresholds> {
    // For now, return default thresholds based on common African currencies
    // This will be configurable per organization in production
    const defaultThresholds: ApprovalThresholds = {
      tenantId,
      branchId,
      currency: 'NGN', // Nigerian Naira as example
      managerThreshold: 25000,    // ~$60 USD equivalent
      financeThreshold: 100000,   // ~$240 USD equivalent  
      ceoThreshold: 500000,       // ~$1200 USD equivalent
      isActive: true
    };

    return defaultThresholds;
  }

  /**
   * Update approval thresholds for an organization
   */
  async updateApprovalThresholds(thresholds: ApprovalThresholds): Promise<void> {
    // Implementation for updating thresholds in database
    // This will be used during setup/configuration phase
    console.log('Updating approval thresholds:', thresholds);
  }

  /**
   * Get currency-specific approval amounts
   */
  getCurrencyThresholds(currency: string): ApprovalThresholds {
    const currencyDefaults: Record<string, Partial<ApprovalThresholds>> = {
      'NGN': { // Nigerian Naira
        managerThreshold: 25000,
        financeThreshold: 100000,
        ceoThreshold: 500000
      },
      'KES': { // Kenyan Shilling
        managerThreshold: 2500,
        financeThreshold: 10000,
        ceoThreshold: 50000
      },
      'GHS': { // Ghanaian Cedi
        managerThreshold: 150,
        financeThreshold: 600,
        ceoThreshold: 3000
      },
      'ZAR': { // South African Rand
        managerThreshold: 400,
        financeThreshold: 1600,
        ceoThreshold: 8000
      },
      'USD': { // US Dollar
        managerThreshold: 25,
        financeThreshold: 100,
        ceoThreshold: 500
      },
      'EUR': { // Euro
        managerThreshold: 23,
        financeThreshold: 92,
        ceoThreshold: 460
      }
    };

    const defaults = currencyDefaults[currency] || currencyDefaults['USD'];
    
    return {
      tenantId: 1,
      branchId: 1,
      currency,
      managerThreshold: defaults.managerThreshold || 25,
      financeThreshold: defaults.financeThreshold || 100,
      ceoThreshold: defaults.ceoThreshold || 500,
      isActive: true
    };
  }

  /**
   * Load approval roles and hierarchies for an organization
   */
  async loadApprovalRoles(tenantId: number, branchId: number): Promise<ApprovalRole[]> {
    // This will query the actual user roles and their approval limits
    // For now, returning empty array - will be populated during setup
    return [];
  }

  /**
   * Initialize default approval configuration for a new organization
   */
  async initializeApprovalConfig(tenantId: number, branchId: number, currency: string = 'USD'): Promise<void> {
    const thresholds = this.getCurrencyThresholds(currency);
    thresholds.tenantId = tenantId;
    thresholds.branchId = branchId;
    
    await this.updateApprovalThresholds(thresholds);
    
    console.log(`Initialized approval configuration for tenant ${tenantId}, branch ${branchId} with currency ${currency}`);
  }

  /**
   * Validate approval amount against configured thresholds
   */
  async validateApprovalAmount(tenantId: number, branchId: number, amount: number, approverId: number): Promise<boolean> {
    const thresholds = await this.getApprovalThresholds(tenantId, branchId);
    const roles = await this.loadApprovalRoles(tenantId, branchId);
    
    // Find approver's role and max approval amount
    const approverRole = roles.find(role => role.userId === approverId && role.isActive);
    
    if (!approverRole) {
      return false; // Approver not found or inactive
    }
    
    return amount <= approverRole.maxApprovalAmount;
  }
}

export const approvalConfigService = new ApprovalConfigService();