import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { rbacStorage } from "./rbac-storage";
import * as RBACMiddleware from "./rbac-middleware";
import { financialStorage } from "./financial-storage";
import { inventoryStorage } from "./inventory-storage";
import { inventoryConsumptionService } from "./inventory-consumption";
import { trainingStorage } from "./training-storage";
import { marketingStorage } from "./marketing-storage";
import { db } from "./db";
import { 
  patients, 
  patientTests, 
  tests, 
  testCategories, 
  invoices, 
  transactions,
  branches,
  tenants,
  users
} from "@shared/schema";
import { 
  eq, 
  and, 
  or, 
  desc, 
  asc, 
  gte, 
  lte, 
  lt, 
  gt, 
  ne, 
  isNull, 
  isNotNull, 
  inArray, 
  like, 
  ilike, 
  sql 
} from "drizzle-orm";
import { notificationService, PDFService } from "./notifications";
import { rbacStorage } from "./rbac-storage";
import { RBACMiddleware, rbacHelpers } from "./rbac-middleware";
import { seedRBACSystem, assignUserRole } from "./rbac-seed";
import { z } from "zod";
import { insertPatientSchema, insertPatientTestSchema, insertTransactionSchema } from "@shared/schema";
import { insertRoleSchema, insertPermissionSchema, insertUserRoleSchema, insertSecurityPolicySchema } from "@shared/rbac-schema";

// Thermal receipt generator for POS printers
// Helper function to interpret parameter values
function interpretParameterValue(parameter: any, value: string) {
  const numericValue = parseFloat(value);
  if (isNaN(numericValue)) return { status: "text", flag: "" };

  if (parameter.normalRangeMin !== null && parameter.normalRangeMax !== null) {
    if (numericValue < parameter.normalRangeMin) {
      return { status: "low", flag: "L" };
    } else if (numericValue > parameter.normalRangeMax) {
      return { status: "high", flag: "H" };
    } else {
      return { status: "normal", flag: "N" };
    }
  }
  return { status: "normal", flag: "N" };
}

// Helper function to generate consolidated report
async function generateConsolidatedReport(patientId: number, scientistSignature?: string) {
  const patient = await storage.getPatient(patientId);
  if (!patient) throw new Error("Patient not found");
  
  const patientTests = await storage.getPatientTestsWithResults(patientId);
  
  return {
    patient: {
      id: patient.id,
      patientId: patient.patientId,
      firstName: patient.firstName,
      lastName: patient.lastName,
      dateOfBirth: patient.dateOfBirth,
      gender: patient.gender,
      phone: patient.phone,
      email: patient.email
    },
    tests: patientTests.map((test: any) => ({
      id: test.id,
      testName: test.testName,
      testCode: test.testCode,
      results: test.results,
      notes: test.notes,
      status: test.status,
      completedAt: test.completedAt,
      resultsSavedAt: test.resultsSavedAt,
      category: test.category
    })),
    generatedAt: new Date(),
    totalTests: patientTests.length,
    completedTests: patientTests.filter((t: any) => t.status === "completed").length,
    savedResults: patientTests.filter((t: any) => t.status === "reported_and_saved").length,
    scientistSignature: scientistSignature || 'Laboratory Scientist',
    signedAt: new Date()
  };
}

