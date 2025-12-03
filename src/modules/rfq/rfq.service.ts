import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import * as sgMail from '@sendgrid/mail';

@Injectable()
export class RFQService {
  private readonly logger = new Logger(RFQService.name);
  private readonly sendgridConfigured: boolean;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
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

    // Get email template based on vendor type
    const isContractor = rfq.vendor.type === 'SUBCONTRACTOR' || rfq.vendor.type === 'BOTH';
    const templateName = isContractor ? 'RFQ Template - Subcontractors' : 'RFQ Template - Material Suppliers';
    
    let template = await this.prisma.emailTemplate.findFirst({
      where: {
        type: 'RFQ',
        name: templateName,
        active: true,
      },
    });

    // Fallback to any RFQ template if specific one not found
    if (!template) {
      template = await this.prisma.emailTemplate.findFirst({
        where: {
          type: 'RFQ',
          active: true,
        },
      });
    }

    // Generate email body
    const emailBody = this.generateRFQEmail(rfq, template);

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
      };

      const response = await sgMail.send(msg);
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

    // Replace template variables
    html = html.replace('{{PROJECT_NAME}}', rfq.project.name);
    html = html.replace('{{RFQ_NUMBER}}', rfq.rfqNumber);
    html = html.replace('{{DUE_DATE}}', rfq.dueDate?.toLocaleDateString() || 'TBD');

    // Add materials table
    const materialsTable = this.generateMaterialsTable(rfq.items);
    html = html.replace('{{MATERIALS_TABLE}}', materialsTable);

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
