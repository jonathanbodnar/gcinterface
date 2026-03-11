import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import * as xlsx from 'xlsx';
import * as pdfParse from 'pdf-parse';

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

    // Update project status to AWARD_PENDING (don't reject other quotes -
    // multiple vendors can be awarded for different materials)
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
    console.log('🔍 parseQuoteFromEmail called');
    console.log(`  RFQ Number: ${rfqId}`);
    console.log(`  Attachments: ${attachments?.length || 0}`);
    console.log(`  Email body length: ${emailBody?.length || 0} chars`);
    
    // Get RFQ first so we can always create items
    const rfq = await this.prisma.rFQ.findUnique({
      where: { rfqNumber: rfqId },
      include: {
        vendor: true,
        items: {
          include: {
            bomItem: {
              include: { material: true },
            },
          },
        },
      },
    });

    if (!rfq) {
      throw new Error(`RFQ with number ${rfqId} not found`);
    }

    console.log(`✅ RFQ found: ${rfq.rfqNumber} for ${rfq.vendor.name} (${rfq.items.length} items)`);

    // Try parsing from all available sources
    let quoteData = null;
    let parseSource = 'none';

    if (attachments && attachments.length > 0) {
      for (let i = 0; i < attachments.length; i++) {
        const attachment = attachments[i];
        console.log(`\n🔍 Trying attachment ${i + 1}/${attachments.length} (${attachment.length} bytes)`);
        
        try {
          const pdfData = await pdfParse(attachment);
          console.log(`  📄 PDF text extracted: ${pdfData.text.length} chars`);
          console.log(`  📄 First 300 chars: ${pdfData.text.substring(0, 300)}`);
          quoteData = this.parsePDFQuote(pdfData.text);
          if (quoteData) {
            parseSource = 'pdf';
            console.log(`  ✅ Parsed ${quoteData.items.length} items from PDF`);
            break;
          }
        } catch (pdfError) {
          console.log(`  ❌ PDF parse failed: ${pdfError.message}`);
          try {
            const workbook = xlsx.read(attachment, { type: 'buffer' });
            quoteData = this.parseExcelQuote(workbook);
            if (quoteData) {
              parseSource = 'excel';
              break;
            }
          } catch (excelError) {
            console.log(`  ❌ Excel parse failed: ${excelError.message}`);
          }
        }
      }
    }

    if (!quoteData && emailBody) {
      console.log('⚠️ No data from attachments, trying email body...');
      quoteData = this.parseEmailBodyQuote(emailBody);
      if (quoteData) parseSource = 'email';
    }

    console.log(`📊 Parse result: source=${parseSource}, items=${quoteData?.items?.length || 0}, total=$${quoteData?.totalAmount || 0}`);

    // Create quote record - ALWAYS, even if parsing extracted nothing
    const quote = await this.prisma.quote.create({
      data: {
        projectId: rfq.projectId,
        vendorId: rfq.vendorId,
        rfqId: rfq.id,
        quoteNumber: quoteData?.quoteNumber || `Q-${Date.now()}`,
        totalAmount: quoteData?.totalAmount || 0,
        validUntil: quoteData?.validUntil,
        hasVE: quoteData?.hasVE || false,
        veNotes: quoteData?.veNotes,
        status: 'RECEIVED',
      },
    });

    // Update RFQ status to RESPONDED
    await this.prisma.rFQ.update({
      where: { id: rfq.id },
      data: { status: 'RESPONDED' },
    });

    // Update project status
    try {
      await this.prisma.project.update({
        where: { id: rfq.projectId },
        data: { status: 'QUOTE_COMPARISON' },
      });
    } catch { /* non-critical */ }

    // ALWAYS create QuoteItems for every RFQ item (what we asked for).
    // Then overlay any parsed prices we could match.
    let matchedCount = 0;
    let pricingUpdates = 0;
    const parsedItems = quoteData?.items || [];

    for (const rfqItem of rfq.items) {
      const bomItem = rfqItem.bomItem;

      // Try to find a matching parsed price for this BOM item
      const matchedParsed = this.matchParsedToRFQItem(rfqItem, parsedItems);

      const unitPrice = matchedParsed?.unitPrice || 0;
      const totalPrice = matchedParsed?.totalPrice || 0;
      const matchNotes = matchedParsed
        ? `Auto-matched from ${parseSource}: "${matchedParsed.description}"`
        : `Awaiting manual price entry`;

      if (matchedParsed) matchedCount++;

      await this.prisma.quoteItem.create({
        data: {
          quoteId: quote.id,
          bomItemId: bomItem.id,
          description: bomItem.description,
          quantity: rfqItem.quantity,
          uom: rfqItem.uom,
          unitPrice,
          totalPrice,
          isAlternate: false,
          notes: matchNotes,
        },
      });

      // Update vendor pricing if we have a price
      if (bomItem.materialId && unitPrice > 0) {
        try {
          await this.prisma.vendorMaterialPricing.upsert({
            where: {
              vendorId_materialId: {
                vendorId: rfq.vendorId,
                materialId: bomItem.materialId,
              },
            },
            update: {
              unitCost: unitPrice,
              uom: rfqItem.uom,
              lastQuoteDate: new Date(),
              sourceQuoteId: quote.id,
              updatedAt: new Date(),
            },
            create: {
              vendorId: rfq.vendorId,
              materialId: bomItem.materialId,
              unitCost: unitPrice,
              uom: rfqItem.uom,
              lastQuoteDate: new Date(),
              sourceQuoteId: quote.id,
              active: true,
            },
          });
          pricingUpdates++;
        } catch (error) {
          console.error(`Failed to update pricing for ${bomItem.description}:`, error.message);
        }
      }
    }

    // Update quote total from matched items if we have better data
    if (matchedCount > 0) {
      const computedTotal = rfq.items.reduce((sum, rfqItem) => {
        const matched = this.matchParsedToRFQItem(rfqItem, parsedItems);
        return sum + (matched?.totalPrice || 0);
      }, 0);
      if (computedTotal > 0) {
        await this.prisma.quote.update({
          where: { id: quote.id },
          data: { totalAmount: computedTotal },
        });
      }
    }

    console.log(`✅ Quote created: ${quote.quoteNumber}`);
    console.log(`   ${rfq.items.length} line items created (${matchedCount} with prices from ${parseSource})`);
    console.log(`   ${pricingUpdates} vendor prices updated`);

    return {
      quote,
      itemsCreated: rfq.items.length,
      matchedItems: matchedCount,
      parseSource,
      pricingUpdates,
    };
  }

  private matchParsedToRFQItem(rfqItem: any, parsedItems: any[]): any {
    if (parsedItems.length === 0) return null;
    const bomDesc = rfqItem.bomItem?.description?.toLowerCase() || rfqItem.description?.toLowerCase() || '';
    const bomWords = bomDesc.split(/\s+/).filter(w => w.length > 2);

    let bestMatch: any = null;
    let bestScore = 0;

    for (const parsed of parsedItems) {
      const parsedDesc = (parsed.description || '').toLowerCase();

      // Exact substring match
      if (bomDesc.includes(parsedDesc) || parsedDesc.includes(bomDesc)) {
        return parsed;
      }

      // Word overlap scoring
      const parsedWords = parsedDesc.split(/\s+/).filter(w => w.length > 2);
      const overlap = bomWords.filter(w => parsedWords.some(pw => pw.includes(w) || w.includes(pw)));
      const score = overlap.length / Math.max(bomWords.length, 1);

      if (score > bestScore && score >= 0.4) {
        bestScore = score;
        bestMatch = parsed;
      }
    }

    return bestMatch;
  }

  async populateQuoteItems(quoteId: string) {
    const quote = await this.prisma.quote.findUnique({
      where: { id: quoteId },
      include: {
        rfq: {
          include: {
            items: {
              include: {
                bomItem: { include: { material: true } },
              },
            },
          },
        },
        items: true,
      },
    });

    if (!quote) throw new Error('Quote not found');
    if (!quote.rfq) throw new Error('Quote has no linked RFQ');

    // Delete existing items (if any garbage was created before)
    if (quote.items.length > 0) {
      await this.prisma.quoteItem.deleteMany({ where: { quoteId } });
    }

    // Create a QuoteItem for every RFQ item
    let created = 0;
    for (const rfqItem of quote.rfq.items) {
      await this.prisma.quoteItem.create({
        data: {
          quoteId,
          bomItemId: rfqItem.bomItem.id,
          description: rfqItem.bomItem.description,
          quantity: rfqItem.quantity,
          uom: rfqItem.uom,
          unitPrice: 0,
          totalPrice: 0,
          isAlternate: false,
          notes: 'Awaiting manual price entry',
        },
      });
      created++;
    }

    // Reset quote total
    await this.prisma.quote.update({
      where: { id: quoteId },
      data: { totalAmount: 0 },
    });

    return { quoteId, itemsCreated: created };
  }

  async updateQuoteItem(quoteItemId: string, data: { unitPrice: number; totalPrice: number }) {
    const item = await this.prisma.quoteItem.update({
      where: { id: quoteItemId },
      data: {
        unitPrice: data.unitPrice,
        totalPrice: data.totalPrice,
        notes: 'Manually entered',
      },
      include: { quote: true },
    });

    // Recalculate quote total
    const allItems = await this.prisma.quoteItem.findMany({
      where: { quoteId: item.quoteId },
    });
    const newTotal = allItems.reduce((sum, i) => sum + (i.totalPrice || 0), 0);
    await this.prisma.quote.update({
      where: { id: item.quoteId },
      data: { totalAmount: newTotal },
    });

    return { item, newTotal };
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

    if (quotes.length === 0) {
      return { vendors: [], items: [] };
    }

    const vendors = quotes.map(q => q.vendor.name);
    
    // Get all unique BOM items across all quotes
    const allBomItemIds = new Set<string>();
    quotes.forEach(quote => {
      quote.items.forEach(item => {
        allBomItemIds.add(item.bomItemId);
      });
    });

    // Create comparison matrix
    const itemComparison = Array.from(allBomItemIds).map(bomItemId => {
      // Find the item description (from any quote that has it)
      const sampleItem = quotes
        .flatMap(q => q.items)
        .find(item => item.bomItemId === bomItemId);

      const description = sampleItem?.description || 'Unknown';

      // Get price from each vendor for this item
      const vendorQuotes = vendors.map(vendorName => {
        const quote = quotes.find(q => q.vendor.name === vendorName);
        const item = quote?.items.find(i => i.bomItemId === bomItemId);

        return {
          vendor: vendorName,
          price: item?.unitPrice || 0,
          total: item?.totalPrice || 0,
          isLowest: false, // Will calculate below
        };
      });

      // Identify lowest price
      const prices = vendorQuotes.map(q => q.price).filter(p => p > 0);
      if (prices.length > 0) {
        const lowest = Math.min(...prices);
        vendorQuotes.forEach(q => {
          q.isLowest = q.price === lowest && q.price > 0;
        });
      }

      return {
        description,
        quotes: vendorQuotes,
      };
    });

    // Compute vendor totals from line items (more accurate than stored totalAmount)
    const vendorTotals = vendors.map(vendorName => {
      const quote = quotes.find(q => q.vendor.name === vendorName);
      const lineItemTotal = quote?.items.reduce((sum, item) => sum + (item.totalPrice || 0), 0) || 0;
      return {
        vendor: vendorName,
        lineItemTotal,
        storedTotal: quote?.totalAmount || 0,
      };
    });

    return {
      vendors,
      items: itemComparison,
      vendorTotals,
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
    const lines = emailBody.split('\n').map(l => l.trim()).filter(Boolean);
    const items = [];
    let totalAmount = 0;

    // Look for a total line like "Total: $12,345" or "Grand Total: $12,345"
    let explicitTotal = 0;
    for (const line of lines) {
      const totalMatch = line.match(/(?:grand\s*)?total\s*[:=]?\s*\$?([\d,]+\.?\d*)/i);
      if (totalMatch) {
        explicitTotal = parseFloat(totalMatch[1].replace(/,/g, ''));
      }
    }

    for (const line of lines) {
      // Only match lines that look like actual line items with structured pricing
      // Pattern: "Description - $price/UOM - Total: $total"
      const structuredMatch = line.match(/^(.+?)\s*[-–]\s*\$?([\d,]+\.?\d*)\s*\/\s*(\w+)\s*[-–]\s*(?:Total:?\s*)?\$?([\d,]+\.?\d*)/i);
      if (structuredMatch) {
        const [, description, unitPrice, uom, total] = structuredMatch;
        const price = parseFloat(total.replace(/,/g, ''));
        if (price > 0 && description.length > 3) {
          items.push({
            description: description.trim(),
            quantity: 1,
            uom: uom.trim(),
            unitPrice: parseFloat(unitPrice.replace(/,/g, '')),
            totalPrice: price,
          });
          totalAmount += price;
          continue;
        }
      }

      // Pattern: "Description  Qty UOM  $Unit  $Total" (tab/space-separated table row)
      const tableMatch = line.match(/^(.{5,}?)\s{2,}([\d.]+)\s+(\w{1,5})\s+\$?([\d,]+\.?\d*)\s+\$?([\d,]+\.?\d*)\s*$/);
      if (tableMatch) {
        const [, description, qty, uom, unitPrice, total] = tableMatch;
        const price = parseFloat(total.replace(/,/g, ''));
        if (price > 0) {
          items.push({
            description: description.trim(),
            quantity: parseFloat(qty),
            uom: uom.trim(),
            unitPrice: parseFloat(unitPrice.replace(/,/g, '')),
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
      totalAmount: explicitTotal > 0 ? explicitTotal : totalAmount,
      hasVE: false,
    };
  }

  private parsePDFQuote(pdfText: string): any {
    console.log('📄 Parsing PDF quote...');
    console.log('📄 PDF Text length:', pdfText.length, 'chars');
    console.log('📄 First 1000 chars:');
    console.log(pdfText.substring(0, 1000));
    console.log('📄 ---END SAMPLE---');
    
    const lines = pdfText.split('\n').map(l => l.trim()).filter(Boolean);
    console.log(`📄 PDF has ${lines.length} non-empty lines`);
    console.log('📄 All lines (first 50):');
    lines.slice(0, 50).forEach((line, i) => console.log(`  ${i + 1}: "${line}"`));
    console.log('📄 ---END LINES---');
    
    const items = [];
    let totalAmount = 0;
    let quoteNumber: string | null = null;

    // Try to find a quote number
    for (const line of lines) {
      const qnMatch = line.match(/(?:quote|proposal|estimate)\s*#?\s*:?\s*(\S+)/i);
      if (qnMatch) { quoteNumber = qnMatch[1]; break; }
    }

    // Find all dollar amounts in the text to understand the data
    const allPrices: { line: string; amounts: number[] }[] = [];
    for (const line of lines) {
      const amounts = [...line.matchAll(/\$\s*([\d,]+\.?\d*)/g)].map(m => parseFloat(m[1].replace(/,/g, '')));
      if (amounts.length > 0 && amounts.some(a => a > 0)) {
        allPrices.push({ line, amounts });
      }
    }
    console.log(`📄 Found ${allPrices.length} lines with dollar amounts`);
    allPrices.forEach(p => console.log(`  💲 "${p.line.substring(0, 100)}" => [${p.amounts.join(', ')}]`));

    for (const line of lines) {
      // Skip header/label lines
      if (/^(item|#|no\.|description|material|qty|quantity|uom|unit|price|total|amount|subtotal)\s*$/i.test(line)) continue;
      if (/^(date|from|to|phone|fax|email|address|page|quote|proposal|estimate|terms)/i.test(line)) continue;

      let matched = false;

      // Pattern: "ItemNum  Description  Qty UOM  $Price/UOM  ~$Total"
      const p1 = line.match(/^(\d+)\s+(.+?)\s+([\d,.]+)\s+(SF|LF|EA|SY|CY|CF|GAL|LB|TON|HR|LS|SET|PC|BOX|BAG|ROLL|SHT|BDL)\s+\$?([\d,]+\.?\d*)\s*(?:\/\s*\w+\s*)?[~≈]?\$?([\d,]+\.?\d*)/i);
      if (p1) {
        const [, , desc, qty, uom, unitP, total] = p1;
        items.push({ description: desc.trim(), quantity: parseFloat(qty.replace(/,/g, '')), uom: uom.toUpperCase(), unitPrice: parseFloat(unitP.replace(/,/g, '')), totalPrice: parseFloat(total.replace(/,/g, '')) });
        totalAmount += parseFloat(total.replace(/,/g, ''));
        matched = true;
      }

      // Pattern: "Description  Qty  UOM  $UnitPrice  $TotalPrice" (no item number)
      if (!matched) {
        const p2 = line.match(/^(.{4,}?)\s{2,}([\d,.]+)\s+(SF|LF|EA|SY|CY|CF|GAL|LB|TON|HR|LS|SET|PC|BOX|BAG|ROLL|SHT|BDL)\s+\$?([\d,]+\.?\d*)\s+\$?([\d,]+\.?\d*)\s*$/i);
        if (p2) {
          const [, desc, qty, uom, unitP, total] = p2;
          items.push({ description: desc.trim(), quantity: parseFloat(qty.replace(/,/g, '')), uom: uom.toUpperCase(), unitPrice: parseFloat(unitP.replace(/,/g, '')), totalPrice: parseFloat(total.replace(/,/g, '')) });
          totalAmount += parseFloat(total.replace(/,/g, ''));
          matched = true;
        }
      }

      // Pattern: line with description + two dollar amounts (unit price and total)
      if (!matched) {
        const p3 = line.match(/^(.{4,}?)\s+\$?([\d,]+\.?\d{2})\s+\$?([\d,]+\.?\d{2})\s*$/);
        if (p3) {
          const [, desc, price1, price2] = p3;
          const p1v = parseFloat(price1.replace(/,/g, ''));
          const p2v = parseFloat(price2.replace(/,/g, ''));
          if (p1v > 0 && p2v > 0 && !/(total|subtotal|tax|shipping|grand)/i.test(desc)) {
            items.push({ description: desc.trim(), quantity: p2v / p1v || 1, uom: 'EA', unitPrice: p1v, totalPrice: p2v });
            totalAmount += p2v;
            matched = true;
          }
        }
      }

      // Pattern: line with description + one dollar amount (lump sum)
      if (!matched) {
        const p4 = line.match(/^(.{6,}?)\s+\$\s*([\d,]+\.?\d{2})\s*$/);
        if (p4) {
          const price = parseFloat(p4[2].replace(/,/g, ''));
          if (price > 1 && !/(total|subtotal|tax|shipping|grand|balance|deposit|due)/i.test(p4[1])) {
            items.push({ description: p4[1].trim(), quantity: 1, uom: 'LS', unitPrice: price, totalPrice: price });
            totalAmount += price;
            matched = true;
          }
        }
      }

      if (matched) {
        console.log(`  ✅ Parsed: "${items[items.length - 1].description}" $${items[items.length - 1].unitPrice} x ${items[items.length - 1].quantity} = $${items[items.length - 1].totalPrice}`);
      }
    }

    // Look for an explicit total
    let explicitTotal = 0;
    for (const line of lines) {
      const totalMatch = line.match(/(?:grand\s*)?total\s*[:=]?\s*\$?\s*([\d,]+\.?\d*)/i);
      if (totalMatch) {
        const t = parseFloat(totalMatch[1].replace(/,/g, ''));
        if (t > explicitTotal) explicitTotal = t;
      }
    }

    console.log(`📄 PDF parsing: ${items.length} items, computed=$${totalAmount}, explicit total=$${explicitTotal}`);

    if (items.length === 0) {
      console.log('⚠️ No structured items found in PDF');
      return null;
    }

    return {
      quoteNumber,
      items,
      totalAmount: explicitTotal > 0 ? explicitTotal : totalAmount,
      hasVE: pdfText.toLowerCase().includes('alternative') || pdfText.toLowerCase().includes('substitute'),
    };
  }
}