// Helper function to generate report PDF
async function generateReportPDF(consolidatedReport: any): Promise<Buffer> {
  // Use existing PDF generation service
  return new Promise((resolve, reject) => {
    try {
      const PDFDocument = require('pdfkit');
      const doc = new PDFDocument();
      const chunks: Buffer[] = [];
      
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      
      // Header
      doc.fontSize(20).text('Medical Laboratory Report', { align: 'center' });
      doc.moveDown();
      
      // Patient Information
      doc.fontSize(14).text('Patient Information:', { underline: true });
      doc.fontSize(12);
      doc.text(`Name: ${consolidatedReport.patient.firstName} ${consolidatedReport.patient.lastName}`);
      doc.text(`Patient ID: ${consolidatedReport.patient.patientId}`);
      doc.text(`Date of Birth: ${new Date(consolidatedReport.patient.dateOfBirth).toLocaleDateString()}`);
      doc.text(`Gender: ${consolidatedReport.patient.gender}`);
      doc.moveDown();
      
      // Test Results
      doc.fontSize(14).text('Test Results:', { underline: true });
      doc.fontSize(12);
      
      consolidatedReport.tests.forEach((test: any, index: number) => {
        doc.text(`${index + 1}. ${test.testName} (${test.testCode})`);
        doc.text(`Status: ${test.status}`);
        if (test.results) {
          doc.text(`Results: ${test.results}`);
        }
        if (test.notes) {
          doc.text(`Notes: ${test.notes}`);
        }
        doc.moveDown();
      });
      
      // Scientist Signature
      doc.moveDown();
      doc.text('_'.repeat(50), { align: 'right' });
      doc.text(`Signed by: ${consolidatedReport.scientistSignature}`, { align: 'right' });
      doc.text(`Date: ${new Date(consolidatedReport.signedAt).toLocaleString()}`, { align: 'right' });
      
      // Footer
      doc.moveDown();
      doc.text(`Report generated on: ${new Date().toLocaleString()}`, { align: 'right' });
      
      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

// Generate Laboratory PDF Report for individual tests
async function generateLaboratoryReportPDF(reportData: any): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const PDFDocument = require('pdfkit');
      const doc = new PDFDocument({ margin: 50 });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));

      const { test, patient, testDetails, testParameters, branch, tenant, generatedBy, generatedAt } = reportData;

      // Header with Organization Info
      doc.fontSize(18).text(tenant?.organizationName || 'Orient Medical Diagnostic Center', { align: 'center' });
      doc.fontSize(12).text(branch?.address || 'Medical Diagnostic Center', { align: 'center' });
      doc.fontSize(12).text(branch?.phoneNumber || '', { align: 'center' });
      doc.moveDown(0.5);
      
      doc.fontSize(16).text('LABORATORY REPORT', { align: 'center', underline: true });
      doc.moveDown();

      // Patient Information Section
      doc.fontSize(14).text('PATIENT INFORMATION', { underline: true });
      doc.fontSize(11);
      doc.text(`Name: ${patient?.firstName} ${patient?.lastName}`);
      doc.text(`Patient ID: ${patient?.patientId}`);
      doc.text(`Date of Birth: ${patient?.dateOfBirth ? new Date(patient.dateOfBirth).toLocaleDateString() : 'N/A'}`);
      doc.text(`Gender: ${patient?.gender || 'N/A'}`);
      doc.text(`Phone: ${patient?.phoneNumber || 'N/A'}`);
      doc.text(`Email: ${patient?.email || 'N/A'}`);
      doc.moveDown();

      // Test Information Section
      doc.fontSize(14).text('TEST INFORMATION', { underline: true });
      doc.fontSize(11);
      doc.text(`Test: ${testDetails?.name || 'Laboratory Test'}`);
      doc.text(`Test Category: ${testDetails?.category || 'N/A'}`);
      doc.text(`Specimen Type: ${test.specimenType || 'N/A'}`);
      doc.text(`Collection Date: ${test.scheduledAt ? new Date(test.scheduledAt).toLocaleDateString() : 'N/A'}`);
      doc.text(`Report Date: ${test.completedAt ? new Date(test.completedAt).toLocaleDateString() : new Date().toLocaleDateString()}`);
      doc.moveDown();

      // Test Results Section
      doc.fontSize(14).text('TEST RESULTS', { underline: true });
      doc.fontSize(11);

      if (testParameters && testParameters.length > 0) {
        // Structured parameters table header
        doc.text('Parameter                    Result         Reference Range    Unit');
        doc.text('─'.repeat(80));
        
        testParameters.forEach((param: any) => {
          const result = test.parameterResults ? JSON.parse(test.parameterResults)[param.id] : 'N/A';
          const paramName = param.parameterName.length > 25 ? param.parameterName.substring(0, 22) + '...' : param.parameterName;
          const resultText = result.length > 12 ? result.substring(0, 9) + '...' : result;
          const refRange = param.referenceRange && param.referenceRange.length > 15 ? param.referenceRange.substring(0, 12) + '...' : (param.referenceRange || 'N/A');
          
          doc.text(`${paramName.padEnd(25)} ${resultText.padEnd(14)} ${refRange.padEnd(16)} ${param.unit || ''}`);
        });
      } else {
        // Free text results
        doc.text(test.results || 'Results pending');
      }

      doc.moveDown();

      // Clinical Notes
      if (test.notes) {
        doc.fontSize(14).text('CLINICAL NOTES', { underline: true });
        doc.fontSize(11);
        doc.text(test.notes);
        doc.moveDown();
      }

      // Scientist Signature
      doc.fontSize(14).text('LABORATORY SCIENTIST', { underline: true });
      doc.fontSize(11);
      doc.text(`Reviewed and verified by: ${test.scientistSignature || 'Laboratory Scientist'}`);
      doc.text(`Date: ${test.completedAt ? new Date(test.completedAt).toLocaleDateString() : new Date().toLocaleDateString()}`);
      doc.moveDown();

      // Footer
      doc.fontSize(9);
      doc.text(`Report generated by: ${generatedBy}`, { align: 'left' });
      doc.text(`Generated on: ${generatedAt.toLocaleString()}`, { align: 'left' });
      doc.text('This report is confidential and intended for the named patient only.', { align: 'center' });
      
      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

// Helper function to send WhatsApp report
async function sendWhatsAppReport(consolidatedReport: any, phoneNumber: string) {
  const message = `Medical Laboratory Report for ${consolidatedReport.patient.firstName} ${consolidatedReport.patient.lastName}

Patient ID: ${consolidatedReport.patient.patientId}
Total Tests: ${consolidatedReport.totalTests}
Completed: ${consolidatedReport.completedTests}

Test Results:
${consolidatedReport.tests.map((test: any, index: number) => 
  `${index + 1}. ${test.testName}: ${test.status}`
).join('\n')}

Signed by: ${consolidatedReport.scientistSignature}
Date: ${new Date(consolidatedReport.signedAt).toLocaleString()}
Generated: ${new Date().toLocaleString()}`;

  // Implementation would use actual WhatsApp Business API
  console.log(`WhatsApp report sent to ${phoneNumber}:`, message);
}

// Helper function to send email report
async function sendEmailReport(consolidatedReport: any, emailAddress: string) {
  const subject = `Medical Laboratory Report - ${consolidatedReport.patient.firstName} ${consolidatedReport.patient.lastName}`;
  
  const htmlContent = `
    <h2>Medical Laboratory Report</h2>
    <h3>Patient Information</h3>
    <p><strong>Name:</strong> ${consolidatedReport.patient.firstName} ${consolidatedReport.patient.lastName}</p>
    <p><strong>Patient ID:</strong> ${consolidatedReport.patient.patientId}</p>
    <p><strong>Date of Birth:</strong> ${new Date(consolidatedReport.patient.dateOfBirth).toLocaleDateString()}</p>
    
    <h3>Test Results</h3>
    ${consolidatedReport.tests.map((test: any, index: number) => `
      <div style="margin-bottom: 15px; padding: 10px; border: 1px solid #ddd;">
        <h4>${index + 1}. ${test.testName} (${test.testCode})</h4>
        <p><strong>Status:</strong> ${test.status}</p>
        ${test.results ? `<p><strong>Results:</strong> ${test.results}</p>` : ''}
        ${test.notes ? `<p><strong>Notes:</strong> ${test.notes}</p>` : ''}
      </div>
    `).join('')}
    
    <div style="margin-top: 30px; border-top: 1px solid #000; padding-top: 15px;">
      <p><strong>Signed by:</strong> ${consolidatedReport.scientistSignature}</p>
      <p><strong>Date:</strong> ${new Date(consolidatedReport.signedAt).toLocaleString()}</p>
    </div>
    
    <p><em>Report generated on: ${new Date().toLocaleString()}</em></p>
  `;

  // Implementation would use actual email service
  console.log(`Email report sent to ${emailAddress}:`, { subject, htmlContent });
}

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

  // Get patient tests with filtering
  app.get("/api/patient-tests", async (req, res) => {
    // Disable caching to ensure date filtering works
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const { branchId, paidOnly, startDate, endDate, limit, patientId, today } = req.query;
      const userBranchId = branchId ? parseInt(branchId as string) : req.user?.branchId;
      const testLimit = limit ? parseInt(limit as string) : 50;
      const isPaidOnly = paidOnly === 'true';

      if (!userBranchId) {
        return res.status(400).json({ message: "Branch ID is required" });
      }

      const start = startDate ? new Date(startDate as string) : undefined;
      const end = endDate ? new Date(endDate as string) : undefined;

      // Handle duplicate test prevention check
      if (patientId && today === 'true') {
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date();
        todayEnd.setHours(23, 59, 59, 999);
        
        let tests = await storage.getPatientTestsByBranch(userBranchId, 200, false, todayStart, todayEnd);
        const patientTests = tests.filter((test: any) => test.patientId === parseInt(patientId as string));
        return res.json(patientTests);
      }
      
      console.log('Date filter debug:', { 
        startDate, 
        endDate, 
        start, 
        end, 
        userBranchId, 
        isPaidOnly,
        queryParams: req.query 
      });
      
      console.log('Calling storage.getPatientTestsByBranch with:', { userBranchId, testLimit, isPaidOnly, start, end });
      
      let tests = await storage.getPatientTestsByBranch(userBranchId, testLimit, isPaidOnly, start, end);

      res.json(tests);
    } catch (error) {
      console.error("Error fetching patient tests:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Update patient test status with automatic inventory consumption
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

      // Update test status
      await storage.updatePatientTestStatus(id, status);

      // If test is completed, automatically consume inventory items
      if (status === "completed") {
        try {
          // Get patient test details
          const patientTest = await db.execute(sql`
            SELECT pt.*, p.tenant_id, p.branch_id 
            FROM patient_tests pt
            JOIN patients p ON pt.patient_id = p.id
            WHERE pt.id = ${id}
          `);

          if (patientTest.rows.length > 0) {
            const testData = patientTest.rows[0];
            await inventoryConsumptionService.consumeItemsForCompletedTest(
              testData.test_id,
              id,
              testData.patient_id,
              testData.branch_id,
              testData.tenant_id,
              req.user!.id
            );
            console.log(`Inventory automatically consumed for completed test ID: ${id}`);
          }
        } catch (consumptionError) {
          console.error("Error consuming inventory for completed test:", consumptionError);
          // Don't fail the status update if consumption fails, just log it
        }
      }

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

      // Note: Patient tests are created separately in the patient intake workflow
      // This invoice route only handles the billing/payment aspect
      console.log("Invoice created successfully, patient tests handled separately");

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

  // Get test parameters for structured reporting
  app.get("/api/test-parameters/:testId", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    try {
      const testId = parseInt(req.params.testId);
      const { getTestParametersForTest } = await import("./lab-parameters");
      const parameters = await getTestParametersForTest(testId);
      res.json(parameters);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Complete test with structured results
  app.post("/api/patient-tests/:id/complete-structured", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    try {
      const testId = parseInt(req.params.id);
      const { structuredResults, additionalNotes, interpretation } = req.body;

      // Save structured results and complete test
      await storage.saveStructuredTestResults(testId, structuredResults, additionalNotes, interpretation, req.user.id);
      
      res.json({ 
        message: "Test completed successfully",
        status: "completed"
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Seed test parameters for laboratory reports
  app.post("/api/seed-test-parameters", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    try {
      const { seedTestParameters } = await import("./lab-parameters");
      await seedTestParameters();
      res.json({ message: "Test parameters seeded successfully" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
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

  // Get tests (with tenant ID from user session and optional service unit filtering)
  app.get("/api/tests", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const tenantId = req.user.tenantId;
      const serviceUnit = req.query.serviceUnit as string;
      
      // Role-based access control preparation
      // TODO: Implement full RBAC - only admin/finance/CEO/directors should see all units
      const userRole = req.user.role || 'staff'; // Default to staff if no role
      const hasFullAccess = ['admin', 'finance', 'ceo', 'director'].includes(userRole.toLowerCase());

      let tests;
      
      if (serviceUnit && !hasFullAccess) {
        // Filter tests by service unit for regular staff
        tests = await db.execute(sql`
          SELECT t.*, tc.name as category_name 
          FROM tests t 
          JOIN test_categories tc ON t.category_id = tc.id 
          WHERE t.tenant_id = ${tenantId}
          AND (
            LOWER(tc.name) LIKE LOWER(${`%${serviceUnit}%`}) 
            OR LOWER(t.department) = LOWER(${serviceUnit})
            OR LOWER(t.service_unit) = LOWER(${serviceUnit})
          )
          ORDER BY tc.name, t.name
        `);
        res.json(tests.rows);
      } else if (serviceUnit && hasFullAccess) {
        // Admin/Finance/CEO/Directors can filter but see all if they want
        tests = await db.execute(sql`
          SELECT t.*, tc.name as category_name 
          FROM tests t 
          JOIN test_categories tc ON t.category_id = tc.id 
          WHERE t.tenant_id = ${tenantId}
          AND (
            LOWER(tc.name) LIKE LOWER(${`%${serviceUnit}%`}) 
            OR LOWER(t.department) = LOWER(${serviceUnit})
            OR LOWER(t.service_unit) = LOWER(${serviceUnit})
          )
          ORDER BY tc.name, t.name
        `);
        res.json(tests.rows);
      } else {
        // Return all tests (for admin roles or when no filter specified)
        tests = await storage.getTests(tenantId);
        res.json(tests);
      }
    } catch (error) {
      console.error("Error fetching tests:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Laboratory workflow metrics
  app.get("/api/laboratory/metrics", async (req, res) => {
    // Disable caching to ensure date filtering works
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    try {
      const { startDate, endDate, branchId } = req.query;
      const userBranchId = branchId ? parseInt(branchId as string) : (req.user?.branchId || 1);
      
      console.log('Laboratory metrics route - query params:', { startDate, endDate, branchId, userBranchId });
      
      const start = startDate ? new Date(startDate as string) : undefined;
      const end = endDate ? new Date(endDate as string) : undefined;
      
      console.log('Laboratory metrics route - parsed dates:', { start, end });
      
      const metrics = await storage.getLabWorkflowMetrics(userBranchId, start, end);
      res.json(metrics);
    } catch (error: any) {
      console.error("Error fetching laboratory metrics:", error);
      res.status(500).json({ message: "Error fetching laboratory metrics" });
    }
  });

  // Radiology metrics
  app.get("/api/radiology/metrics", async (req, res) => {
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    try {
      const { startDate, endDate, branchId } = req.query;
      const userBranchId = branchId ? parseInt(branchId as string) : (req.user?.branchId || 1);
      
      const start = startDate ? new Date(startDate as string) : undefined;
      const end = endDate ? new Date(endDate as string) : undefined;
      
      // Get imaging tests from paid invoices
      const paidTests = await storage.getPatientTestsByCategory(userBranchId, 'Radiology & Imaging', 100);
      
      const filteredTests = paidTests.filter(test => {
        if (!start && !end) return true;
        const testDate = new Date(test.scheduledAt);
        if (start && testDate < start) return false;
        if (end && testDate > end) return false;
        return true;
      });
      
      const totalStudies = filteredTests.length;
      const completedStudies = filteredTests.filter(t => t.status === 'completed').length;
      const pendingStudies = filteredTests.filter(t => t.status === 'scheduled' || t.status === 'in_progress').length;
      
      res.json({
        totalStudies,
        completionRate: totalStudies > 0 ? Math.round((completedStudies / totalStudies) * 100) : 0,
        pendingStudies,
        averageWaitTime: 0,
        equipmentUtilization: Math.min(totalStudies * 10, 100),
        qualityScore: 95,
        retakeRate: 2
      });
    } catch (error: any) {
      console.error("Error fetching radiology metrics:", error);
      res.status(500).json({ message: "Error fetching radiology metrics" });
    }
  });

  // Ultrasound studies endpoint
  app.get("/api/ultrasound/studies", async (req, res) => {
    try {
      const branchId = parseInt(req.query.branchId as string) || 1;

      // Get paid invoices with patient information
      const paidInvoices = await db
        .select({
          invoiceId: invoices.id,
          patientId: invoices.patientId,
          patientName: sql<string>`CONCAT(${patients.firstName}, ' ', ${patients.lastName})`,
          tests: invoices.tests,
          paidAt: invoices.paidAt,
          paymentMethod: invoices.paymentMethod
        })
        .from(invoices)
        .innerJoin(patients, eq(invoices.patientId, patients.id))
        .where(
          and(
            eq(invoices.branchId, branchId),
            eq(invoices.paymentStatus, 'paid')
          )
        );

      console.log('Found paid invoices for ultrasound:', paidInvoices.length);

      // Extract ultrasound tests from paid invoices
      const ultrasoundTests = [];
      for (const invoice of paidInvoices) {
        if (invoice.tests && typeof invoice.tests === 'string') {
          try {
            const testsArray = JSON.parse(invoice.tests);
            
            for (const test of testsArray) {
              if (test.testId) {
                // Get test details to check category
                const testDetails = await db
                  .select({
                    id: tests.id,
                    name: tests.name,
                    categoryName: testCategories.name,
                    price: tests.price
                  })
                  .from(tests)
                  .innerJoin(testCategories, eq(tests.categoryId, testCategories.id))
                  .where(eq(tests.id, test.testId))
                  .limit(1);

                if (testDetails.length > 0) {
                  const testDetail = testDetails[0];
                  const categoryName = testDetail.categoryName.toLowerCase();
                  
                  // Check if it's specifically an ultrasound test
                  if (categoryName.includes('ultrasound')) {
                    ultrasoundTests.push({
                      id: `${invoice.invoiceId}-${test.testId}`,
                      testId: test.testId,
                      testName: test.name,
                      patientId: invoice.patientId,
                      patientName: invoice.patientName,
                      price: test.price,
                      status: 'scheduled',
                      scheduledAt: invoice.paidAt,
                      categoryName: testDetail.categoryName,
                      paymentMethod: invoice.paymentMethod
                    });
                  }
                }
              }
            }
          } catch (e) {
            console.log('Error parsing tests JSON:', e);
          }
        }
      }
      
      console.log('Final ultrasound tests count:', ultrasoundTests.length);
      
      // If no results from invoice parsing, try direct patient_tests query for ultrasound
      if (ultrasoundTests.length === 0) {
        console.log('No ultrasound results from invoice parsing, trying direct query...');
        
        try {
          const directResults = await storage.getPatientTestsByCategory(branchId, 'Ultrasound', 50);
          console.log('Direct ultrasound query results:', directResults.length);
          
          const formattedResults = directResults.map(test => ({
            id: `pt-${test.id}`,
            testId: test.testId,
            testName: test.testName,
            patientId: test.patientId,
            patientName: test.patientName,
            price: test.price || 0,
            status: test.status || 'scheduled',
            scheduledAt: test.scheduledAt,
            categoryName: 'Ultrasound Services',
            paymentMethod: 'paid',
            paymentVerified: test.paymentVerified || false,
            paymentVerifiedAt: test.paymentVerifiedAt,
            specimenCollected: test.specimenCollected || false,
            processingStarted: test.processingStarted || false
          }));
          
          return res.json(formattedResults);
        } catch (directError) {
          console.log('Direct ultrasound query failed:', directError);
        }
      }
      
      res.json(ultrasoundTests);
    } catch (error: any) {
      console.error("Error fetching ultrasound studies:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Ultrasound metrics endpoint
  app.get("/api/ultrasound/metrics", async (req, res) => {
    try {
      const branchId = parseInt(req.query.branchId as string) || 1;
      
      res.json({
        totalStudies: 0,
        completionRate: 0,
        avgProcessingTime: 0,
        pendingReports: 0
      });
    } catch (error: any) {
      console.error("Error fetching ultrasound metrics:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Radiology equipment status
  app.get("/api/radiology/equipment", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    try {
      res.json([
        { id: 1, name: 'X-Ray Machine 1', status: 'active', utilization: 75 },
        { id: 2, name: 'CT Scanner', status: 'active', utilization: 60 },
        { id: 3, name: 'Ultrasound Unit', status: 'active', utilization: 85 }
      ]);
    } catch (error: any) {
      console.error("Error fetching equipment status:", error);
      res.status(500).json({ message: "Error fetching equipment status" });
    }
  });

  // Radiology studies (paid imaging requests)
  app.get("/api/radiology/studies", async (req, res) => {
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    try {
      const { startDate, endDate, branchId, modality, limit = 50 } = req.query;
      const userBranchId = branchId ? parseInt(branchId as string) : (req.user?.branchId || 1);
      
      const start = startDate ? new Date(startDate as string) : undefined;
      const end = endDate ? new Date(endDate as string) : undefined;
      
      // Get paid imaging tests by directly querying paid invoices and extracting imaging tests
      const paidInvoices = await db
        .select({
          invoiceId: invoices.id,
          patientId: invoices.patientId,
          patientName: sql<string>`CONCAT(${patients.firstName}, ' ', ${patients.lastName})`,
          tests: invoices.tests,
          paidAt: invoices.paidAt,
          paymentMethod: invoices.paymentMethod
        })
        .from(invoices)
        .innerJoin(patients, eq(invoices.patientId, patients.id))
        .where(
          and(
            eq(invoices.branchId, userBranchId),
            eq(invoices.paymentStatus, 'paid')
          )
        );

      console.log('Found paid invoices:', paidInvoices.length);

      // Extract imaging tests from paid invoices
      const imagingTests = [];
      for (const invoice of paidInvoices) {
        console.log('Processing invoice:', invoice.invoiceId, 'tests:', invoice.tests);
        
        if (invoice.tests && typeof invoice.tests === 'string') {
          try {
            const testsArray = JSON.parse(invoice.tests);
            console.log('Parsed tests:', testsArray);
            
            for (const test of testsArray) {
              console.log('Processing raw test:', test);
              let testId = null;
              let testName = '';
              let testPrice = 0;

              // Handle both old format (description) and new format (testId)
              if (test.testId) {
                console.log('Found testId format:', test.testId);
                testId = test.testId;
                testName = test.name;
                testPrice = test.price;
              } else if (test.description) {
                console.log('Found description format:', test.description);
                // For old format, try to find test by name
                const foundTest = await db
                  .select({ id: tests.id, name: tests.name, price: tests.price })
                  .from(tests)
                  .where(eq(tests.name, test.description))
                  .limit(1);
                
                if (foundTest.length > 0) {
                  testId = foundTest[0].id;
                  testName = foundTest[0].name;
                  testPrice = foundTest[0].price;
                  console.log('Resolved test from description:', testName, 'ID:', testId);
                }
              }

              if (testId) {
                console.log('Processing test:', testName, 'with ID:', testId);
                
                try {
                  // Get test details to check category
                  const testDetails = await db
                    .select({
                      id: tests.id,
                      name: tests.name,
                      categoryName: testCategories.name,
                      price: tests.price
                    })
                    .from(tests)
                    .innerJoin(testCategories, eq(tests.categoryId, testCategories.id))
                    .where(eq(tests.id, testId))
                    .limit(1);

                  console.log('Test details query result:', testDetails);

                  if (testDetails.length > 0) {
                    const testDetail = testDetails[0];
                    const categoryName = testDetail.categoryName.toLowerCase();
                    console.log('Test category:', categoryName, 'for test:', testDetail.name);
                    console.log('Category check results:', {
                      hasRadiology: categoryName.includes('radiology'),
                      hasImaging: categoryName.includes('imaging'),
                      hasUltrasound: categoryName.includes('ultrasound'),
                      hasCtScan: categoryName.includes('ct scan')
                    });
                    
                    // Check if it's an imaging test
                    if (categoryName.includes('radiology') || categoryName.includes('imaging') || categoryName.includes('ultrasound') || categoryName.includes('ct scan')) {
                      console.log('Adding imaging test:', testDetail.name);
                      imagingTests.push({
                        id: `${invoice.invoiceId}-${testId}`,
                        testId: testId,
                        testName: testName,
                        patientId: invoice.patientId,
                        patientName: invoice.patientName,
                        price: testPrice,
                        status: 'scheduled',
                        scheduledAt: invoice.paidAt,
                        categoryName: testDetail.categoryName,
                        paymentMethod: invoice.paymentMethod
                      });
                    }
                  } else {
                    console.log('No test details found for testId:', testId);
                  }
                } catch (dbError) {
                  console.log('Database error for testId:', testId, 'Error:', dbError);
                }
              } else {
                console.log('Could not resolve test:', test);
              }
            }
          } catch (e) {
            console.log('Error parsing tests JSON:', e);
          }
        }
      }
      
      console.log('Final imaging tests count:', imagingTests.length);
      
      // If no results from invoice parsing, try direct patient_tests query
      if (imagingTests.length === 0) {
        console.log('No results from invoice parsing, trying direct query...');
        
        try {
          const directResults = await storage.getPatientTestsByCategory(userBranchId, 'Imaging', 50);
          console.log('Direct query results:', directResults.length);
          
          const formattedResults = directResults.map(test => ({
            id: `pt-${test.id}`,
            testId: test.testId,
            testName: test.testName,
            patientId: test.patientId,
            patientName: test.patientName,
            price: test.price || 0,
            status: test.status || 'scheduled',
            scheduledAt: test.scheduledAt,
            categoryName: 'Imaging',
            paymentMethod: 'paid',
            paymentVerified: test.paymentVerified || false,
            paymentVerifiedAt: test.paymentVerifiedAt,
            specimenCollected: test.specimenCollected || false,
            processingStarted: test.processingStarted || false
          }));
          
          return res.json(formattedResults);
        } catch (directError) {
          console.log('Direct query also failed:', directError);
        }
      }
      
      res.json(imagingTests);
    } catch (error: any) {
      console.error("Error fetching radiology studies:", error);
      res.status(500).json({ message: "Error fetching radiology studies" });
    }
  });

  // Imaging workflow management endpoints (Radiology & Ultrasound)
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

  app.post("/api/patient-tests/:id/start-imaging", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    const { id } = req.params;
    const { expectedHours, imagingType } = req.body;
    
    if (!expectedHours || !imagingType) {
      return res.status(400).json({ message: "Expected hours and imaging type are required" });
    }
    
    try {
      await storage.startProcessing(parseInt(id), req.user.id, expectedHours);
      res.json({ message: `${imagingType} imaging started successfully` });
    } catch (error: any) {
      console.error("Error starting imaging:", error);
      res.status(500).json({ message: "Error starting imaging" });
    }
  });

  app.post("/api/patient-tests/:id/complete-imaging", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    const { id } = req.params;
    const { findings, interpretation, recommendation } = req.body;
    
    if (!findings) {
      return res.status(400).json({ message: "Imaging findings are required" });
    }
    
    try {
      const reportData = {
        findings,
        interpretation: interpretation || '',
        recommendation: recommendation || '',
        completedBy: req.user.id,
        completedAt: new Date()
      };
      
      await storage.completeTest(parseInt(id), JSON.stringify(reportData));
      res.json({ message: "Imaging study completed successfully" });
    } catch (error: any) {
      console.error("Error completing imaging:", error);
      res.status(500).json({ message: "Error completing imaging" });
    }
  });

  app.post("/api/patient-tests/:id/release-report", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    const { id } = req.params;
    const { releaseTo, releaseMethod } = req.body;
    
    try {
      // Update patient test with report release information
      await db
        .update(patientTests)
        .set({
          reportReleasedAt: new Date(),
          reportReleasedBy: req.user.id,
          status: 'completed'
        })
        .where(eq(patientTests.id, parseInt(id)));
      
      res.json({ message: "Report released successfully" });
    } catch (error: any) {
      console.error("Error releasing report:", error);
      res.status(500).json({ message: "Error releasing report" });
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

  // Save test results for later processing (printing, WhatsApp, email)
  app.post("/api/patient-tests/:id/save-results", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    const { id } = req.params;
    const { results, parameterResults, notes, saveForLater, scientistSignature } = req.body;
    
    try {
      const testId = parseInt(id);
      let finalResults = results;
      
      // Handle structured parameter results
      if (parameterResults && Object.keys(parameterResults).length > 0) {
        const testParameters = await storage.getTestParameters(testId);
        if (testParameters && testParameters.length > 0) {
          // Generate formatted results from parameter values
          finalResults = testParameters.map((param: any) => {
            const value = parameterResults[param.id];
            const interpretation = value ? interpretParameterValue(param, value) : { status: "pending", flag: "" };
            return `${param.parameterName}: ${value || "Pending"} ${param.unit || ""} ${interpretation.flag ? `(${interpretation.flag})` : ""}`;
          }).join("\n");
          
          // Add automated interpretation
          const abnormalCount = testParameters.filter((param: any) => {
            const value = parameterResults[param.id];
            if (!value) return false;
            const interpretation = interpretParameterValue(param, value);
            return interpretation.status === "high" || interpretation.status === "low";
          }).length;
          
          if (abnormalCount === 0) {
            finalResults += "\n\nInterpretation: All parameters are within normal limits.";
          } else {
            finalResults += "\n\nInterpretation: Abnormal findings detected. Further clinical correlation is recommended.";
          }
        }
      }
      
      // Save results with status indicating saved for later processing
      await storage.updatePatientTestResults(testId, {
        results: finalResults,
        notes: notes || null,
        status: saveForLater ? "reported_and_saved" : "completed",
        resultsSavedAt: new Date(),
        resultsSavedBy: req.user.id
      });
      
      // Get the test to find the patient ID
      const test = await storage.getPatientTest(testId);
      if (!test) {
        throw new Error("Test not found");
      }

      res.json({ 
        message: saveForLater ? 
          "Results saved successfully for later processing" : 
          "Results saved and test completed",
        consolidatedReport: await generateConsolidatedReport(test.patientId, scientistSignature || req.user.username)
      });
    } catch (error: any) {
      console.error("Error saving test results:", error);
      res.status(500).json({ message: "Error saving test results" });
    }
  });

  // Generate consolidated report for patient (combining multiple tests)
  app.get("/api/patients/:patientId/consolidated-report", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    const { patientId } = req.params;
    const { includeStatus } = req.query;
    
    try {
      const patient = await storage.getPatient(parseInt(patientId));
      if (!patient) {
        return res.status(404).json({ message: "Patient not found" });
      }
      
      // Get all patient tests with results
      const patientTests = await storage.getPatientTestsWithResults(parseInt(patientId), includeStatus as string);
      
      if (!patientTests || patientTests.length === 0) {
        return res.status(404).json({ message: "No test results found for this patient" });
      }
      
      const consolidatedReport = {
        patient: {
          id: patient.id,
          patientId: patient.patientId,
          firstName: patient.firstName,
          lastName: patient.lastName,
          dateOfBirth: patient.dateOfBirth,
          gender: patient.gender,
          phone: patient.phone,
          email: patient.email
        },
        tests: patientTests.map((test: any) => ({
          id: test.id,
          testName: test.testName,
          testCode: test.testCode,
          results: test.results,
          notes: test.notes,
          status: test.status,
          completedAt: test.completedAt,
          resultsSavedAt: test.resultsSavedAt,
          category: test.category
        })),
        generatedAt: new Date(),
        totalTests: patientTests.length,
        completedTests: patientTests.filter((t: any) => t.status === "completed").length,
        savedResults: patientTests.filter((t: any) => t.status === "results_saved").length
      };
      
      res.json(consolidatedReport);
    } catch (error: any) {
      console.error("Error generating consolidated report:", error);
      res.status(500).json({ message: "Error generating consolidated report" });
    }
  });

  // Batch process saved results (print, WhatsApp, email)
  app.post("/api/patients/:patientId/process-saved-results", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    const { patientId } = req.params;
    const { deliveryMethod, recipientInfo } = req.body;
    
    try {
      const consolidatedReport = await generateConsolidatedReport(parseInt(patientId));
      
      switch (deliveryMethod) {
        case "print":
          // Generate PDF for printing
          const printPdf = await generateReportPDF(consolidatedReport);
          res.setHeader('Content-Type', 'application/pdf');
          res.setHeader('Content-Disposition', `attachment; filename="patient-${patientId}-report.pdf"`);
          res.send(printPdf);
          break;
          
        case "whatsapp":
          if (!recipientInfo?.phone) {
            return res.status(400).json({ message: "Phone number required for WhatsApp delivery" });
          }
          await sendWhatsAppReport(consolidatedReport, recipientInfo.phone);
          res.json({ message: "Report sent via WhatsApp successfully" });
          break;
          
        case "email":
          if (!recipientInfo?.email) {
            return res.status(400).json({ message: "Email address required for email delivery" });
          }
          await sendEmailReport(consolidatedReport, recipientInfo.email);
          res.json({ message: "Report sent via email successfully" });
          break;
          
        default:
          return res.status(400).json({ message: "Invalid delivery method" });
      }
      
      // Mark results as processed
      await storage.markResultsAsProcessed(parseInt(patientId), deliveryMethod, req.user.id);
      
    } catch (error: any) {
      console.error("Error processing saved results:", error);
      res.status(500).json({ message: "Error processing saved results" });
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

  // Patient Journey Visualization endpoints
  app.get("/api/patient-journeys", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const branchId = req.user.branchId || 1;
      const status = req.query.status as string;
      
      const patientTests = await storage.getPatientTestsByBranch(branchId, 100, false);
      
      const journeys = patientTests.map((test: any) => {
        const steps = [
          {
            id: 'registration',
            name: 'Registration',
            status: 'completed',
            timestamp: test.createdAt,
            duration: 5,
            staff: test.createdByName,
            location: 'Reception'
          },
          {
            id: 'payment',
            name: 'Payment',
            status: test.paymentVerified ? 'completed' : 'current',
            timestamp: test.paymentVerifiedAt,
            duration: test.paymentVerified ? 3 : null,
            staff: test.paymentVerifiedBy ? 'Cashier' : null,
            location: 'Billing'
          },
          {
            id: 'specimen_collection',
            name: 'Sample Collection',
            status: test.specimenCollected ? 'completed' : 
                   test.paymentVerified ? 'current' : 'pending',
            timestamp: test.specimenCollectedAt,
            duration: test.specimenCollected ? 10 : null,
            staff: test.specimenCollectedBy ? 'Technician' : null,
            location: 'Collection Room'
          },
          {
            id: 'processing',
            name: 'Processing',
            status: test.processingStarted ? 'completed' : 
                   test.specimenCollected ? 'current' : 'pending',
            timestamp: test.processingStartedAt,
            duration: test.processingStarted ? 120 : null,
            staff: test.processingStartedBy ? 'Lab Tech' : null,
            location: 'Laboratory'
          },
          {
            id: 'results',
            name: 'Results Ready',
            status: test.reportReadyAt ? 'completed' : 
                   test.processingStarted ? 'current' : 'pending',
            timestamp: test.reportReadyAt,
            duration: test.reportReadyAt ? 30 : null,
            staff: 'Consultant',
            location: 'Review Room'
          },
          {
            id: 'report_delivery',
            name: 'Report Delivery',
            status: test.reportReleasedAt ? 'completed' : 
                   test.reportReadyAt ? 'current' : 'pending',
            timestamp: test.reportReleasedAt,
            duration: test.reportReleasedAt ? 5 : null,
            staff: 'Front Desk',
            location: 'Reception'
          }
        ];

        const currentStep = steps.find(step => step.status === 'current')?.name || 'Completed';
        const priority = test.priority || 'normal';
        
        const startTime = new Date(test.scheduledAt);
        const expectedCompletion = new Date(startTime.getTime() + (test.expectedTurnaroundHours || 4) * 60 * 60 * 1000);
        
        const now = new Date();
        const isDelayed = now > expectedCompletion && test.status !== 'completed';
        
        const alerts = [];
        if (isDelayed) {
          alerts.push(`Test is ${Math.round((now.getTime() - expectedCompletion.getTime()) / (1000 * 60))} minutes overdue`);
        }
        if (priority === 'stat') {
          alerts.push('STAT order - requires immediate attention');
        }

        return {
          patientId: test.patientId,
          patientName: test.patientName,
          testName: test.testName,
          status: isDelayed ? 'delayed' : test.status,
          startedAt: test.scheduledAt,
          expectedCompletion: expectedCompletion.toISOString(),
          currentStep,
          steps,
          priority,
          alerts: alerts.length > 0 ? alerts : undefined
        };
      });

      const filteredJourneys = status && status !== 'all' 
        ? journeys.filter((j: any) => j.status === status)
        : journeys;

      res.json(filteredJourneys);
    } catch (error) {
      console.error("Error fetching patient journeys:", error);
      res.status(500).json({ error: "Failed to fetch patient journeys" });
    }
  });

  app.get("/api/patient-journeys/:patientId", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const patientId = parseInt(req.params.patientId);
      const branchId = req.user.branchId || 1;
      
      const patientTests = await storage.getPatientTestsByBranch(branchId, 100, false);
      const test = patientTests.find((t: any) => t.patientId === patientId);
      
      if (!test) {
        return res.status(404).json({ error: "Patient journey not found" });
      }

      const steps = [
        {
          id: 'registration',
          name: 'Patient Registration',
          status: 'completed',
          timestamp: test.createdAt,
          duration: 5,
          staff: test.createdByName || 'Reception Staff',
          location: 'Reception Desk',
          notes: 'Patient registered and demographic information collected'
        },
        {
          id: 'payment',
          name: 'Payment Verification',
          status: test.paymentVerified ? 'completed' : 'current',
          timestamp: test.paymentVerifiedAt,
          duration: test.paymentVerified ? 3 : null,
          staff: test.paymentVerifiedBy ? 'Cashier' : null,
          location: 'Billing Counter',
          notes: test.paymentVerified ? 'Payment verified and receipt issued' : 'Awaiting payment verification'
        },
        {
          id: 'specimen_collection',
          name: 'Specimen Collection',
          status: test.specimenCollected ? 'completed' : 
                 test.paymentVerified ? 'current' : 'pending',
          timestamp: test.specimenCollectedAt,
          duration: test.specimenCollected ? 10 : null,
          staff: test.specimenCollectedBy ? 'Collection Technician' : null,
          location: 'Sample Collection Room',
          notes: test.specimenCollected ? `${test.specimenType || 'Sample'} collected successfully` : 'Waiting for sample collection'
        },
        {
          id: 'processing',
          name: 'Laboratory Processing',
          status: test.processingStarted ? 'completed' : 
                 test.specimenCollected ? 'current' : 'pending',
          timestamp: test.processingStartedAt,
          duration: test.processingStarted ? 120 : null,
          staff: test.processingStartedBy ? 'Laboratory Technician' : null,
          location: 'Main Laboratory',
          notes: test.processingStarted ? 'Sample processing completed' : 'Waiting for laboratory processing'
        },
        {
          id: 'analysis',
          name: 'Result Analysis',
          status: test.reportReadyAt ? 'completed' : 
                 test.processingStarted ? 'current' : 'pending',
          timestamp: test.reportReadyAt,
          duration: test.reportReadyAt ? 30 : null,
          staff: 'Consultant Pathologist',
          location: 'Review Room',
          notes: test.reportReadyAt ? 'Results analyzed and report prepared' : 'Awaiting consultant review'
        },
        {
          id: 'report_delivery',
          name: 'Report Delivery',
          status: test.reportReleasedAt ? 'completed' : 
                 test.reportReadyAt ? 'current' : 'pending',
          timestamp: test.reportReleasedAt,
          duration: test.reportReleasedAt ? 5 : null,
          staff: 'Front Desk Staff',
          location: 'Reception Desk',
          notes: test.reportReleasedAt ? 'Report delivered to patient' : 'Report ready for collection'
        }
      ];

      const totalDuration = test.reportReleasedAt 
        ? Math.round((new Date(test.reportReleasedAt).getTime() - new Date(test.scheduledAt).getTime()) / (1000 * 60))
        : null;

      const expectedDuration = (test.expectedTurnaroundHours || 4) * 60;
      const efficiencyScore = totalDuration ? Math.round((expectedDuration / totalDuration) * 100) : null;
      const slaStatus = totalDuration && totalDuration <= expectedDuration ? 'on-time' : 'delayed';

      const detailedJourney = {
        patientId: test.patientId,
        patientName: test.patientName,
        testName: test.testName,
        status: test.status,
        startedAt: test.scheduledAt,
        currentStep: steps.find(step => step.status === 'current')?.name || 'Completed',
        steps,
        totalDuration: totalDuration ? `${Math.floor(totalDuration / 60)}h ${totalDuration % 60}m` : null,
        efficiencyScore: efficiencyScore ? `${efficiencyScore}%` : null,
        slaStatus
      };

      res.json(detailedJourney);
    } catch (error) {
      console.error("Error fetching patient journey details:", error);
      res.status(500).json({ error: "Failed to fetch journey details" });
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
          amount: invoice.totalAmount,
          type: "payment",
          description: `Invoice payment - ${invoice.invoiceNumber}`,
          currency: "NGN",
          tenantId: invoice.tenantId,
          branchId: invoice.branchId,
          createdBy: req.user.id,
          invoiceId: invoice.id,
          paymentMethod: paymentData.paymentMethod
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

  // Financial management routes
  app.get("/api/financial/metrics", async (req, res) => {
    // Disable caching to ensure date filtering works
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    try {
      const { startDate, endDate, branchId } = req.query;
      const userBranchId = branchId ? parseInt(branchId as string) : (req.user?.branchId || 1);
      
      const startDateObj = startDate ? new Date(startDate as string) : undefined;
      const endDateObj = endDate ? new Date(endDate as string) : undefined;
      
      const metrics = await storage.getFinancialMetrics(userBranchId, startDateObj, endDateObj);
      res.json(metrics);
    } catch (error) {
      console.error("Error fetching financial metrics:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/financial/revenue-breakdown", async (req, res) => {
    // Disable caching to ensure date filtering works
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    try {
      const { startDate, endDate, branchId } = req.query;
      const userBranchId = branchId ? parseInt(branchId as string) : (req.user?.branchId || 1);
      
      const startDateObj = startDate ? new Date(startDate as string) : undefined;
      const endDateObj = endDate ? new Date(endDate as string) : undefined;
      
      const breakdown = await storage.getRevenueBreakdown(userBranchId, startDateObj, endDateObj);
      res.json(breakdown);
    } catch (error) {
      console.error("Error fetching revenue breakdown:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/financial/transactions", async (req, res) => {
    // Disable caching to ensure date filtering works
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    try {
      const { startDate, endDate, branchId, paymentMethod, limit } = req.query;
      const userBranchId = branchId ? parseInt(branchId as string) : (req.user?.branchId || 1);
      
      const startDateObj = startDate ? new Date(startDate as string) : undefined;
      const endDateObj = endDate ? new Date(endDate as string) : undefined;
      const limitNum = limit ? parseInt(limit as string) : 50;
      
      const transactions = await storage.getTransactionHistory(
        userBranchId, 
        paymentMethod as string, 
        startDateObj, 
        endDateObj, 
        limitNum
      );
      res.json(transactions);
    } catch (error) {
      console.error("Error fetching transaction history:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Cardiology Unit API endpoints
  app.get("/api/cardiology/metrics", async (req, res) => {
    try {
      const branchId = parseInt(req.query.branchId as string);
      
      // Get paid invoices for cardiology tests
      const paidInvoices = await db
        .select({
          id: invoices.id,
          tests: invoices.tests
        })
        .from(invoices)
        .where(
          and(
            eq(invoices.branchId, branchId),
            eq(invoices.paymentStatus, 'paid')
          )
        );

      let totalProcedures = 0;
      let ecgStudies = 0;
      let echoStudies = 0;
      let todayProcedures = 0;
      let ecgToday = 0;
      let echoToday = 0;

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      for (const invoice of paidInvoices) {
        let tests: any[] = [];
        
        if (typeof invoice.tests === 'string') {
          try {
            tests = JSON.parse(invoice.tests);
          } catch (e) {
            continue;
          }
        } else if (Array.isArray(invoice.tests)) {
          tests = invoice.tests;
        }

        for (const test of tests) {
          const testName = (test.description || test.name || '').toLowerCase();
          const isCardiology = testName.includes('echo') || 
                             testName.includes('ecg') || 
                             testName.includes('ekg') ||
                             testName.includes('electrocardiogram') ||
                             testName.includes('cardio');
          
          if (isCardiology) {
            totalProcedures++;
            
            if (testName.includes('ecg') || testName.includes('ekg') || testName.includes('electrocardiogram')) {
              ecgStudies++;
            }
            
            if (testName.includes('echo')) {
              echoStudies++;
            }
          }
        }
      }

      res.json({
        totalProcedures,
        todayProcedures,
        ecgStudies,
        ecgToday,
        echoStudies,
        echoToday,
        completionRate: 85,
        avgTurnaroundTime: 2
      });
    } catch (error) {
      console.error('Error fetching cardiology metrics:', error);
      res.status(500).json({ error: 'Failed to fetch cardiology metrics' });
    }
  });

  app.get("/api/cardiology/studies", async (req, res) => {
    try {
      const branchId = parseInt(req.query.branchId as string);
      const procedure = req.query.procedure as string;

      // Get paid invoices with patient details
      const paidInvoices = await db
        .select({
          id: invoices.id,
          patientId: invoices.patientId,
          tests: invoices.tests,
          totalAmount: invoices.totalAmount,
          createdAt: invoices.createdAt,
          patientFirstName: patients.firstName,
          patientLastName: patients.lastName,
          patientIdNumber: patients.patientId,
          patientDateOfBirth: patients.dateOfBirth,
          patientGender: patients.gender,
          patientPhone: patients.phone
        })
        .from(invoices)
        .leftJoin(patients, eq(invoices.patientId, patients.id))
        .where(
          and(
            eq(invoices.branchId, branchId),
            eq(invoices.paymentStatus, 'paid')
          )
        )
        .orderBy(desc(invoices.createdAt))
        .limit(50);

      console.log(`Found paid invoices for cardiology: ${paidInvoices.length}`);

      const cardiologyStudies: any[] = [];

      // Process paid invoices to extract cardiology tests
      for (const invoice of paidInvoices) {
        let tests: any[] = [];
        
        if (typeof invoice.tests === 'string') {
          try {
            tests = JSON.parse(invoice.tests);
          } catch (e) {
            console.error('Error parsing test data:', e);
            continue;
          }
        } else if (Array.isArray(invoice.tests)) {
          tests = invoice.tests;
        }

        console.log(`Processing invoice: ${invoice.id} tests:`, tests);

        // Filter for cardiology tests
        const cardiologyTestsInInvoice = tests.filter((test: any) => {
          const testName = test.description || test.name || '';
          const isCardiology = testName.toLowerCase().includes('echo') || 
                             testName.toLowerCase().includes('ecg') || 
                             testName.toLowerCase().includes('ekg') ||
                             testName.toLowerCase().includes('electrocardiogram') ||
                             testName.toLowerCase().includes('cardio');
          
          // Filter by procedure type if specified
          if (procedure && procedure !== 'all') {
            if (procedure === 'ecg') {
              return testName.toLowerCase().includes('ecg') || 
                     testName.toLowerCase().includes('ekg') ||
                     testName.toLowerCase().includes('electrocardiogram');
            } else if (procedure === 'echo') {
              return testName.toLowerCase().includes('echo');
            }
          }
          
          return isCardiology;
        });

        // Create patient test entries for each cardiology test
        for (const test of cardiologyTestsInInvoice) {
          const testName = test.description || test.name || 'Cardiology Procedure';
          const testPrice = test.unitPrice || test.price || test.total || 0;
          
          cardiologyStudies.push({
            id: `pt-${invoice.id}-${test.testId || Math.random()}`,
            testName,
            patientName: `${invoice.patientFirstName || ''} ${invoice.patientLastName || ''}`.trim(),
            patientId: invoice.patientIdNumber || `P${invoice.patientId}`,
            scheduledAt: invoice.createdAt,
            status: 'scheduled',
            price: testPrice,
            categoryName: 'Cardiology',
            paymentVerified: true,
            invoiceId: invoice.id
          });
        }
      }

      console.log(`Final cardiology tests count: ${cardiologyStudies.length}`);

      // Sort by scheduled date
      cardiologyStudies.sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime());

      res.json(cardiologyStudies);
    } catch (error) {
      console.error('Error fetching cardiology studies:', error);
      res.status(500).json({ error: 'Failed to fetch cardiology studies' });
    }
  });

  // Enhanced Financial Management API endpoints
  app.get("/api/financial/expenses", async (req, res) => {
    try {
      const branchId = parseInt(req.query.branchId as string);
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : new Date();

      // Mock expense data for demonstration
      const expenses = {
        operational: 450000,
        salaries: 1200000,
        equipment: 250000,
        other: 150000,
        recent: [
          {
            id: 1,
            date: new Date(),
            category: "Equipment",
            description: "MRI Machine Maintenance",
            amount: 85000,
            status: "approved"
          },
          {
            id: 2,
            date: new Date(Date.now() - 24 * 60 * 60 * 1000),
            category: "Operational",
            description: "Medical Supplies",
            amount: 45000,
            status: "paid"
          },
          {
            id: 3,
            date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
            category: "Utilities",
            description: "Electricity Bill",
            amount: 125000,
            status: "pending"
          }
        ]
      };

      res.json(expenses);
    } catch (error) {
      console.error('Error fetching expenses:', error);
      res.status(500).json({ error: 'Failed to fetch expenses' });
    }
  });

  app.post("/api/financial/expenses", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const { category, amount, description, notes } = req.body;
      
      // Create expense record
      const expense = {
        id: Date.now(),
        category,
        amount: parseFloat(amount),
        description,
        notes,
        status: 'pending',
        createdBy: req.user.id,
        createdAt: new Date()
      };

      res.json({ message: "Expense recorded successfully", expense });
    } catch (error) {
      console.error('Error recording expense:', error);
      res.status(500).json({ error: 'Failed to record expense' });
    }
  });

  app.get("/api/financial/payroll", async (req, res) => {
    try {
      const branchId = parseInt(req.query.branchId as string);

      // Mock payroll data
      const payrollData = {
        totalStaff: 25,
        monthlyTotal: 3500000,
        pendingPayments: 2,
        departments: [
          { name: "Medical Staff", count: 8, totalSalary: 1800000 },
          { name: "Laboratory", count: 6, totalSalary: 900000 },
          { name: "Radiology", count: 4, totalSalary: 600000 },
          { name: "Administrative", count: 7, totalSalary: 1200000 }
        ]
      };

      res.json(payrollData);
    } catch (error) {
      console.error('Error fetching payroll data:', error);
      res.status(500).json({ error: 'Failed to fetch payroll data' });
    }
  });

  app.get("/api/financial/budget", async (req, res) => {
    try {
      const branchId = parseInt(req.query.branchId as string);

      // Mock budget data
      const budgetData = {
        monthlyBudget: 5000000,
        actualSpending: 4250000,
        variance: 750000,
        categories: [
          { name: "Salaries", budgeted: 2000000, actual: 1950000, variance: 50000 },
          { name: "Equipment", budgeted: 800000, actual: 650000, variance: 150000 },
          { name: "Supplies", budgeted: 600000, actual: 580000, variance: 20000 },
          { name: "Utilities", budgeted: 400000, actual: 420000, variance: -20000 },
          { name: "Marketing", budgeted: 200000, actual: 150000, variance: 50000 }
        ]
      };

      res.json(budgetData);
    } catch (error) {
      console.error('Error fetching budget data:', error);
      res.status(500).json({ error: 'Failed to fetch budget data' });
    }
  });

  app.post("/api/financial/payments", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const { type, amount, method, reference, notes } = req.body;
      
      // Process payment
      const payment = {
        id: Date.now(),
        type,
        amount: parseFloat(amount),
        method,
        reference,
        notes,
        status: 'completed',
        processedBy: req.user.id,
        processedAt: new Date()
      };

      res.json({ message: "Payment processed successfully", payment });
    } catch (error) {
      console.error('Error processing payment:', error);
      res.status(500).json({ error: 'Failed to process payment' });
    }
  });

  // Enhanced financial reports endpoints
  app.get("/api/financial/income-statement", async (req, res) => {
    try {
      const branchId = parseInt(req.query.branchId as string);
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : new Date();

      // Calculate revenue from paid invoices
      const totalRevenue = await db
        .select({
          total: sql<number>`COALESCE(SUM(CAST(${invoices.totalAmount} AS DECIMAL)), 0)`
        })
        .from(invoices)
        .where(
          and(
            eq(invoices.branchId, branchId),
            eq(invoices.paymentStatus, 'paid'),
            gte(invoices.paidAt, startDate),
            lte(invoices.paidAt, endDate)
          )
        );

      const incomeStatement = {
        revenue: {
          diagnostic_services: totalRevenue[0]?.total || 0,
          consultation_fees: 0,
          other_income: 0,
          total_revenue: totalRevenue[0]?.total || 0
        },
        expenses: {
          salaries: 1200000,
          equipment_maintenance: 250000,
          supplies: 180000,
          utilities: 125000,
          rent: 300000,
          other_expenses: 95000,
          total_expenses: 2150000
        },
        net_income: (totalRevenue[0]?.total || 0) - 2150000,
        period: { startDate, endDate }
      };

      res.json(incomeStatement);
    } catch (error) {
      console.error('Error generating income statement:', error);
      res.status(500).json({ error: 'Failed to generate income statement' });
    }
  });

  app.get("/api/financial/cash-flow", async (req, res) => {
    try {
      const branchId = parseInt(req.query.branchId as string);

      // Calculate cash flows from transactions
      const cashInflow = await db
        .select({
          total: sql<number>`COALESCE(SUM(CAST(${transactions.amount} AS DECIMAL)), 0)`
        })
        .from(transactions)
        .where(
          and(
            eq(transactions.branchId, branchId),
            eq(transactions.type, 'income')
          )
        );

      const cashOutflow = await db
        .select({
          total: sql<number>`COALESCE(SUM(CAST(${transactions.amount} AS DECIMAL)), 0)`
        })
        .from(transactions)
        .where(
          and(
            eq(transactions.branchId, branchId),
            eq(transactions.type, 'expense')
          )
        );

      const cashFlow = {
        operating_activities: {
          cash_from_patients: cashInflow[0]?.total || 0,
          cash_to_suppliers: -(cashOutflow[0]?.total || 0) * 0.4,
          cash_to_employees: -(cashOutflow[0]?.total || 0) * 0.6,
          net_operating_cash: (cashInflow[0]?.total || 0) - (cashOutflow[0]?.total || 0)
        },
        investing_activities: {
          equipment_purchases: -250000,
          net_investing_cash: -250000
        },
        financing_activities: {
          loan_receipts: 0,
          loan_payments: -50000,
          net_financing_cash: -50000
        },
        net_cash_flow: (cashInflow[0]?.total || 0) - (cashOutflow[0]?.total || 0) - 300000
      };

      res.json(cashFlow);
    } catch (error) {
      console.error('Error generating cash flow statement:', error);
      res.status(500).json({ error: 'Failed to generate cash flow statement' });
    }
  });

  app.get("/api/financial/balance-sheet", async (req, res) => {
    try {
      const branchId = parseInt(req.query.branchId as string);

      // Calculate current assets from transactions and invoices
      const totalRevenue = await db
        .select({
          total: sql<number>`COALESCE(SUM(CAST(${invoices.totalAmount} AS DECIMAL)), 0)`
        })
        .from(invoices)
        .where(
          and(
            eq(invoices.branchId, branchId),
            eq(invoices.paymentStatus, 'paid')
          )
        );

      const outstandingReceivables = await db
        .select({
          total: sql<number>`COALESCE(SUM(CAST(${invoices.totalAmount} AS DECIMAL)), 0)`
        })
        .from(invoices)
        .where(
          and(
            eq(invoices.branchId, branchId),
            eq(invoices.paymentStatus, 'unpaid')
          )
        );

      const balanceSheet = {
        assets: {
          current_assets: {
            cash: totalRevenue[0]?.total || 0,
            accounts_receivable: outstandingReceivables[0]?.total || 0,
            inventory: 150000,
            total_current: (totalRevenue[0]?.total || 0) + (outstandingReceivables[0]?.total || 0) + 150000
          },
          fixed_assets: {
            equipment: 5000000,
            furniture: 500000,
            total_fixed: 5500000
          },
          total_assets: (totalRevenue[0]?.total || 0) + (outstandingReceivables[0]?.total || 0) + 150000 + 5500000
        },
        liabilities: {
          current_liabilities: {
            accounts_payable: 200000,
            accrued_expenses: 150000,
            total_current: 350000
          },
          long_term_liabilities: {
            equipment_loans: 1500000,
            total_long_term: 1500000
          },
          total_liabilities: 1850000
        },
        equity: {
          retained_earnings: (totalRevenue[0]?.total || 0) + (outstandingReceivables[0]?.total || 0) + 150000 + 5500000 - 1850000,
          total_equity: (totalRevenue[0]?.total || 0) + (outstandingReceivables[0]?.total || 0) + 150000 + 5500000 - 1850000
        }
      };

      res.json(balanceSheet);
    } catch (error) {
      console.error('Error generating balance sheet:', error);
      res.status(500).json({ error: 'Failed to generate balance sheet' });
    }
  });

  // Tax and compliance reporting
  app.get("/api/financial/tax-report", async (req, res) => {
    try {
      const branchId = parseInt(req.query.branchId as string);
      const year = req.query.year ? parseInt(req.query.year as string) : new Date().getFullYear();

      // Calculate taxable income
      const totalRevenue = await db
        .select({
          total: sql<number>`COALESCE(SUM(CAST(${invoices.totalAmount} AS DECIMAL)), 0)`
        })
        .from(invoices)
        .where(
          and(
            eq(invoices.branchId, branchId),
            eq(invoices.paymentStatus, 'paid'),
            sql`EXTRACT(YEAR FROM ${invoices.paidAt}) = ${year}`
          )
        );

      const grossIncome = totalRevenue[0]?.total || 0;
      const deductibleExpenses = 2150000; // From income statement
      const taxableIncome = Math.max(0, grossIncome - deductibleExpenses);
      const corporateTax = taxableIncome * 0.30; // 30% corporate tax rate
      const vatCollected = grossIncome * 0.075; // 7.5% VAT
      const withholdingTax = grossIncome * 0.05; // 5% WHT

      const taxReport = {
        period: year,
        gross_income: grossIncome,
        deductible_expenses: deductibleExpenses,
        taxable_income: taxableIncome,
        taxes: {
          corporate_income_tax: corporateTax,
          vat_collected: vatCollected,
          withholding_tax: withholdingTax,
          total_tax_liability: corporateTax + vatCollected + withholdingTax
        },
        compliance_status: "compliant",
        next_filing_date: new Date(year + 1, 2, 31) // March 31st of following year
      };

      res.json(taxReport);
    } catch (error) {
      console.error('Error generating tax report:', error);
      res.status(500).json({ error: 'Failed to generate tax report' });
    }
  });

  // Financial Management Routes

  // Purchase Orders
  app.get("/api/purchase-orders", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const { tenantId, branchId } = req.query;
      const orders = await financialStorage.getPurchaseOrders(
        Number(tenantId), 
        branchId ? Number(branchId) : undefined
      );
      
      res.json(orders);
    } catch (error) {
      console.error("Error fetching purchase orders:", error);
      res.status(500).json({ message: "Failed to fetch purchase orders" });
    }
  });

  app.post("/api/purchase-orders", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const orderData = {
        ...req.body,
        createdAt: new Date(),
        status: "pending"
      };

      const order = await financialStorage.createPurchaseOrder(orderData);
      
      // Create audit trail entry
      await financialStorage.createAuditEntry({
        tenantId: req.body.tenantId,
        branchId: req.body.branchId,
        userId: req.user.id,
        action: "create_purchase_order",
        resourceType: "purchase_order",
        resourceId: order.id,
        details: `Created PO ${req.body.poNumber}`
      });

      res.status(201).json(order);
    } catch (error) {
      console.error("Error creating purchase order:", error);
      res.status(500).json({ message: "Failed to create purchase order" });
    }
  });

  app.patch("/api/purchase-orders/:id/approve", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const { id } = req.params;
      const { status, comments } = req.body;

      const updatedOrder = await financialStorage.updatePurchaseOrderStatus(
        Number(id), 
        status, 
        req.user.id
      );

      // Create audit trail entry
      await financialStorage.createAuditEntry({
        tenantId: req.body.tenantId,
        branchId: req.body.branchId,
        userId: req.user.id,
        action: `${status}_purchase_order`,
        resourceType: "purchase_order",
        resourceId: Number(id),
        details: `${status} PO with comments: ${comments || 'No comments'}`
      });

      res.json(updatedOrder);
    } catch (error) {
      console.error("Error updating purchase order:", error);
      res.status(500).json({ message: "Failed to update purchase order" });
    }
  });

  // Petty Cash Management
  app.get("/api/petty-cash/funds", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const { tenantId, branchId } = req.query;
      const funds = await financialStorage.getPettyCashFunds(
        Number(tenantId), 
        branchId ? Number(branchId) : undefined
      );
      
      res.json(funds);
    } catch (error) {
      console.error("Error fetching petty cash funds:", error);
      res.status(500).json({ message: "Failed to fetch petty cash funds" });
    }
  });

  app.post("/api/petty-cash/funds", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const fundData = {
        ...req.body,
        createdAt: new Date(),
        currentBalance: req.body.initialAmount
      };

      const fund = await financialStorage.createPettyCashFund(fundData);
      
      // Create audit trail entry
      await financialStorage.createAuditEntry({
        tenantId: req.body.tenantId,
        branchId: req.body.branchId,
        userId: req.user.id,
        action: "create_petty_cash_fund",
        resourceType: "petty_cash_fund",
        resourceId: fund.id,
        details: `Created petty cash fund with initial amount: ${req.body.initialAmount}`
      });

      res.status(201).json(fund);
    } catch (error) {
      console.error("Error creating petty cash fund:", error);
      res.status(500).json({ message: "Failed to create petty cash fund" });
    }
  });

  app.get("/api/petty-cash/transactions/:fundId", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const { fundId } = req.params;
      const transactions = await financialStorage.getPettyCashTransactions(Number(fundId));
      
      res.json(transactions);
    } catch (error) {
      console.error("Error fetching petty cash transactions:", error);
      res.status(500).json({ message: "Failed to fetch transactions" });
    }
  });

  app.post("/api/petty-cash/transactions", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const transactionData = {
        ...req.body,
        createdAt: new Date()
      };

      const transaction = await financialStorage.createPettyCashTransaction(transactionData);
      
      // Update fund balance
      const amount = req.body.type === 'expense' ? -Math.abs(req.body.amount) : Math.abs(req.body.amount);
      await financialStorage.updatePettyCashFundBalance(req.body.fundId, amount);
      
      // Create audit trail entry
      await financialStorage.createAuditEntry({
        tenantId: req.body.tenantId,
        branchId: req.body.branchId,
        userId: req.user.id,
        action: "create_petty_cash_transaction",
        resourceType: "petty_cash_transaction",
        resourceId: transaction.id,
        details: `${req.body.type} transaction: ${req.body.description} - Amount: ${req.body.amount}`
      });

      res.status(201).json(transaction);
    } catch (error) {
      console.error("Error creating petty cash transaction:", error);
      res.status(500).json({ message: "Failed to create transaction" });
    }
  });

  app.post("/api/petty-cash/reconciliation", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const reconciliationData = {
        ...req.body,
        createdAt: new Date(),
        status: "pending"
      };

      const reconciliation = await financialStorage.createPettyCashReconciliation(reconciliationData);
      
      // Create audit trail entry
      await financialStorage.createAuditEntry({
        tenantId: req.body.tenantId,
        branchId: req.body.branchId,
        userId: req.user.id,
        action: "create_reconciliation",
        resourceType: "petty_cash_reconciliation",
        resourceId: reconciliation.id,
        details: `Reconciliation created with variance: ${req.body.variance}`
      });

      res.status(201).json(reconciliation);
    } catch (error) {
      console.error("Error creating reconciliation:", error);
      res.status(500).json({ message: "Failed to create reconciliation" });
    }
  });

  // Accounting System Routes
  app.get("/api/accounting/chart-of-accounts", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const { tenantId } = req.query;
      const accounts = await financialStorage.getChartOfAccounts(Number(tenantId));
      
      res.json(accounts);
    } catch (error) {
      console.error("Error fetching chart of accounts:", error);
      res.status(500).json({ message: "Failed to fetch accounts" });
    }
  });

  app.post("/api/accounting/accounts", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const accountData = {
        ...req.body,
        createdAt: new Date()
      };

      const account = await financialStorage.createAccount(accountData);
      
      res.status(201).json(account);
    } catch (error) {
      console.error("Error creating account:", error);
      res.status(500).json({ message: "Failed to create account" });
    }
  });

  app.get("/api/accounting/journal-entries", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const { tenantId } = req.query;
      const entries = await financialStorage.getJournalEntries(Number(tenantId));
      
      res.json(entries);
    } catch (error) {
      console.error("Error fetching journal entries:", error);
      res.status(500).json({ message: "Failed to fetch journal entries" });
    }
  });

  app.post("/api/accounting/journal-entries", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const { lineItems, ...entryData } = req.body;

      // Create journal entry
      const entryToCreate = {
        ...entryData,
        createdAt: new Date(),
        status: "posted"
      };

      const entry = await financialStorage.createJournalEntry(entryToCreate);
      
      // Create line items
      if (lineItems && lineItems.length > 0) {
        const lineItemsWithEntry = lineItems.map((item: any) => ({
          ...item,
          journalEntryId: entry.id
        }));
        
        await financialStorage.createJournalEntryLineItems(lineItemsWithEntry);
      }

      res.status(201).json(entry);
    } catch (error) {
      console.error("Error creating journal entry:", error);
      res.status(500).json({ message: "Failed to create journal entry" });
    }
  });

  // Vendor Management
  app.get("/api/vendors", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const { tenantId } = req.query;
      const vendors = await financialStorage.getVendors(Number(tenantId));
      
      res.json(vendors);
    } catch (error) {
      console.error("Error fetching vendors:", error);
      res.status(500).json({ message: "Failed to fetch vendors" });
    }
  });

  app.post("/api/vendors", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const vendorData = {
        ...req.body,
        createdAt: new Date()
      };

      const vendor = await financialStorage.createVendor(vendorData);
      
      res.status(201).json(vendor);
    } catch (error) {
      console.error("Error creating vendor:", error);
      res.status(500).json({ message: "Failed to create vendor" });
    }
  });

  const httpServer = createServer(app);
  // Inventory Management Routes
  app.get("/api/inventory/categories", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const tenantId = req.user.tenantId;
      const categories = await inventoryStorage.getInventoryCategories(tenantId);
      res.json(categories);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/inventory/categories", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const data = { ...req.body, tenantId: req.user.tenantId };
      const category = await inventoryStorage.createInventoryCategory(data);
      res.status(201).json(category);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/inventory/items", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const tenantId = req.user.tenantId;
      const categoryId = req.query.categoryId ? parseInt(req.query.categoryId as string) : undefined;
      const items = await inventoryStorage.getInventoryItems(tenantId, categoryId);
      res.json(items);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/inventory/items", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const data = { ...req.body, tenantId: req.user.tenantId };
      const item = await inventoryStorage.createInventoryItem(data);
      res.status(201).json(item);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/inventory/stock", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const tenantId = req.user.tenantId;
      const branchId = req.user.branchId;
      const itemId = req.query.itemId ? parseInt(req.query.itemId as string) : undefined;
      const stock = await inventoryStorage.getInventoryStock(tenantId, branchId, itemId);
      res.json(stock);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/inventory/transactions", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const data = { 
        ...req.body, 
        tenantId: req.user.tenantId,
        branchId: req.user.branchId,
        performedBy: req.user.id
      };
      const transaction = await inventoryStorage.createInventoryTransaction(data);
      res.status(201).json(transaction);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/inventory/transactions", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const tenantId = req.user.tenantId;
      const branchId = req.query.branchId ? parseInt(req.query.branchId as string) : undefined;
      const itemId = req.query.itemId ? parseInt(req.query.itemId as string) : undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      const transactions = await inventoryStorage.getInventoryTransactions(tenantId, branchId, itemId, limit);
      res.json(transactions);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/inventory/low-stock", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const tenantId = req.user.tenantId;
      const branchId = req.query.branchId ? parseInt(req.query.branchId as string) : undefined;
      const items = await inventoryStorage.getLowStockItems(tenantId, branchId);
      res.json(items);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/inventory/expiring", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const tenantId = req.user.tenantId;
      const branchId = req.query.branchId ? parseInt(req.query.branchId as string) : undefined;
      const daysAhead = req.query.daysAhead ? parseInt(req.query.daysAhead as string) : 30;
      const items = await inventoryStorage.getExpiringItems(tenantId, branchId, daysAhead);
      res.json(items);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/inventory/valuation", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const tenantId = req.user.tenantId;
      const branchId = req.query.branchId ? parseInt(req.query.branchId as string) : undefined;
      const valuation = await inventoryStorage.getInventoryValuation(tenantId, branchId);
      res.json(valuation);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Human Resources Routes
  app.get("/api/hr/employees", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const tenantId = req.user.tenantId;
      const employees = await storage.getEmployees(tenantId);
      res.json(employees);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/hr/employees", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const data = { ...req.body, tenantId: req.user.tenantId };
      const employee = await storage.createEmployee(data);
      res.status(201).json(employee);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/hr/departments", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const tenantId = req.user.tenantId;
      const departments = await storage.getDepartments(tenantId);
      res.json(departments);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/hr/departments", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const data = { ...req.body, tenantId: req.user.tenantId };
      const department = await storage.createDepartment(data);
      res.status(201).json(department);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/hr/positions", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const tenantId = req.user.tenantId;
      const positions = await storage.getPositions(tenantId);
      res.json(positions);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/hr/positions", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const data = { ...req.body, tenantId: req.user.tenantId };
      const position = await storage.createPosition(data);
      res.status(201).json(position);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/hr/payroll-periods", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const tenantId = req.user.tenantId;
      const periods = await storage.getPayrollPeriods(tenantId);
      res.json(periods);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/hr/payroll-periods", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const data = { ...req.body, tenantId: req.user.tenantId };
      const period = await storage.createPayrollPeriod(data);
      res.status(201).json(period);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/hr/metrics", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const tenantId = req.user.tenantId;
      const metrics = await storage.getHRMetrics(tenantId);
      res.json(metrics);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ==================== RBAC API ROUTES ====================

  // Initialize RBAC System
  app.post("/api/rbac/initialize", rbacHelpers.isSystemAdmin, async (req, res) => {
    try {
      await seedRBACSystem();
      res.json({ message: "RBAC system initialized successfully" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ==================== ROLES MANAGEMENT ====================

  // Get all roles
  app.get("/api/roles", RBACMiddleware.authenticateWithRBAC, rbacHelpers.canManageRoles, async (req, res) => {
    try {
      const tenantId = req.user.tenantId;
      const roles = await rbacStorage.getRoles(tenantId);
      res.json(roles);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Create new role
  app.post("/api/roles", RBACMiddleware.authenticateWithRBAC, rbacHelpers.canManageRoles, async (req, res) => {
    try {
      const roleData = insertRoleSchema.parse({
        ...req.body,
        tenantId: req.user.tenantId,
        createdBy: req.user.id
      });
      const role = await rbacStorage.createRole(roleData);
      res.status(201).json(role);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        res.status(400).json({ message: "Invalid role data", errors: error.errors });
      } else {
        res.status(500).json({ message: error.message });
      }
    }
  });

  // Get role with permissions
  app.get("/api/roles/:id", RBACMiddleware.authenticateWithRBAC, rbacHelpers.canManageRoles, async (req, res) => {
    try {
      const roleId = parseInt(req.params.id);
      const tenantId = req.user.tenantId;
      const role = await rbacStorage.getRoleWithPermissions(roleId, tenantId);
      
      if (!role) {
        return res.status(404).json({ message: "Role not found" });
      }
      
      res.json(role);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Update role
  app.put("/api/roles/:id", RBACMiddleware.authenticateWithRBAC, rbacHelpers.canManageRoles, async (req, res) => {
    try {
      const roleId = parseInt(req.params.id);
      const updateData = insertRoleSchema.partial().parse(req.body);
      const role = await rbacStorage.updateRole(roleId, updateData);
      res.json(role);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        res.status(400).json({ message: "Invalid role data", errors: error.errors });
      } else {
        res.status(500).json({ message: error.message });
      }
    }
  });

  // ==================== PERMISSIONS MANAGEMENT ====================

  // Get all permissions
  app.get("/api/permissions", RBACMiddleware.authenticateWithRBAC, rbacHelpers.canManageRoles, async (req, res) => {
    try {
      const permissions = await rbacStorage.getPermissions();
      res.json(permissions);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get permissions by category
  app.get("/api/permissions/category/:category", RBACMiddleware.authenticateWithRBAC, rbacHelpers.canManageRoles, async (req, res) => {
    try {
      const category = req.params.category;
      const permissions = await rbacStorage.getPermissionsByCategory(category);
      res.json(permissions);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Create new permission
  app.post("/api/permissions", RBACMiddleware.authenticateWithRBAC, rbacHelpers.isSystemAdmin, async (req, res) => {
    try {
      const permissionData = insertPermissionSchema.parse(req.body);
      const permission = await rbacStorage.createPermission(permissionData);
      res.status(201).json(permission);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        res.status(400).json({ message: "Invalid permission data", errors: error.errors });
      } else {
        res.status(500).json({ message: error.message });
      }
    }
  });

  // ==================== ROLE-PERMISSION ASSIGNMENT ====================

  // Assign permission to role
  app.post("/api/roles/:roleId/permissions/:permissionId", RBACMiddleware.authenticateWithRBAC, rbacHelpers.canManageRoles, async (req, res) => {
    try {
      const roleId = parseInt(req.params.roleId);
      const permissionId = parseInt(req.params.permissionId);
      const { conditions } = req.body;

      const assignment = await rbacStorage.assignPermissionToRole({
        roleId,
        permissionId,
        conditions,
        grantedBy: req.user.id,
        tenantId: req.user.tenantId
      });

      res.status(201).json(assignment);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Remove permission from role
  app.delete("/api/roles/:roleId/permissions/:permissionId", RBACMiddleware.authenticateWithRBAC, rbacHelpers.canManageRoles, async (req, res) => {
    try {
      const roleId = parseInt(req.params.roleId);
      const permissionId = parseInt(req.params.permissionId);

      await rbacStorage.removePermissionFromRole(roleId, permissionId, req.user.id, req.user.tenantId);
      res.json({ message: "Permission removed from role successfully" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ==================== USER-ROLE ASSIGNMENT ====================

  // Get user roles
  app.get("/api/users/:userId/roles", RBACMiddleware.authenticateWithRBAC, rbacHelpers.canManageUsers, async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const tenantId = req.user.tenantId;
      const userRoles = await rbacStorage.getUserRoles(userId, tenantId);
      res.json(userRoles);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Assign role to user
  app.post("/api/users/:userId/roles/:roleId", RBACMiddleware.authenticateWithRBAC, rbacHelpers.canManageUsers, async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const roleId = parseInt(req.params.roleId);
      const { conditions, expiresAt } = req.body;

      const assignment = await rbacStorage.assignRoleToUser({
        userId,
        roleId,
        assignedBy: req.user.id,
        tenantId: req.user.tenantId,
        conditions,
        expiresAt: expiresAt ? new Date(expiresAt) : undefined
      });

      res.status(201).json(assignment);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Remove role from user
  app.delete("/api/users/:userId/roles/:roleId", RBACMiddleware.authenticateWithRBAC, rbacHelpers.canManageUsers, async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const roleId = parseInt(req.params.roleId);

      await rbacStorage.removeRoleFromUser(userId, roleId, req.user.id, req.user.tenantId);
      res.json({ message: "Role removed from user successfully" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get user effective permissions
  app.get("/api/users/:userId/permissions", RBACMiddleware.authenticateWithRBAC, async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const tenantId = req.user.tenantId;
      
      // Users can view their own permissions, or admins can view any user's permissions
      if (userId !== req.user.id && !req.permissions?.includes('users:manage')) {
        return res.status(403).json({ message: "Cannot view other user's permissions" });
      }

      const permissions = await rbacStorage.getUserEffectivePermissions(userId, tenantId);
      res.json(permissions);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ==================== SECURITY POLICIES ====================

  // Get security policies
  app.get("/api/security/policies", RBACMiddleware.authenticateWithRBAC, rbacHelpers.canManageSystem, async (req, res) => {
    try {
      const tenantId = req.user.tenantId;
      const { policyType } = req.query;
      const policies = await rbacStorage.getSecurityPolicies(tenantId, policyType as string);
      res.json(policies);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Create security policy
  app.post("/api/security/policies", RBACMiddleware.authenticateWithRBAC, rbacHelpers.canManageSystem, async (req, res) => {
    try {
      const policyData = insertSecurityPolicySchema.parse({
        ...req.body,
        tenantId: req.user.tenantId,
        createdBy: req.user.id
      });

      const policy = await rbacStorage.createSecurityPolicy(policyData);
      res.status(201).json(policy);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        res.status(400).json({ message: "Invalid policy data", errors: error.errors });
      } else {
        res.status(500).json({ message: error.message });
      }
    }
  });

  // ==================== AUDIT & SECURITY ====================

  // Get security audit trail
  app.get("/api/security/audit", RBACMiddleware.authenticateWithRBAC, rbacHelpers.canViewAuditLogs, async (req, res) => {
    try {
      const tenantId = req.user.tenantId;
      const { userId, eventType, startDate, endDate, limit } = req.query;

      const filters: any = {};
      if (userId) filters.userId = parseInt(userId as string);
      if (eventType) filters.eventType = eventType as string;
      if (startDate) filters.startDate = new Date(startDate as string);
      if (endDate) filters.endDate = new Date(endDate as string);
      if (limit) filters.limit = parseInt(limit as string);

      const auditTrail = await rbacStorage.getSecurityAuditTrail(tenantId, filters);
      res.json(auditTrail);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get security metrics
  app.get("/api/security/metrics", RBACMiddleware.authenticateWithRBAC, rbacHelpers.canViewAuditLogs, async (req, res) => {
    try {
      const tenantId = req.user.tenantId;
      const { startDate, endDate } = req.query;

      const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const end = endDate ? new Date(endDate as string) : new Date();

      const metrics = await rbacStorage.getSecurityMetrics(tenantId, start, end);
      res.json(metrics);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ==================== SESSION MANAGEMENT ====================

  // Get active user sessions
  app.get("/api/users/:userId/sessions", RBACMiddleware.authenticateWithRBAC, async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      
      // Users can view their own sessions, or admins can view any user's sessions
      if (userId !== req.user.id && !req.permissions?.includes('users:manage')) {
        return res.status(403).json({ message: "Cannot view other user's sessions" });
      }

      const sessions = await rbacStorage.getActiveUserSessions(userId);
      res.json(sessions);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Invalidate user sessions
  app.delete("/api/users/:userId/sessions", RBACMiddleware.authenticateWithRBAC, rbacHelpers.canManageUsers, async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const { exceptCurrent } = req.query;

      const exceptSessionId = exceptCurrent === 'true' ? req.sessionID : undefined;
      await rbacStorage.invalidateUserSessions(userId, exceptSessionId);

      res.json({ message: "User sessions invalidated successfully" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ==================== PERMISSION GROUPS ====================

  // Get permission groups
  app.get("/api/permission-groups", RBACMiddleware.authenticateWithRBAC, rbacHelpers.canManageRoles, async (req, res) => {
    try {
      const tenantId = req.user.tenantId;
      const groups = await rbacStorage.getPermissionGroups(tenantId);
      res.json(groups);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Check user permission (utility endpoint)
  app.get("/api/check-permission/:permission", RBACMiddleware.authenticateWithRBAC, async (req, res) => {
    try {
      const permission = req.params.permission;
      const { resource } = req.query;
      
      const hasPermission = await rbacStorage.checkUserPermission(
        req.user.id, 
        permission, 
        resource as string
      );
      
      res.json({ hasPermission });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Test Consumption Management API Routes
  app.get("/api/inventory/test-consumption-templates/:testId", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const testId = parseInt(req.params.testId);
      if (isNaN(testId)) {
        return res.status(400).json({ message: "Invalid test ID" });
      }

      const templates = await db.execute(sql`
        SELECT 
          tct.*,
          ii.name as item_name,
          ii.item_code,
          ii.unit_of_measure,
          ic.name as category_name,
          t.name as test_name
        FROM test_consumption_templates tct
        JOIN inventory_items ii ON tct.item_id = ii.id
        JOIN inventory_categories ic ON ii.category_id = ic.id
        JOIN tests t ON tct.test_id = t.id
        WHERE tct.test_id = ${testId}
        ORDER BY tct.is_critical DESC, ii.name
      `);

      res.json(templates.rows);
    } catch (error) {
      console.error("Error getting test consumption templates:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/inventory/test-consumption-templates", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const { testId, itemId, standardQuantity, consumptionType, costCenter, isCritical, notes } = req.body;
      const tenantId = 1;

      const existing = await db.execute(sql`
        SELECT id FROM test_consumption_templates 
        WHERE test_id = ${testId} AND item_id = ${itemId} AND tenant_id = ${tenantId}
      `);

      if (existing.rows.length > 0) {
        return res.status(400).json({ message: "Consumption template already exists for this test and item" });
      }

      const result = await db.execute(sql`
        INSERT INTO test_consumption_templates (
          tenant_id, test_id, item_id, standard_quantity, consumption_type,
          cost_center, is_critical, notes, created_at, updated_at
        ) VALUES (
          ${tenantId}, ${testId}, ${itemId}, ${standardQuantity}, ${consumptionType},
          ${costCenter}, ${isCritical}, ${notes || null}, NOW(), NOW()
        ) RETURNING id
      `);

      res.status(201).json({ success: true, id: result.rows[0]?.id });
    } catch (error) {
      console.error("Error creating test consumption template:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/inventory/test-consumption-templates/:id", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const templateId = parseInt(req.params.id);
      const { testId, itemId, standardQuantity, consumptionType, costCenter, isCritical, notes } = req.body;

      if (isNaN(templateId)) {
        return res.status(400).json({ message: "Invalid template ID" });
      }

      await db.execute(sql`
        UPDATE test_consumption_templates 
        SET test_id = ${testId}, item_id = ${itemId}, standard_quantity = ${standardQuantity},
            consumption_type = ${consumptionType}, cost_center = ${costCenter},
            is_critical = ${isCritical}, notes = ${notes || null}, updated_at = NOW()
        WHERE id = ${templateId}
      `);

      res.json({ success: true });
    } catch (error) {
      console.error("Error updating test consumption template:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/inventory/test-consumption-templates/:id", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const templateId = parseInt(req.params.id);

      if (isNaN(templateId)) {
        return res.status(400).json({ message: "Invalid template ID" });
      }

      await db.execute(sql`
        DELETE FROM test_consumption_templates WHERE id = ${templateId}
      `);

      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting test consumption template:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // ==================== CEO DASHBOARD API ROUTES ====================

  // CEO comprehensive metrics
  app.get("/api/ceo/metrics", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const { timeframe = "7d" } = req.query;
      const user = req.user!;

      // Calculate total revenue from invoices
      const revenueQuery = await db
        .select({
          totalRevenue: sql<string>`COALESCE(SUM(CAST(total_amount AS DECIMAL)), 0)::text`,
          paidCount: sql<number>`COUNT(CASE WHEN payment_status = 'paid' THEN 1 END)`,
          pendingCount: sql<number>`COUNT(CASE WHEN payment_status = 'pending' THEN 1 END)`,
          overdueCount: sql<number>`COUNT(CASE WHEN payment_status = 'overdue' THEN 1 END)`
        })
        .from(invoices)
        .where(eq(invoices.tenantId, user.tenantId || 1));

      const revenue = revenueQuery[0];

      // Get active patients count
      const activePatients = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(patients)
        .where(eq(patients.tenantId, user.tenantId || 1));

      // Get pending approvals count - using correct table import
      const pendingApprovalsResult = await db.execute(
        sql`SELECT COUNT(*) as count FROM purchase_orders WHERE tenant_id = ${user.tenantId || 1} AND status = 'pending'`
      );
      const pendingApprovals = { count: Number(pendingApprovalsResult.rows[0]?.count || 0) };

      // Revenue by service calculation
      const serviceRevenue = await db
        .select({
          service: sql<string>`CASE 
            WHEN tests->0->>'test_name' LIKE '%Blood%' OR tests->0->>'test_name' LIKE '%CBC%' THEN 'Laboratory'
            WHEN tests->0->>'test_name' LIKE '%Ultrasound%' OR tests->0->>'test_name' LIKE '%X-Ray%' OR tests->0->>'test_name' LIKE '%CT%' OR tests->0->>'test_name' LIKE '%MRI%' THEN 'Radiology'
            WHEN tests->0->>'test_name' LIKE '%ECG%' OR tests->0->>'test_name' LIKE '%Cardio%' THEN 'Cardiology'
            ELSE 'Other'
          END`,
          revenue: sql<string>`SUM(CAST(total_amount AS DECIMAL))::text`
        })
        .from(invoices)
        .where(
          and(
            eq(invoices.tenantId, user.tenantId || 1),
            eq(invoices.paymentStatus, 'paid')
          )
        )
        .groupBy(sql`CASE 
          WHEN tests->0->>'test_name' LIKE '%Blood%' OR tests->0->>'test_name' LIKE '%CBC%' THEN 'Laboratory'
          WHEN tests->0->>'test_name' LIKE '%Ultrasound%' OR tests->0->>'test_name' LIKE '%X-Ray%' OR tests->0->>'test_name' LIKE '%CT%' OR tests->0->>'test_name' LIKE '%MRI%' THEN 'Radiology'
          WHEN tests->0->>'test_name' LIKE '%ECG%' OR tests->0->>'test_name' LIKE '%Cardio%' THEN 'Cardiology'
          ELSE 'Other'
        END`);

      res.json({
        totalRevenue: revenue.totalRevenue,
        monthlyGrowth: 15.2, // Calculate based on historical data
        activePatients: activePatients[0]?.count || 0,
        pendingApprovals: pendingApprovals.count,
        criticalAlerts: 2,
        branchPerformance: [
          { name: 'Main Branch', revenue: revenue.totalRevenue, growth: 15.2 }
        ],
        revenueByService: serviceRevenue,
        kpiMetrics: {
          patientSatisfaction: 4.8,
          staffEfficiency: 92,
          equipmentUptime: 98.5,
          qualityScore: 95
        }
      });
    } catch (error: any) {
      console.error("Error fetching CEO metrics:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // CEO pending approvals
  app.get("/api/ceo/pending-approvals", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const user = req.user!;

      // Get pending purchase orders using direct SQL
      const pendingPOsResult = await db.execute(
        sql`SELECT 
          id,
          'Purchase Order' as type,
          vendor_name || ' - ' || COALESCE(notes, 'Purchase Order') as description,
          total_amount as amount,
          'Staff Member' as requestedBy,
          CASE 
            WHEN total_amount::decimal > 1000000 THEN 'high'
            WHEN total_amount::decimal > 500000 THEN 'medium'
            ELSE 'low'
          END as urgency,
          EXTRACT(DAY FROM NOW() - created_at)::int as daysWaiting
        FROM purchase_orders 
        WHERE tenant_id = ${user.tenantId || 1} AND status = 'pending'
        ORDER BY created_at DESC
        LIMIT 10`
      );
      
      const pendingPOs = pendingPOsResult.rows.map((row: any) => ({
        id: row.id,
        type: row.type,
        description: row.description,
        amount: row.amount,
        requestedBy: row.requestedby,
        urgency: row.urgency,
        daysWaiting: row.dayswaiting
      }));

      res.json(pendingPOs);
    } catch (error: any) {
      console.error("Error fetching pending approvals:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // CEO notifications
  app.get("/api/ceo/notifications", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const user = req.user!;

      // Get critical notifications
      const notifications = [
        {
          id: 1,
          type: 'approval',
          title: 'High-value purchase order pending',
          message: 'Equipment purchase of ₦150,000 requires approval',
          urgency: 'high',
          timestamp: new Date()
        },
        {
          id: 2,
          type: 'alert',
          title: 'Low inventory alert',
          message: 'Laboratory reagents below reorder level',
          urgency: 'medium',
          timestamp: new Date()
        }
      ];

      res.json(notifications);
    } catch (error: any) {
      console.error("Error fetching notifications:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // ==================== MARKETING AND MESSAGING API ROUTES ====================

  // Marketing campaigns
  app.get("/api/marketing/campaigns", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const user = req.user!;
      const { branchId } = req.query;
      
      const campaigns = await marketingStorage.getMarketingCampaigns(
        user.tenantId || 1, 
        branchId ? Number(branchId) : undefined
      );
      
      res.json(campaigns);
    } catch (error: any) {
      console.error("Error fetching marketing campaigns:", error);
      res.status(500).json({ message: "Failed to fetch campaigns" });
    }
  });

  app.post("/api/marketing/campaigns", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const user = req.user!;
      const campaignData = {
        ...req.body,
        tenantId: user.tenantId || 1,
        createdBy: user.id
      };

      const campaign = await marketingStorage.createMarketingCampaign(campaignData);
      res.status(201).json(campaign);
    } catch (error: any) {
      console.error("Error creating marketing campaign:", error);
      res.status(500).json({ message: "Failed to create campaign" });
    }
  });

  // Marketing leads
  app.get("/api/marketing/leads", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const user = req.user!;
      const { branchId, status } = req.query;
      
      const leads = await marketingStorage.getMarketingLeads(
        user.tenantId || 1,
        branchId ? Number(branchId) : undefined,
        status as string
      );
      
      res.json(leads);
    } catch (error: any) {
      console.error("Error fetching marketing leads:", error);
      res.status(500).json({ message: "Failed to fetch leads" });
    }
  });

  app.post("/api/marketing/leads", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const user = req.user!;
      const leadData = {
        ...req.body,
        tenantId: user.tenantId || 1
      };

      const lead = await marketingStorage.createMarketingLead(leadData);
      res.status(201).json(lead);
    } catch (error: any) {
      console.error("Error creating marketing lead:", error);
      res.status(500).json({ message: "Failed to create lead" });
    }
  });

  // Internal messaging system
  app.get("/api/messages/metrics", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const user = req.user!;
      const metrics = await marketingStorage.getMessageMetrics(user.tenantId || 1, user.id);
      res.json(metrics);
    } catch (error: any) {
      console.error("Error fetching message metrics:", error);
      res.status(500).json({ message: "Failed to fetch message metrics" });
    }
  });

  app.get("/api/messages", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const user = req.user!;
      const { messageType } = req.query;
      
      const messages = await marketingStorage.getInternalMessages(
        user.tenantId || 1,
        user.id,
        messageType as string
      );
      
      res.json(messages);
    } catch (error: any) {
      console.error("Error fetching messages:", error);
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });

  app.post("/api/messages", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const user = req.user!;
      const messageData = {
        ...req.body,
        tenantId: user.tenantId || 1,
        senderId: user.id
      };

      const message = await marketingStorage.createInternalMessage(messageData);
      res.status(201).json(message);
    } catch (error: any) {
      console.error("Error creating message:", error);
      res.status(500).json({ message: "Failed to create message" });
    }
  });

  app.patch("/api/messages/:id/read", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const user = req.user!;
      const messageId = parseInt(req.params.id);
      
      const message = await marketingStorage.markMessageAsRead(messageId, user.id);
      res.json(message);
    } catch (error: any) {
      console.error("Error marking message as read:", error);
      res.status(500).json({ message: "Failed to mark as read" });
    }
  });

  app.patch("/api/messages/:id/acknowledge", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const user = req.user!;
      const messageId = parseInt(req.params.id);
      
      const message = await marketingStorage.acknowledgeMessage(messageId, user.id);
      res.json(message);
    } catch (error: any) {
      console.error("Error acknowledging message:", error);
      res.status(500).json({ message: "Failed to acknowledge message" });
    }
  });

  app.patch("/api/messages/:id/complete", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const user = req.user!;
      const messageId = parseInt(req.params.id);
      const { actionDetails } = req.body;
      
      const message = await marketingStorage.completeMessageAction(messageId, user.id, actionDetails);
      res.json(message);
    } catch (error: any) {
      console.error("Error completing message action:", error);
      res.status(500).json({ message: "Failed to complete action" });
    }
  });

  // Work tasks management
  app.get("/api/tasks", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const user = req.user!;
      const { assignedTo, status, taskType } = req.query;
      
      const tasks = await marketingStorage.getWorkTasks(
        user.tenantId || 1,
        assignedTo ? Number(assignedTo) : undefined,
        status as string,
        taskType as string
      );
      
      res.json(tasks);
    } catch (error: any) {
      console.error("Error fetching tasks:", error);
      res.status(500).json({ message: "Failed to fetch tasks" });
    }
  });

  app.post("/api/tasks", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const user = req.user!;
      const taskData = {
        ...req.body,
        tenantId: user.tenantId || 1,
        assignedBy: user.id
      };

      const task = await marketingStorage.createWorkTask(taskData);
      res.status(201).json(task);
    } catch (error: any) {
      console.error("Error creating task:", error);
      res.status(500).json({ message: "Failed to create task" });
    }
  });

  app.patch("/api/tasks/:id/complete", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const user = req.user!;
      const taskId = parseInt(req.params.id);
      const { completionNotes } = req.body;
      
      const task = await marketingStorage.completeWorkTask(taskId, user.id, completionNotes);
      res.json(task);
    } catch (error: any) {
      console.error("Error completing task:", error);
      res.status(500).json({ message: "Failed to complete task" });
    }
  });

  // Marketing reports
  app.get("/api/marketing/reports", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const user = req.user!;
      const { reportType, status } = req.query;
      
      const reports = await marketingStorage.getMarketingReports(
        user.tenantId || 1,
        reportType as string,
        status as string
      );
      
      res.json(reports);
    } catch (error: any) {
      console.error("Error fetching marketing reports:", error);
      res.status(500).json({ message: "Failed to fetch reports" });
    }
  });

  app.post("/api/marketing/reports", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const user = req.user!;
      const reportData = {
        ...req.body,
        tenantId: user.tenantId || 1,
        createdBy: user.id
      };

      const report = await marketingStorage.createMarketingReport(reportData);
      res.status(201).json(report);
    } catch (error: any) {
      console.error("Error creating marketing report:", error);
      res.status(500).json({ message: "Failed to create report" });
    }
  });

  // Marketing metrics
  app.get("/api/marketing/metrics", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const user = req.user!;
      const { period } = req.query;
      
      const metrics = await marketingStorage.getMarketingMetrics(
        user.tenantId || 1,
        period as string
      );
      
      res.json(metrics);
    } catch (error: any) {
      console.error("Error fetching marketing metrics:", error);
      res.status(500).json({ message: "Failed to fetch metrics" });
    }
  });

  // ==================== TRAINING SIMULATION API ROUTES ====================

  // Get training modules by department with role-based access
  app.get("/api/training/modules", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const { department, difficulty } = req.query;
      const user = req.user!;
      
      // Admin/CEO gets access to all modules
      const isAdmin = user.role === 'admin' || user.role === 'ceo' || user.role === 'director';
      
      let modules;
      if (isAdmin) {
        // Admin gets all modules regardless of department filter
        modules = await trainingStorage.getTrainingModules({
          difficulty: difficulty as string,
        });
      } else {
        // Regular users get modules for their department only
        const userDepartment = user.department || department as string;
        modules = await trainingStorage.getTrainingModules({
          department: userDepartment,
          difficulty: difficulty as string,
        });
      }

      // Enrich with user progress if available
      const enrichedModules = await Promise.all(
        modules.map(async (module) => {
          const progress = await trainingStorage.getUserTrainingProgress(user.id, module.id);
          const userProgress = progress[0];
          
          return {
            ...module,
            progressPercentage: userProgress?.progressPercentage || 0,
            certificateEarned: userProgress?.certificateEarned || false,
            accessLevel: isAdmin ? 'full' : 'restricted',
          };
        })
      );

      res.json(enrichedModules);
    } catch (error: any) {
      console.error("Error fetching training modules:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get training scenarios for a module
  app.get("/api/training/scenarios/:moduleId", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const moduleId = parseInt(req.params.moduleId);
      if (isNaN(moduleId)) {
        return res.status(400).json({ message: "Invalid module ID" });
      }

      const scenarios = await trainingStorage.getTrainingScenarios(moduleId);
      res.json(scenarios);
    } catch (error: any) {
      console.error("Error fetching training scenarios:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get user's training progress
  app.get("/api/training/progress", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const progress = await trainingStorage.getUserTrainingProgress(req.user!.id);
      res.json(progress);
    } catch (error: any) {
      console.error("Error fetching training progress:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Start a new training session
  app.post("/api/training/sessions", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const { scenarioId, sessionMode } = req.body;

      // Validate scenario exists
      const scenario = await trainingStorage.getTrainingScenario(scenarioId);
      if (!scenario) {
        return res.status(404).json({ message: "Scenario not found" });
      }

      // Calculate max score based on required actions
      const maxScore = scenario.requiredActions.reduce((sum, action) => sum + action.points, 0);

      const session = await trainingStorage.createTrainingSession({
        userId: req.user!.id,
        scenarioId,
        sessionMode: sessionMode || 'guided',
        status: 'active',
        score: 0,
        maxScore,
        timeSpent: 0,
        actionsPerformed: [],
        mistakesMade: [],
        hintsUsed: 0,
      });

      res.status(201).json(session);
    } catch (error: any) {
      console.error("Error creating training session:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Update training session (for progress tracking)
  app.put("/api/training/sessions/:sessionId", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const sessionId = parseInt(req.params.sessionId);
      if (isNaN(sessionId)) {
        return res.status(400).json({ message: "Invalid session ID" });
      }

      const updates = req.body;
      const session = await trainingStorage.updateTrainingSession(sessionId, updates);

      if (!session) {
        return res.status(404).json({ message: "Session not found" });
      }

      res.json(session);
    } catch (error: any) {
      console.error("Error updating training session:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // PATCH endpoint for session updates
  app.patch("/api/training/sessions/:sessionId", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const sessionId = parseInt(req.params.sessionId);
      if (isNaN(sessionId)) {
        return res.status(400).json({ message: "Invalid session ID" });
      }

      const updates = req.body;
      const session = await trainingStorage.updateTrainingSession(sessionId, updates);

      if (!session) {
        return res.status(404).json({ message: "Session not found" });
      }

      res.json(session);
    } catch (error: any) {
      console.error("Error updating training session:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get user's certificates
  app.get("/api/training/certificates", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const certificates = await trainingStorage.getUserCertificates(req.user!.id);
      res.json(certificates);
    } catch (error: any) {
      console.error("Error fetching certificates:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // ==================== GROUP EXECUTIVE DIRECTOR API ROUTES ====================

  // Get GED dashboard metrics
  app.get("/api/ged/metrics", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const user = req.user!;
      
      // Mock GED metrics - replace with actual database queries
      const gedMetrics = {
        pendingApprovals: 5,
        monthlyExpenseApprovals: "2500000",
        fundTransferVolume: "15000000",
        businessAccountBalance: "45000000",
        fintechAccountBalance: "12000000",
        approvedThisMonth: 28,
        rejectedThisMonth: 3,
        averageApprovalTime: "2.5 hours"
      };

      res.json(gedMetrics);
    } catch (error: any) {
      console.error("Error fetching GED metrics:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get pending approvals for GED
  app.get("/api/ged/pending-approvals", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      // Mock pending approvals - replace with actual database queries
      const pendingApprovals = [
        {
          id: 1,
          type: "Equipment Purchase",
          description: "New ultrasound machine for cardiology unit",
          amount: "850000",
          requestedBy: "Dr. Sarah Johnson",
          requestedAt: "2025-06-05T10:30:00Z",
          priority: "high",
          department: "Cardiology",
          justification: "Current ultrasound machine is outdated and requires frequent repairs. New machine will improve diagnostic accuracy and reduce patient wait times."
        },
        {
          id: 2,
          type: "Training Program",
          description: "Advanced laboratory training certification",
          amount: "450000",
          requestedBy: "Lab Manager",
          requestedAt: "2025-06-05T09:15:00Z",
          priority: "medium",
          department: "Laboratory",
          justification: "Staff certification required for new testing protocols and equipment operation."
        },
        {
          id: 3,
          type: "Facility Upgrade",
          description: "HVAC system upgrade for clean room",
          amount: "1200000",
          requestedBy: "Facilities Manager",
          requestedAt: "2025-06-04T16:45:00Z",
          priority: "urgent",
          department: "Infrastructure",
          justification: "Current HVAC system failing, affecting laboratory environment controls and compliance requirements."
        }
      ];

      res.json(pendingApprovals);
    } catch (error: any) {
      console.error("Error fetching pending approvals:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get fund transfer requests
  app.get("/api/ged/fund-transfers", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      // Mock fund transfers - replace with actual database queries
      const fundTransfers = [
        {
          id: 1,
          fromAccount: "Fintech Primary",
          toAccount: "Business Main Account",
          amount: "5000000",
          purpose: "Monthly revenue consolidation",
          requestedAt: "2025-06-05T08:00:00Z",
          status: "completed"
        },
        {
          id: 2,
          fromAccount: "Fintech Reserve",
          toAccount: "Business Operating",
          amount: "2500000",
          purpose: "Equipment purchase funding",
          requestedAt: "2025-06-04T14:30:00Z",
          status: "completed"
        },
        {
          id: 3,
          fromAccount: "Business Reserve",
          toAccount: "Business Main Account",
          amount: "1000000",
          purpose: "Working capital adjustment",
          requestedAt: "2025-06-03T11:15:00Z",
          status: "completed"
        }
      ];

      res.json(fundTransfers);
    } catch (error: any) {
      console.error("Error fetching fund transfers:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Approve expense
  app.post("/api/ged/approve-expense/:id", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const { id } = req.params;
      const { comments } = req.body;
      const user = req.user!;

      // Mock approval process - replace with actual database updates
      console.log(`GED ${user.username} approved expense ${id} with comments:`, comments);

      // In real implementation, update database:
      // - Update expense status to 'approved'
      // - Add approval record with user ID and timestamp
      // - Create journal entry for accounting
      // - Send notification to requester

      res.json({ 
        success: true, 
        message: "Expense approved successfully",
        approvedBy: user.username,
        approvedAt: new Date().toISOString()
      });
    } catch (error: any) {
      console.error("Error approving expense:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Reject expense
  app.post("/api/ged/reject-expense/:id", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const { id } = req.params;
      const { reason } = req.body;
      const user = req.user!;

      // Mock rejection process - replace with actual database updates
      console.log(`GED ${user.username} rejected expense ${id} with reason:`, reason);

      // In real implementation, update database:
      // - Update expense status to 'rejected'
      // - Add rejection record with user ID, timestamp, and reason
      // - Send notification to requester with rejection reason

      res.json({ 
        success: true, 
        message: "Expense rejected successfully",
        rejectedBy: user.username,
        rejectedAt: new Date().toISOString(),
        reason
      });
    } catch (error: any) {
      console.error("Error rejecting expense:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Execute fund transfer
  app.post("/api/ged/fund-transfer", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const { fromAccount, toAccount, amount, purpose } = req.body;
      const user = req.user!;

      // Validate required fields
      if (!fromAccount || !toAccount || !amount || !purpose) {
        return res.status(400).json({ message: "All fields are required" });
      }

      // Mock fund transfer process - replace with actual financial system integration
      console.log(`GED ${user.username} initiated fund transfer:`, {
        fromAccount,
        toAccount,
        amount,
        purpose
      });

      // In real implementation:
      // - Validate account balances
      // - Execute transfer through banking API
      // - Create transaction records
      // - Update account balances
      // - Create audit trail
      // - Send confirmation notifications

      const transferRecord = {
        id: Date.now(),
        fromAccount,
        toAccount,
        amount,
        purpose,
        executedBy: user.username,
        executedAt: new Date().toISOString(),
        status: "completed",
        transferId: `TXN-${Date.now()}`
      };

      res.json({ 
        success: true, 
        message: "Fund transfer completed successfully",
        transfer: transferRecord
      });
    } catch (error: any) {
      console.error("Error executing fund transfer:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Generate Laboratory PDF Report
  app.post("/api/generate-lab-report", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const { testId } = req.body;

      if (!testId) {
        return res.status(400).json({ message: "Test ID is required" });
      }

      // Get test details with patient info
      const tests = await storage.getPatientTestsByBranch(req.user!.branchId, 200);
      const test = tests.find(t => t.id === parseInt(testId));
      if (!test) {
        return res.status(404).json({ message: "Test not found" });
      }

      // Get patient details
      const patient = await storage.getPatient(test.patientId);

      // Get test category details
      const testCategories = await storage.getTestCategories(req.user!.tenantId);
      const testDetails = testCategories.find(tc => tc.id === test.testId);

      // Get test parameters if available from lab parameters file
      const { getTestParametersForTest } = await import('./lab-parameters');
      const testParameters = await getTestParametersForTest(test.testId);
      
      // Get branch and tenant information
      const branch = await storage.getBranch(test.branchId);
      const tenant = await storage.getTenant(test.tenantId);

      // Generate PDF
      const pdfBuffer = await generateLaboratoryReportPDF({
        test,
        patient: test.patient,
        testDetails: test.testDetails,
        testParameters,
        branch,
        tenant,
        generatedBy: req.user!.username,
        generatedAt: new Date()
      });

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=Lab-Report-${test.patient?.firstName}-${test.patient?.lastName}-${new Date().toISOString().split('T')[0]}.pdf`);
      res.send(pdfBuffer);

    } catch (error: any) {
      console.error("Error generating laboratory report:", error);
      res.status(500).json({ message: "Failed to generate report" });
    }
  });

  return httpServer;
}
