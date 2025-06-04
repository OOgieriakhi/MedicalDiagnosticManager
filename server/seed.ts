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
  console.log("🌱 Starting database seeding for Orient Medical Diagnostic Center...");

  try {
    // Create Orient Medical tenant
    const [tenant] = await db.insert(tenants).values({
      name: "Orient Medical Diagnostic Center",
      slug: "orient-medical",
      logo: null,
      primaryColor: "#2563EB",
      secondaryColor: "#059669",
      contactEmail: "admin@orientmedical.ng",
      contactPhone: "+234-800-ORIENT",
      address: "123 Medical Drive, Lagos, Nigeria",
      isActive: true
    }).returning();

    console.log("✓ Created tenant: Orient Medical Diagnostic Center");

    // Create branches
    const branchesData = [
      {
        name: "Central Branch",
        code: "OMD-CENTRAL",
        tenantId: tenant.id,
        address: "123 Medical Drive, Lagos, Nigeria",
        phone: "+234-800-ORIENT-1",
        email: "central@orientmedical.ng",
        isActive: true
      },
      {
        name: "Victoria Island Branch",
        code: "OMD-VI",
        tenantId: tenant.id,
        address: "456 Victoria Island, Lagos, Nigeria",
        phone: "+234-800-ORIENT-2",
        email: "vi@orientmedical.ng",
        isActive: true
      },
      {
        name: "Abuja Branch",
        code: "OMD-ABJ",
        tenantId: tenant.id,
        address: "789 Central Area, Abuja, Nigeria",
        phone: "+234-800-ORIENT-3",
        email: "abuja@orientmedical.ng",
        isActive: true
      }
    ];

    const createdBranches = await db.insert(branches).values(branchesData).returning();
    console.log("✓ Created 3 branches");

    // Create admin user
    const hashedPassword = await hashPassword("admin123");
    const [adminUser] = await db.insert(users).values({
      username: "admin",
      password: hashedPassword,
      email: "admin@orientmedical.ng",
      firstName: "System",
      lastName: "Administrator",
      role: "admin",
      tenantId: tenant.id,
      branchId: createdBranches[0].id,
      isActive: true
    }).returning();

    console.log("✓ Created admin user (username: admin, password: admin123)");

    // Create staff users
    const staffUsers = [
      {
        username: "manager1",
        password: await hashPassword("manager123"),
        email: "manager@orientmedical.ng",
        firstName: "John",
        lastName: "Manager",
        role: "manager",
        tenantId: tenant.id,
        branchId: createdBranches[0].id,
        isActive: true
      },
      {
        username: "tech1",
        password: await hashPassword("tech123"),
        email: "tech1@orientmedical.ng",
        firstName: "Mary",
        lastName: "Technician",
        role: "technician",
        tenantId: tenant.id,
        branchId: createdBranches[0].id,
        isActive: true
      },
      {
        username: "receptionist1",
        password: await hashPassword("reception123"),
        email: "reception@orientmedical.ng",
        firstName: "Sarah",
        lastName: "Reception",
        role: "receptionist",
        tenantId: tenant.id,
        branchId: createdBranches[0].id,
        isActive: true
      }
    ];

    const createdStaffUsers = await db.insert(users).values(staffUsers).returning();
    console.log("✓ Created staff users");

    // Update branch managers
    await db.update(branches)
      .set({ managerId: adminUser.id })
      .where(eq(branches.id, createdBranches[0].id));

    // Create test categories
    const categories = [
      {
        name: "Blood Tests",
        description: "Complete blood count, blood chemistry, etc.",
        tenantId: tenant.id,
        isActive: true
      },
      {
        name: "Imaging",
        description: "X-rays, CT scans, MRI, ultrasound",
        tenantId: tenant.id,
        isActive: true
      },
      {
        name: "Cardiac Tests",
        description: "ECG, echocardiogram, stress tests",
        tenantId: tenant.id,
        isActive: true
      },
      {
        name: "Microbiology",
        description: "Culture tests, sensitivity tests",
        tenantId: tenant.id,
        isActive: true
      }
    ];

    const createdCategories = await db.insert(testCategories).values(categories).returning();
    console.log("✓ Created test categories");

    // Create tests
    const testsData = [
      // Blood Tests
      {
        name: "Complete Blood Count (CBC)",
        code: "CBC-001",
        categoryId: createdCategories[0].id,
        description: "Full blood count analysis",
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
        description: "Cholesterol and triglycerides",
        price: "8000.00",
        duration: 45,
        requiresConsultant: false,
        tenantId: tenant.id,
        isActive: true
      },
      // Imaging
      {
        name: "Chest X-Ray",
        code: "XR-001",
        categoryId: createdCategories[1].id,
        description: "Chest radiography",
        price: "12000.00",
        duration: 15,
        requiresConsultant: true,
        tenantId: tenant.id,
        isActive: true
      },
      {
        name: "Abdominal Ultrasound",
        code: "US-001",
        categoryId: createdCategories[1].id,
        description: "Abdominal organ ultrasound",
        price: "15000.00",
        duration: 30,
        requiresConsultant: true,
        tenantId: tenant.id,
        isActive: true
      },
      // Cardiac
      {
        name: "ECG (Electrocardiogram)",
        code: "ECG-001",
        categoryId: createdCategories[2].id,
        description: "Heart rhythm analysis",
        price: "10000.00",
        duration: 20,
        requiresConsultant: true,
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