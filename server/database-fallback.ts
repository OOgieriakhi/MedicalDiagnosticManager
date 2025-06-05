import { scrypt, randomBytes } from 'crypto';
import { promisify } from 'util';

const scryptAsync = promisify(scrypt);

// In-memory fallback data for when database is unavailable
let fallbackData = {
  users: [
    {
      id: 1,
      tenantId: 1,
      branchId: 1,
      username: 'admin',
      email: 'admin@orient-medical.com',
      password: '', // Will be set in initialization
      firstName: 'System',
      lastName: 'Administrator',
      role: 'admin',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ],
  tenants: [
    {
      id: 1,
      name: 'Orient Medical Diagnostic Center',
      slug: 'orient-medical',
      isActive: true
    }
  ],
  branches: [
    {
      id: 1,
      tenantId: 1,
      name: 'Main Branch',
      address: 'Lagos, Nigeria',
      phone: '+234-123-456-7890',
      isActive: true
    }
  ]
};

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = await scryptAsync(password, salt, 64) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = await scryptAsync(supplied, salt, 64) as Buffer;
  return Buffer.compare(hashedBuf, suppliedBuf) === 0;
}

class FallbackStorage {
  private initialized = false;

  async initialize() {
    if (!this.initialized) {
      fallbackData.users[0].password = await hashPassword('admin123');
      this.initialized = true;
    }
  }

  async getUser(id: number) {
    await this.initialize();
    return fallbackData.users.find(u => u.id === id);
  }

  async getUserByUsername(username: string) {
    await this.initialize();
    return fallbackData.users.find(u => u.username === username);
  }

  async validatePassword(username: string, password: string) {
    await this.initialize();
    const user = await this.getUserByUsername(username);
    if (!user) return false;
    return await comparePasswords(password, user.password);
  }

  async getTenant(id: number) {
    return fallbackData.tenants.find(t => t.id === id);
  }

  async getBranch(id: number) {
    return fallbackData.branches.find(b => b.id === id);
  }
}

export const fallbackStorage = new FallbackStorage();
export { hashPassword, comparePasswords };