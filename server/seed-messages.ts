import { marketingStorage } from "./marketing-storage";

export async function seedMessages() {
  try {
    console.log("Seeding sample messages...");

    // Sample internal messages for demonstration
    const sampleMessages = [
      {
        tenantId: 1,
        messageType: "announcement",
        subject: "New Quality Control Protocols",
        content: "All laboratory staff must familiarize themselves with the updated quality control protocols effective immediately. Training sessions will be held next week.",
        priority: "high",
        senderId: 1,
        recipientIds: [1, 2, 3],
        actionRequired: true,
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
      },
      {
        tenantId: 1,
        messageType: "alert",
        subject: "Equipment Maintenance Alert",
        content: "The ultrasound machine in room 3 requires scheduled maintenance. Please coordinate with the technical team.",
        priority: "urgent",
        senderId: 1,
        recipientIds: [1, 2],
        actionRequired: true,
        dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000) // 2 days from now
      },
      {
        tenantId: 1,
        messageType: "task",
        subject: "Monthly Inventory Audit",
        content: "Please complete the monthly inventory audit for all laboratory consumables by the end of this week.",
        priority: "normal",
        senderId: 1,
        recipientIds: [1, 3],
        actionRequired: true,
        dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000) // 5 days from now
      },
      {
        tenantId: 1,
        messageType: "reminder",
        subject: "Staff Meeting Tomorrow",
        content: "Reminder: All department heads meeting scheduled for tomorrow at 10:00 AM in the conference room.",
        priority: "normal",
        senderId: 1,
        recipientIds: [1, 2, 3],
        actionRequired: false
      }
    ];

    // Create sample messages
    for (const message of sampleMessages) {
      await marketingStorage.createInternalMessage(message);
    }

    console.log("Sample messages seeded successfully!");
  } catch (error) {
    console.error("Error seeding messages:", error);
  }
}