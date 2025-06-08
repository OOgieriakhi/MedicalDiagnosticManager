import { db } from "./db";
import { patients, users, patient_tests, inventory_items, vendors, purchase_orders } from "../shared/schema";
import type { DatabaseStorage } from "./storage";

interface ImportResult {
  success: boolean;
  message: string;
  recordsProcessed: number;
  errors: string[];
}

interface PatientImportData {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  dateOfBirth?: string;
  gender?: string;
  address?: string;
  emergencyContact?: string;
  medicalHistory?: string;
  referralSource?: string;
}

interface TestImportData {
  patientId: number;
  testId: number;
  testDate: string;
  status: string;
  results?: string;
  cost?: number;
  paymentStatus?: string;
  paymentMethod?: string;
}

interface InventoryImportData {
  itemCode: string;
  name: string;
  description?: string;
  category: string;
  unitOfMeasure: string;
  minimumStock: number;
  maximumStock: number;
  reorderLevel: number;
  currentStock?: number;
  unitPrice?: number;
}

interface VendorImportData {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  contactPerson?: string;
  paymentTerms?: string;
  category?: string;
  taxId?: string;
}

export class DataImportService {
  constructor(private storage: DatabaseStorage) {}

  async importPatients(patientsData: PatientImportData[]): Promise<ImportResult> {
    const errors: string[] = [];
    let recordsProcessed = 0;

    try {
      for (const patientData of patientsData) {
        try {
          await this.storage.createPatient({
            tenantId: 1,
            branchId: 1,
            firstName: patientData.firstName,
            lastName: patientData.lastName,
            email: patientData.email || '',
            phone: patientData.phone || '',
            dateOfBirth: patientData.dateOfBirth ? new Date(patientData.dateOfBirth) : new Date(),
            gender: patientData.gender || 'unknown',
            address: patientData.address || '',
            emergencyContact: patientData.emergencyContact || '',
            medicalHistory: patientData.medicalHistory || '',
            referralSource: patientData.referralSource || 'walk-in'
          });
          recordsProcessed++;
        } catch (error) {
          errors.push(`Failed to import patient ${patientData.firstName} ${patientData.lastName}: ${error}`);
        }
      }

      return {
        success: errors.length === 0,
        message: `Imported ${recordsProcessed} patients successfully`,
        recordsProcessed,
        errors
      };
    } catch (error) {
      return {
        success: false,
        message: `Import failed: ${error}`,
        recordsProcessed,
        errors: [error as string]
      };
    }
  }

  async importPatientTests(testsData: TestImportData[]): Promise<ImportResult> {
    const errors: string[] = [];
    let recordsProcessed = 0;

    try {
      for (const testData of testsData) {
        try {
          await db.insert(patient_tests).values({
            patientId: testData.patientId,
            testId: testData.testId,
            tenantId: 1,
            branchId: 1,
            status: testData.status,
            scheduledAt: new Date(testData.testDate),
            completedAt: testData.status === 'completed' ? new Date(testData.testDate) : null,
            results: testData.results || '',
            paymentVerified: testData.paymentStatus === 'paid',
            paymentVerifiedAt: testData.paymentStatus === 'paid' ? new Date() : null
          });
          recordsProcessed++;
        } catch (error) {
          errors.push(`Failed to import test for patient ${testData.patientId}: ${error}`);
        }
      }

      return {
        success: errors.length === 0,
        message: `Imported ${recordsProcessed} patient tests successfully`,
        recordsProcessed,
        errors
      };
    } catch (error) {
      return {
        success: false,
        message: `Test import failed: ${error}`,
        recordsProcessed,
        errors: [error as string]
      };
    }
  }

  async importInventoryItems(inventoryData: InventoryImportData[]): Promise<ImportResult> {
    const errors: string[] = [];
    let recordsProcessed = 0;

    try {
      for (const item of inventoryData) {
        try {
          await db.insert(inventory_items).values({
            tenantId: 1,
            itemCode: item.itemCode,
            name: item.name,
            description: item.description || '',
            categoryId: 1, // Default category
            unitOfMeasure: item.unitOfMeasure,
            minimumStock: item.minimumStock,
            maximumStock: item.maximumStock,
            reorderLevel: item.reorderLevel
          });
          recordsProcessed++;
        } catch (error) {
          errors.push(`Failed to import inventory item ${item.itemCode}: ${error}`);
        }
      }

      return {
        success: errors.length === 0,
        message: `Imported ${recordsProcessed} inventory items successfully`,
        recordsProcessed,
        errors
      };
    } catch (error) {
      return {
        success: false,
        message: `Inventory import failed: ${error}`,
        recordsProcessed,
        errors: [error as string]
      };
    }
  }

  async importVendors(vendorsData: VendorImportData[]): Promise<ImportResult> {
    const errors: string[] = [];
    let recordsProcessed = 0;

    try {
      for (const vendor of vendorsData) {
        try {
          await db.insert(vendors).values({
            tenantId: 1,
            name: vendor.name,
            email: vendor.email || '',
            phone: vendor.phone || '',
            address: vendor.address || '',
            contactPerson: vendor.contactPerson || '',
            paymentTerms: vendor.paymentTerms || 'Net 30',
            category: vendor.category || 'general',
            taxId: vendor.taxId || '',
            status: 'active'
          });
          recordsProcessed++;
        } catch (error) {
          errors.push(`Failed to import vendor ${vendor.name}: ${error}`);
        }
      }

      return {
        success: errors.length === 0,
        message: `Imported ${recordsProcessed} vendors successfully`,
        recordsProcessed,
        errors
      };
    } catch (error) {
      return {
        success: false,
        message: `Vendor import failed: ${error}`,
        recordsProcessed,
        errors: [error as string]
      };
    }
  }

  async validateImportData(data: any[], type: string): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    switch (type) {
      case 'patients':
        data.forEach((item, index) => {
          if (!item.firstName || !item.lastName) {
            errors.push(`Row ${index + 1}: First name and last name are required`);
          }
          if (item.email && !this.validateEmail(item.email)) {
            errors.push(`Row ${index + 1}: Invalid email format`);
          }
        });
        break;

      case 'tests':
        data.forEach((item, index) => {
          if (!item.patientId || !item.testId) {
            errors.push(`Row ${index + 1}: Patient ID and Test ID are required`);
          }
          if (!item.testDate) {
            errors.push(`Row ${index + 1}: Test date is required`);
          }
        });
        break;

      case 'inventory':
        data.forEach((item, index) => {
          if (!item.itemCode || !item.name) {
            errors.push(`Row ${index + 1}: Item code and name are required`);
          }
          if (item.minimumStock < 0 || item.maximumStock < 0) {
            errors.push(`Row ${index + 1}: Stock levels cannot be negative`);
          }
        });
        break;

      case 'vendors':
        data.forEach((item, index) => {
          if (!item.name) {
            errors.push(`Row ${index + 1}: Vendor name is required`);
          }
        });
        break;
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  private validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  async getImportSummary(): Promise<{
    patients: number;
    tests: number;
    inventory: number;
    vendors: number;
  }> {
    const [patientsCount] = await db.select().from(patients).where({ tenantId: 1 });
    const [testsCount] = await db.select().from(patient_tests).where({ tenantId: 1 });
    const [inventoryCount] = await db.select().from(inventory_items).where({ tenantId: 1 });
    const [vendorsCount] = await db.select().from(vendors).where({ tenantId: 1 });

    return {
      patients: patientsCount ? 1 : 0,
      tests: testsCount ? 1 : 0,
      inventory: inventoryCount ? 1 : 0,
      vendors: vendorsCount ? 1 : 0
    };
  }
}