import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import * as sgMail from '@sendgrid/mail';
import { PDFGeneratorService } from './pdf-generator.service';

@Injectable()
export class RFQService {
  private readonly logger = new Logger(RFQService.name);
  private readonly sendgridConfigured: boolean;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    private pdfGenerator: PDFGeneratorService,
  ) {
    // Initialize SendGrid
    const apiKey = this.configService.get('SENDGRID_API_KEY');
    if (apiKey) {
      sgMail.setApiKey(apiKey);
      this.sendgridConfigured = true;
      this.logger.log('✅ SendGrid configured for email sending');
    } else {
      this.sendgridConfigured = false;
      this.logger.warn('⚠️ SENDGRID_API_KEY not set - email sending disabled');
    }
  }

  async listByProject(projectId: string) {
    const rfqs = await this.prisma.rFQ.findMany({
      where: { projectId },
      include: {
        vendor: {
          select: {
            id: true,
            name: true,
            email: true,
            type: true,
          },
        },
        items: true,
        _count: {
          select: {
            items: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return rfqs;
  }

  async getRFQDetails(rfqId: string) {
    const rfq = await this.prisma.rFQ.findUnique({
      where: { id: rfqId },
      include: {
        project: true,
        vendor: true,
        items: {
          include: {
            bomItem: {
              include: {
                material: true,
              },
            },
          },
        },
        sentByUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return rfq;
  }

  async createRFQ(projectId: string, vendorId: string, materialIds: string[], userId: string) {
    // Generate RFQ number
    const rfqNumber = `RFQ-${Date.now()}`;

    // Create RFQ
    const rfq = await this.prisma.rFQ.create({
      data: {
        projectId,
        vendorId,
        rfqNumber,
        subject: `Request for Quote - ${rfqNumber}`,
        status: 'DRAFT',
        sentBy: userId,
      },
    });

    // Create RFQ items
    for (const materialId of materialIds) {
      const material = await this.prisma.bOM.findUnique({
        where: { id: materialId },
      });

      if (material) {
        await this.prisma.rFQItem.create({
          data: {
            rfqId: rfq.id,
            bomItemId: materialId,
            quantity: material.finalQty,
            uom: material.uom,
            description: material.description,
          },
        });
      }
    }

    return rfq;
  }

  async sendRFQ(rfqId: string) {
    if (!this.sendgridConfigured) {
      throw new Error('Email service not configured. Please set SENDGRID_API_KEY environment variable.');
    }

    const rfq = await this.prisma.rFQ.findUnique({
      where: { id: rfqId },
      include: {
        project: true,
        vendor: true,
        items: {
          include: {
            bomItem: true,
          },
        },
      },
    });

    if (!rfq) {
      throw new Error('RFQ not found');
    }

    if (!rfq.vendor.email) {
      throw new Error(`Vendor ${rfq.vendor.name} does not have an email address`);
    }

    // Get email template - first try to find ANY active RFQ template
    // Users create templates without specific names, so just use type
    let template = await this.prisma.emailTemplate.findFirst({
      where: {
        type: 'RFQ',
        active: true,
      },
      orderBy: {
        createdAt: 'desc', // Use most recent template
      },
    });

    if (template) {
      this.logger.log(`Using RFQ template: ${template.name || 'Unnamed'}`);
    } else {
      this.logger.warn('No RFQ template found in database, using default template');
    }

    // Generate email body
    const emailBody = this.generateRFQEmail(rfq, template);

    // Generate PDF attachment
    this.logger.log('Generating PDF attachment for RFQ...');
    const pdfBuffer = await this.pdfGenerator.generateRFQPDF(rfqId);
    const pdfBase64 = pdfBuffer.toString('base64');

    // Send email via SendGrid
    const fromEmail = this.configService.get('SENDGRID_FROM_EMAIL') || 'noreply@gclegacy.com';
    const fromName = this.configService.get('SENDGRID_FROM_NAME') || 'GC Legacy Construction';

    try {
      const msg = {
        to: rfq.vendor.email,
        from: {
          email: fromEmail,
          name: fromName,
        },
        subject: rfq.subject,
        html: emailBody,
        // Add reply-to for quote responses
        replyTo: this.configService.get('SENDGRID_REPLY_TO') || 'quotes@mail.gclegacy.com',
        // Attach PDF
        attachments: [
          {
            content: pdfBase64,
            filename: `RFQ-${rfq.rfqNumber}.pdf`,
            type: 'application/pdf',
            disposition: 'attachment',
          },
        ],
      };

      const response = await sgMail.send(msg);
      this.logger.log(`📧 RFQ sent to ${rfq.vendor.name} with PDF attachment`);
      this.logger.log(`📧 RFQ sent to ${rfq.vendor.name} (${rfq.vendor.email})`);

      // Update RFQ status
      await this.prisma.rFQ.update({
        where: { id: rfqId },
        data: {
          status: 'SENT',
          sentAt: new Date(),
        },
      });

      return {
        rfq,
        emailInfo: response,
        success: true,
        message: `RFQ sent successfully to ${rfq.vendor.email}`,
      };
    } catch (error) {
      this.logger.error(`Failed to send RFQ: ${error.message}`, error.stack);
      throw new Error(`Failed to send email: ${error.message}`);
    }
  }

  private generateRFQEmail(rfq: any, template: any): string {
    // Generate structured RFQ email
    let bodyContent = template?.body || this.getDefaultRFQTemplate();

    // Determine trade for subcontractor context
    const trade = rfq.items[0]?.bomItem?.trade || 'General';

    // Replace ALL template variables (use global replace with regex)
    const replacements = {
      '{{PROJECT_NAME}}': rfq.project.name || 'N/A',
      '{{projectName}}': rfq.project.name || 'N/A',
      '{{RFQ_NUMBER}}': rfq.rfqNumber || 'N/A',
      '{{rfqNumber}}': rfq.rfqNumber || 'N/A',
      '{{DUE_DATE}}': rfq.dueDate ? new Date(rfq.dueDate).toLocaleDateString() : 'TBD',
      '{{dueDate}}': rfq.dueDate ? new Date(rfq.dueDate).toLocaleDateString() : 'TBD',
      '{{vendorName}}': rfq.vendor.name || 'N/A',
      '{{VENDOR_NAME}}': rfq.vendor.name || 'N/A',
      '{{projectLocation}}': rfq.project.location || 'N/A',
      '{{PROJECT_LOCATION}}': rfq.project.location || 'N/A',
      '{{contactName}}': 'GC Legacy Construction',
      '{{contactEmail}}': this.configService.get('SENDGRID_FROM_EMAIL') || 'noreply@gclegacy.com',
      '{{contactPhone}}': this.configService.get('CONTACT_PHONE') || '(555) 555-5555',
      '{{MATERIALS_TABLE}}': this.generateMaterialsTable(rfq.items),
      '{{materialsTable}}': this.generateMaterialsTable(rfq.items),
      '{{trade}}': trade,
      '{{TRADE}}': trade,
    };

    // Replace all variables
    Object.entries(replacements).forEach(([key, value]) => {
      bodyContent = bodyContent.replace(new RegExp(key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), value);
    });

    // Convert TipTap HTML to email-friendly HTML with inline styles
    // Replace <p> tags with inline styles for spacing
    bodyContent = bodyContent.replace(/<p>/g, '<p style="margin: 16px 0; line-height: 1.6;">');
    bodyContent = bodyContent.replace(/<h1>/g, '<h1 style="margin: 24px 0 8px 0; font-size: 32px; font-weight: 600;">');
    bodyContent = bodyContent.replace(/<h2>/g, '<h2 style="margin: 24px 0 8px 0; font-size: 24px; font-weight: 600;">');
    bodyContent = bodyContent.replace(/<h3>/g, '<h3 style="margin: 20px 0 8px 0; font-size: 18px; font-weight: 600;">');
    bodyContent = bodyContent.replace(/<ul>/g, '<ul style="margin: 16px 0; padding-left: 32px;">');
    bodyContent = bodyContent.replace(/<ol>/g, '<ol style="margin: 16px 0; padding-left: 32px;">');
    bodyContent = bodyContent.replace(/<li>/g, '<li style="margin: 8px 0;">');
    bodyContent = bodyContent.replace(/<br>/g, '<br style="line-height: 1.6;">');
    
    // Wrap in email-safe HTML structure
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
        <div style="background-color: #ffffff; padding: 30px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          ${bodyContent}
        </div>
      </body>
      </html>
    `;

    return html;
  }

  private generateMaterialsTable(items: any[]): string {
    let table = `
      <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
        <thead>
          <tr style="background-color: #f3f4f6;">
            <th style="padding: 12px; text-align: left; border: 1px solid #e5e7eb;">Item</th>
            <th style="padding: 12px; text-align: left; border: 1px solid #e5e7eb;">Description</th>
            <th style="padding: 12px; text-align: right; border: 1px solid #e5e7eb;">Quantity</th>
            <th style="padding: 12px; text-align: left; border: 1px solid #e5e7eb;">UOM</th>
          </tr>
        </thead>
        <tbody>
    `;

    items.forEach((item, index) => {
      table += `
        <tr>
          <td style="padding: 12px; border: 1px solid #e5e7eb;">${index + 1}</td>
          <td style="padding: 12px; border: 1px solid #e5e7eb;">${item.description}</td>
          <td style="padding: 12px; text-align: right; border: 1px solid #e5e7eb;">${item.quantity.toFixed(2)}</td>
          <td style="padding: 12px; border: 1px solid #e5e7eb;">${item.uom}</td>
        </tr>
      `;
    });

    table += `
        </tbody>
      </table>
    `;

    return table;
  }

  private getDefaultRFQTemplate(): string {
    return `
      <html>
        <body style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px;">
          <h2>Request for Quote</h2>
          <p><strong>Project:</strong> {{PROJECT_NAME}}</p>
          <p><strong>RFQ Number:</strong> {{RFQ_NUMBER}}</p>
          <p><strong>Due Date:</strong> {{DUE_DATE}}</p>
          
          <h3>Materials Required:</h3>
          {{MATERIALS_TABLE}}
          
          <p>Please provide your best pricing for the materials listed above.</p>
          <p>Reply to this email with your quote.</p>
          
          <p>Thank you,<br/>GC Legacy Construction</p>
        </body>
      </html>
    `;
  }

  async clearAllRFQs() {
    this.logger.log('🗑️  Clearing all RFQs...');
    
    // Delete RFQ items first (foreign key constraint)
    const deletedItems = await this.prisma.rFQItem.deleteMany({});
    this.logger.log(`✅ Deleted ${deletedItems.count} RFQ items`);
    
    // Delete RFQs
    const deletedRFQs = await this.prisma.rFQ.deleteMany({});
    this.logger.log(`✅ Deleted ${deletedRFQs.count} RFQs`);
    
    return {
      success: true,
      message: `Cleared ${deletedRFQs.count} RFQs and ${deletedItems.count} items`,
      deletedRFQs: deletedRFQs.count,
      deletedItems: deletedItems.count,
    };
  }
}
