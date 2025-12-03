import { Injectable } from '@nestjs/common';
import { PrismaService, TakeoffPrismaService } from '@/common/prisma/prisma.service';
import { MaterialsService } from '../materials/materials.service';
import * as XLSX from 'xlsx';

@Injectable()
export class VendorsService {
  constructor(
    private prisma: PrismaService,
    private takeoffPrisma: TakeoffPrismaService,
    private materialsService: MaterialsService,
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
    const vendors = await this.getVendorsByProximity(project.location);

    return {
      materialsNeeded: materialsByTrade,
      availableVendors: vendors,
      coverageAnalysis: this.calculateMaterialCoverage(materialsByTrade, vendors),
    };
  }

  private groupMaterialsByTrade(bomItems: any[]) {
    const byTrade: Record<string, any[]> = {};
    
    bomItems.forEach(item => {
      const trade = this.identifyTrade(item);
      if (!byTrade[trade]) {
        byTrade[trade] = [];
      }
      byTrade[trade].push({
        description: item.description,
        quantity: item.finalQty,
        uom: item.uom,
      });
    });

    return byTrade;
  }

  private identifyTrade(item: any): string {
    // Identify trade from CSI division or category
    if (item.csiDivision) {
      const division = item.csiDivision.substring(0, 2);
      const tradeMap: Record<string, string> = {
        '09': 'A', // Finishes
        '22': 'P', // Plumbing
        '23': 'M', // HVAC
        '26': 'E', // Electrical
        '27': 'E',
        '28': 'E',
      };
      if (tradeMap[division]) return tradeMap[division];
    }

    // Fallback to category
    const category = (item.category || '').toLowerCase();
    if (category.includes('plumb')) return 'P';
    if (category.includes('hvac') || category.includes('mechanical')) return 'M';
    if (category.includes('electric')) return 'E';
    
    return 'A'; // Default to architectural
  }

  private async getVendorsByProximity(projectLocation: string) {
    // For now, return all active vendors
    // TODO: Implement Google Maps Distance Matrix API for actual proximity
    return this.prisma.vendor.findMany({
      where: { active: true },
      orderBy: { rating: 'desc' },
    });
  }

  private calculateMaterialCoverage(materialsByTrade: Record<string, any[]>, vendors: any[]) {
    // Calculate what percentage of materials can be covered by vendors
    const totalMaterials = Object.values(materialsByTrade).reduce((sum, items) => sum + items.length, 0);
    
    const coverage = vendors.map(vendor => {
      let coveredCount = 0;
      vendor.trades?.forEach((trade: string) => {
        if (materialsByTrade[trade]) {
          coveredCount += materialsByTrade[trade].length;
        }
      });
      
      return {
        vendorId: vendor.id,
        vendorName: vendor.name,
        coverage: totalMaterials > 0 ? (coveredCount / totalMaterials) * 100 : 0,
        coveredMaterials: coveredCount,
      };
    });

    return coverage;
  }

