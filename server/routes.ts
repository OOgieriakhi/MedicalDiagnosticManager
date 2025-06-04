import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { notificationService, PDFService } from "./notifications";
import { z } from "zod";
import { insertPatientSchema, insertPatientTestSchema, insertTransactionSchema } from "@shared/schema";

// Thermal receipt generator for POS printers
function generateThermalReceipt(invoice: any, patient: any, tests: any[], branch: any, tenant: any): string {
  const centerText = (text: string, width = 32) => {
    const padding = Math.max(0, (width - text.length) / 2);
    return ' '.repeat(Math.floor(padding)) + text;
  };

  const formatLine = (left: string, right: string, width = 32) => {
    const rightPadding = Math.max(0, width - left.length - right.length);
    return left + ' '.repeat(rightPadding) + right;
  };

  const separator = '='.repeat(32);
  const dashes = '-'.repeat(32);

  let receipt = '';
  
  // Header
  receipt += centerText('ORIENT MEDICAL') + '\n';
  receipt += centerText('DIAGNOSTIC CENTER') + '\n';
  receipt += centerText(branch?.name || 'Main Branch') + '\n';
  receipt += centerText(branch?.address || '') + '\n';
  receipt += centerText(branch?.phone || '') + '\n';
  receipt += separator + '\n';
  receipt += centerText('PAYMENT RECEIPT') + '\n';
  receipt += separator + '\n';
  
  // Invoice details
  receipt += formatLine('Receipt #:', invoice.invoiceNumber) + '\n';
  receipt += formatLine('Date:', new Date(invoice.paidAt || invoice.createdAt).toLocaleDateString('en-GB')) + '\n';
  receipt += formatLine('Time:', new Date(invoice.paidAt || invoice.createdAt).toLocaleTimeString('en-GB', { hour12: false })) + '\n';
  receipt += dashes + '\n';
  
  // Patient details
  receipt += 'PATIENT INFORMATION:\n';
  receipt += formatLine('Name:', `${patient.firstName} ${patient.lastName}`) + '\n';
  receipt += formatLine('ID:', patient.patientId) + '\n';
  if (patient.phone) {
    receipt += formatLine('Phone:', patient.phone) + '\n';
  }
  receipt += dashes + '\n';
  
  // Tests/Services
  receipt += 'SERVICES:\n';
  let total = 0;
  tests.forEach((test, index) => {
    const price = typeof test.price === 'string' ? parseFloat(test.price) : (test.price || 0);
    total += price;
    
    // Test name (handle undefined/null names)
    const testName = test.name || `Test ${index + 1}`;
    if (testName.length > 32) {
      receipt += testName.substring(0, 29) + '...\n';
    } else {
      receipt += testName + '\n';
    }
    receipt += formatLine('', `₦${price.toLocaleString()}`) + '\n';
  });
  
  receipt += dashes + '\n';
  
  // Totals
  const subtotal = parseFloat(invoice.subtotal || total);
  const discountAmount = parseFloat(invoice.discountAmount || 0);
  const totalAmount = parseFloat(invoice.totalAmount || subtotal);
  
  receipt += formatLine('Subtotal:', `₦${subtotal.toLocaleString()}`) + '\n';
  if (discountAmount > 0) {
    receipt += formatLine('Discount:', `-₦${discountAmount.toLocaleString()}`) + '\n';
  }
  receipt += formatLine('TOTAL:', `₦${totalAmount.toLocaleString()}`) + '\n';
  receipt += separator + '\n';
  
  // Payment details
  receipt += 'PAYMENT DETAILS:\n';
  receipt += formatLine('Method:', invoice.paymentMethod?.toUpperCase() || 'CASH') + '\n';
  receipt += formatLine('Amount Paid:', `₦${totalAmount.toLocaleString()}`) + '\n';
  receipt += formatLine('Status:', 'PAID') + '\n';
  receipt += dashes + '\n';
  
  // Footer
  receipt += centerText('Thank you for choosing') + '\n';
  receipt += centerText('Orient Medical!') + '\n';
  receipt += '\n';
  receipt += centerText('For results inquiry:') + '\n';
  receipt += centerText(branch?.phone || 'Contact reception') + '\n';
  receipt += '\n';
  receipt += centerText('Visit us online:') + '\n';
  receipt += centerText('www.orientmedical.ng') + '\n';
  receipt += '\n';
  receipt += separator + '\n';
  
  // Extra lines for paper cutting
  receipt += '\n\n\n';
  
  return receipt;
}

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

  // Get patient tests
  app.get("/api/patient-tests", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const branchId = req.query.branchId ? parseInt(req.query.branchId as string) : (req.user!.branchId || 1);
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      const paidOnly = req.query.paidOnly === 'true';

      if (isNaN(branchId) || branchId <= 0) {
        return res.status(400).json({ message: "Invalid branch ID" });
      }

      const patientTests = await storage.getPatientTestsByBranch(branchId, limit, paidOnly);
      res.json(patientTests);
    } catch (error) {
      console.error("Error fetching patient tests:", error);
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
        tests: invoiceData.tests || invoiceData.items || [],
        subtotal: (invoiceData.subtotal || 0).toString(),
        discountPercentage: (invoiceData.discountPercentage || 0).toString(),
        discountAmount: (invoiceData.discountAmount || 0).toString(),
        commissionAmount: (invoiceData.commission || invoiceData.commissionAmount || 0).toString(),
        totalAmount: (invoiceData.totalAmount || invoiceData.total || 0).toString(),
        netAmount: (invoiceData.netAmount || invoiceData.totalAmount || invoiceData.total || 0).toString(),
        paymentStatus: invoiceData.status || "unpaid",
        paymentMethod: invoiceData.paymentMethod,
        createdBy: req.user?.id || 1
      });

      // Create patient test records for each test in the invoice
      const tests = invoiceData.tests || invoiceData.items || [];
      for (const test of tests) {
        try {
          await storage.createPatientTest({
            patientId: invoiceData.patientId,
            testId: test.testId,
            branchId: invoiceData.branchId,
            tenantId: invoiceData.tenantId,
            status: "pending",
            scheduledAt: new Date(),
            createdBy: req.user?.id || 1
          });
        } catch (error) {
          console.error(`Error creating patient test record for test ${test.testId}:`, error);
          // Continue with other tests even if one fails
        }
      }

      res.status(201).json(invoice);
    } catch (error) {
      console.error("Error creating invoice:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Generate thermal receipt (text format for POS printers)
  app.get("/api/invoices/:id/thermal-receipt", async (req, res) => {
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

      const branch = await storage.getBranch(invoice.branchId);
      const tenant = await storage.getTenant(invoice.tenantId);

      // Get test details from invoice
      const tests = Array.isArray(invoice.tests) ? invoice.tests : [];
      
      // Generate thermal receipt text
      const receiptText = generateThermalReceipt(invoice, patient, tests, branch, tenant);
      
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="thermal-receipt-${invoice.invoiceNumber}.txt"`);
      res.send(receiptText);

    } catch (error) {
      console.error("Error generating thermal receipt:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Generate receipt PDF (for record keeping)
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
      const tests = Array.isArray(invoice.tests) ? invoice.tests : [];
      
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

  // Update patient test results (for laboratory module)
  app.patch("/api/patient-tests/:id/results", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const testId = parseInt(req.params.id);
      const { results, notes, status, updatedBy } = req.body;

      if (isNaN(testId)) {
        return res.status(400).json({ message: "Invalid test ID" });
      }

      if (!results) {
        return res.status(400).json({ message: "Test results are required" });
      }

      await storage.updatePatientTestResults(testId, results, notes, updatedBy);
      res.json({ success: true, message: "Test results updated successfully" });
    } catch (error) {
      console.error("Error updating test results:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get today's revenue for cashiers module
  app.get("/api/revenue/today", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const branchId = parseInt(req.query.branchId as string) || req.user.branchId;
      if (!branchId) {
        return res.status(400).json({ message: "Branch ID is required" });
      }

      const revenue = await storage.getTodayRevenue(branchId);
      res.json({ revenue });
    } catch (error) {
      console.error("Error fetching today's revenue:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get payment methods breakdown for cashiers module
  app.get("/api/payments/methods", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const branchId = parseInt(req.query.branchId as string) || req.user.branchId;
      if (!branchId) {
        return res.status(400).json({ message: "Branch ID is required" });
      }

      const paymentMethods = await storage.getPaymentMethodsBreakdown(branchId);
      res.json(paymentMethods);
    } catch (error) {
      console.error("Error fetching payment methods:", error);
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

  // Laboratory workflow management endpoints
  app.post("/api/patient-tests/:id/verify-payment", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    const { id } = req.params;
    
    try {
      await storage.verifyPayment(parseInt(id), req.user.id);
      res.json({ message: "Payment verified successfully" });
    } catch (error: any) {
      console.error("Error verifying payment:", error);
      res.status(500).json({ message: "Error verifying payment" });
    }
  });

  app.post("/api/patient-tests/:id/collect-specimen", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    const { id } = req.params;
    const { specimenType } = req.body;
    
    if (!specimenType) {
      return res.status(400).json({ message: "Specimen type is required" });
    }
    
    try {
      await storage.collectSpecimen(parseInt(id), req.user.id, specimenType);
      res.json({ message: "Specimen collected successfully" });
    } catch (error: any) {
      console.error("Error collecting specimen:", error);
      res.status(500).json({ message: "Error collecting specimen" });
    }
  });

  app.post("/api/patient-tests/:id/start-processing", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    const { id } = req.params;
    const { expectedHours } = req.body;
    
    if (!expectedHours || expectedHours <= 0) {
      return res.status(400).json({ message: "Expected hours must be a positive number" });
    }
    
    try {
      await storage.startProcessing(parseInt(id), req.user.id, expectedHours);
      res.json({ message: "Processing started successfully" });
    } catch (error: any) {
      console.error("Error starting processing:", error);
      res.status(500).json({ message: "Error starting processing" });
    }
  });

  app.post("/api/patient-tests/:id/complete", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    const { id } = req.params;
    const { results, notes } = req.body;
    
    if (!results) {
      return res.status(400).json({ message: "Test results are required" });
    }
    
    try {
      await storage.completeTest(parseInt(id), results, notes);
      res.json({ message: "Test completed successfully" });
    } catch (error: any) {
      console.error("Error completing test:", error);
      res.status(500).json({ message: "Error completing test" });
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
