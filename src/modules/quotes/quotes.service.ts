import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import * as xlsx from 'xlsx';

@Injectable()
export class QuotesService {
  constructor(private prisma: PrismaService) {}

  async listByProject(projectId: string) {
    const quotes = await this.prisma.quote.findMany({
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
        rfq: {
          select: {
            id: true,
            rfqNumber: true,
          },
        },
        _count: {
          select: {
            items: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return quotes;
  }

  async getQuoteDetails(quoteId: string) {
    const quote = await this.prisma.quote.findUnique({
      where: { id: quoteId },
      include: {
        vendor: true,
        rfq: true,
        items: {
          include: {
            bomItem: {
              include: {
                material: true,
              },
            },
          },
        },
      },
    });

    return quote;
  }

  async selectWinner(quoteId: string) {
    const quote = await this.prisma.quote.update({
      where: { id: quoteId },
      data: {
        status: 'AWARDED',
        acceptedAt: new Date(),
      },
    });

    // Reject other quotes for the same project
    await this.prisma.quote.updateMany({
      where: {
        projectId: quote.projectId,
        id: { not: quoteId },
        status: 'RECEIVED',
      },
      data: {
        status: 'DECLINED',
      },
    });

    // Update project status
    await this.prisma.project.update({
      where: { id: quote.projectId },
      data: { status: 'AWARD_PENDING' },
    });

    return {
      success: true,
      message: 'Quote accepted successfully',
      quote,
    };
  }

  async parseQuoteFromEmail(rfqId: string, emailBody: string, attachments?: Buffer[]) {
    // Parse quote from email body or Excel attachment
    let quoteData = null;

    // Try to parse from Excel attachment
    if (attachments && attachments.length > 0) {
      for (const attachment of attachments) {
        try {
          const workbook = xlsx.read(attachment, { type: 'buffer' });
          quoteData = this.parseExcelQuote(workbook);
          if (quoteData) break;
        } catch (error) {
          console.log('Failed to parse Excel attachment:', error.message);
        }
      }
    }

    // Fallback to parsing email body text
    if (!quoteData) {
      quoteData = this.parseEmailBodyQuote(emailBody);
    }

    if (!quoteData) {
      throw new Error('Could not parse quote from email or attachments');
    }

    // Get RFQ to link quote
    const rfq = await this.prisma.rFQ.findUnique({
      where: { id: rfqId },
      include: {
        items: {
          include: {
            bomItem: true,
          },
        },
      },
    });

    // Create quote record
    const quote = await this.prisma.quote.create({
      data: {
        projectId: rfq.projectId,
        vendorId: rfq.vendorId,
        rfqId: rfqId,
        quoteNumber: quoteData.quoteNumber || `Q-${Date.now()}`,
        totalAmount: quoteData.totalAmount,
        validUntil: quoteData.validUntil,
        hasVE: quoteData.hasVE || false,
        veNotes: quoteData.veNotes,
        status: 'RECEIVED',
      },
    });

    // Create quote items
    for (const item of quoteData.items) {
      // Match item to BOM item by description or SKU
      const bomItem = this.matchItemToBOM(item, rfq.items.map(ri => ri.bomItem));

      if (bomItem) {
        await this.prisma.quoteItem.create({
          data: {
            quoteId: quote.id,
            bomItemId: bomItem.id,
            description: item.description,
            quantity: item.quantity,
            uom: item.uom,
            unitPrice: item.unitPrice,
            totalPrice: item.totalPrice,
            isAlternate: item.isAlternate || false,
            alternateFor: item.alternateFor,
            notes: item.notes,
          },
        });
      }
    }

    // Update RFQ status
    await this.prisma.rFQ.update({
      where: { id: rfqId },
      data: { status: 'RESPONDED' },
    });

    return quote;
  }

  private parseExcelQuote(workbook: xlsx.WorkBook): any {
    // Parse Excel quote format
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = xlsx.utils.sheet_to_json(sheet);

    const items = data.map((row: any) => ({
      description: row['Description'] || row['Item'] || row['Material'],
      quantity: parseFloat(row['Quantity'] || row['Qty'] || 0),
      uom: row['UOM'] || row['Unit'] || 'EA',
      unitPrice: parseFloat(row['Unit Price'] || row['Price'] || 0),
      totalPrice: parseFloat(row['Total'] || row['Amount'] || 0),
    }));

    // Find total amount
    const totalRow = data.find((row: any) => 
      row['Description']?.toString().toLowerCase().includes('total') ||
      row['Item']?.toString().toLowerCase().includes('total')
    );

    const totalAmount = totalRow 
      ? parseFloat(totalRow['Total'] || totalRow['Amount'] || 0)
      : items.reduce((sum, item) => sum + item.totalPrice, 0);

    return {
      items,
      totalAmount,
    };
  }

  private parseEmailBodyQuote(emailBody: string): any {
    // Simple text parsing for quote data
    // This is a basic implementation - can be enhanced with NLP
    const lines = emailBody.split('\n');
    const items = [];
    let totalAmount = 0;

    for (const line of lines) {
      // Try to extract line items
      const match = line.match(/(.+?)\s+(\d+\.?\d*)\s+(\d+\.?\d*)\s+(\d+\.?\d*)/);
      if (match) {
        items.push({
          description: match[1].trim(),
          quantity: parseFloat(match[2]),
          unitPrice: parseFloat(match[3]),
          totalPrice: parseFloat(match[4]),
        });
      }

      // Find total
      const totalMatch = line.match(/total[:\s]+[\$]?(\d+\.?\d*)/i);
      if (totalMatch) {
        totalAmount = parseFloat(totalMatch[1]);
      }
    }

    return items.length > 0 ? { items, totalAmount } : null;
  }

  private matchItemToBOM(item: any, bomItems: any[]) {
    // Match quote item to BOM item by description similarity
    const itemDesc = item.description.toLowerCase();
    
    for (const bomItem of bomItems) {
      const bomDesc = bomItem.description.toLowerCase();
      
      // Exact match
      if (itemDesc === bomDesc) {
        return bomItem;
      }

      // Partial match (contains key words)
      const keyWords = itemDesc.split(/\s+/).filter(w => w.length > 3);
      if (keyWords.some(word => bomDesc.includes(word))) {
        return bomItem;
      }
    }

    return null;
  }

  async compareQuotes(projectId: string) {
    // Get all quotes for project
    const quotes = await this.prisma.quote.findMany({
      where: { projectId, status: { not: 'REJECTED' } },
      include: {
        vendor: true,
        items: {
          include: {
            bomItem: true,
          },
        },
      },
    });

    // Get BOM items for comparison
    const bomItems = await this.prisma.bOM.findMany({
      where: { projectId },
    });

    // Build comparison matrix
    const comparison = {
      vendors: quotes.map(q => ({
        vendorId: q.vendorId,
        vendorName: q.vendor.name,
        totalAmount: q.totalAmount,
        itemCount: q.items.length,
        coverage: (q.items.length / bomItems.length) * 100,
        hasVE: q.hasVE,
      })),
      lineItems: bomItems.map(bomItem => {
        const quoteItems = quotes
          .flatMap(q => q.items.map(qi => ({ ...qi, quote: q })))
          .filter(qi => qi.bomItemId === bomItem.id);

        return {
          bomItemId: bomItem.id,
          description: bomItem.description,
          quantity: bomItem.finalQty,
          uom: bomItem.uom,
          quotes: quoteItems.map(qi => ({
            vendorId: qi.quote.vendorId,
            vendorName: qi.quote.vendor.name,
            unitPrice: qi.unitPrice,
            totalPrice: qi.totalPrice,
          })),
          lowestPrice: quoteItems.length > 0 
            ? Math.min(...quoteItems.map(qi => qi.unitPrice))
            : null,
        };
      }),
    };

    return comparison;
  }

  async levelBids(projectId: string) {
    // Create leveled bid comparison
    const comparison = await this.compareQuotes(projectId);

    // Calculate leveled totals (using lowest price for each item)
    const leveledTotal = comparison.lineItems.reduce((sum, item) => {
      if (item.lowestPrice) {
        return sum + (item.lowestPrice * item.quantity);
      }
      return sum;
    }, 0);

    // Calculate savings vs each vendor
    const savings = comparison.vendors.map(vendor => {
      const vendorQuote = comparison.lineItems
        .flatMap(li => li.quotes)
        .filter(q => q.vendorId === vendor.vendorId)
        .reduce((sum, q) => sum + q.totalPrice, 0);

      return {
        vendorId: vendor.vendorId,
        vendorName: vendor.vendorName,
        quotedTotal: vendor.totalAmount,
        leveledTotal,
        savings: vendor.totalAmount - leveledTotal,
        savingsPercent: ((vendor.totalAmount - leveledTotal) / vendor.totalAmount) * 100,
      };
    });

    return {
      leveledTotal,
      savings,
      comparison,
    };
  }
}
