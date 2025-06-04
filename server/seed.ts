import { db } from "./db";
import { 
  tenants, 
  branches, 
  users, 
  testCategories, 
  tests, 
  referralProviders, 
  consultants,
  patients,
  patientTests,
  transactions,
  systemAlerts
} from "@shared/schema";
import { eq } from "drizzle-orm";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function seedDatabase() {
  console.log("🌱 Updating database with comprehensive diagnostic tests...");

  try {
    // Get existing tenant
    const [tenant] = await db.select().from(tenants).where(eq(tenants.slug, "orient-medical"));
    
    if (!tenant) {
      console.log("❌ Orient Medical tenant not found. Please run initial seeding first.");
      return;
    }

    console.log("✓ Found existing tenant: Orient Medical Diagnostic Center");

    // Get existing branches
    const existingBranches = await db.select().from(branches).where(eq(branches.tenantId, tenant.id));
    console.log(`✓ Found ${existingBranches.length} existing branches`);

    // Get or create test categories
    let existingCategories = await db.select().from(testCategories).where(eq(testCategories.tenantId, tenant.id));
    
    const newCategories = [
      { name: "Ultrasound Services", description: "Abdominal, pelvic, obstetric, and vascular ultrasounds" },
      { name: "CT Scan Services", description: "Computed tomography scans for various body parts" },
      { name: "Laboratory Services", description: "Clinical chemistry, hematology, and biochemistry" }
    ];

    // Add only new categories that don't exist
    for (const category of newCategories) {
      const exists = existingCategories.find(c => c.name === category.name);
      if (!exists) {
        const [created] = await db.insert(testCategories).values({
          ...category,
          tenantId: tenant.id,
          isActive: true
        }).returning();
        existingCategories.push(created);
        console.log(`✓ Created category: ${category.name}`);
      }
    }

    const createdCategories = existingCategories;

    // Create tests
    const testsData = [
      // Blood Tests (Category 0)
      {
        name: "Complete Blood Count (CBC)",
        code: "CBC-001",
        categoryId: createdCategories[0].id,
        description: "Full blood count analysis including RBC, WBC, platelets",
        price: "5000.00",
        duration: 30,
        requiresConsultant: false,
        tenantId: tenant.id,
        isActive: true
      },
      {
        name: "Lipid Profile",
        code: "LIP-001",
        categoryId: createdCategories[0].id,
        description: "Cholesterol, triglycerides, HDL, LDL analysis",
        price: "8000.00",
        duration: 45,
        requiresConsultant: false,
        tenantId: tenant.id,
        isActive: true
      },
      {
        name: "Liver Function Test (LFT)",
        code: "LFT-001",
        categoryId: createdCategories[0].id,
        description: "ALT, AST, bilirubin, albumin levels",
        price: "12000.00",
        duration: 60,
        requiresConsultant: false,
        tenantId: tenant.id,
        isActive: true
      },
      {
        name: "Kidney Function Test",
        code: "KFT-001",
        categoryId: createdCategories[0].id,
        description: "Creatinine, urea, electrolytes analysis",
        price: "10000.00",
        duration: 45,
        requiresConsultant: false,
        tenantId: tenant.id,
        isActive: true
      },

      // Radiology & Imaging (Category 1)
      {
        name: "Chest X-Ray (PA & Lateral)",
        code: "XR-001",
        categoryId: createdCategories[1].id,
        description: "Chest radiography - posteroanterior and lateral views",
        price: "12000.00",
        duration: 15,
        requiresConsultant: true,
        tenantId: tenant.id,
        isActive: true
      },
      {
        name: "Pelvis X-Ray",
        code: "XR-002",
        categoryId: createdCategories[1].id,
        description: "Pelvic bone and hip joint radiography",
        price: "15000.00",
        duration: 20,
        requiresConsultant: true,
        tenantId: tenant.id,
        isActive: true
      },
      {
        name: "Spine X-Ray (Lumbar)",
        code: "XR-003",
        categoryId: createdCategories[1].id,
        description: "Lumbar spine radiography - AP and lateral",
        price: "18000.00",
        duration: 25,
        requiresConsultant: true,
        tenantId: tenant.id,
        isActive: true
      },
      {
        name: "Knee X-Ray",
        code: "XR-004",
        categoryId: createdCategories[1].id,
        description: "Knee joint radiography - multiple views",
        price: "14000.00",
        duration: 20,
        requiresConsultant: true,
        tenantId: tenant.id,
        isActive: true
      },

      // Cardiac Tests (Category 2)
      {
        name: "ECG (Electrocardiogram)",
        code: "ECG-001",
        categoryId: createdCategories[2].id,
        description: "12-lead electrocardiogram for heart rhythm analysis",
        price: "10000.00",
        duration: 20,
        requiresConsultant: true,
        tenantId: tenant.id,
        isActive: true
      },
      {
        name: "2D Echocardiogram",
        code: "ECHO-001",
        categoryId: createdCategories[2].id,
        description: "Two-dimensional echocardiography with Doppler",
        price: "45000.00",
        duration: 45,
        requiresConsultant: true,
        tenantId: tenant.id,
        isActive: true
      },
      {
        name: "Stress ECG (Treadmill Test)",
        code: "STRESS-001",
        categoryId: createdCategories[2].id,
        description: "Exercise stress test with continuous ECG monitoring",
        price: "35000.00",
        duration: 60,
        requiresConsultant: true,
        tenantId: tenant.id,
        isActive: true
      },

      // Microbiology (Category 3)
      {
        name: "Urine Culture & Sensitivity",
        code: "UC-001",
        categoryId: createdCategories[3].id,
        description: "Bacterial culture and antibiotic sensitivity testing",
        price: "8000.00",
        duration: 72,
        requiresConsultant: false,
        tenantId: tenant.id,
        isActive: true
      },
      {
        name: "Blood Culture",
        code: "BC-001",
        categoryId: createdCategories[3].id,
        description: "Blood culture for bacterial infection detection",
        price: "15000.00",
        duration: 72,
        requiresConsultant: false,
        tenantId: tenant.id,
        isActive: true
      },

      // Ultrasound Services (Category 4)
      {
        name: "Abdominal Ultrasound",
        code: "US-001",
        categoryId: createdCategories[4].id,
        description: "Complete abdominal organ ultrasound scan",
        price: "25000.00",
        duration: 30,
        requiresConsultant: true,
        tenantId: tenant.id,
        isActive: true
      },
      {
        name: "Pelvic Ultrasound",
        code: "US-002",
        categoryId: createdCategories[4].id,
        description: "Pelvic organ ultrasound (transabdominal)",
        price: "22000.00",
        duration: 25,
        requiresConsultant: true,
        tenantId: tenant.id,
        isActive: true
      },
      {
        name: "Obstetric Ultrasound (Dating)",
        code: "US-003",
        categoryId: createdCategories[4].id,
        description: "Early pregnancy dating and viability scan",
        price: "20000.00",
        duration: 20,
        requiresConsultant: true,
        tenantId: tenant.id,
        isActive: true
      },
      {
        name: "Obstetric Ultrasound (Anomaly)",
        code: "US-004",
        categoryId: createdCategories[4].id,
        description: "Mid-pregnancy anomaly and morphology scan",
        price: "35000.00",
        duration: 45,
        requiresConsultant: true,
        tenantId: tenant.id,
        isActive: true
      },
      {
        name: "Thyroid Ultrasound",
        code: "US-005",
        categoryId: createdCategories[4].id,
        description: "Thyroid gland ultrasound examination",
        price: "18000.00",
        duration: 20,
        requiresConsultant: true,
        tenantId: tenant.id,
        isActive: true
      },
      {
        name: "Breast Ultrasound",
        code: "US-006",
        categoryId: createdCategories[4].id,
        description: "Bilateral breast ultrasound examination",
        price: "20000.00",
        duration: 25,
        requiresConsultant: true,
        tenantId: tenant.id,
        isActive: true
      },
      {
        name: "Carotid Doppler Ultrasound",
        code: "US-007",
        categoryId: createdCategories[4].id,
        description: "Carotid artery Doppler flow study",
        price: "30000.00",
        duration: 30,
        requiresConsultant: true,
        tenantId: tenant.id,
        isActive: true
      },

      // CT Scan Services (Category 5)
      {
        name: "CT Brain (Plain)",
        code: "CT-001",
        categoryId: createdCategories[5].id,
        description: "Non-contrast CT scan of the brain",
        price: "55000.00",
        duration: 15,
        requiresConsultant: true,
        tenantId: tenant.id,
        isActive: true
      },
      {
        name: "CT Brain (Contrast)",
        code: "CT-002",
        categoryId: createdCategories[5].id,
        description: "Contrast-enhanced CT scan of the brain",
        price: "75000.00",
        duration: 30,
        requiresConsultant: true,
        tenantId: tenant.id,
        isActive: true
      },
      {
        name: "CT Chest (HRCT)",
        code: "CT-003",
        categoryId: createdCategories[5].id,
        description: "High-resolution CT scan of the chest",
        price: "65000.00",
        duration: 20,
        requiresConsultant: true,
        tenantId: tenant.id,
        isActive: true
      },
      {
        name: "CT Abdomen & Pelvis",
        code: "CT-004",
        categoryId: createdCategories[5].id,
        description: "CT scan of abdomen and pelvis with contrast",
        price: "85000.00",
        duration: 30,
        requiresConsultant: true,
        tenantId: tenant.id,
        isActive: true
      },
      {
        name: "CT Spine (Lumbar)",
        code: "CT-005",
        categoryId: createdCategories[5].id,
        description: "CT scan of lumbar spine",
        price: "60000.00",
        duration: 20,
        requiresConsultant: true,
        tenantId: tenant.id,
        isActive: true
      },
      {
        name: "CT Angiography (Brain)",
        code: "CT-006",
        categoryId: createdCategories[5].id,
        description: "CT angiography of cerebral vessels",
        price: "95000.00",
        duration: 45,
        requiresConsultant: true,
        tenantId: tenant.id,
        isActive: true
      },

      // Laboratory Services (Category 6)
      {
        name: "Hepatitis B Surface Antigen",
        code: "HEP-001",
        categoryId: createdCategories[6].id,
        description: "HBsAg screening test",
        price: "3500.00",
        duration: 120,
        requiresConsultant: false,
        tenantId: tenant.id,
        isActive: true
      },
      {
        name: "HIV 1 & 2 Screening",
        code: "HIV-001",
        categoryId: createdCategories[6].id,
        description: "HIV antibody screening test",
        price: "4000.00",
        duration: 60,
        requiresConsultant: false,
        tenantId: tenant.id,
        isActive: true
      },
      {
        name: "Malaria Parasite Test",
        code: "MP-001",
        categoryId: createdCategories[6].id,
        description: "Microscopic examination for malaria parasites",
        price: "2000.00",
        duration: 30,
        requiresConsultant: false,
        tenantId: tenant.id,
        isActive: true
      },
      {
        name: "Thyroid Function Test (T3, T4, TSH)",
        code: "TFT-001",
        categoryId: createdCategories[6].id,
        description: "Complete thyroid hormone analysis",
        price: "15000.00",
        duration: 180,
        requiresConsultant: false,
        tenantId: tenant.id,
        isActive: true
      },
      {
        name: "Prostate Specific Antigen (PSA)",
        code: "PSA-001",
        categoryId: createdCategories[6].id,
        description: "PSA level for prostate cancer screening",
        price: "8000.00",
        duration: 120,
        requiresConsultant: false,
        tenantId: tenant.id,
        isActive: true
      },
      {
        name: "Pregnancy Test (Beta hCG)",
        code: "PREG-001",
        categoryId: createdCategories[6].id,
        description: "Quantitative beta human chorionic gonadotropin",
        price: "3000.00",
        duration: 60,
        requiresConsultant: false,
        tenantId: tenant.id,
        isActive: true
      }
    ];

    const createdTests = await db.insert(tests).values(testsData).returning();
    console.log("✓ Created diagnostic tests");

    // Create referral providers
    const referralProvidersData = [
      {
        name: "Lagos General Hospital",
        type: "hospital",
        contactPerson: "Dr. Adebayo Johnson",
        email: "referrals@lagosgeneral.ng",
        phone: "+234-803-LAGOS-GEN",
        address: "Marina Street, Lagos Island",
        commissionRate: "5.00",
        maxRebateLimit: "2000.00",
        tenantId: tenant.id,
        isActive: true
      },
      {
        name: "Dr. Emeka Okafor Clinic",
        type: "clinic",
        contactPerson: "Dr. Emeka Okafor",
        email: "clinic@okaformedical.ng",
        phone: "+234-802-OKAFOR",
        address: "Victoria Island, Lagos",
        commissionRate: "7.50",
        maxRebateLimit: "1500.00",
        tenantId: tenant.id,
        isActive: true
      },
      {
        name: "Sunrise Medical Center",
        type: "clinic",
        contactPerson: "Dr. Fatima Bello",
        email: "info@sunrisemedical.ng",
        phone: "+234-901-SUNRISE",
        address: "Ikeja, Lagos",
        commissionRate: "6.00",
        maxRebateLimit: "1800.00",
        tenantId: tenant.id,
        isActive: true
      }
    ];

    const createdProviders = await db.insert(referralProviders).values(referralProvidersData).returning();
    console.log("✓ Created referral providers");

    // Create consultants
    const consultantsData = [
      {
        name: "Dr. Adebisi Radiologist",
        specialization: "Radiology",
        email: "radiology@consultants.ng",
        phone: "+234-805-RAD-DOC",
        feePerTest: "3000.00",
        tenantId: tenant.id,
        isActive: true
      },
      {
        name: "Dr. Olumide Cardiologist",
        specialization: "Cardiology",
        email: "cardio@consultants.ng",
        phone: "+234-806-CARDIO",
        feePerTest: "4000.00",
        tenantId: tenant.id,
        isActive: true
      }
    ];

    const createdConsultants = await db.insert(consultants).values(consultantsData).returning();
    console.log("✓ Created consultant specialists");

    // Create sample patients
    const patientsData = [
      {
        patientId: "P-2024-001",
        firstName: "Adebayo",
        lastName: "Ogundimu",
        email: "adebayo.ogundimu@email.com",
        phone: "+234-803-123-4567",
        dateOfBirth: new Date("1985-03-15"),
        gender: "male",
        address: "12 Allen Avenue, Ikeja, Lagos",
        pathway: "self",
        tenantId: tenant.id,
        branchId: createdBranches[0].id
      },
      {
        patientId: "P-2024-002",
        firstName: "Kemi",
        lastName: "Adeyemi",
        email: "kemi.adeyemi@email.com",
        phone: "+234-802-987-6543",
        dateOfBirth: new Date("1990-07-22"),
        gender: "female",
        address: "45 Victoria Island, Lagos",
        pathway: "referral",
        referralProviderId: createdProviders[0].id,
        tenantId: tenant.id,
        branchId: createdBranches[0].id
      },
      {
        patientId: "P-2024-003",
        firstName: "Chukwu",
        lastName: "Okafor",
        email: "chukwu.okafor@email.com",
        phone: "+234-901-555-7890",
        dateOfBirth: new Date("1978-11-08"),
        gender: "male",
        address: "78 Ring Road, Ibadan",
        pathway: "self",
        tenantId: tenant.id,
        branchId: createdBranches[1].id
      }
    ];

    const createdPatients = await db.insert(patients).values(patientsData).returning();
    console.log("✓ Created sample patients");

    // Create sample patient tests
    const today = new Date();
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
    
    const patientTestsData = [
      {
        patientId: createdPatients[0].id,
        testId: createdTests[0].id, // CBC
        status: "completed",
        scheduledAt: yesterday,
        completedAt: yesterday,
        results: "Normal blood count values. All parameters within normal range.",
        notes: "Patient fasted for 12 hours before test.",
        technicianId: createdStaffUsers[1] ? createdStaffUsers[1].id : adminUser.id,
        branchId: createdBranches[0].id,
        tenantId: tenant.id
      },
      {
        patientId: createdPatients[1].id,
        testId: createdTests[2].id, // Chest X-Ray
        status: "in_progress",
        scheduledAt: today,
        technicianId: createdStaffUsers[1] ? createdStaffUsers[1].id : adminUser.id,
        consultantId: createdConsultants[0].id,
        branchId: createdBranches[0].id,
        tenantId: tenant.id
      },
      {
        patientId: createdPatients[2].id,
        testId: createdTests[4].id, // ECG
        status: "scheduled",
        scheduledAt: new Date(today.getTime() + 2 * 60 * 60 * 1000), // 2 hours from now
        technicianId: createdStaffUsers[1] ? createdStaffUsers[1].id : adminUser.id,
        consultantId: createdConsultants[1].id,
        branchId: createdBranches[1].id,
        tenantId: tenant.id
      }
    ];

    await db.insert(patientTests).values(patientTestsData);
    console.log("✓ Created sample patient tests");

    // Create sample transactions
    const transactionsData = [
      {
        type: "payment",
        amount: "5000.00",
        currency: "NGN",
        description: "Payment for CBC test - Adebayo Ogundimu",
        patientTestId: 1, // Will be auto-assigned
        branchId: createdBranches[0].id,
        tenantId: tenant.id,
        createdBy: adminUser.id
      },
      {
        type: "commission",
        amount: "600.00",
        currency: "NGN",
        description: "Commission payment to Lagos General Hospital",
        referralProviderId: createdProviders[0].id,
        branchId: createdBranches[0].id,
        tenantId: tenant.id,
        createdBy: adminUser.id
      }
    ];

    await db.insert(transactions).values(transactionsData);
    console.log("✓ Created sample transactions");

    // Create system alerts
    const alertsData = [
      {
        title: "System Maintenance Scheduled",
        message: "Routine system maintenance will occur tonight from 2:00 AM to 4:00 AM",
        type: "info",
        isRead: false,
        tenantId: tenant.id
      },
      {
        title: "Equipment Calibration Due",
        message: "X-Ray machine in Central Branch requires calibration by end of week",
        type: "warning",
        isRead: false,
        branchId: createdBranches[0].id,
        tenantId: tenant.id
      },
      {
        title: "Monthly Commission Report Ready",
        message: "Commission report for referral providers is ready for review",
        type: "success",
        isRead: false,
        tenantId: tenant.id
      }
    ];

    await db.insert(systemAlerts).values(alertsData);
    console.log("✓ Created system alerts");

    console.log("\n🎉 Database seeding completed successfully!");
    console.log("\n📋 Login Credentials:");
    console.log("👤 Admin User:");
    console.log("   Username: admin");
    console.log("   Password: admin123");
    console.log("\n👤 Manager User:");
    console.log("   Username: manager1");
    console.log("   Password: manager123");
    console.log("\n👤 Technician User:");
    console.log("   Username: tech1");
    console.log("   Password: tech123");
    console.log("\n👤 Receptionist User:");
    console.log("   Username: receptionist1");
    console.log("   Password: reception123");

  } catch (error) {
    console.error("❌ Error seeding database:", error);
    throw error;
  }
}

// Run seeding if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedDatabase()
    .then(() => {
      console.log("✅ Seeding completed");
      process.exit(0);
    })
    .catch((error) => {
      console.error("❌ Seeding failed:", error);
      process.exit(1);
    });
}

export { seedDatabase };