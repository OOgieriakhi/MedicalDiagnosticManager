import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage.js";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import bcrypt from "bcryptjs";
import session from "express-session";
import { 
  insertUserSchema, 
  insertPatientSchema, 
  insertPatientTestSchema,
  insertTransactionSchema,
  insertInvoiceSchema,
  insertSystemAlertSchema
} from "../shared/schema.js";

interface AuthenticatedRequest extends Express.Request {
  user?: any;
  isAuthenticated(): boolean;
  query: any;
  body: any;
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Session configuration
  app.use(session({
    store: storage.sessionStore,
    secret: process.env.SESSION_SECRET || 'orient-medical-secret-key-development',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false,
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
  }));

  // Passport configuration
  app.use(passport.initialize());
  app.use(passport.session());

  // Passport Local Strategy
  passport.use(new LocalStrategy(
    { usernameField: 'username' },
    async (username: string, password: string, done) => {
      try {
        const user = await storage.getUserByUsername(username);
        if (!user) {
          return done(null, false, { message: 'Invalid credentials' });
        }

        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
          return done(null, false, { message: 'Invalid credentials' });
        }

        return done(null, user);
      } catch (error) {
        return done(error);
      }
    }
  ));

  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (error) {
      done(error);
    }
  });

  // Authentication routes
  app.post('/api/auth/login', passport.authenticate('local'), (req, res) => {
    res.json({ user: req.user, message: 'Login successful' });
  });

  app.post('/api/auth/logout', (req, res) => {
    req.logout(() => {
      res.json({ message: 'Logout successful' });
    });
  });

  // User authentication and management
  app.get("/api/user", (req: AuthenticatedRequest, res) => {
    if (req.isAuthenticated()) {
      res.json(req.user);
    } else {
      res.status(401).json({ message: "Unauthorized" });
    }
  });

  // Patient management endpoints
  app.get("/api/patients", async (req: AuthenticatedRequest, res) => {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    try {
      const branchId = req.query.branchId ? parseInt(String(req.query.branchId)) : req.user.branchId;
      const limit = req.query.limit ? parseInt(String(req.query.limit)) : 50;
      
      const patients = await storage.getPatientsByBranch(branchId, limit);
      res.json(patients);
    } catch (error: any) {
      res.status(500).json({ message: "Error fetching patients", error: error.message });
    }
  });

  app.post("/api/patients", async (req: AuthenticatedRequest, res) => {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const patientData = insertPatientSchema.parse({
        ...req.body,
        tenantId: req.user.tenantId,
        branchId: req.user.branchId
      });
      
      const patient = await storage.createPatient(patientData);
      res.status(201).json(patient);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        res.status(400).json({ message: "Invalid patient data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Error creating patient", error: error.message });
      }
    }
  });

  // Patient tests management
  app.get("/api/patient-tests", async (req: AuthenticatedRequest, res) => {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const branchId = req.query.branchId ? parseInt(String(req.query.branchId)) : req.user.branchId;
      const limit = req.query.limit ? parseInt(String(req.query.limit)) : 50;
      const paidOnly = String(req.query.paidOnly) === "true";
      
      const tests = await storage.getPatientTestsByBranch(branchId, limit, paidOnly);
      res.json(tests);
    } catch (error: any) {
      res.status(500).json({ message: "Error fetching patient tests", error: error.message });
    }
  });

  // Dashboard metrics
  app.get("/api/dashboard-metrics", async (req: AuthenticatedRequest, res) => {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const branchId = req.query.branchId ? parseInt(String(req.query.branchId)) : req.user.branchId;
      const metrics = await storage.getDashboardMetrics(branchId);
      res.json(metrics);
    } catch (error: any) {
      res.status(500).json({ message: "Error fetching dashboard metrics", error: error.message });
    }
  });

  // Dashboard data endpoint for main dashboard
  app.get("/api/dashboard-data", async (req: AuthenticatedRequest, res) => {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const branchId = req.query.branchId ? parseInt(String(req.query.branchId)) : req.user.branchId;
      
      // Calculate revenue from migrated transactions
      const todayRevenue = await storage.calculateDailyRevenue();
      const patientCount = await storage.getTodayPatientCount();
      const transactionCount = await storage.getTodayTransactionCount();
      
      res.json({
        revenue: {
          total: todayRevenue.total,
          cash: todayRevenue.cash,
          pos: todayRevenue.pos,
          transfer: todayRevenue.transfer,
          transactionCount: transactionCount
        },
        patients: {
          uniquePatients: patientCount,
          totalVisits: patientCount
        },
        purchaseOrders: {
          pending: 0,
          approved: 0
        }
      });
    } catch (error: any) {
      res.status(500).json({ message: "Error fetching dashboard data", error: error.message });
    }
  });

  // Financial management
  app.get("/api/financial-metrics", async (req: AuthenticatedRequest, res) => {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const branchId = req.query.branchId ? parseInt(String(req.query.branchId)) : req.user.branchId;
      const startDate = req.query.startDate ? new Date(String(req.query.startDate)) : undefined;
      const endDate = req.query.endDate ? new Date(String(req.query.endDate)) : undefined;
      
      const metrics = await storage.getFinancialMetrics(branchId, startDate, endDate);
      res.json(metrics);
    } catch (error: any) {
      res.status(500).json({ message: "Error fetching financial metrics", error: error.message });
    }
  });

  // Tests and categories
  app.get("/api/tests", async (req: AuthenticatedRequest, res) => {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const tests = await storage.getTests(req.user.tenantId);
      res.json(tests);
    } catch (error: any) {
      res.status(500).json({ message: "Error fetching tests", error: error.message });
    }
  });

  app.get("/api/test-categories", async (req: AuthenticatedRequest, res) => {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const categories = await storage.getTestCategories(req.user.tenantId);
      res.json(categories);
    } catch (error: any) {
      res.status(500).json({ message: "Error fetching test categories", error: error.message });
    }
  });

  // Referral providers
  app.get("/api/referral-providers", async (req: AuthenticatedRequest, res) => {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const providers = await storage.getReferralProviders(req.user.tenantId);
      res.json(providers);
    } catch (error: any) {
      res.status(500).json({ message: "Error fetching referral providers", error: error.message });
    }
  });

  // Organization branding
  app.get("/api/organization-branding", async (req: AuthenticatedRequest, res) => {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const tenant = await storage.getTenant(req.user.tenantId);
      if (!tenant) {
        return res.status(404).json({ message: "Organization not found" });
      }
      
      res.json({
        id: tenant.id,
        tenantId: tenant.id,
        organizationName: tenant.name,
        logo: tenant.logo,
        primaryColor: tenant.primaryColor,
        secondaryColor: tenant.secondaryColor,
        contactEmail: tenant.contactEmail,
        contactPhone: tenant.contactPhone,
        address: tenant.address
      });
    } catch (error: any) {
      res.status(500).json({ message: "Error fetching organization branding", error: error.message });
    }
  });

  // Data Migration Routes for Orient Medical Centre
  app.post("/api/data-migration/analyze", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    try {
      const { tableStructure, accessDbPath } = req.body;
      
      // Parse the table structure to identify A/B/C prefixed tables
      const tables = [];
      const lines = tableStructure.split('\n');
      let currentTable = null;
      
      for (const line of lines) {
        const trimmed = line.trim();
        
        // Detect table definitions (A_, B_, C_ prefixes or AtblRec, BtblFin, CtblRef patterns)
        if (trimmed.match(/^[ABC](_\w+|tbl\w+)/)) {
          if (currentTable) {
            tables.push(currentTable);
          }
          
          const tableName = trimmed.split(' ')[0].replace('-', '');
          const recordMatch = trimmed.match(/\((\d+[,\d]*)\s*records?\)/);
          const recordCount = recordMatch ? parseInt(recordMatch[1].replace(/,/g, '')) : 0;
          
          // Determine priority based on prefix
          let priority: 'high' | 'medium' | 'low' = 'medium';
          if (tableName.startsWith('A') || tableName.includes('Patient')) priority = 'high';
          else if (tableName.startsWith('B') || tableName.includes('Financial') || tableName.includes('Transaction')) priority = 'high';
          else if (tableName.startsWith('C') || tableName.includes('Referral')) priority = 'medium';
          
          currentTable = {
            name: tableName,
            recordCount,
            fields: [],
            sampleData: [],
            mapped: false,
            priority,
            category: (tableName.startsWith('A') || tableName.includes('Patient')) ? 'patients' : 
                     (tableName.startsWith('B') || tableName.includes('Financial') || tableName.includes('Transaction')) ? 'financial' : 'referrals'
          };
        }
        
        // Detect field definitions
        else if (trimmed.startsWith('-') && currentTable) {
          const fieldName = trimmed.substring(1).trim().split(' ')[0];
          currentTable.fields.push(fieldName);
        }
      }
      
      if (currentTable) {
        tables.push(currentTable);
      }

      // Generate migration recommendations
      const recommendations = {
        patientDeduplication: {
          enabled: true,
          matchFields: ['lastName', 'firstName', 'phone'],
          description: 'Detect duplicate patients using surname + firstname + phone matching'
        },
        referralTracking: {
          enabled: true,
          criticalField: 'referralID',
          description: 'Preserve referralID linkage in financial transactions for commission tracking'
        },
        migrationOrder: [
          'A_* tables (Patient records)',
          'C_* tables (Referral providers)', 
          'B_* tables (Financial transactions with referralID links)'
        ]
      };

      res.json({
        tables,
        recommendations,
        totalRecords: tables.reduce((sum, t) => sum + t.recordCount, 0),
        analysisComplete: true
      });

    } catch (error: any) {
      res.status(500).json({ 
        message: "Error analyzing database structure", 
        error: error.message 
      });
    }
  });

  app.post("/api/data-migration/upload", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    try {
      // Handle file upload for Access database
      res.json({
        success: true,
        filesProcessed: 1,
        message: "Database upload simulation - ready for field mapping"
      });
    } catch (error: any) {
      res.status(500).json({ 
        message: "Error uploading files", 
        error: error.message 
      });
    }
  });

  app.post("/api/data-migration/execute", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    try {
      const { tableMappings, deduplicationSettings } = req.body;
      
      // Simulate migration execution with progress tracking
      const migrationSteps = [
        { table: 'A_PatientRegister', phase: 'Patient data migration', progress: 25 },
        { table: 'C_ReferralProviders', phase: 'Referral provider setup', progress: 50 },
        { table: 'B_FinancialTransactions', phase: 'Financial transaction migration', progress: 75 },
        { table: 'Validation', phase: 'Data validation and integrity checks', progress: 100 }
      ];

      res.json({
        migrationId: `migration_${Date.now()}`,
        steps: migrationSteps,
        estimatedDuration: '15-20 minutes',
        status: 'initiated'
      });

    } catch (error: any) {
      res.status(500).json({ 
        message: "Error executing migration", 
        error: error.message 
      });
    }
  });

  app.get("/api/data-migration/templates/:type", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    try {
      const { type } = req.params;
      
      let template = '';
      
      switch (type) {
        case 'patients':
          template = 'PatientID,FirstName,LastName,Phone,Email,DateOfBirth,Address,ReferralSource\n';
          template += 'P001,John,Doe,1234567890,john.doe@email.com,1980-01-15,"123 Main St",Dr. Smith\n';
          break;
        case 'financial':
          template = 'TransactionID,PatientID,Amount,Date,PaymentMethod,ReferralID,Description\n';
          template += 'T001,P001,150.00,2024-01-15,Cash,R001,Blood Test\n';
          break;
        case 'referrals':
          template = 'ReferralID,ProviderName,CommissionRate,ContactPhone,ContactEmail\n';
          template += 'R001,Dr. Smith Clinic,15.0,1234567890,dr.smith@clinic.com\n';
          break;
        default:
          return res.status(400).json({ message: 'Invalid template type' });
      }

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${type}_template.csv"`);
      res.send(template);

    } catch (error: any) {
      res.status(500).json({ 
        message: "Error generating template", 
        error: error.message 
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}