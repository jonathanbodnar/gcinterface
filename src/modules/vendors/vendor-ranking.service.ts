import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';

interface VendorScore {
  vendor: any;
  estimatedCost: number;
  coverage: number; // % of materials they have pricing for
  competitiveScore: number; // Overall ranking score
  avgPriceVsMarket: number; // % above/below market average
  materialsWithPricing: number;
  totalMaterials: number;
}

@Injectable()
export class VendorRankingService {
  constructor(private prisma: PrismaService) {}

  async rankVendorsByPrice(projectId: string) {
    // Get BOM items for project
    const bomItems = await this.prisma.bOM.findMany({
      where: { projectId },
      include: {
        material: true,
      },
    });

    if (bomItems.length === 0) {
      return [];
    }

    // Get all active vendors
    const vendors = await this.prisma.vendor.findMany({
      where: { active: true },
      include: {
        materialPricing: {
          where: { active: true },
          include: {
            material: true,
          },
        },
      },
    });

    const scoredVendors: VendorScore[] = [];

    for (const vendor of vendors) {
      let estimatedCost = 0;
      let materialsWithPricing = 0;
      const priceComparisons = [];

      for (const bomItem of bomItems) {
        // Try exact ID match first
        let vendorPrice = bomItem.materialId 
          ? vendor.materialPricing.find(p => p.materialId === bomItem.materialId)
          : null;

        // If no exact match, try fuzzy name matching
        if (!vendorPrice && bomItem.description) {
          vendorPrice = vendor.materialPricing.find(p => {
            if (!p.material?.name) return false;
            const similarity = this.calculateSimilarity(bomItem.description, p.material.name);
            return similarity > 0.7; // 70% threshold
          });
          
          if (vendorPrice) {
            console.log(`🔗 Fuzzy matched "${bomItem.description}" to "${vendorPrice.material?.name}"`);
          }
        }

        if (vendorPrice) {
          const itemCost = vendorPrice.unitCost * bomItem.finalQty;
          estimatedCost += itemCost;
          materialsWithPricing++;

          // Get market average for comparison
          const allPrices = await this.prisma.vendorMaterialPricing.findMany({
            where: {
              materialId: vendorPrice.materialId,
              active: true,
            },
          });

          if (allPrices.length > 1) {
            const avgPrice = allPrices.reduce((sum, p) => sum + p.unitCost, 0) / allPrices.length;
            const percentVsAvg = ((vendorPrice.unitCost - avgPrice) / avgPrice) * 100;
            priceComparisons.push(percentVsAvg);
          }
        }
      }

      const coverage = (materialsWithPricing / bomItems.length) * 100;
      const avgPriceVsMarket = priceComparisons.length > 0
        ? priceComparisons.reduce((sum, p) => sum + p, 0) / priceComparisons.length
        : 0;

      // Calculate competitive score
      // Lower cost = higher score, higher coverage = higher score, higher rating = higher score
      let competitiveScore = 100;
      
      // Price factor (0-40 points) - lower is better
      const priceFactor = Math.max(0, 40 - (avgPriceVsMarket * 2)); // -20% = 40pts, +20% = 0pts
      
      // Coverage factor (0-40 points) - higher is better
      const coverageFactor = (coverage / 100) * 40;
      
      // Rating factor (0-20 points) - higher is better
      const ratingFactor = ((vendor.rating || 0) / 5) * 20;
      
      competitiveScore = priceFactor + coverageFactor + ratingFactor;

      scoredVendors.push({
        vendor,
        estimatedCost,
        coverage,
        competitiveScore,
        avgPriceVsMarket,
        materialsWithPricing,
        totalMaterials: bomItems.length,
      });
    }

    // Sort by competitive score (highest first)
    return scoredVendors.sort((a, b) => b.competitiveScore - a.competitiveScore);
  }

  async getVendorPriceComparison(projectId: string) {
    const rankings = await this.rankVendorsByPrice(projectId);

    if (rankings.length === 0) {
      return {
        hasData: false,
        message: 'No vendor pricing data available',
      };
    }

    const lowestCost = Math.min(...rankings.map(r => r.estimatedCost).filter(c => c > 0));
    const highestCost = Math.max(...rankings.map(r => r.estimatedCost).filter(c => c > 0));

    return {
      hasData: true,
      rankings: rankings.map(r => ({
        vendorId: r.vendor.id,
        vendorName: r.vendor.name,
        estimatedCost: r.estimatedCost,
        coverage: r.coverage,
        competitiveScore: r.competitiveScore,
        avgPriceVsMarket: r.avgPriceVsMarket,
        isBestPrice: r.estimatedCost === lowestCost,
        savingsVsBest: r.estimatedCost - lowestCost,
        recommendation: r.competitiveScore >= 70 ? 'RECOMMENDED' : 
                       r.competitiveScore >= 50 ? 'CONSIDER' : 'NOT_RECOMMENDED',
      })),
      summary: {
        lowestCost,
        highestCost,
        potentialSavings: highestCost - lowestCost,
        vendorsWithPricing: rankings.filter(r => r.coverage > 0).length,
      },
    };
  }

  async rankVendorsByProject(projectId: string) {
    return this.rankVendorsByPrice(projectId);
  }

  /**
   * Calculate similarity between two strings (0-1 score)
   * Uses word-based comparison for fuzzy matching
   */
  private calculateSimilarity(str1: string, str2: string): number {
    const s1 = str1.toLowerCase().trim();
    const s2 = str2.toLowerCase().trim();

    // Exact match
    if (s1 === s2) return 1.0;

    // Normalize: remove extra spaces, punctuation
    const normalize = (s: string) => s.replace(/[^\w\s]/g, '').replace(/\s+/g, ' ').trim();
    const n1 = normalize(s1);
    const n2 = normalize(s2);

    if (n1 === n2) return 0.95;

    // Word-based matching
    const words1 = n1.split(' ').filter(w => w.length > 2); // Ignore short words
    const words2 = n2.split(' ').filter(w => w.length > 2);
    
    if (words1.length === 0 || words2.length === 0) return 0;
    
    const commonWords = words1.filter(w => words2.includes(w));
    const totalWords = Math.max(words1.length, words2.length);
    
    const wordMatchScore = commonWords.length / totalWords;

    // Substring matching bonus
    const substringBonus = (s1.includes(s2) || s2.includes(s1)) ? 0.1 : 0;

    return Math.min(wordMatchScore + substringBonus, 1.0);
  }
}
