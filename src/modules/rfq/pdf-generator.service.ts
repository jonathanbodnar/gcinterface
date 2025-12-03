import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
const PDFDocument = require('pdfkit');

@Injectable()
export class PDFGeneratorService {
  private readonly logger = new Logger(PDFGeneratorService.name);

  constructor(private prisma: PrismaService) {}

  async generateRFQPDF(rfqId: string): Promise<Buffer> {
    this.logger.log(`Generating PDF for RFQ ${rfqId}`);
    
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
      this.logger.error(`RFQ ${rfqId} not found`);
      throw new Error('RFQ not found');
    }

    if (!rfq.items || rfq.items.length === 0) {
      this.logger.warn(`RFQ ${rfqId} has no items`);
    }

    this.logger.log(`Found RFQ with ${rfq.items?.length || 0} items`);

    return new Promise((resolve, reject) => {
      try {
        this.logger.log('Creating PDF document...');
        const doc = new PDFDocument({ size: 'LETTER', margin: 50 });
        const chunks: Buffer[] = [];

        doc.on('data', (chunk: Buffer) => chunks.push(chunk));
        doc.on('end', () => {
          this.logger.log(`PDF generated successfully for RFQ ${rfqId}`);
          resolve(Buffer.concat(chunks));
        });
        doc.on('error', (error: Error) => {
          this.logger.error(`PDF generation error: ${error.message}`, error.stack);
          reject(error);
        });

      // Header
      doc.fontSize(20).text('REQUEST FOR QUOTE', { align: 'center' });
      doc.moveDown();
      doc.fontSize(12).text(`RFQ #${rfq.rfqNumber}`, { align: 'center' });
      doc.moveDown(2);

      // Project Information
      doc.fontSize(14).text('Project Information', { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(10);
      doc.text(`Project: ${rfq.project.name}`);
      doc.text(`Location: ${rfq.project.location}`);
      if (rfq.project.totalSF) {
        doc.text(`Total Area: ${rfq.project.totalSF.toLocaleString()} SF`);
      }
      if (rfq.dueDate) {
        doc.text(`Due Date: ${new Date(rfq.dueDate).toLocaleDateString()}`, { 
          color: 'red', 
          continued: false 
        });
      }
      doc.moveDown(2);

      // Vendor Information
      doc.fontSize(14).text('To:', { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(10);
      doc.text(rfq.vendor.name);
      if (rfq.vendor.address) doc.text(rfq.vendor.address);
      if (rfq.vendor.email) doc.text(`Email: ${rfq.vendor.email}`);
      if (rfq.vendor.phone) doc.text(`Phone: ${rfq.vendor.phone}`);
      doc.moveDown(2);

      // Scope
      doc.fontSize(14).text('Scope of Work', { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(10);
      
      const isSupplier = rfq.vendor.type === 'MATERIAL_SUPPLIER';
      if (isSupplier) {
        doc.text('Please provide pricing for the materials listed below.');
      } else {
        doc.text('Please provide pricing for labor and installation services for the materials listed below.');
      }
      doc.moveDown(2);

      // Materials Table
      doc.fontSize(14).text('Materials Required', { underline: true });
      doc.moveDown(1);

      // Table headers
      const tableTop = doc.y;
      const itemCol = 50;
      const descCol = 100;
      const qtyCol = 350;
      const uomCol = 420;
      const priceCol = isSupplier ? 470 : null;

      doc.fontSize(9).fillColor('black');
      doc.text('Item', itemCol, tableTop, { width: 40, continued: false });
      doc.text('Description', descCol, tableTop, { width: 240 });
      doc.text('Quantity', qtyCol, tableTop, { width: 60, align: 'right' });
      doc.text('UOM', uomCol, tableTop, { width: 40 });
      if (isSupplier) {
        doc.text('Unit Price', priceCol, tableTop, { width: 80, align: 'right' });
      }

      // Draw header line
      doc.moveTo(itemCol, tableTop + 15)
         .lineTo(isSupplier ? 550 : 470, tableTop + 15)
         .stroke();

      let y = tableTop + 25;
      
      // Table rows
      rfq.items.forEach((item, index) => {
        if (y > 700) {
          doc.addPage();
          y = 50;
        }

        doc.fontSize(9);
        doc.text((index + 1).toString(), itemCol, y, { width: 40 });
        doc.text(item.description, descCol, y, { width: 240 });
        doc.text(item.quantity.toFixed(2), qtyCol, y, { width: 60, align: 'right' });
        doc.text(item.uom, uomCol, y, { width: 40 });
        
        if (isSupplier) {
          doc.text('$_______', priceCol, y, { width: 80, align: 'right' });
        }

        y += 30;
      });

      doc.moveDown(2);

      // Instructions
      // Check current Y position and add page if needed
      const currentY = doc.y;
      if (currentY > 650) {
        doc.addPage();
      }

      doc.fontSize(12).text('Instructions', { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(9);
      
      if (isSupplier) {
        doc.list([
          'Please provide your best pricing for each material',
          'Include lead times and minimum order quantities',
          'Specify payment terms',
          'Note any value engineering alternatives you recommend',
        ]);
      } else {
        doc.list([
          'Please provide lump sum pricing for labor and installation',
          'Include crew size and proposed schedule',
          'Provide insurance certificates',
          'List equipment you will provide',
          'Include references from similar projects',
        ]);
      }

      doc.moveDown(1);
      doc.text(`Please submit your quote by ${rfq.dueDate ? new Date(rfq.dueDate).toLocaleDateString() : 'TBD'}`);
      doc.moveDown(1);
      doc.text('Thank you for your quote!');
      doc.text('GC Legacy Construction');

      doc.end();
      } catch (error) {
        this.logger.error(`Failed to create PDF document: ${error.message}`, error.stack);
        reject(error);
      }
    });
  }
}

