import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import * as nodemailer from 'nodemailer';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class RFQService {
  private transporter: nodemailer.Transporter;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    // Initialize email transporter
    this.transporter = nodemailer.createTransporter({
      host: this.configService.get('SMTP_HOST'),
      port: parseInt(this.configService.get('SMTP_PORT', '587')),
      secure: this.configService.get('SMTP_SECURE') === 'true',
      auth: {
        user: this.configService.get('SMTP_USER'),
        pass: this.configService.get('SMTP_PASSWORD'),
      },
    });
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

    // Get email template
    const template = await this.prisma.emailTemplate.findFirst({
      where: {
        type: 'RFQ',
        active: true,
      },
    });

    // Generate email body
    const emailBody = this.generateRFQEmail(rfq, template);

    // Send email
    const info = await this.transporter.sendMail({
      from: this.configService.get('SMTP_FROM'),
      to: rfq.vendor.email,
      subject: rfq.subject,
      html: emailBody,
    });

    // Update RFQ status
    await this.prisma.rFQ.update({
      where: { id: rfqId },
      data: {
        status: 'SENT',
        sentAt: new Date(),
      },
    });

    console.log(`📧 RFQ sent to ${rfq.vendor.name} (${rfq.vendor.email})`);

    return {
      rfq,
      emailInfo: info,
    };
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
