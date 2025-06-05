import { db } from "./db";
import { sql } from "drizzle-orm";

/**
 * International Medical Laboratory Consumption Standards
 * Based on WHO, CLSI, ISO 15189, and CAP guidelines
 */

export interface StandardTestConsumption {
  testName: string;
  testCode: string;
  serviceUnit: string;
  consumptions: {
    itemName: string;
    itemCode: string;
    category: string;
    standardQuantity: number;
    unitOfMeasure: string;
    consumptionType: 'direct' | 'proportional' | 'fixed';
    costCenter: string;
    isCritical: boolean;
    notes?: string;
  }[];
}

export const STANDARD_TEST_CONSUMPTIONS: StandardTestConsumption[] = [
  // HEMATOLOGY TESTS
  {
    testName: "Complete Blood Count (CBC)",
    testCode: "CBC",
    serviceUnit: "hematology",
    consumptions: [
      {
        itemName: "EDTA Blood Collection Tube",
        itemCode: "LAB-EDTA-3ML",
        category: "Blood Collection",
        standardQuantity: 1,
        unitOfMeasure: "tube",
        consumptionType: "direct",
        costCenter: "HEMATOLOGY",
        isCritical: true,
        notes: "3ml EDTA tube required for CBC analysis"
      },
      {
        itemName: "CBC Reagent Kit",
        itemCode: "REG-CBC-100T",
        category: "Reagents",
        standardQuantity: 0.01,
        unitOfMeasure: "kit",
        consumptionType: "proportional",
        costCenter: "HEMATOLOGY",
        isCritical: true,
        notes: "Automated analyzer reagent consumption"
      },
      {
        itemName: "Cleaning Solution",
        itemCode: "CLEAN-HEM-500ML",
        category: "Cleaning Supplies",
        standardQuantity: 2,
        unitOfMeasure: "ml",
        consumptionType: "fixed",
        costCenter: "HEMATOLOGY",
        isCritical: false
      }
    ]
  },
  {
    testName: "Erythrocyte Sedimentation Rate (ESR)",
    testCode: "ESR",
    serviceUnit: "hematology",
    consumptions: [
      {
        itemName: "Citrate Blood Collection Tube",
        itemCode: "LAB-CIT-2ML",
        category: "Blood Collection",
        standardQuantity: 1,
        unitOfMeasure: "tube",
        consumptionType: "direct",
        costCenter: "HEMATOLOGY",
        isCritical: true
      },
      {
        itemName: "ESR Tube (Westergren)",
        itemCode: "ESR-WEST-200MM",
        category: "Consumables",
        standardQuantity: 1,
        unitOfMeasure: "tube",
        consumptionType: "direct",
        costCenter: "HEMATOLOGY",
        isCritical: true
      }
    ]
  },

  // CLINICAL CHEMISTRY TESTS
  {
    testName: "Fasting Blood Sugar (FBS)",
    testCode: "FBS",
    serviceUnit: "biochemistry",
    consumptions: [
      {
        itemName: "Fluoride Oxalate Tube",
        itemCode: "LAB-FLOX-2ML",
        category: "Blood Collection",
        standardQuantity: 1,
        unitOfMeasure: "tube",
        consumptionType: "direct",
        costCenter: "BIOCHEMISTRY",
        isCritical: true
      },
      {
        itemName: "Glucose Reagent Kit",
        itemCode: "REG-GLU-500T",
        category: "Reagents",
        standardQuantity: 0.002,
        unitOfMeasure: "kit",
        consumptionType: "proportional",
        costCenter: "BIOCHEMISTRY",
        isCritical: true
      },
      {
        itemName: "Disposable Cuvettes",
        itemCode: "CUV-DISP-1000",
        category: "Consumables",
        standardQuantity: 1,
        unitOfMeasure: "piece",
        consumptionType: "direct",
        costCenter: "BIOCHEMISTRY",
        isCritical: true
      }
    ]
  },
  {
    testName: "Lipid Profile",
    testCode: "LIPID",
    serviceUnit: "biochemistry",
    consumptions: [
      {
        itemName: "Serum Separator Tube",
        itemCode: "LAB-SST-5ML",
        category: "Blood Collection",
        standardQuantity: 1,
        unitOfMeasure: "tube",
        consumptionType: "direct",
        costCenter: "BIOCHEMISTRY",
        isCritical: true
      },
      {
        itemName: "Cholesterol Reagent",
        itemCode: "REG-CHOL-200T",
        category: "Reagents",
        standardQuantity: 0.005,
        unitOfMeasure: "kit",
        consumptionType: "proportional",
        costCenter: "BIOCHEMISTRY",
        isCritical: true
      },
      {
        itemName: "Triglyceride Reagent",
        itemCode: "REG-TG-200T",
        category: "Reagents",
        standardQuantity: 0.005,
        unitOfMeasure: "kit",
        consumptionType: "proportional",
        costCenter: "BIOCHEMISTRY",
        isCritical: true
      },
      {
        itemName: "HDL Reagent",
        itemCode: "REG-HDL-100T",
        category: "Reagents",
        standardQuantity: 0.01,
        unitOfMeasure: "kit",
        consumptionType: "proportional",
        costCenter: "BIOCHEMISTRY",
        isCritical: true
      }
    ]
  },
  {
    testName: "Liver Function Test (LFT)",
    testCode: "LFT",
    serviceUnit: "biochemistry",
    consumptions: [
      {
        itemName: "Serum Separator Tube",
        itemCode: "LAB-SST-5ML",
        category: "Blood Collection",
        standardQuantity: 1,
        unitOfMeasure: "tube",
        consumptionType: "direct",
        costCenter: "BIOCHEMISTRY",
        isCritical: true
      },
      {
        itemName: "ALT Reagent Kit",
        itemCode: "REG-ALT-100T",
        category: "Reagents",
        standardQuantity: 0.01,
        unitOfMeasure: "kit",
        consumptionType: "proportional",
        costCenter: "BIOCHEMISTRY",
        isCritical: true
      },
      {
        itemName: "AST Reagent Kit",
        itemCode: "REG-AST-100T",
        category: "Reagents",
        standardQuantity: 0.01,
        unitOfMeasure: "kit",
        consumptionType: "proportional",
        costCenter: "BIOCHEMISTRY",
        isCritical: true
      },
      {
        itemName: "Bilirubin Reagent Kit",
        itemCode: "REG-BIL-100T",
        category: "Reagents",
        standardQuantity: 0.01,
        unitOfMeasure: "kit",
        consumptionType: "proportional",
        costCenter: "BIOCHEMISTRY",
        isCritical: true
      },
      {
        itemName: "Total Protein Reagent",
        itemCode: "REG-TP-200T",
        category: "Reagents",
        standardQuantity: 0.005,
        unitOfMeasure: "kit",
        consumptionType: "proportional",
        costCenter: "BIOCHEMISTRY",
        isCritical: true
      }
    ]
  },

  // MICROBIOLOGY TESTS
  {
    testName: "Urine Culture & Sensitivity",
    testCode: "UCS",
    serviceUnit: "microbiology",
    consumptions: [
      {
        itemName: "Sterile Urine Container",
        itemCode: "CONT-URINE-50ML",
        category: "Containers",
        standardQuantity: 1,
        unitOfMeasure: "container",
        consumptionType: "direct",
        costCenter: "MICROBIOLOGY",
        isCritical: true
      },
      {
        itemName: "Blood Agar Plate",
        itemCode: "AGAR-BLOOD-90MM",
        category: "Culture Media",
        standardQuantity: 1,
        unitOfMeasure: "plate",
        consumptionType: "direct",
        costCenter: "MICROBIOLOGY",
        isCritical: true
      },
      {
        itemName: "MacConkey Agar Plate",
        itemCode: "AGAR-MAC-90MM",
        category: "Culture Media",
        standardQuantity: 1,
        unitOfMeasure: "plate",
        consumptionType: "direct",
        costCenter: "MICROBIOLOGY",
        isCritical: true
      },
      {
        itemName: "Antibiotic Sensitivity Discs",
        itemCode: "DISC-AST-SET",
        category: "Sensitivity Testing",
        standardQuantity: 1,
        unitOfMeasure: "set",
        consumptionType: "direct",
        costCenter: "MICROBIOLOGY",
        isCritical: true
      },
      {
        itemName: "Calibrated Loop (1μl)",
        itemCode: "LOOP-CAL-1UL",
        category: "Consumables",
        standardQuantity: 1,
        unitOfMeasure: "loop",
        consumptionType: "direct",
        costCenter: "MICROBIOLOGY",
        isCritical: true
      }
    ]
  },
  {
    testName: "Gram Stain",
    testCode: "GRAM",
    serviceUnit: "microbiology",
    consumptions: [
      {
        itemName: "Glass Slides",
        itemCode: "SLIDE-GLASS-25X75",
        category: "Consumables",
        standardQuantity: 1,
        unitOfMeasure: "slide",
        consumptionType: "direct",
        costCenter: "MICROBIOLOGY",
        isCritical: true
      },
      {
        itemName: "Crystal Violet Stain",
        itemCode: "STAIN-CV-100ML",
        category: "Stains",
        standardQuantity: 0.5,
        unitOfMeasure: "ml",
        consumptionType: "fixed",
        costCenter: "MICROBIOLOGY",
        isCritical: true
      },
      {
        itemName: "Iodine Solution",
        itemCode: "STAIN-IOD-100ML",
        category: "Stains",
        standardQuantity: 0.5,
        unitOfMeasure: "ml",
        consumptionType: "fixed",
        costCenter: "MICROBIOLOGY",
        isCritical: true
      },
      {
        itemName: "Safranin Stain",
        itemCode: "STAIN-SAF-100ML",
        category: "Stains",
        standardQuantity: 0.5,
        unitOfMeasure: "ml",
        consumptionType: "fixed",
        costCenter: "MICROBIOLOGY",
        isCritical: true
      }
    ]
  },

  // IMMUNOLOGY/SEROLOGY TESTS
  {
    testName: "Hepatitis B Surface Antigen (HBsAg)",
    testCode: "HBSAG",
    serviceUnit: "serology",
    consumptions: [
      {
        itemName: "Serum Separator Tube",
        itemCode: "LAB-SST-5ML",
        category: "Blood Collection",
        standardQuantity: 1,
        unitOfMeasure: "tube",
        consumptionType: "direct",
        costCenter: "SEROLOGY",
        isCritical: true
      },
      {
        itemName: "HBsAg Rapid Test Kit",
        itemCode: "RDT-HBSAG-25T",
        category: "Rapid Tests",
        standardQuantity: 0.04,
        unitOfMeasure: "kit",
        consumptionType: "proportional",
        costCenter: "SEROLOGY",
        isCritical: true
      },
      {
        itemName: "Disposable Pipette Tips",
        itemCode: "TIP-DISP-1000",
        category: "Consumables",
        standardQuantity: 3,
        unitOfMeasure: "tip",
        consumptionType: "direct",
        costCenter: "SEROLOGY",
        isCritical: false
      }
    ]
  },
  {
    testName: "HIV Antibody Test",
    testCode: "HIV",
    serviceUnit: "serology",
    consumptions: [
      {
        itemName: "Serum Separator Tube",
        itemCode: "LAB-SST-5ML",
        category: "Blood Collection",
        standardQuantity: 1,
        unitOfMeasure: "tube",
        consumptionType: "direct",
        costCenter: "SEROLOGY",
        isCritical: true
      },
      {
        itemName: "HIV Rapid Test Kit",
        itemCode: "RDT-HIV-25T",
        category: "Rapid Tests",
        standardQuantity: 0.04,
        unitOfMeasure: "kit",
        consumptionType: "proportional",
        costCenter: "SEROLOGY",
        isCritical: true
      },
      {
        itemName: "Safety Lancets",
        itemCode: "LANC-SAFE-100",
        category: "Blood Collection",
        standardQuantity: 0.01,
        unitOfMeasure: "box",
        consumptionType: "proportional",
        costCenter: "SEROLOGY",
        isCritical: true
      }
    ]
  },

  // HISTOPATHOLOGY TESTS
  {
    testName: "Routine Histopathology",
    testCode: "HISTO",
    serviceUnit: "histopathology",
    consumptions: [
      {
        itemName: "10% Formalin Solution",
        itemCode: "FIX-FORM-1L",
        category: "Fixatives",
        standardQuantity: 20,
        unitOfMeasure: "ml",
        consumptionType: "proportional",
        costCenter: "HISTOPATHOLOGY",
        isCritical: true
      },
      {
        itemName: "Paraffin Wax",
        itemCode: "WAX-PAR-1KG",
        category: "Embedding Media",
        standardQuantity: 5,
        unitOfMeasure: "g",
        consumptionType: "proportional",
        costCenter: "HISTOPATHOLOGY",
        isCritical: true
      },
      {
        itemName: "Glass Slides (Frosted)",
        itemCode: "SLIDE-FROST-25X75",
        category: "Consumables",
        standardQuantity: 5,
        unitOfMeasure: "slide",
        consumptionType: "direct",
        costCenter: "HISTOPATHOLOGY",
        isCritical: true
      },
      {
        itemName: "Hematoxylin Stain",
        itemCode: "STAIN-HEM-500ML",
        category: "Stains",
        standardQuantity: 2,
        unitOfMeasure: "ml",
        consumptionType: "fixed",
        costCenter: "HISTOPATHOLOGY",
        isCritical: true
      },
      {
        itemName: "Eosin Stain",
        itemCode: "STAIN-EOS-500ML",
        category: "Stains",
        standardQuantity: 1,
        unitOfMeasure: "ml",
        consumptionType: "fixed",
        costCenter: "HISTOPATHOLOGY",
        isCritical: true
      }
    ]
  }
];

