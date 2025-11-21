import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';

@Injectable()
export class PricingService {
  constructor(private prisma: PrismaService) {}

  async getVendorPricing(vendorId: string, materialId: string) {
    return this.prisma.vendorMaterialPricing.findUnique({
      where: {
        vendorId_materialId: {
          vendorId,
          materialId,
        },
      },
    });
  }

  async getAllPricingForMaterial(materialId: string) {
    const pricing = await this.prisma.vendorMaterialPricing.findMany({
      where: {
        materialId,
        active: true,
      },
      include: {
        vendor: {
          select: {
            id: true,
            name: true,
            type: true,
            rating: true,
          },
        },
      },
      orderBy: {
        unitCost: 'asc', // Lowest price first
      },
    });

    if (pricing.length === 0) {
      return {
        hasPricing: false,
        prices: [],
      };
    }

    const prices = pricing.map(p => p.unitCost);
    const lowest = prices[0];
    const highest = prices[prices.length - 1];
    const average = prices.reduce((sum, p) => sum + p, 0) / prices.length;

    return {
      hasPricing: true,
      prices: pricing.map(p => ({
        ...p,
        percentAboveLowest: ((p.unitCost - lowest) / lowest) * 100,
        isBestPrice: p.unitCost === lowest,
      })),
      summary: {
        lowest,
        highest,
        average,
        spread: highest - lowest,
        spreadPercent: ((highest - lowest) / lowest) * 100,
        vendorCount: pricing.length,
      },
    };
  }

  async setVendorPricing(data: {
    vendorId: string;
    materialId: string;
    unitCost: number;
    uom?: string;
    leadTimeDays?: number;
    minimumOrder?: number;
  }) {
    return this.prisma.vendorMaterialPricing.upsert({
      where: {
        vendorId_materialId: {
          vendorId: data.vendorId,
          materialId: data.materialId,
        },
      },
      update: {
        unitCost: data.unitCost,
        uom: data.uom,
        leadTimeDays: data.leadTimeDays,
        minimumOrder: data.minimumOrder,
        updatedAt: new Date(),
      },
      create: {
        vendorId: data.vendorId,
        materialId: data.materialId,
        unitCost: data.unitCost,
        uom: data.uom,
        leadTimeDays: data.leadTimeDays,
        minimumOrder: data.minimumOrder,
        active: true,
      },
    });
  }

  async getBestPriceForMaterial(materialId: string) {
    const pricing = await this.prisma.vendorMaterialPricing.findFirst({
      where: {
        materialId,
        active: true,
      },
      include: {
        vendor: {
          select: {
            id: true,
            name: true,
            rating: true,
          },
        },
      },
      orderBy: {
        unitCost: 'asc',
      },
    });

    return pricing;
  }

  async suggestPriceForMaterial(materialId: string) {
    // Get historical pricing for this material
    const material = await this.prisma.material.findUnique({
      where: { id: materialId },
      include: {
        vendorPricing: {
          where: { active: true },
        },
      },
    });

    if (!material) {
      throw new Error('Material not found');
    }

    if (material.vendorPricing.length > 0) {
      // Use historical average
      const avg = material.vendorPricing.reduce((sum, p) => sum + p.unitCost, 0) / material.vendorPricing.length;
      return {
        suggestedPrice: avg,
        confidence: 'HIGH',
        source: 'Historical Average',
        dataPoints: material.vendorPricing.length,
      };
    }

    // Find similar materials
    const similar = await this.prisma.material.findMany({
      where: {
        trade: material.trade,
        category: material.category,
        vendorPricing: {
          some: {},
        },
      },
      include: {
        vendorPricing: {
          where: { active: true },
        },
      },
      take: 10,
    });

    if (similar.length > 0) {
      const allPrices = similar.flatMap(m => m.vendorPricing.map(p => p.unitCost));
      const avg = allPrices.reduce((sum, p) => sum + p, 0) / allPrices.length;
      
      return {
        suggestedPrice: avg,
        confidence: 'MEDIUM',
        source: 'Similar Materials',
        dataPoints: allPrices.length,
      };
    }

    // No data - return null for AI suggestion
    return {
      suggestedPrice: null,
      confidence: 'LOW',
      source: 'No Data',
      dataPoints: 0,
      needsAI: true,
    };
  }

  async getVendorCatalog(vendorId: string) {
    const pricing = await this.prisma.vendorMaterialPricing.findMany({
      where: { vendorId, active: true },
      include: {
        material: {
          select: {
            id: true,
            name: true,
            trade: true,
            category: true,
            uom: true,
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    return {
      vendorId,
      materialCount: pricing.length,
      catalog: pricing,
    };
  }
}

