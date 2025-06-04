import { db } from "./db";
import { tenants, testCategories, tests } from "@shared/schema";
import { eq, and } from "drizzle-orm";

async function addDiagnosticTests() {
  console.log("🔍 Adding comprehensive diagnostic tests...");

  try {
    // Get existing tenant
    const [tenant] = await db.select().from(tenants).where(eq(tenants.slug, "orient-medical"));
    
    if (!tenant) {
      console.log("❌ Orient Medical tenant not found.");
      return;
    }

    console.log("✓ Found tenant: Orient Medical Diagnostic Center");

    // Get existing categories
    let categories = await db.select().from(testCategories).where(eq(testCategories.tenantId, tenant.id));
    
    // Add new categories if they don't exist
    const newCategories = [
      { name: "Ultrasound Services", description: "Abdominal, pelvic, obstetric, and vascular ultrasounds" },
      { name: "CT Scan Services", description: "Computed tomography scans for various body parts" },
      { name: "Laboratory Services", description: "Clinical chemistry, hematology, and biochemistry" }
    ];

    for (const category of newCategories) {
      const exists = categories.find(c => c.name === category.name);
      if (!exists) {
        const [created] = await db.insert(testCategories).values({
          ...category,
          tenantId: tenant.id,
          isActive: true
        }).returning();
        categories.push(created);
        console.log(`✓ Created category: ${category.name}`);
      }
    }

    // Find category IDs
    const bloodCategory = categories.find(c => c.name === "Blood Tests");
    const imagingCategory = categories.find(c => c.name === "Imaging" || c.name === "Radiology & Imaging");
    const cardiacCategory = categories.find(c => c.name === "Cardiac Tests");
    const microCategory = categories.find(c => c.name === "Microbiology");
    const ultrasoundCategory = categories.find(c => c.name === "Ultrasound Services");
    const ctCategory = categories.find(c => c.name === "CT Scan Services");
    const labCategory = categories.find(c => c.name === "Laboratory Services");

    // New comprehensive test catalog
    const newTests = [
      // Enhanced Ultrasound Services
      {
        name: "Abdominal Ultrasound",
        code: "US-001",
        categoryId: ultrasoundCategory?.id || imagingCategory?.id,
        description: "Complete abdominal organ ultrasound scan",
        price: "25000.00",
        duration: 30,
        requiresConsultant: true
      },
      {
        name: "Pelvic Ultrasound",
        code: "US-002", 
        categoryId: ultrasoundCategory?.id || imagingCategory?.id,
        description: "Pelvic organ ultrasound (transabdominal)",
        price: "22000.00",
        duration: 25,
        requiresConsultant: true
      },
      {
        name: "Obstetric Ultrasound (Dating)",
        code: "US-003",
        categoryId: ultrasoundCategory?.id || imagingCategory?.id,
        description: "Early pregnancy dating and viability scan",
        price: "20000.00",
        duration: 20,
        requiresConsultant: true
      },
      {
        name: "Obstetric Ultrasound (Anomaly)",
        code: "US-004",
        categoryId: ultrasoundCategory?.id || imagingCategory?.id,
        description: "Mid-pregnancy anomaly and morphology scan",
        price: "35000.00",
        duration: 45,
        requiresConsultant: true
      },
      {
        name: "Thyroid Ultrasound",
        code: "US-005",
        categoryId: ultrasoundCategory?.id || imagingCategory?.id,
        description: "Thyroid gland ultrasound examination",
        price: "18000.00",
        duration: 20,
        requiresConsultant: true
      },
      {
        name: "Breast Ultrasound",
        code: "US-006",
        categoryId: ultrasoundCategory?.id || imagingCategory?.id,
        description: "Bilateral breast ultrasound examination",
        price: "20000.00",
        duration: 25,
        requiresConsultant: true
      },
      {
        name: "Carotid Doppler Ultrasound",
        code: "US-007",
        categoryId: ultrasoundCategory?.id || imagingCategory?.id,
        description: "Carotid artery Doppler flow study",
        price: "30000.00",
        duration: 30,
        requiresConsultant: true
      },

      // CT Scan Services
      {
        name: "CT Brain (Plain)",
        code: "CT-001",
        categoryId: ctCategory?.id || imagingCategory?.id,
        description: "Non-contrast CT scan of the brain",
        price: "55000.00",
        duration: 15,
        requiresConsultant: true
      },
      {
        name: "CT Brain (Contrast)",
        code: "CT-002",
        categoryId: ctCategory?.id || imagingCategory?.id,
        description: "Contrast-enhanced CT scan of the brain",
        price: "75000.00",
        duration: 30,
        requiresConsultant: true
      },
      {
        name: "CT Chest (HRCT)",
        code: "CT-003",
        categoryId: ctCategory?.id || imagingCategory?.id,
        description: "High-resolution CT scan of the chest",
        price: "65000.00",
        duration: 20,
        requiresConsultant: true
      },
      {
        name: "CT Abdomen & Pelvis",
        code: "CT-004",
        categoryId: ctCategory?.id || imagingCategory?.id,
        description: "CT scan of abdomen and pelvis with contrast",
        price: "85000.00",
        duration: 30,
        requiresConsultant: true
      },
      {
        name: "CT Spine (Lumbar)",
        code: "CT-005",
        categoryId: ctCategory?.id || imagingCategory?.id,
        description: "CT scan of lumbar spine",
        price: "60000.00",
        duration: 20,
        requiresConsultant: true
      },
      {
        name: "CT Angiography (Brain)",
        code: "CT-006",
        categoryId: ctCategory?.id || imagingCategory?.id,
        description: "CT angiography of cerebral vessels",
        price: "95000.00",
        duration: 45,
        requiresConsultant: true
      },

      // Enhanced X-Ray Services
      {
        name: "Pelvis X-Ray",
        code: "XR-002",
        categoryId: imagingCategory?.id,
        description: "Pelvic bone and hip joint radiography",
        price: "15000.00",
        duration: 20,
        requiresConsultant: true
      },
      {
        name: "Spine X-Ray (Lumbar)",
        code: "XR-003",
        categoryId: imagingCategory?.id,
        description: "Lumbar spine radiography - AP and lateral",
        price: "18000.00",
        duration: 25,
        requiresConsultant: true
      },
      {
        name: "Knee X-Ray",
        code: "XR-004",
        categoryId: imagingCategory?.id,
        description: "Knee joint radiography - multiple views",
        price: "14000.00",
        duration: 20,
        requiresConsultant: true
      },

      // Enhanced Cardiac Tests
      {
        name: "2D Echocardiogram",
        code: "ECHO-001",
        categoryId: cardiacCategory?.id,
        description: "Two-dimensional echocardiography with Doppler",
        price: "45000.00",
        duration: 45,
        requiresConsultant: true
      },
      {
        name: "Stress ECG (Treadmill Test)",
        code: "STRESS-001",
        categoryId: cardiacCategory?.id,
        description: "Exercise stress test with continuous ECG monitoring",
        price: "35000.00",
        duration: 60,
        requiresConsultant: true
      },

      // Enhanced Laboratory Services
      {
        name: "Liver Function Test (LFT)",
        code: "LFT-001",
        categoryId: labCategory?.id || bloodCategory?.id,
        description: "ALT, AST, bilirubin, albumin levels",
        price: "12000.00",
        duration: 60,
        requiresConsultant: false
      },
      {
        name: "Kidney Function Test",
        code: "KFT-001",
        categoryId: labCategory?.id || bloodCategory?.id,
        description: "Creatinine, urea, electrolytes analysis",
        price: "10000.00",
        duration: 45,
        requiresConsultant: false
      },
      {
        name: "Hepatitis B Surface Antigen",
        code: "HEP-001",
        categoryId: labCategory?.id || microCategory?.id,
        description: "HBsAg screening test",
        price: "3500.00",
        duration: 120,
        requiresConsultant: false
      },
      {
        name: "HIV 1 & 2 Screening",
        code: "HIV-001",
        categoryId: labCategory?.id || microCategory?.id,
        description: "HIV antibody screening test",
        price: "4000.00",
        duration: 60,
        requiresConsultant: false
      },
      {
        name: "Malaria Parasite Test",
        code: "MP-001",
        categoryId: labCategory?.id || microCategory?.id,
        description: "Microscopic examination for malaria parasites",
        price: "2000.00",
        duration: 30,
        requiresConsultant: false
      },
      {
        name: "Thyroid Function Test (T3, T4, TSH)",
        code: "TFT-001",
        categoryId: labCategory?.id || bloodCategory?.id,
        description: "Complete thyroid hormone analysis",
        price: "15000.00",
        duration: 180,
        requiresConsultant: false
      },
      {
        name: "Prostate Specific Antigen (PSA)",
        code: "PSA-001",
        categoryId: labCategory?.id || bloodCategory?.id,
        description: "PSA level for prostate cancer screening",
        price: "8000.00",
        duration: 120,
        requiresConsultant: false
      },
      {
        name: "Pregnancy Test (Beta hCG)",
        code: "PREG-001",
        categoryId: labCategory?.id || bloodCategory?.id,
        description: "Quantitative beta human chorionic gonadotropin",
        price: "3000.00",
        duration: 60,
        requiresConsultant: false
      },
      {
        name: "Urine Culture & Sensitivity",
        code: "UC-001",
        categoryId: microCategory?.id,
        description: "Bacterial culture and antibiotic sensitivity testing",
        price: "8000.00",
        duration: 72,
        requiresConsultant: false
      },
      {
        name: "Blood Culture",
        code: "BC-001",
        categoryId: microCategory?.id,
        description: "Blood culture for bacterial infection detection",
        price: "15000.00",
        duration: 72,
        requiresConsultant: false
      }
    ];

    // Add tests that don't already exist
    let addedCount = 0;
    for (const testData of newTests) {
      if (testData.categoryId) {
        const exists = await db.select().from(tests).where(
          and(
            eq(tests.code, testData.code),
            eq(tests.tenantId, tenant.id)
          )
        );

        if (exists.length === 0) {
          await db.insert(tests).values({
            ...testData,
            tenantId: tenant.id,
            isActive: true
          });
          addedCount++;
          console.log(`✓ Added test: ${testData.name}`);
        }
      }
    }

    console.log(`\n🎉 Successfully added ${addedCount} new diagnostic tests!`);
    console.log("✓ Comprehensive test catalog now available including:");
    console.log("  • Ultrasound services (abdominal, pelvic, obstetric, thyroid, breast, carotid)");
    console.log("  • CT scan services (brain, chest, abdomen, spine, angiography)");
    console.log("  • Enhanced X-ray services (pelvis, spine, knee)");
    console.log("  • Advanced cardiac tests (echocardiogram, stress ECG)");
    console.log("  • Comprehensive laboratory services (liver, kidney, thyroid, infectious disease screening)");

  } catch (error) {
    console.error("❌ Error adding diagnostic tests:", error);
    throw error;
  }
}

// Run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  addDiagnosticTests()
    .then(() => {
      console.log("✅ Test addition completed");
      process.exit(0);
    })
    .catch((error) => {
      console.error("❌ Test addition failed:", error);
      process.exit(1);
    });
}

export { addDiagnosticTests };