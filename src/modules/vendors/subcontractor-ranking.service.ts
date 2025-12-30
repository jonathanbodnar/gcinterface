import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';

interface SubcontractorScore {
  vendor: any;
  estimatedLaborCost: number;
  materialCoverage: number; // % of materials they can install
  competitiveScore: number;
  avgRateVsMarket: number;
  materialsWithPricing: number;
  totalMaterials: number;
}

@Injectable()
export class SubcontractorRankingService {
  constructor(private prisma: PrismaService) {}

  /**
   * Rank subcontractors by their ability to provide labor for project materials
   * Similar to vendor ranking, but for labor instead of material supply
   */
  async rankSubcontractorsByProject(projectId: string) {
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

    // Get all active subcontractors
    const subcontractors = await (this.prisma as any).vendor.findMany({
      where: {
        active: true,
        type: { in: ['SUBCONTRACTOR', 'BOTH'] },
      },
      include: {
        laborPricing: {
          where: { active: true },
          include: {
            material: true,
          },
        },
      },
    });

    const scoredSubcontractors: SubcontractorScore[] = [];

    for (const subcontractor of subcontractors) {
      let estimatedLaborCost = 0;
      let materialsWithPricing = 0;
      const rateComparisons = [];

      for (const bomItem of bomItems) {
        // Try to find labor pricing for this material
        let laborPrice = null;

        // 1. Try exact material match
        if (bomItem.materialId) {
          laborPrice = subcontractor.laborPricing?.find(
            (p: any) => p.materialId === bomItem.materialId
          );
        }

        // 2. Try fuzzy name matching on material capabilities
        if (!laborPrice && bomItem.description) {
          laborPrice = subcontractor.laborPricing?.find((p: any) => {
            if (!p.material?.name) return false;
            const similarity = this.calculateSimilarity(
              bomItem.description,
              p.material.name
            );
            return similarity > 0.7;
          });

          if (!laborPrice) {
            // Check material capabilities array
            const canInstall = subcontractor.materialCapabilities?.some(
              (capability: string) => {
                const similarity = this.calculateSimilarity(
                  bomItem.description,
                  capability
                );
                return similarity > 0.7;
              }
            );

            if (canInstall) {
              // Find trade-level pricing
              const trade = bomItem.material?.trade || this.identifyTrade(bomItem.category);
              laborPrice = subcontractor.laborPricing?.find(
                (p: any) => p.trade === trade && !p.materialId
              );
            }
          }
        }

        if (laborPrice) {
          // Calculate labor cost
          const hours = bomItem.laborHours || (bomItem.finalQty * (laborPrice.hoursPerUnit || 0));
          const cost = hours * laborPrice.laborRate;
          
          estimatedLaborCost += cost;
          materialsWithPricing++;

          // Get market average for comparison
          const allPrices = await (this.prisma as any).vendorLaborPricing.findMany({
            where: {
              materialId: laborPrice.materialId,
              trade: laborPrice.trade,
              active: true,
            },
          });

          if (allPrices.length > 1) {
            const avgRate = allPrices.reduce((sum: number, p: any) => sum + p.laborRate, 0) / allPrices.length;
            const percentVsAvg = ((laborPrice.laborRate - avgRate) / avgRate) * 100;
            rateComparisons.push(percentVsAvg);
          }
        }
      }

      const coverage = (materialsWithPricing / bomItems.length) * 100;
      const avgRateVsMarket = rateComparisons.length > 0
        ? rateComparisons.reduce((sum, p) => sum + p, 0) / rateComparisons.length
        : 0;

      // Calculate competitive score
      let competitiveScore = 100;
      
      // Rate factor (0-40 points) - lower is better
      const rateFactor = Math.max(0, 40 - (avgRateVsMarket * 2));
      
      // Coverage factor (0-40 points) - higher is better
      const coverageFactor = (coverage / 100) * 40;
      
      // Rating factor (0-20 points) - higher is better
      const ratingFactor = ((subcontractor.rating || 0) / 5) * 20;
      
      competitiveScore = rateFactor + coverageFactor + ratingFactor;

      scoredSubcontractors.push({
        vendor: subcontractor,
        estimatedLaborCost,
        materialCoverage: coverage,
        competitiveScore,
        avgRateVsMarket,
        materialsWithPricing,
        totalMaterials: bomItems.length,
      });
    }

    // Sort by competitive score (highest first)
    return scoredSubcontractors.sort((a, b) => b.competitiveScore - a.competitiveScore);
  }