  async createVendor(data: any) {
    // Extract material IDs if provided
    const materialIds = data.materialIds || [];
    delete data.materialIds; // Remove from vendor data
    
    // Create the vendor
    const vendor = await this.prisma.vendor.create({ data });
    
    // Create VendorMaterialPricing entries for each material
    if (materialIds.length > 0) {
      console.log(`Creating ${materialIds.length} material pricing entries for vendor ${vendor.id}`);
      
      for (const materialId of materialIds) {
        try {
          await (this.prisma as any).vendorMaterialPricing.create({
            data: {
              vendorId: vendor.id,
              materialId: materialId,
              unitCost: 0, // Placeholder - user can update later
              active: true,
            },
          });
        } catch (error) {
          console.error(`Failed to create pricing for material ${materialId}:`, error.message);
        }
      }
      
      console.log(`✅ Created vendor ${vendor.name} with ${materialIds.length} materials`);
    }
    
    return vendor;
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

  async bulkImportVendors(vendorsData: any[]) {
    // Import multiple vendors from Excel
    const imported = [];
    
    for (const vendorData of vendorsData) {
      const vendor = await this.createVendor(vendorData);
      imported.push(vendor);
    }

    return {
      imported: imported.length,
      vendors: imported,
    };
  }

  async getVendor(id: string) {
    return this.prisma.vendor.findUnique({
      where: { id },
    });
  }

  async updateVendor(id: string, data: any) {
    // Extract material IDs if provided
    const materialIds = data.materialIds || [];
    delete data.materialIds; // Remove from vendor data
    
    // Update the vendor
    const vendor = await this.prisma.vendor.update({
      where: { id },
      data,
    });
    
    // If materialIds provided, sync VendorMaterialPricing entries
    if (materialIds.length > 0) {
      console.log(`Syncing ${materialIds.length} materials for vendor ${vendor.id}`);
      
      // Get existing pricing entries
      const existing = await (this.prisma as any).vendorMaterialPricing.findMany({
        where: { vendorId: id },
        select: { materialId: true },
      });
      const existingMaterialIds = new Set(existing.map(e => e.materialId));
      
      // Add new materials
      for (const materialId of materialIds) {
        if (!existingMaterialIds.has(materialId)) {
          try {
            await (this.prisma as any).vendorMaterialPricing.create({
              data: {
                vendorId: id,
                materialId: materialId,
                unitCost: 0, // Placeholder
                active: true,
              },
            });
          } catch (error) {
            console.error(`Failed to create pricing for material ${materialId}:`, error.message);
          }
        }
      }
      
      console.log(`✅ Updated vendor ${vendor.name} materials`);
    }
    
    return vendor;
  }

  async uploadMaterialCatalog(vendorId: string, file: Express.Multer.File) {
    if (!file) {
      throw new Error('No file provided');
    }

    try {
      // Parse CSV/Excel file
      const workbook = XLSX.read(file.buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(worksheet);

      const vendor = await this.prisma.vendor.findUnique({
        where: { id: vendorId },
      });

      if (!vendor) {
        throw new Error('Vendor not found');
      }

      const createdMaterials = [];
      const materialNames = [];
      const errors = [];

      for (const row of data as any[]) {
        try {
          // Map columns flexibly
          const materialData = {
            name: row.name || row.Name || row.Material || row.MATERIAL || row.product || row.Product,
            description: row.description || row.Description || row.name,
            trade: row.trade || row.Trade || vendor.trades[0] || 'A',
            category: row.category || row.Category || row.type,
            sku: row.sku || row.SKU || row.code || row.Code,
            manufacturer: row.manufacturer || row.Manufacturer || row.brand,
            model: row.model || row.Model,
            uom: row.uom || row.UOM || row.unit || row.Unit || 'EA',
            unitCost: row.unitCost || row.unit_cost || row.cost || row.price ? parseFloat(row.unitCost || row.unit_cost || row.cost || row.price) : null,
          };

          if (!materialData.name) {
            errors.push({ row, error: 'Missing material name' });
            continue;
          }

          // Create or update material in materials database
          const material = await this.materialsService.createOrUpdateMaterial(materialData);
          createdMaterials.push(material);
          materialNames.push(material.name);
        } catch (error) {
          errors.push({ row, error: error.message });
        }
      }

      // Update vendor with new materials
      const existingMaterials = vendor.materials || [];
      const allMaterials = [...new Set([...existingMaterials, ...materialNames])];

      await this.prisma.vendor.update({
        where: { id: vendorId },
        data: {
          materials: allMaterials,
        },
      });

      return {
        success: true,
        vendor: vendor.name,
        materialsCreated: createdMaterials.length,
        materialsLinked: materialNames.length,
        totalMaterials: allMaterials.length,
        errors: errors.length,
        details: {
          created: createdMaterials.map(m => ({ id: m.id, name: m.name, trade: m.trade })),
          errors,
        },
      };
    } catch (error) {
      throw new Error(`Failed to parse material catalog: ${error.message}`);
    }
  }
}