export class TestConsumptionStandardsService {
  
  /**
   * Initialize standard test consumption templates for a tenant
   */
  async initializeStandardConsumptionTemplates(tenantId: number): Promise<void> {
    try {
      console.log(`Initializing standard consumption templates for tenant ${tenantId}`);
      
      for (const testStandard of STANDARD_TEST_CONSUMPTIONS) {
        // Check if test exists
        const testResult = await db.execute(sql`
          SELECT id FROM tests 
          WHERE LOWER(name) = LOWER(${testStandard.testName}) 
          AND tenant_id = ${tenantId}
          LIMIT 1
        `);

        let testId: number;
        
        if (testResult.rows.length === 0) {
          // Create the test if it doesn't exist
          const newTestResult = await db.execute(sql`
            INSERT INTO tests (
              tenant_id, name, code, service_unit, price, is_active, created_at, updated_at
            ) VALUES (
              ${tenantId}, ${testStandard.testName}, ${testStandard.testCode}, 
              ${testStandard.serviceUnit}, 50.00, true, NOW(), NOW()
            ) RETURNING id
          `);
          testId = newTestResult.rows[0].id;
          console.log(`Created test: ${testStandard.testName} with ID ${testId}`);
        } else {
          testId = testResult.rows[0].id;
        }

        // Process each consumption item
        for (const consumption of testStandard.consumptions) {
          // Check if category exists
          let categoryResult = await db.execute(sql`
            SELECT id FROM inventory_categories 
            WHERE LOWER(name) = LOWER(${consumption.category}) 
            AND tenant_id = ${tenantId}
            LIMIT 1
          `);

          let categoryId: number;
          
          if (categoryResult.rows.length === 0) {
            // Create category if it doesn't exist
            const newCategoryResult = await db.execute(sql`
              INSERT INTO inventory_categories (
                tenant_id, name, description, is_active, created_at, updated_at
              ) VALUES (
                ${tenantId}, ${consumption.category}, 
                'Auto-created category for ${consumption.category}', 
                true, NOW(), NOW()
              ) RETURNING id
            `);
            categoryId = newCategoryResult.rows[0].id;
            console.log(`Created category: ${consumption.category} with ID ${categoryId}`);
          } else {
            categoryId = categoryResult.rows[0].id;
          }

          // Check if inventory item exists
          let itemResult = await db.execute(sql`
            SELECT id FROM inventory_items 
            WHERE LOWER(name) = LOWER(${consumption.itemName}) 
            AND tenant_id = ${tenantId}
            LIMIT 1
          `);

          let itemId: number;
          
          if (itemResult.rows.length === 0) {
            // Create inventory item if it doesn't exist
            const newItemResult = await db.execute(sql`
              INSERT INTO inventory_items (
                tenant_id, category_id, item_code, name, description,
                unit_of_measure, reorder_level, minimum_stock, maximum_stock,
                unit_cost, is_active, created_at, updated_at
              ) VALUES (
                ${tenantId}, ${categoryId}, ${consumption.itemCode}, ${consumption.itemName},
                'Standard medical laboratory consumable', ${consumption.unitOfMeasure},
                10, 5, 1000, 1.00, true, NOW(), NOW()
              ) RETURNING id
            `);
            itemId = newItemResult.rows[0].id;
            console.log(`Created inventory item: ${consumption.itemName} with ID ${itemId}`);
          } else {
            itemId = itemResult.rows[0].id;
          }

          // Check if consumption template already exists
          const existingTemplate = await db.execute(sql`
            SELECT id FROM test_consumption_templates 
            WHERE test_id = ${testId} AND item_id = ${itemId} AND tenant_id = ${tenantId}
            LIMIT 1
          `);

          if (existingTemplate.rows.length === 0) {
            // Create consumption template
            await db.execute(sql`
              INSERT INTO test_consumption_templates (
                tenant_id, test_id, item_id, standard_quantity, consumption_type,
                cost_center, is_critical, notes, created_at, updated_at
              ) VALUES (
                ${tenantId}, ${testId}, ${itemId}, ${consumption.standardQuantity},
                ${consumption.consumptionType}, ${consumption.costCenter},
                ${consumption.isCritical}, ${consumption.notes || null}, NOW(), NOW()
              )
            `);
            console.log(`Created consumption template for ${testStandard.testName} -> ${consumption.itemName}`);
          }
        }
      }

      console.log(`Successfully initialized standard consumption templates for tenant ${tenantId}`);
    } catch (error) {
      console.error('Error initializing standard consumption templates:', error);
      throw error;
    }
  }

  /**
   * Get consumption requirements for a specific test
   */
  async getTestConsumptionRequirements(testId: number, tenantId: number) {
    try {
      const requirements = await db.execute(sql`
        SELECT 
          tct.id,
          tct.standard_quantity,
          tct.consumption_type,
          tct.cost_center,
          tct.is_critical,
          tct.notes,
          ii.id as item_id,
          ii.item_code,
          ii.name as item_name,
          ii.unit_of_measure,
          ic.name as category_name,
          t.name as test_name
        FROM test_consumption_templates tct
        JOIN inventory_items ii ON tct.item_id = ii.id
        JOIN inventory_categories ic ON ii.category_id = ic.id
        JOIN tests t ON tct.test_id = t.id
        WHERE tct.test_id = ${testId} 
          AND tct.tenant_id = ${tenantId}
        ORDER BY tct.is_critical DESC, ii.name
      `);

      return requirements.rows;
    } catch (error) {
      console.error('Error getting test consumption requirements:', error);
      throw error;
    }
  }
}

export const testConsumptionStandardsService = new TestConsumptionStandardsService();