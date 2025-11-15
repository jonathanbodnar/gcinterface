import { Injectable } from '@nestjs/common';
import { PrismaService, TakeoffPrismaService } from '@/common/prisma/prisma.service';

@Injectable()
export class VendorsService {
  constructor(
    private prisma: PrismaService,
    private takeoffPrisma: TakeoffPrismaService,
  ) {}

  async matchVendorsToMaterials(projectId: string) {
    // Get project and its materials from takeoff
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new Error('Project not found');
    }

    // Get materials from BOM (gcinterface database) instead of takeoff
    // The BOM should already be populated from takeoff import
    const bomItems = await this.prisma.bOM.findMany({
      where: { projectId },
    });

    // Get materials grouped by trade
    const materialsByTrade = this.groupMaterialsByTrade(bomItems);

    // Get vendors by trade and proximity
    const vendors = await this.getVendorsByProximity(project.location, materialsByTrade);

    return {
      materialsNeeded: materialsByTrade,
      availableVendors: vendors,
      matchingResults: this.calculateMaterialCoverage(materialsByTrade, vendors),
    };
  }

  private groupMaterialsByTrade(materials: any[]) {
    const groups = {
      'M': [], // Mechanical
      'P': [], // Plumbing
      'E': [], // Electrical
      'A': [], // Architectural
    };

    for (const material of materials) {
      // Determine trade based on SKU, category, or CSI division
      const trade = this.identifyTrade(material.sku || material.description || material.category);
      if (groups[trade]) {
        groups[trade].push(material);
      } else {
        groups['A'].push(material); // Default to architectural
      }
    }

    return groups;
  }

  private identifyTrade(sku: string): string {
    // Identify trade from SKU prefix or material type
    if (sku.includes('PIPE') || sku.includes('WC-') || sku.includes('LAV-') || sku.includes('PLUMB')) {
      return 'P';
    }
    if (sku.includes('DUCT') || sku.includes('RTU-') || sku.includes('HVAC') || sku.includes('DIFFUSER')) {
      return 'M';
    }
    if (sku.includes('LED-') || sku.includes('ELECT') || sku.includes('WIRE') || sku.includes('PANEL')) {
      return 'E';
    }
    return 'A'; // Architectural default
  }

  private async getVendorsByProximity(location: string, materialsByTrade: any) {
    // Get all active vendors
    const vendors = await this.prisma.vendor.findMany({
      where: { active: true },
    });

    // Filter and sort by proximity
    // TODO: Implement actual proximity calculation using Google Maps API
    
    return vendors;
  }

  private calculateMaterialCoverage(materialsNeeded: any, vendors: any[]) {
    // Calculate which materials each vendor can supply
    const coverage = {};

    for (const vendor of vendors) {
      const canSupply = [];
      
      for (const trade of vendor.trades) {
        if (materialsNeeded[trade]) {
          canSupply.push(...materialsNeeded[trade]);
        }
      }

      coverage[vendor.id] = {
        vendorId: vendor.id,
        vendorName: vendor.name,
        canSupplyCount: canSupply.length,
        materials: canSupply,
      };
    }

    return coverage;
  }

  async createVendor(data: any) {
    return this.prisma.vendor.create({
      data,
    });
  }

  async bulkImportVendors(vendorsData: any[]) {
    // Import vendors from Excel upload
    const created = [];

    for (const vendorData of vendorsData) {
      const vendor = await this.prisma.vendor.create({
        data: vendorData,
      });
      created.push(vendor);
    }

    return {
      imported: created.length,
      vendors: created,
    };
  }

  async listVendors(filters?: { trade?: string; proximity?: string }) {
    const where: any = { active: true };

    if (filters?.trade) {
      where.trades = {
        has: filters.trade,
      };
    }

    return this.prisma.vendor.findMany({
      where,
      orderBy: { rating: 'desc' },
    });
  }
}
