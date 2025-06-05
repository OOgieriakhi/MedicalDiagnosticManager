import { db } from "./db";
import { inventoryCategories, inventoryItems, inventoryStock } from "@shared/schema";

async function seedInventoryData() {
  console.log("Seeding inventory data...");

  const tenantId = 1;
  const branchId = 1;

  try {
    // Insert inventory categories
    const categories = await db.insert(inventoryCategories).values([
      {
        tenantId,
        name: "Laboratory Consumables",
        description: "Test tubes, slides, reagents, and laboratory supplies",
        parentCategoryId: null,
      },
      {
        tenantId,
        name: "Radiology Supplies",
        description: "X-ray films, contrast agents, and imaging supplies",
        parentCategoryId: null,
      },
      {
        tenantId,
        name: "Medical Equipment",
        description: "Diagnostic equipment, monitors, and medical devices",
        parentCategoryId: null,
      },
      {
        tenantId,
        name: "Office Supplies",
        description: "Stationery, forms, and administrative supplies",
        parentCategoryId: null,
      },
      {
        tenantId,
        name: "Pharmacy Items",
        description: "Medications, vaccines, and pharmaceutical supplies",
        parentCategoryId: null,
      },
      {
        tenantId,
        name: "Safety & PPE",
        description: "Personal protective equipment and safety supplies",
        parentCategoryId: null,
      },
      {
        tenantId,
        name: "Cleaning Supplies",
        description: "Disinfectants, cleaning agents, and maintenance supplies",
        parentCategoryId: null,
      },
    ]).returning();

    console.log(`Created ${categories.length} inventory categories`);

    // Insert inventory items
    const items = await db.insert(inventoryItems).values([
      // Laboratory Consumables
      {
        tenantId,
        itemCode: "LAB001",
        name: "Blood Collection Tubes (EDTA)",
        description: "Purple top tubes for hematology tests",
        categoryId: categories[0].id,
        unitOfMeasure: "pcs",
        minimumStock: 50,
        maximumStock: 500,
        reorderLevel: 100,
        standardCost: "0.50",
        isConsumable: true,
        expiryTracking: true,
      },
      {
        tenantId,
        itemCode: "LAB002",
        name: "Microscope Slides",
        description: "Glass slides for microscopic examination",
        categoryId: categories[0].id,
        unitOfMeasure: "box",
        minimumStock: 10,
        maximumStock: 100,
        reorderLevel: 20,
        standardCost: "15.00",
        isConsumable: true,
      },
      {
        tenantId,
        itemCode: "LAB003",
        name: "Glucose Reagent Kit",
        description: "Reagent kit for glucose testing",
        categoryId: categories[0].id,
        unitOfMeasure: "kit",
        minimumStock: 5,
        maximumStock: 25,
        reorderLevel: 10,
        standardCost: "45.00",
        isConsumable: true,
        expiryTracking: true,
      },
      {
        tenantId,
        itemCode: "LAB004",
        name: "Urine Collection Containers",
        description: "Sterile containers for urine samples",
        categoryId: categories[0].id,
        unitOfMeasure: "pcs",
        minimumStock: 100,
        maximumStock: 1000,
        reorderLevel: 200,
        standardCost: "0.25",
        isConsumable: true,
      },
      {
        tenantId,
        itemCode: "LAB005",
        name: "CBC Reagent",
        description: "Complete blood count reagent",
        categoryId: categories[0].id,
        unitOfMeasure: "ml",
        minimumStock: 500,
        maximumStock: 2000,
        reorderLevel: 750,
        standardCost: "0.15",
        isConsumable: true,
        expiryTracking: true,
      },

      // Radiology Supplies
      {
        tenantId,
        itemCode: "RAD001",
        name: "X-Ray Film 14x17 inches",
        description: "Standard size X-ray film for chest imaging",
        categoryId: categories[1].id,
        unitOfMeasure: "sheet",
        minimumStock: 50,
        maximumStock: 200,
        reorderLevel: 75,
        standardCost: "2.50",
        isConsumable: true,
        expiryTracking: true,
      },
      {
        tenantId,
        itemCode: "RAD002",
        name: "Contrast Agent (Iodine)",
        description: "Iodine-based contrast medium",
        categoryId: categories[1].id,
        unitOfMeasure: "ml",
        minimumStock: 1000,
        maximumStock: 5000,
        reorderLevel: 2000,
        standardCost: "0.75",
        isConsumable: true,
        expiryTracking: true,
      },
      {
        tenantId,
        itemCode: "RAD003",
        name: "Ultrasound Gel",
        description: "Conductive gel for ultrasound examinations",
        categoryId: categories[1].id,
        unitOfMeasure: "ml",
        minimumStock: 2000,
        maximumStock: 10000,
        reorderLevel: 5000,
        standardCost: "0.05",
        isConsumable: true,
      },

      // Medical Equipment
      {
        tenantId,
        itemCode: "MED001",
        name: "Digital Thermometer",
        description: "Non-contact infrared thermometer",
        categoryId: categories[2].id,
        unitOfMeasure: "pcs",
        minimumStock: 5,
        maximumStock: 20,
        reorderLevel: 10,
        standardCost: "25.00",
        isConsumable: false,
        requiresSerialNumber: true,
      },
      {
        tenantId,
        itemCode: "MED002",
        name: "Blood Pressure Monitor",
        description: "Digital blood pressure monitor",
        categoryId: categories[2].id,
        unitOfMeasure: "pcs",
        minimumStock: 3,
        maximumStock: 10,
        reorderLevel: 5,
        standardCost: "85.00",
        isConsumable: false,
        requiresSerialNumber: true,
      },
      {
        tenantId,
        itemCode: "MED003",
        name: "Pulse Oximeter",
        description: "Fingertip pulse oximeter",
        categoryId: categories[2].id,
        unitOfMeasure: "pcs",
        minimumStock: 10,
        maximumStock: 30,
        reorderLevel: 15,
        standardCost: "35.00",
        isConsumable: false,
      },

      // Office Supplies
      {
        tenantId,
        itemCode: "OFF001",
        name: "Patient Registration Forms",
        description: "Pre-printed patient registration forms",
        categoryId: categories[3].id,
        unitOfMeasure: "pad",
        minimumStock: 20,
        maximumStock: 100,
        reorderLevel: 40,
        standardCost: "5.00",
        isConsumable: true,
      },
      {
        tenantId,
        itemCode: "OFF002",
        name: "Test Result Report Paper",
        description: "Letterhead paper for test results",
        categoryId: categories[3].id,
        unitOfMeasure: "ream",
        minimumStock: 10,
        maximumStock: 50,
        reorderLevel: 20,
        standardCost: "8.00",
        isConsumable: true,
      },

      // Pharmacy Items
      {
        tenantId,
        itemCode: "PHR001",
        name: "Paracetamol 500mg",
        description: "Pain relief and fever reducer",
        categoryId: categories[4].id,
        unitOfMeasure: "tablet",
        minimumStock: 500,
        maximumStock: 2000,
        reorderLevel: 750,
        standardCost: "0.02",
        isConsumable: true,
        expiryTracking: true,
      },
      {
        tenantId,
        itemCode: "PHR002",
        name: "Antiseptic Solution",
        description: "Topical antiseptic for wound cleaning",
        categoryId: categories[4].id,
        unitOfMeasure: "ml",
        minimumStock: 1000,
        maximumStock: 5000,
        reorderLevel: 2000,
        standardCost: "0.10",
        isConsumable: true,
        expiryTracking: true,
      },

      // Safety & PPE
      {
        tenantId,
        itemCode: "PPE001",
        name: "Disposable Gloves (Nitrile)",
        description: "Powder-free nitrile examination gloves",
        categoryId: categories[5].id,
        unitOfMeasure: "box",
        minimumStock: 20,
        maximumStock: 100,
        reorderLevel: 40,
        standardCost: "12.00",
        isConsumable: true,
      },
      {
        tenantId,
        itemCode: "PPE002",
        name: "Face Masks (Surgical)",
        description: "3-ply surgical face masks",
        categoryId: categories[5].id,
        unitOfMeasure: "box",
        minimumStock: 10,
        maximumStock: 50,
        reorderLevel: 20,
        standardCost: "8.00",
        isConsumable: true,
      },
      {
        tenantId,
        itemCode: "PPE003",
        name: "Safety Goggles",
        description: "Anti-fog safety goggles",
        categoryId: categories[5].id,
        unitOfMeasure: "pcs",
        minimumStock: 10,
        maximumStock: 30,
        reorderLevel: 15,
        standardCost: "15.00",
        isConsumable: false,
      },

      // Cleaning Supplies
      {
        tenantId,
        itemCode: "CLN001",
        name: "Disinfectant Spray",
        description: "Multi-surface disinfectant spray",
        categoryId: categories[6].id,
        unitOfMeasure: "bottle",
        minimumStock: 20,
        maximumStock: 100,
        reorderLevel: 40,
        standardCost: "6.50",
        isConsumable: true,
      },
      {
        tenantId,
        itemCode: "CLN002",
        name: "Hand Sanitizer",
        description: "Alcohol-based hand sanitizer",
        categoryId: categories[6].id,
        unitOfMeasure: "ml",
        minimumStock: 2000,
        maximumStock: 10000,
        reorderLevel: 5000,
        standardCost: "0.08",
        isConsumable: true,
      },
    ]).returning();

    console.log(`Created ${items.length} inventory items`);

    // Create initial stock levels
    const stockEntries = items.map(item => ({
      tenantId,
      branchId,
      itemId: item.id,
      availableQuantity: Math.floor(Math.random() * (item.maximumStock! - item.minimumStock)) + item.minimumStock,
      reservedQuantity: 0,
      onOrderQuantity: 0,
    }));

    const stock = await db.insert(inventoryStock).values(stockEntries).returning();
    console.log(`Created ${stock.length} stock entries`);

    console.log("Inventory seeding completed successfully!");
    return { categories, items, stock };
  } catch (error) {
    console.error("Error seeding inventory data:", error);
    throw error;
  }
}

// Execute the seeding immediately
seedInventoryData()
  .then(() => {
    console.log("Inventory seeding process completed");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Inventory seeding failed:", error);
    process.exit(1);
  });

export { seedInventoryData };