import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import * as nodemailer from 'nodemailer';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SubcontractsService {
  private transporter: nodemailer.Transporter;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get('SMTP_HOST'),
      port: parseInt(this.configService.get('SMTP_PORT', '587')),
      secure: this.configService.get('SMTP_SECURE') === 'true',
      auth: {
        user: this.configService.get('SMTP_USER'),
        pass: this.configService.get('SMTP_PASSWORD'),
      },
    });
  }

  async createSubcontract(projectId: string, vendorId: string, quoteId: string, userId: string) {
    // Get quote and vendor
    const quote = await this.prisma.quote.findUnique({
      where: { id: quoteId },
      include: {
        vendor: true,
        items: {
          include: {
            bomItem: true,
          },
        },
      },
    });

    // Generate contract number
    const contractNumber = `SUB-${Date.now()}`;

    // Determine trade from materials
    const trade = this.determineTrade(quote.items.map(qi => qi.bomItem));

    // Create subcontract
    const subcontract = await this.prisma.subcontract.create({
      data: {
        projectId,
        vendorId,
        trade,
        contractNumber,
        scopeOfWork: this.generateScopeOfWork(quote.items),
        materials: quote.items.map(qi => ({
          bomItemId: qi.bomItemId,
          description: qi.description,
          quantity: qi.quantity,
          unitPrice: qi.unitPrice,
        })),
        contractAmount: quote.totalAmount,
        status: 'DRAFT',
      },
    });

    return subcontract;
  }

  async awardSubcontract(subcontractId: string, userId: string) {
    const subcontract = await this.prisma.subcontract.findUnique({
      where: { id: subcontractId },
      include: {
        project: true,
        vendor: true,
      },
    });

    // Update status
    await this.prisma.subcontract.update({
      where: { id: subcontractId },
      data: {
        status: 'AWARDED',
        awardedAt: new Date(),
        awardedBy: userId,
      },
    });

    // Update quote status
    const quote = await this.prisma.quote.findFirst({
      where: {
        projectId: subcontract.projectId,
        vendorId: subcontract.vendorId,
      },
    });

    if (quote) {
      await this.prisma.quote.update({
        where: { id: quote.id },
        data: { status: 'AWARDED' },
      });
    }

    // Send award email
    await this.sendAwardEmail(subcontract);

    // Send non-award emails to other vendors
    await this.sendNonAwardEmails(subcontract.projectId, subcontract.vendorId);

    return subcontract;
  }

  private async sendAwardEmail(subcontract: any) {
    const template = await this.prisma.emailTemplate.findFirst({
      where: {
        type: 'AWARD',
        active: true,
      },
    });

    let emailBody = template?.body || this.getDefaultAwardTemplate();
    emailBody = emailBody.replace('{{PROJECT_NAME}}', subcontract.project.name);
    emailBody = emailBody.replace('{{CONTRACT_NUMBER}}', subcontract.contractNumber);
    emailBody = emailBody.replace('{{CONTRACT_AMOUNT}}', `$${subcontract.contractAmount.toLocaleString()}`);

    await this.transporter.sendMail({
      from: this.configService.get('SMTP_FROM'),
      to: subcontract.vendor.email,
      subject: `Subcontract Award - ${subcontract.contractNumber}`,
      html: emailBody,
    });

    console.log(`📧 Award email sent to ${subcontract.vendor.name}`);
  }

  private async sendNonAwardEmails(projectId: string, awardedVendorId: string) {
    // Get all other vendors who submitted quotes
    const quotes = await this.prisma.quote.findMany({
      where: {
        projectId,
        vendorId: { not: awardedVendorId },
        status: { not: 'REJECTED' },
      },
      include: {
        vendor: true,
      },
    });

    const template = await this.prisma.emailTemplate.findFirst({
      where: {
        type: 'NON_AWARD',
        active: true,
      },
    });

    let emailBody = template?.body || this.getDefaultNonAwardTemplate();

    for (const quote of quotes) {
      await this.transporter.sendMail({
        from: this.configService.get('SMTP_FROM'),
        to: quote.vendor.email,
        subject: 'Thank you for your quote',
        html: emailBody,
      });
    }

    console.log(`📧 Non-award emails sent to ${quotes.length} vendors`);
  }

  private determineTrade(bomItems: any[]): string {
    // Determine primary trade from materials
    const trades = { M: 0, E: 0, P: 0, A: 0 };

    for (const item of bomItems) {
      if (item.category.includes('HVAC') || item.category.includes('Mechanical')) trades.M++;
      if (item.category.includes('Electrical') || item.category.includes('Lighting')) trades.E++;
      if (item.category.includes('Plumbing') || item.category.includes('Water')) trades.P++;
      trades.A++;
    }

    return Object.entries(trades).sort((a, b) => b[1] - a[1])[0][0];
  }

  private generateScopeOfWork(items: any[]): string {
    return `Supply and install the following materials:\n${items.map((item, i) => `${i + 1}. ${item.description} - ${item.quantity} ${item.uom}`).join('\n')}`;
  }

  private getDefaultAwardTemplate(): string {
    return `
      <html>
        <body style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px;">
          <h2>Subcontract Award</h2>
          <p>Congratulations! We are pleased to award you the subcontract for:</p>
          <p><strong>Project:</strong> {{PROJECT_NAME}}</p>
          <p><strong>Contract Number:</strong> {{CONTRACT_NUMBER}}</p>
          <p><strong>Contract Amount:</strong> {{CONTRACT_AMOUNT}}</p>
          <p>Please confirm your acceptance and we will send the formal contract documents.</p>
          <p>Thank you,<br/>GC Legacy Construction</p>
        </body>
      </html>
    `;
  }

  private getDefaultNonAwardTemplate(): string {
    return `
      <html>
        <body style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px;">
          <h2>Thank You</h2>
          <p>Thank you for submitting your quote. While we have selected another vendor for this project, we appreciate your interest and will keep you in mind for future opportunities.</p>
          <p>Best regards,<br/>GC Legacy Construction</p>
        </body>
      </html>
    `;
  }
}