  /**
   * Get detailed material coverage for a subcontractor
   */
  async getSubcontractorMaterialCoverage(vendorId: string, projectId: string) {
    const bomItems = await this.prisma.bOM.findMany({
      where: { projectId },
      include: {
        material: true,
      },
    });

    if (bomItems.length === 0) {
      return { covered: [], uncovered: [], coverage: 0 };
    }

    const subcontractor = await (this.prisma as any).vendor.findUnique({
      where: { id: vendorId },
      include: {
        laborPricing: {
          where: { active: true },
          include: {
            material: true,
          },
        },
      },
    });

    if (!subcontractor) {
      throw new Error('Subcontractor not found');
    }

    const covered = [];
    const uncovered = [];

    for (const bomItem of bomItems) {
      let laborPrice = null;

      // Try exact ID match
      if (bomItem.materialId) {
        laborPrice = subcontractor.laborPricing?.find(
          (p: any) => p.materialId === bomItem.materialId
        );
      }

      // Try fuzzy matching
      if (!laborPrice && bomItem.description) {
        laborPrice = subcontractor.laborPricing?.find((p: any) => {
          if (!p.material?.name) return false;
          const similarity = this.calculateSimilarity(
            bomItem.description,
            p.material.name
          );
          return similarity > 0.7;
        });
      }

      if (laborPrice) {
        const hours = bomItem.laborHours || (bomItem.finalQty * (laborPrice.hoursPerUnit || 0));
        covered.push({
          bomItemId: bomItem.id,
          description: bomItem.description,
          materialName: laborPrice.material?.name,
          laborRate: laborPrice.laborRate,
          estimatedHours: hours,
          estimatedCost: hours * laborPrice.laborRate,
          matchType: bomItem.materialId === laborPrice.materialId ? 'exact' : 'fuzzy',
        });
      } else {
        uncovered.push({
          bomItemId: bomItem.id,
          description: bomItem.description,
        });
      }
    }

    return {
      vendorId,
      vendorName: subcontractor.name,
      covered,
      uncovered,
      coverage: (covered.length / bomItems.length) * 100,
      totalMaterials: bomItems.length,
    };
  }

  private identifyTrade(category: string): string {
    if (category.includes('Plumbing')) return 'P';
    if (category.includes('HVAC') || category.includes('Mechanical')) return 'M';
    if (category.includes('Electrical')) return 'E';
    return 'A';
  }

  private calculateSimilarity(str1: string, str2: string): number {
    const s1 = str1.toLowerCase().trim();
    const s2 = str2.toLowerCase().trim();

    if (s1 === s2) return 1.0;

    const normalize = (s: string) => s.replace(/[^\w\s]/g, '').replace(/\s+/g, ' ').trim();
    const n1 = normalize(s1);
    const n2 = normalize(s2);

    if (n1 === n2) return 0.95;

    const words1 = n1.split(' ').filter(w => w.length > 2);
    const words2 = n2.split(' ').filter(w => w.length > 2);
    
    if (words1.length === 0 || words2.length === 0) return 0;
    
    const commonWords = words1.filter(w => words2.includes(w));
    const totalWords = Math.max(words1.length, words2.length);
    
    const wordMatchScore = commonWords.length / totalWords;
    const substringBonus = (s1.includes(s2) || s2.includes(s1)) ? 0.1 : 0;

    return Math.min(wordMatchScore + substringBonus, 1.0);
  }
}


