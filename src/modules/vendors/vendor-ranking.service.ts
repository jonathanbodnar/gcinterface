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
        if (!bomItem.materialId) continue;

        // Find vendor's price for this material
        const vendorPrice = vendor.materialPricing.find(
          p => p.materialId === bomItem.materialId
        );

        if (vendorPrice) {
          const itemCost = vendorPrice.unitCost * bomItem.finalQty;
          estimatedCost += itemCost;
          materialsWithPricing++;

          // Get market average for comparison
          const allPrices = await this.prisma.vendorMaterialPricing.findMany({
            where: {
              materialId: bomItem.materialId,
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
}

