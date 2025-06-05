import { Pool } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { users, tenants, branches } from './shared/schema.js';
import { scrypt, randomBytes } from 'crypto';
import { promisify } from 'util';

const scryptAsync = promisify(scrypt);

async function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const buf = await scryptAsync(password, salt, 64);
  return `${buf.toString("hex")}.${salt}`;
}

async function fixBlankPage() {
  console.log('Fixing blank page issue by seeding database...');
  
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle({ client: pool });

  try {
    // Create default tenant
    const [tenant] = await db.insert(tenants).values({
      name: 'Orient Medical Diagnostic Center',
      slug: 'orient-medical',
      isActive: true
    }).returning().catch(() => [null]);

    if (!tenant) {
      console.log('Tenant already exists');
      const [existingTenant] = await db.select().from(tenants).limit(1);
      var tenantId = existingTenant?.id || 1;
    } else {
      var tenantId = tenant.id;
      console.log('Created tenant:', tenant.name);
    }

    // Create default branch
    const [branch] = await db.insert(branches).values({
      tenantId: tenantId,
      name: 'Main Branch',
      address: 'Lagos, Nigeria',
      phone: '+234-123-456-7890',
      isActive: true
    }).returning().catch(() => [null]);

    if (!branch) {
      console.log('Branch already exists');
      const [existingBranch] = await db.select().from(branches).limit(1);
      var branchId = existingBranch?.id || 1;
    } else {
      var branchId = branch.id;
      console.log('Created branch:', branch.name);
    }

    // Create admin user
    const hashedPassword = await hashPassword('admin123');
    const [user] = await db.insert(users).values({
      tenantId: tenantId,
      branchId: branchId,
      username: 'admin',
      email: 'admin@orient-medical.com',
      password: hashedPassword,
      firstName: 'System',
      lastName: 'Administrator',
      role: 'admin',
      isActive: true
    }).returning().catch(() => [null]);

    if (!user) {
      console.log('Admin user already exists');
    } else {
      console.log('Created admin user - username: admin, password: admin123');
    }

    console.log('Database seeding completed successfully!');
    console.log('You can now login with:');
    console.log('Username: admin');
    console.log('Password: admin123');
    
  } catch (error) {
    console.error('Error seeding database:', error);
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  fixBlankPage();
}

module.exports = { fixBlankPage };