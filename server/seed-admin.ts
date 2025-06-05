import { db } from "./db";
import { users, tenants, branches } from "@shared/schema";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

export async function seedAdminUser() {
  try {
    // Create default tenant
    const [tenant] = await db
      .insert(tenants)
      .values({
        name: "Orient Medical Diagnostic Center",
        slug: "orient-medical",
        isActive: true,
      })
      .onConflictDoNothing()
      .returning();

    // Create default branch
    const [branch] = await db
      .insert(branches)
      .values({
        tenantId: tenant?.id || 1,
        name: "Main Branch",
        address: "Lagos, Nigeria",
        phone: "+234-123-456-7890",
        isActive: true,
      })
      .onConflictDoNothing()
      .returning();

    // Create admin user
    const hashedPassword = await hashPassword("admin123");
    const [adminUser] = await db
      .insert(users)
      .values({
        tenantId: tenant?.id || 1,
        branchId: branch?.id || 1,
        username: "admin",
        email: "admin@orient-medical.com",
        password: hashedPassword,
        firstName: "System",
        lastName: "Administrator",
        role: "admin",
        isActive: true,
      })
      .onConflictDoNothing()
      .returning();

    console.log("Admin user created successfully:", adminUser?.username);
    return adminUser;
  } catch (error) {
    console.error("Error seeding admin user:", error);
    throw error;
  }
}