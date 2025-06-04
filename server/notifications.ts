import { MailService } from '@sendgrid/mail';
import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';

// Initialize SendGrid
let mailService: MailService | null = null;
if (process.env.SENDGRID_API_KEY) {
  mailService = new MailService();
  mailService.setApiKey(process.env.SENDGRID_API_KEY);
}

// WhatsApp Business API client
class WhatsAppService {
  private accessToken: string;
  private phoneNumberId: string;
  private baseUrl = 'https://graph.facebook.com/v18.0';

  constructor() {
    this.accessToken = process.env.WHATSAPP_ACCESS_TOKEN || '';
    this.phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID || '';
  }

  async sendMessage(to: string, message: string): Promise<boolean> {
    if (!this.accessToken || !this.phoneNumberId) {
      console.error('WhatsApp credentials not configured');
      return false;
    }

    try {
      const response = await fetch(
        `${this.baseUrl}/${this.phoneNumberId}/messages`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            to: to.replace(/\D/g, ''), // Remove non-digits
            type: 'text',
            text: { body: message }
          })
        }
      );

      const result = await response.json();
      return response.ok;
    } catch (error) {
      console.error('WhatsApp send error:', error);
      return false;
    }
  }

  async sendDocument(to: string, documentUrl: string, filename: string, caption: string): Promise<boolean> {
    if (!this.accessToken || !this.phoneNumberId) {
      console.error('WhatsApp credentials not configured');
      return false;
    }

    try {
      const response = await fetch(
        `${this.baseUrl}/${this.phoneNumberId}/messages`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            to: to.replace(/\D/g, ''),
            type: 'document',
            document: {
              link: documentUrl,
              filename: filename,
              caption: caption
            }
          })
        }
      );

      return response.ok;
    } catch (error) {
      console.error('WhatsApp document send error:', error);
      return false;
    }
  }
}

// PDF Generation Service
export class PDFService {
  static generateTestResultPDF(patientTest: any, patient: any, test: any): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument();
      const chunks: Buffer[] = [];

      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Header
      doc.fontSize(20).text('Orient Medical Diagnostic Center', 50, 50);
      doc.fontSize(12).text('Test Result Report', 50, 80);
      doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 50, 95);

      // Patient Information
      doc.fontSize(14).text('Patient Information', 50, 130);
      doc.fontSize(10)
        .text(`Patient ID: ${patient.patientId}`, 50, 150)
        .text(`Name: ${patient.firstName} ${patient.lastName}`, 50, 165)
        .text(`Phone: ${patient.phone}`, 50, 180)
        .text(`Email: ${patient.email || 'N/A'}`, 50, 195);

      // Test Information
      doc.fontSize(14).text('Test Information', 50, 230);
      doc.fontSize(10)
        .text(`Test: ${test.name}`, 50, 250)
        .text(`Test Code: ${test.code}`, 50, 265)
        .text(`Date Performed: ${new Date(patientTest.scheduledAt).toLocaleDateString()}`, 50, 280)
        .text(`Status: ${patientTest.status}`, 50, 295);

      // Results Section
      if (patientTest.results) {
        doc.fontSize(14).text('Results', 50, 330);
        doc.fontSize(10).text(patientTest.results, 50, 350);
      }

      // Footer
      doc.fontSize(8)
        .text('This is a computer-generated report.', 50, 750)
        .text('For questions, contact Orient Medical Diagnostic Center', 50, 765);

      doc.end();
    });
  }

  static generateAppointmentConfirmationPDF(patient: any, tests: any[], appointment: any): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument();
      const chunks: Buffer[] = [];

      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Header
      doc.fontSize(20).text('Orient Medical Diagnostic Center', 50, 50);
      doc.fontSize(12).text('Appointment Confirmation', 50, 80);
      doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 50, 95);

      // Patient Information
      doc.fontSize(14).text('Patient Information', 50, 130);
      doc.fontSize(10)
        .text(`Patient ID: ${patient.patientId}`, 50, 150)
        .text(`Name: ${patient.firstName} ${patient.lastName}`, 50, 165)
        .text(`Phone: ${patient.phone}`, 50, 180);

      // Appointment Details
      doc.fontSize(14).text('Appointment Details', 50, 210);
      doc.fontSize(10)
        .text(`Date & Time: ${new Date(appointment.scheduledAt).toLocaleString()}`, 50, 230)
        .text(`Location: ${appointment.branchName || 'Main Branch'}`, 50, 245);

      // Tests Scheduled
      doc.fontSize(14).text('Tests Scheduled', 50, 280);
      let yPos = 300;
      tests.forEach((test, index) => {
        doc.fontSize(10).text(`${index + 1}. ${test.name} (${test.code})`, 50, yPos);
        yPos += 15;
      });

      // Instructions
      doc.fontSize(12).text('Instructions', 50, yPos + 20);
      doc.fontSize(10)
        .text('• Please arrive 15 minutes before your appointment time', 50, yPos + 40)
        .text('• Bring a valid ID and this confirmation', 50, yPos + 55)
        .text('• Follow any specific preparation instructions given', 50, yPos + 70);

      doc.end();
    });
  }
}

// Notification Service
export class NotificationService {
  private whatsapp: WhatsAppService;

  constructor() {
    this.whatsapp = new WhatsAppService();
  }

