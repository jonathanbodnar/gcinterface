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
        status: 'REJECTED',
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
      },
    });

    if (!rfq) {
      throw new Error('RFQ not found');
    }

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

    // Create quote items AND update vendor pricing
    let pricingUpdates = 0;
    for (const item of quoteData.items) {
      // Match item to BOM item by description or SKU
      const bomItem = this.matchItemToBOM(item, rfq.items.map(ri => ri.bomItem));

      if (bomItem) {
        // Create quote item
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

        // ✨ Update vendor pricing from quote
        if (bomItem.materialId && item.unitPrice > 0) {
          try {
            await this.prisma.vendorMaterialPricing.upsert({
              where: {
                vendorId_materialId: {
                  vendorId: rfq.vendorId,
                  materialId: bomItem.materialId,
                },
              },
              update: {
                unitCost: item.unitPrice,
                uom: item.uom,
                lastQuoteDate: new Date(),
                sourceQuoteId: quote.id,
                updatedAt: new Date(),
              },
              create: {
                vendorId: rfq.vendorId,
                materialId: bomItem.materialId,
                unitCost: item.unitPrice,
                uom: item.uom,
                lastQuoteDate: new Date(),
                sourceQuoteId: quote.id,
                active: true,
              },
            });
            pricingUpdates++;
            console.log(`💰 Updated ${rfq.vendor.name}'s price for ${bomItem.description}: $${item.unitPrice}/${item.uom}`);
          } catch (error) {
            console.error(`Failed to update vendor pricing for ${bomItem.description}:`, error.message);
          }
        }
      }
    }

    console.log(`✅ Quote parsed: ${quote.quoteNumber} | ${quoteData.items.length} items | ${pricingUpdates} prices updated`);

    return {
      quote,
      itemsCreated: quoteData.items.length,
      pricingUpdates,
    };
  }

  async compareQuotes(projectId: string) {
    const quotes = await this.prisma.quote.findMany({
      where: { projectId },
      include: {
        vendor: true,
        items: {
          include: {
            bomItem: true,
          },
        },
      },
    });

    // Group items by BOM item for comparison
    const itemComparison: any = {};

    quotes.forEach(quote => {
      quote.items.forEach(item => {
        const key = item.bomItemId;
        if (!itemComparison[key]) {
          itemComparison[key] = {
            description: item.description,
            quotes: [],
          };
        }

        itemComparison[key].quotes.push({
          vendor: quote.vendor.name,
          price: item.unitPrice,
          total: item.totalPrice,
          isLowest: false, // Will calculate below
        });
      });
    });

    // Identify lowest price per item
    Object.values(itemComparison).forEach((item: any) => {
      const prices = item.quotes.map((q: any) => q.price).filter((p: number) => p > 0);
      const lowest = Math.min(...prices);
      item.quotes.forEach((q: any) => {
        q.isLowest = q.price === lowest;
      });
    });

    return {
      vendors: quotes.map(q => q.vendor.name),
      items: Object.values(itemComparison),
    };
  }

  async levelBids(projectId: string) {
    const quotes = await this.prisma.quote.findMany({
      where: { projectId },
      include: {
        vendor: true,
        items: true,
      },
    });

    const leveledItems = [];
    const itemGroups: Record<string, any[]> = {};

    // Group quote items by description
    quotes.forEach(quote => {
      quote.items.forEach(item => {
        if (!itemGroups[item.description]) {
          itemGroups[item.description] = [];
        }
        itemGroups[item.description].push({
          vendor: quote.vendor.name,
          price: item.unitPrice,
          total: item.totalPrice,
        });
      });
    });

    // Find lowest price for each item
    Object.entries(itemGroups).forEach(([description, items]) => {
      const prices = items.map(i => i.total).filter(p => p > 0);
      if (prices.length === 0) return;

      const lowest = Math.min(...prices);
      const highest = Math.max(...prices);
      const lowestItem = items.find(i => i.total === lowest);

      leveledItems.push({
        description,
        lowestPrice: lowest,
        highestPrice: highest,
        lowestVendor: lowestItem?.vendor,
        savings: highest - lowest,
      });
    });

    const totalLowest = leveledItems.reduce((sum, item) => sum + item.lowestPrice, 0);
    const totalHighest = leveledItems.reduce((sum, item) => sum + item.highestPrice, 0);

    // Find vendor totals
    const vendorTotals = quotes.map(q => ({
      vendor: q.vendor.name,
      total: q.totalAmount,
    }));

    const lowestVendorTotal = Math.min(...vendorTotals.map(v => v.total));
    const highestVendorTotal = Math.max(...vendorTotals.map(v => v.total));

    return {
      leveledItems,
      lowestTotal: totalLowest,
      highestTotal: totalHighest,
      potentialSavings: totalHighest - totalLowest,
      savingsPercent: ((totalHighest - totalLowest) / totalHighest) * 100,
      lowestVendor: vendorTotals.find(v => v.total === lowestVendorTotal)?.vendor,
      highestVendor: vendorTotals.find(v => v.total === highestVendorTotal)?.vendor,
    };
  }

  private matchItemToBOM(quoteItem: any, bomItems: any[]): any {
    // Try exact SKU match first
    if (quoteItem.sku) {
      const match = bomItems.find(bi => bi.sku === quoteItem.sku);
      if (match) return match;
    }

    // Try description similarity
    const desc = quoteItem.description.toLowerCase();
    const match = bomItems.find(bi => {
      const bomDesc = bi.description.toLowerCase();
      return bomDesc.includes(desc) || desc.includes(bomDesc);
    });

    return match;
  }

  private parseExcelQuote(workbook: xlsx.WorkBook): any {
    // Parse Excel quote - look for common formats
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = xlsx.utils.sheet_to_json(sheet);

    const items = [];
    let totalAmount = 0;

    for (const row of data as any[]) {
      // Flexible column mapping
      const item = {
        description: row.description || row.Description || row.Item || row.ITEM,
        quantity: parseFloat(row.quantity || row.Quantity || row.Qty || row.QTY || 0),
        uom: row.uom || row.UOM || row.Unit || row.UNIT || 'EA',
        unitPrice: parseFloat(row.unitPrice || row['Unit Price'] || row.price || row.Price || 0),
        totalPrice: parseFloat(row.totalPrice || row['Total Price'] || row.total || row.Total || 0),
        sku: row.sku || row.SKU || row.Code,
      };

      if (item.description && item.unitPrice > 0) {
        if (!item.totalPrice) {
          item.totalPrice = item.quantity * item.unitPrice;
        }
        items.push(item);
        totalAmount += item.totalPrice;
      }
    }

    if (items.length === 0) return null;

    return {
      quoteNumber: null,
      items,
      totalAmount,
      hasVE: false,
    };
  }

  private parseEmailBodyQuote(emailBody: string): any {
    // Simple text parsing - look for patterns like:
    // "VCT Flooring - $3.50/SF - Total: $8,750"
    // This is very basic - production would use more sophisticated parsing

    const lines = emailBody.split('\n');
    const items = [];
    let totalAmount = 0;

    for (const line of lines) {
      // Look for price patterns
      const priceMatch = line.match(/\$?([\d,]+\.?\d*)/);
      if (priceMatch) {
        const price = parseFloat(priceMatch[1].replace(/,/g, ''));
        if (price > 0) {
          items.push({
            description: line.split('-')[0]?.trim() || 'Unknown item',
            quantity: 1,
            uom: 'EA',
            unitPrice: price,
            totalPrice: price,
          });
          totalAmount += price;
        }
      }
    }

    if (items.length === 0) return null;

    return {
      quoteNumber: null,
      items,
      totalAmount,
      hasVE: false,
    };
  }
}
