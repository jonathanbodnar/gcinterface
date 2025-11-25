import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';

export interface QuoteCoverageAnalysis {
  coveragePercent: number;
  totalRequested: number;
  exactMatches: number;
  alternatives: number;
  missing: number;
  details: {
    matched: any[];
    alternatives: any[];
    missing: any[];
  };
}

@Injectable()
export class QuoteAnalysisService {
  constructor(private prisma: PrismaService) {}

  async analyzeQuoteCoverage(quoteId: string): Promise<QuoteCoverageAnalysis> {
    const quote = await this.prisma.quote.findUnique({
      where: { id: quoteId },
      include: {
        rfq: {
          include: {
            items: {
              include: {
                bomItem: true,
              },
            },
          },
        },
        items: true,
      },
    });

    if (!quote) {
      throw new Error('Quote not found');
    }

    const requestedItems = quote.rfq.items;
    const quotedItems = quote.items;

    const matched = [];
    const alternatives = [];
    const missing = [];

    for (const rfqItem of requestedItems) {
      // Look for exact match
      const exactMatch = quotedItems.find(qi => qi.bomItemId === rfqItem.bomItemId && qi.matchType === 'EXACT');
      
      if (exactMatch) {
        matched.push({
          rfqItem: rfqItem.bomItem,
          quoteItem: exactMatch,
          type: 'EXACT',
        });
      } else {
        // Look for alternative
        const alt = quotedItems.find(qi => 
          qi.alternateFor === rfqItem.bomItemId || 
          qi.matchType === 'ALTERNATIVE'
        );
        
        if (alt) {
          alternatives.push({
            original: rfqItem.bomItem,
            alternative: alt,
            type: alt.alternateType || 'Unknown',
          });
        } else {
          // Check for fuzzy match by description
          const fuzzy = quotedItems.find(qi => 
            this.calculateSimilarity(qi.description, rfqItem.description) > 0.7
          );
          
          if (fuzzy) {
            alternatives.push({
              original: rfqItem.bomItem,
              alternative: fuzzy,
              type: 'Possible Match',
              confidence: this.calculateSimilarity(fuzzy.description, rfqItem.description),
            });
          } else {
            missing.push(rfqItem.bomItem);
          }
        }
      }
    }

    const totalRequested = requestedItems.length;
    const coveragePercent = totalRequested > 0 
      ? ((matched.length + alternatives.length) / totalRequested) * 100 
      : 0;

    return {
      coveragePercent,
      totalRequested,
      exactMatches: matched.length,
      alternatives: alternatives.length,
      missing: missing.length,
      details: {
        matched,
        alternatives,
        missing,
      },
    };
  }

  async getProjectBidTracking(projectId: string) {
    const [rfqs, quotes] = await Promise.all([
      this.prisma.rFQ.count({ where: { projectId } }),
      this.prisma.quote.count({ where: { projectId } }),
    ]);

    const responseRate = rfqs > 0 ? (quotes / rfqs) * 100 : 0;

    // Update project with bid tracking
    await this.prisma.project.update({
      where: { id: projectId },
      data: {
        rfqsSent: rfqs,
        quotesReceived: quotes,
        responseRate: responseRate,
      },
    });

    return {
      rfqsSent: rfqs,
      quotesReceived: quotes,
      responseRate,
    };
  }

  private calculateSimilarity(str1: string, str2: string): number {
    // Simple Jaccard similarity for description matching
    const words1 = new Set(str1.toLowerCase().split(/\s+/));
    const words2 = new Set(str2.toLowerCase().split(/\s+/));
    
    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);
    
    return intersection.size / union.size;
  }
}

