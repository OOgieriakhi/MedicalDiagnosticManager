import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { notificationService, PDFService } from "./notifications";
import { z } from "zod";
import { insertPatientSchema, insertPatientTestSchema, insertTransactionSchema } from "@shared/schema";

export function registerRoutes(app: Express): Server {
  // Setup authentication routes
  setupAuth(app);

  // Dashboard metrics endpoint
  app.get("/api/dashboard/metrics/:branchId", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const branchId = parseInt(req.params.branchId);
      if (isNaN(branchId)) {
        return res.status(400).json({ message: "Invalid branch ID" });
      }

      const metrics = await storage.getDashboardMetrics(branchId);
      res.json(metrics);
    } catch (error) {
      console.error("Error fetching dashboard metrics:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Recent patients endpoint
  app.get("/api/patients/recent/:branchId", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const branchId = parseInt(req.params.branchId);
      const limit = parseInt(req.query.limit as string) || 10;

      if (isNaN(branchId)) {
        return res.status(400).json({ message: "Invalid branch ID" });
      }

      const recentTests = await storage.getRecentPatientTests(branchId, limit);
      res.json(recentTests);
    } catch (error) {
      console.error("Error fetching recent patients:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Branches for a tenant
  app.get("/api/branches/:tenantId", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const tenantId = parseInt(req.params.tenantId);
      if (isNaN(tenantId)) {
        return res.status(400).json({ message: "Invalid tenant ID" });
      }

      const branches = await storage.getBranchesByTenant(tenantId);
      res.json(branches);
    } catch (error) {
      console.error("Error fetching branches:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Search patients
  app.get("/api/patients/search", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const { query, branchId } = req.query;
      
      if (!query || !branchId) {
        return res.status(400).json({ message: "Query and branchId are required" });
      }

      const patients = await storage.searchPatients(parseInt(branchId as string), query as string);
      res.json(patients);
    } catch (error) {
      console.error("Error searching patients:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // System alerts
  app.get("/api/alerts/:tenantId", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const tenantId = parseInt(req.params.tenantId);
      const limit = parseInt(req.query.limit as string) || 10;

      if (isNaN(tenantId)) {
        return res.status(400).json({ message: "Invalid tenant ID" });
      }

      const alerts = await storage.getSystemAlerts(tenantId, limit);
      res.json(alerts);
    } catch (error) {
      console.error("Error fetching alerts:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Create patient
  app.post("/api/patients", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      // Generate patient ID first
      const patientId = await storage.generatePatientId(req.body.tenantId);
      
      // Prepare patient data with proper formatting
      const patientData = {
        patientId,
        firstName: req.body.firstName,
        lastName: req.body.lastName,
        email: req.body.email || null,
        phone: req.body.phone,
        dateOfBirth: req.body.dateOfBirth ? new Date(req.body.dateOfBirth) : null,
        gender: req.body.gender || null,
        address: req.body.address || null,
        pathway: req.body.pathway || "self",
        referralProviderId: req.body.referralProviderId || null,
        tenantId: req.body.tenantId,
        branchId: req.body.branchId
      };

      const validatedData = insertPatientSchema.parse(patientData);
      const patient = await storage.createPatient(validatedData);

      res.status(201).json(patient);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error creating patient:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Schedule patient test
  app.post("/api/patient-tests", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      console.log("Received patient test data:", req.body);
      
      // Transform scheduledAt to proper timestamp format
      const testData = {
        ...req.body,
        scheduledAt: req.body.scheduledAt ? new Date(req.body.scheduledAt) : new Date()
      };

      console.log("Transformed data:", testData);

      const validatedData = insertPatientTestSchema.parse(testData);
      const patientTest = await storage.createPatientTest(validatedData);

      res.status(201).json(patientTest);
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error("Validation errors:", error.errors);
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error scheduling test:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Update patient test status
  app.patch("/api/patient-tests/:id/status", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const id = parseInt(req.params.id);
      const { status } = req.body;

      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid test ID" });
      }

      if (!["scheduled", "in_progress", "completed", "cancelled"].includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }

      await storage.updatePatientTestStatus(id, status);
      res.json({ message: "Status updated successfully" });
    } catch (error) {
      console.error("Error updating test status:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Record financial transaction
  app.post("/api/transactions", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const validatedData = insertTransactionSchema.parse({
        ...req.body,
        createdBy: req.user!.id
      });

      const transaction = await storage.createTransaction(validatedData);
      res.status(201).json(transaction);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error creating transaction:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Create invoice
  app.post("/api/invoices", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const invoiceData = req.body;
      console.log("Invoice data received:", invoiceData);
      
      // Generate invoice number
      const invoiceNumber = await storage.generateInvoiceNumber(invoiceData.tenantId);

      // Create the invoice using storage
      const invoice = await storage.createInvoice({
        invoiceNumber,
        patientId: invoiceData.patientId,
        branchId: invoiceData.branchId,
        tenantId: invoiceData.tenantId,
        tests: invoiceData.items || [],
        subtotal: (invoiceData.subtotal || 0).toString(),
        discountPercentage: "0",
        discountAmount: "0",
        commissionAmount: (invoiceData.commission || 0).toString(),
        totalAmount: (invoiceData.total || 0).toString(),
        netAmount: (invoiceData.total || 0).toString(),
        paymentStatus: invoiceData.status || "unpaid",
        paymentMethod: invoiceData.paymentMethod,
        createdBy: req.user?.id || 1
      });

      res.status(201).json(invoice);
    } catch (error) {
      console.error("Error creating invoice:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Generate receipt PDF
  app.get("/api/invoices/:id/receipt", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const invoiceId = parseInt(req.params.id);
      const invoice = await storage.getInvoice(invoiceId);
      
      if (!invoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }

      const patient = await storage.getPatient(invoice.patientId);
      if (!patient) {
        return res.status(404).json({ message: "Patient not found" });
      }

      // Get test details from invoice
      const tests = invoice.tests || [];
      
      // Generate PDF receipt
      const pdfBuffer = await PDFService.generatePaymentReceiptPDF(invoice, patient, tests);
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="receipt-${invoice.invoiceNumber}.pdf"`);
      res.send(pdfBuffer);

    } catch (error) {
      console.error("Error generating receipt:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get referral providers (with tenant ID from user session)
  app.get("/api/referral-providers", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const tenantId = req.user.tenantId;
      const providers = await storage.getReferralProviders(tenantId);
      res.json(providers);
    } catch (error) {
      console.error("Error fetching referral providers:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get referral providers (with tenant ID parameter)
  app.get("/api/referral-providers/:tenantId", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const tenantId = parseInt(req.params.tenantId);
      if (isNaN(tenantId)) {
        return res.status(400).json({ message: "Invalid tenant ID" });
      }

      const providers = await storage.getReferralProviders(tenantId);
      res.json(providers);
    } catch (error) {
      console.error("Error fetching referral providers:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Create new referral provider
  app.post("/api/referral-providers", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const { name, tenantId, requiresCommissionSetup } = req.body;
      
      if (!name || !tenantId) {
        return res.status(400).json({ message: "Name and tenant ID are required" });
      }

      const newProvider = await storage.createReferralProvider({
        name,
        tenantId,
        requiresCommissionSetup: requiresCommissionSetup || true
      });

      res.status(201).json(newProvider);
    } catch (error) {
      console.error("Error creating referral provider:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get test categories (with tenant ID from user session)
  app.get("/api/test-categories", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const tenantId = req.user.tenantId;
      const categories = await storage.getTestCategories(tenantId);
      res.json(categories);
    } catch (error) {
      console.error("Error fetching test categories:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get test categories (with tenant ID parameter)
  app.get("/api/test-categories/:tenantId", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const tenantId = parseInt(req.params.tenantId);
      if (isNaN(tenantId)) {
        return res.status(400).json({ message: "Invalid tenant ID" });
      }

      const categories = await storage.getTestCategories(tenantId);
      res.json(categories);
    } catch (error) {
      console.error("Error fetching test categories:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get tests (with tenant ID from user session)
  app.get("/api/tests", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const tenantId = req.user.tenantId;
      const tests = await storage.getTests(tenantId);
      res.json(tests);
    } catch (error) {
      console.error("Error fetching tests:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get tests (with tenant ID parameter)
  app.get("/api/tests/:tenantId", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const tenantId = parseInt(req.params.tenantId);
      if (isNaN(tenantId)) {
        return res.status(400).json({ message: "Invalid tenant ID" });
      }

      const tests = await storage.getTests(tenantId);
      res.json(tests);
    } catch (error) {
      console.error("Error fetching tests:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get all patients (using user's branch from session)
  app.get("/api/patients", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const branchId = req.user.branchId;
      if (!branchId) {
        return res.status(400).json({ message: "Invalid branch ID" });
      }

      const limit = parseInt(req.query.limit as string) || 50;
      const patients = await storage.getPatientsByBranch(branchId, limit);
      res.json(patients);
    } catch (error) {
      console.error("Error fetching patients:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get recent patients for dashboard
  app.get("/api/patients/recent", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const branchId = req.user.branchId;
      if (!branchId) {
        return res.status(400).json({ message: "Invalid branch ID" });
      }

      const limit = parseInt(req.query.limit as string) || 5;
      const patients = await storage.getPatientsByBranch(branchId, limit);
      res.json(patients);
    } catch (error) {
      console.error("Error fetching recent patients:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get patients for a specific branch
  app.get("/api/patients/:branchId", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const branchId = parseInt(req.params.branchId);
      const limit = parseInt(req.query.limit as string) || 50;

      if (isNaN(branchId)) {
        return res.status(400).json({ message: "Invalid branch ID" });
      }

      const patients = await storage.getPatientsByBranch(branchId, limit);
      res.json(patients);
    } catch (error) {
      console.error("Error fetching patients:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Notification endpoints
  app.post("/api/notifications/test-status", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const { patientTestId, status } = req.body;
      
      // Update test status
      await storage.updatePatientTestStatus(patientTestId, status);
      
      // Get related data for notifications
      const patientTest = await storage.getPatientTest(patientTestId);
      if (patientTest) {
        const patient = await storage.getPatient(patientTest.patientId);
        const test = await storage.getTest(patientTest.testId);
        
        if (patient && test) {
          await notificationService.sendTestStatusUpdate(patient, patientTest, test);
        }
      }

      res.json({ success: true, message: "Status updated and notifications sent" });
    } catch (error) {
      console.error("Error updating test status:", error);
      res.status(500).json({ message: "Failed to update status" });
    }
  });

  app.post("/api/notifications/test-results", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const { patientTestId, results } = req.body;
      
      // Update test results
      await storage.updatePatientTestResults(patientTestId, results);
      
      // Get related data for notifications
      const patientTest = await storage.getPatientTest(patientTestId);
      if (patientTest) {
        const patient = await storage.getPatient(patientTest.patientId);
        const test = await storage.getTest(patientTest.testId);
        let referralProvider = null;
        
        if (patient?.referralProviderId) {
          referralProvider = await storage.getReferralProvider(patient.referralProviderId);
        }
        
        if (patient && test) {
          await notificationService.sendTestResults(patient, patientTest, test, referralProvider);
        }
      }

      res.json({ success: true, message: "Results sent and notifications delivered" });
    } catch (error) {
      console.error("Error sending test results:", error);
      res.status(500).json({ message: "Failed to send results" });
    }
  });

  app.post("/api/notifications/appointment-reminder", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const { patientId, appointmentDate } = req.body;
      
      const patient = await storage.getPatient(patientId);
      if (patient) {
        await notificationService.sendReminder(patient, { scheduledAt: appointmentDate });
      }

      res.json({ success: true, message: "Reminder sent" });
    } catch (error) {
      console.error("Error sending reminder:", error);
      res.status(500).json({ message: "Failed to send reminder" });
    }
  });

  // Two-stage invoice management endpoints
  app.post("/api/invoices", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const invoiceData = req.body;
      
      // Generate invoice number
      const invoiceNumber = await storage.generateInvoiceNumber(invoiceData.tenantId);
      
      // Create unpaid invoice
      const invoice = await storage.createInvoice({
        invoiceNumber,
        patientId: invoiceData.patientId,
        tenantId: invoiceData.tenantId,
        branchId: invoiceData.branchId,
        tests: invoiceData.tests,
        subtotal: invoiceData.subtotal.toString(),
        discountPercentage: invoiceData.discountPercentage.toString(),
        discountAmount: invoiceData.discountAmount.toString(),
        commissionAmount: invoiceData.commissionAmount.toString(),
        totalAmount: invoiceData.totalAmount.toString(),
        netAmount: invoiceData.netAmount.toString(),
        paymentStatus: "unpaid",
        createdBy: req.user.id,
      });

      // Create patient tests for each test in the invoice
      for (const test of invoiceData.tests) {
        await storage.createPatientTest({
          patientId: invoiceData.patientId,
          testId: test.testId,
          status: "pending",
          scheduledAt: new Date(),
          tenantId: invoiceData.tenantId,
          branchId: invoiceData.branchId,
          technicianId: req.user.id
        });
      }

      res.json({ success: true, invoice });
    } catch (error) {
      console.error("Error creating invoice:", error);
      res.status(500).json({ error: "Failed to create invoice" });
    }
  });

  // Get invoices by branch with optional status filter
  app.get("/api/invoices", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const branchId = req.query.branchId as string;
      const status = req.query.status as string;
      
      if (!branchId) {
        return res.status(400).json({ error: "Branch ID is required" });
      }

      const invoices = await storage.getInvoicesByBranch(parseInt(branchId), status);
      res.json(invoices);
    } catch (error) {
      console.error("Error fetching invoices:", error);
      res.status(500).json({ error: "Failed to fetch invoices" });
    }
  });

  // Mark invoice as paid (payment collection stage)
  app.put("/api/invoices/:id/pay", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const invoiceId = parseInt(req.params.id);
      const paymentData = req.body;
      
      // Mark invoice as paid
      await storage.markInvoiceAsPaid(invoiceId, {
        paymentMethod: paymentData.paymentMethod,
        paymentDetails: paymentData.paymentDetails,
        paidBy: req.user.id,
      });

      // Create transaction record
      const invoice = await storage.getInvoice(invoiceId);
      if (invoice) {
        await storage.createTransaction({
          amount: parseFloat(invoice.netAmount),
          type: "payment",
          description: `Invoice payment - ${invoice.invoiceNumber}`,
          tenantId: invoice.tenantId,
          branchId: invoice.branchId,
          createdBy: req.user.id,
        });
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Error processing payment:", error);
      res.status(500).json({ error: "Failed to process payment" });
    }
  });

  // Badge system API routes
  app.get("/api/badge-definitions", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const user = req.user as any;
      const badges = await storage.getBadgeDefinitions(user.tenantId);
      res.json(badges);
    } catch (error) {
      console.error("Error fetching badge definitions:", error);
      res.status(500).json({ error: "Failed to fetch badge definitions" });
    }
  });

  app.post("/api/badge-definitions", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const user = req.user as any;
      const badgeData = {
        ...req.body,
        tenantId: user.tenantId,
        createdBy: user.id
      };
      
      const badge = await storage.createBadgeDefinition(badgeData);
      res.status(201).json(badge);
    } catch (error) {
      console.error("Error creating badge definition:", error);
      res.status(500).json({ error: "Failed to create badge definition" });
    }
  });

  app.get("/api/staff-achievements/:userId", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const userId = parseInt(req.params.userId);
      const achievements = await storage.getStaffAchievements(userId);
      res.json(achievements);
    } catch (error) {
      console.error("Error fetching staff achievements:", error);
      res.status(500).json({ error: "Failed to fetch staff achievements" });
    }
  });

  app.post("/api/staff-achievements", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const achievement = await storage.createStaffAchievement(req.body);
      res.status(201).json(achievement);
    } catch (error) {
      console.error("Error creating staff achievement:", error);
      res.status(500).json({ error: "Failed to create staff achievement" });
    }
  });

  app.patch("/api/staff-achievements/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const id = parseInt(req.params.id);
      const { progress, isCompleted } = req.body;
      
      await storage.updateStaffAchievement(id, progress, isCompleted);
      res.sendStatus(200);
    } catch (error) {
      console.error("Error updating staff achievement:", error);
      res.status(500).json({ error: "Failed to update staff achievement" });
    }
  });

  app.post("/api/performance-metrics", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const metric = await storage.recordPerformanceMetric(req.body);
      res.status(201).json(metric);
    } catch (error) {
      console.error("Error recording performance metric:", error);
      res.status(500).json({ error: "Failed to record performance metric" });
    }
  });

  app.get("/api/performance-metrics/:userId", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const userId = parseInt(req.params.userId);
      const { metricType, period } = req.query;
      
      const metrics = await storage.getPerformanceMetrics(
        userId, 
        metricType as string, 
        period as string
      );
      res.json(metrics);
    } catch (error) {
      console.error("Error fetching performance metrics:", error);
      res.status(500).json({ error: "Failed to fetch performance metrics" });
    }
  });

  app.post("/api/recognition-events", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const user = req.user as any;
      const eventData = {
        ...req.body,
        branchId: user.branchId,
        nominatorId: user.id
      };
      
      const event = await storage.createRecognitionEvent(eventData);
      res.status(201).json(event);
    } catch (error) {
      console.error("Error creating recognition event:", error);
      res.status(500).json({ error: "Failed to create recognition event" });
    }
  });

  app.get("/api/recognition-events", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const user = req.user as any;
      const { recipientId } = req.query;
      
      const events = await storage.getRecognitionEvents(
        user.branchId, 
        recipientId ? parseInt(recipientId as string) : undefined
      );
      res.json(events);
    } catch (error) {
      console.error("Error fetching recognition events:", error);
      res.status(500).json({ error: "Failed to fetch recognition events" });
    }
  });

  app.patch("/api/recognition-events/:id/approve", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const user = req.user as any;
      const id = parseInt(req.params.id);
      
      await storage.approveRecognitionEvent(id, user.id);
      res.sendStatus(200);
    } catch (error) {
      console.error("Error approving recognition event:", error);
      res.status(500).json({ error: "Failed to approve recognition event" });
    }
  });

  app.get("/api/staff-badge-summary/:userId", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const userId = parseInt(req.params.userId);
      const summary = await storage.getStaffBadgeSummary(userId);
      res.json(summary);
    } catch (error) {
      console.error("Error fetching staff badge summary:", error);
      res.status(500).json({ error: "Failed to fetch staff badge summary" });
    }
  });

  app.get("/api/leaderboard", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const user = req.user as any;
      const { period } = req.query;
      
      const leaderboard = await storage.getLeaderboard(user.branchId, period as string);
      res.json(leaderboard);
    } catch (error) {
      console.error("Error fetching leaderboard:", error);
      res.status(500).json({ error: "Failed to fetch leaderboard" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
