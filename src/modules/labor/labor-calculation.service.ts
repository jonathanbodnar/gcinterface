import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';

interface LaborBreakdown {
  trade: string;
  laborHours: number;
  laborCost: number;
  items: Array<{
    bomItemId: string;
    description: string;
    quantity: number;
    hoursPerUnit: number;
    totalHours: number;
    laborRate: number;
    totalCost: number;
  }>;
}

@Injectable()
export class LaborCalculationService {
  constructor(private prisma: PrismaService) {}

  async calculateLabor(projectId: string) {
    // Get all BOM items for the project
    const bomItems = await this.prisma.bOM.findMany({
      where: { projectId },
    });

    if (bomItems.length === 0) {
      throw new Error('No BOM items found for project');
    }

    const breakdown: Record<string, LaborBreakdown> = {};

    // Calculate labor for each BOM item
    for (const bomItem of bomItems) {
      const trade = this.identifyTrade(bomItem.category, bomItem.csiDivision);

      if (!breakdown[trade]) {
        breakdown[trade] = {
          trade,
          laborHours: 0,
          laborCost: 0,
          items: [],
        };
      }

      // Get labor rule for this material
      const laborRule = await this.getLaborRule(bomItem);

      if (laborRule) {
        const totalHours = bomItem.finalQty * laborRule.hoursPerUnit;
        const totalCost = totalHours * laborRule.rate;

        breakdown[trade].laborHours += totalHours;
        breakdown[trade].laborCost += totalCost;
        breakdown[trade].items.push({
          bomItemId: bomItem.id,
          description: bomItem.description,
          quantity: bomItem.finalQty,
          hoursPerUnit: laborRule.hoursPerUnit,
          totalHours,
          laborRate: laborRule.rate,
          totalCost,
        });

        // Update BOM item with labor calculations
        await this.prisma.bOM.update({
          where: { id: bomItem.id },
          data: {
            laborHours: totalHours,
            laborRate: laborRule.rate,
          },
        });
      }
    }

    // Apply trade markups
    const markups = await this.prisma.tradeMarkup.findMany();
    const markupMap = Object.fromEntries(markups.map(m => [m.trade, m.markup]));

    // Calculate totals with markups
    let totalLaborHours = 0;
    let totalLaborCost = 0;
    let totalWithMarkup = 0;

    for (const trade in breakdown) {
      const markup = markupMap[trade] || 0;
      const markedUpCost = breakdown[trade].laborCost * (1 + markup / 100);
      
      totalLaborHours += breakdown[trade].laborHours;
      totalLaborCost += breakdown[trade].laborCost;
      totalWithMarkup += markedUpCost;

      breakdown[trade]['markup'] = markup;
      breakdown[trade]['costWithMarkup'] = markedUpCost;
    }

    return {
      totalLaborHours,
      totalLaborCost,
      totalWithMarkup,
      breakdown: Object.values(breakdown),
      summary: {
        averageRate: totalLaborCost / totalLaborHours,
        totalMarkup: totalWithMarkup - totalLaborCost,
      },
    };
  }

  private identifyTrade(category: string, csiDivision?: string): string {
    // Identify trade from category or CSI division
    if (category.includes('Plumbing') || csiDivision?.startsWith('22')) {
      return 'P'; // Plumbing
    } else if (category.includes('HVAC') || category.includes('Mechanical') || csiDivision?.startsWith('23')) {
      return 'M'; // Mechanical
    } else if (category.includes('Electrical') || category.includes('Lighting') || csiDivision?.startsWith('26')) {
      return 'E'; // Electrical
    } else {
      return 'A'; // Architectural
    }
  }

  private async getLaborRule(bomItem: any): Promise<{ hoursPerUnit: number; rate: number } | null> {
    // Try to find a matching material rule
    const rule = await this.prisma.materialRule.findFirst({
      where: {
        material: bomItem.description,
        active: true,
      },
    });

    if (rule && rule.laborPerUnit) {
      return {
        hoursPerUnit: rule.laborPerUnit,
        rate: 50.00, // Default labor rate (could be configurable)
      };
    }

    // Fallback to category-based estimates
    return this.getDefaultLaborRate(bomItem.category, bomItem.uom);
  }

  private getDefaultLaborRate(category: string, uom: string): { hoursPerUnit: number; rate: number } {
    // Default labor rates by category and UOM
    const defaults = {
      'Flooring': { SF: { hoursPerUnit: 0.015, rate: 45.00 } }, // 0.015 hrs/SF
      'Painting': { SF: { hoursPerUnit: 0.012, rate: 40.00 } },
      'Ceilings': { SF: { hoursPerUnit: 0.020, rate: 45.00 } },
      'Plumbing': { 
        LF: { hoursPerUnit: 0.25, rate: 55.00 }, // 0.25 hrs/LF
        EA: { hoursPerUnit: 2.0, rate: 55.00 },  // 2 hrs per fitting
      },
      'Plumbing Fixtures': { EA: { hoursPerUnit: 3.0, rate: 55.00 } },
      'HVAC Equipment': { EA: { hoursPerUnit: 16.0, rate: 60.00 } },
      'Electrical': {
        LF: { hoursPerUnit: 0.10, rate: 50.00 },
        EA: { hoursPerUnit: 1.5, rate: 50.00 },
      },
    };

    return defaults[category]?.[uom] || { hoursPerUnit: 0.5, rate: 45.00 };
  }
}
