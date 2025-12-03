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
    let html = template?.body || this.getDefaultRFQTemplate();

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
    };

    // Replace all variables
    Object.entries(replacements).forEach(([key, value]) => {
      html = html.replace(new RegExp(key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), value);
    });

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
}