  async sendAppointmentConfirmation(patient: any, tests: any[], appointment: any): Promise<void> {
    const message = `🏥 Orient Medical Diagnostic Center

Hi ${patient.firstName},

Your appointment has been confirmed:
📅 Date: ${new Date(appointment.scheduledAt).toLocaleDateString()}
🕐 Time: ${new Date(appointment.scheduledAt).toLocaleTimeString()}
📍 Location: ${appointment.branchName || 'Main Branch'}

Tests scheduled: ${tests.map(t => t.name).join(', ')}

Please arrive 15 minutes early with a valid ID.

For questions, call: +234-XXX-XXX-XXXX`;

    // Send WhatsApp message
    if (patient.phone) {
      await this.whatsapp.sendMessage(patient.phone, message);
    }

    // Send email with PDF attachment
    if (patient.email && mailService) {
      const pdfBuffer = await PDFService.generateAppointmentConfirmationPDF(patient, tests, appointment);
      
      await mailService.send({
        to: patient.email,
        from: process.env.FROM_EMAIL || 'noreply@orientmedical.com',
        subject: 'Appointment Confirmation - Orient Medical Diagnostic Center',
        text: message,
        attachments: [{
          content: pdfBuffer.toString('base64'),
          filename: `appointment-confirmation-${patient.patientId}.pdf`,
          type: 'application/pdf',
          disposition: 'attachment'
        }]
      });
    }
  }

  async sendTestStatusUpdate(patient: any, patientTest: any, test: any): Promise<void> {
    const statusMessages = {
      scheduled: `📋 Your ${test.name} test has been scheduled for ${new Date(patientTest.scheduledAt).toLocaleDateString()}`,
      in_progress: `🔬 Your ${test.name} test is currently being processed`,
      completed: `✅ Your ${test.name} test has been completed. Results are being reviewed.`,
      reviewed: `📋 Your ${test.name} test results are ready for collection`,
      delivered: `📧 Your ${test.name} test results have been sent to you`
    };

    const message = `🏥 Orient Medical Diagnostic Center

Hi ${patient.firstName},

${statusMessages[patientTest.status as keyof typeof statusMessages] || 'Test status updated'}

Patient ID: ${patient.patientId}
Test: ${test.name}

For questions, call: +234-XXX-XXX-XXXX`;

    // Send WhatsApp message
    if (patient.phone) {
      await this.whatsapp.sendMessage(patient.phone, message);
    }

    // Send email notification
    if (patient.email && mailService) {
      await mailService.send({
        to: patient.email,
        from: process.env.FROM_EMAIL || 'noreply@orientmedical.com',
        subject: `Test Update: ${test.name} - Orient Medical Diagnostic Center`,
        text: message
      });
    }
  }

  async sendTestResults(patient: any, patientTest: any, test: any, referralProvider?: any): Promise<void> {
    const message = `🏥 Orient Medical Diagnostic Center

Hi ${patient.firstName},

Your ${test.name} test results are ready!

Patient ID: ${patient.patientId}
Test Date: ${new Date(patientTest.scheduledAt).toLocaleDateString()}
Status: ${patientTest.status}

Please find your detailed results in the attached PDF.

For questions, call: +234-XXX-XXX-XXXX`;

    // Generate PDF report
    const pdfBuffer = await PDFService.generateTestResultPDF(patientTest, patient, test);

    // Send to patient via WhatsApp and Email
    if (patient.phone) {
      await this.whatsapp.sendMessage(patient.phone, message);
      // Note: WhatsApp document sending would require uploading PDF to a public URL first
    }

    if (patient.email && mailService) {
      await mailService.send({
        to: patient.email,
        from: process.env.FROM_EMAIL || 'noreply@orientmedical.com',
        subject: `Test Results: ${test.name} - Orient Medical Diagnostic Center`,
        text: message,
        attachments: [{
          content: pdfBuffer.toString('base64'),
          filename: `test-results-${patient.patientId}-${test.code}.pdf`,
          type: 'application/pdf',
          disposition: 'attachment'
        }]
      });
    }

    // Send to referral provider if applicable
    if (referralProvider && referralProvider.email && mailService) {
      const providerMessage = `Dear ${referralProvider.contactPerson || 'Doctor'},

Test results for your referred patient are ready:

Patient: ${patient.firstName} ${patient.lastName}
Patient ID: ${patient.patientId}
Test: ${test.name}
Date: ${new Date(patientTest.scheduledAt).toLocaleDateString()}

Please find the detailed results in the attached PDF.

Best regards,
Orient Medical Diagnostic Center`;

      await mailService.send({
        to: referralProvider.email,
        from: process.env.FROM_EMAIL || 'noreply@orientmedical.com',
        subject: `Patient Test Results: ${patient.firstName} ${patient.lastName} - ${test.name}`,
        text: providerMessage,
        attachments: [{
          content: pdfBuffer.toString('base64'),
          filename: `test-results-${patient.patientId}-${test.code}.pdf`,
          type: 'application/pdf',
          disposition: 'attachment'
        }]
      });
    }
  }

  async sendReminder(patient: any, appointment: any): Promise<void> {
    const message = `🔔 Appointment Reminder

Hi ${patient.firstName},

This is a reminder of your upcoming appointment:
📅 Tomorrow at ${new Date(appointment.scheduledAt).toLocaleTimeString()}
📍 Orient Medical Diagnostic Center

Please arrive 15 minutes early.

For questions, call: +234-XXX-XXX-XXXX`;

    // Send WhatsApp reminder
    if (patient.phone) {
      await this.whatsapp.sendMessage(patient.phone, message);
    }

    // Send email reminder
    if (patient.email && mailService) {
      await mailService.send({
        to: patient.email,
        from: process.env.FROM_EMAIL || 'noreply@orientmedical.com',
        subject: 'Appointment Reminder - Orient Medical Diagnostic Center',
        text: message
      });
    }
  }
}

export const notificationService = new NotificationService();