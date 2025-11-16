import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import * as XLSX from 'xlsx';

@Injectable()
export class MaterialsService {
  constructor(private prisma: PrismaService) {}

  async listMaterials(filters?: { trade?: string; category?: string; search?: string }) {
    const where: any = { active: true };
    
    if (filters?.trade) {
      where.trade = filters.trade;
    }
    
    if (filters?.category) {
      where.category = filters.category;
    }
    
    if (filters?.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
        { sku: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    return this.prisma.material.findMany({
      where,
      orderBy: [
        { timesUsed: 'desc' }, // Most used first
        { name: 'asc' },
      ],
    });
  }

  async getMaterial(id: string) {
    const material = await this.prisma.material.findUnique({
      where: { id },
      include: {
        bomItems: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: {
            estimate: {
              include: {
                project: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!material) {
      throw new Error('Material not found');
    }

    // Get vendors that supply this material
    const vendors = await this.prisma.vendor.findMany({
      where: {
        active: true,
        OR: [
          { materials: { has: material.name } },
          { materials: { has: material.sku } },
        ],
      },
      select: {
        id: true,
        name: true,
        type: true,
        email: true,
        phone: true,
        rating: true,
        trades: true,
      },
    });

    return {
      ...material,
      suppliers: vendors,
    };
  }

  async updateMaterial(id: string, data: any) {
    return this.prisma.material.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date(),
      },
    });
  }

  async createOrUpdateMaterial(materialData: {
    name: string;
    trade: string;
    description?: string;
    sku?: string;
    category?: string;
    manufacturer?: string;
    model?: string;
    specs?: any;
    uom?: string;
  }) {
    // Check if material already exists (by name + trade)
    const existing = await this.prisma.material.findUnique({
      where: {
        name_trade: {
          name: materialData.name,
          trade: materialData.trade,
        },
      },
    });

    if (existing) {
      // Update usage count and last used
      return this.prisma.material.update({
        where: { id: existing.id },
        data: {
          timesUsed: { increment: 1 },
          lastUsed: new Date(),
          // Update specs if new ones provided
          specs: materialData.specs || existing.specs,
          description: materialData.description || existing.description,
          manufacturer: materialData.manufacturer || existing.manufacturer,
          model: materialData.model || existing.model,
        },
      });
    }

    // Create new material
    return this.prisma.material.create({
      data: {
        ...materialData,
        timesUsed: 1,
        lastUsed: new Date(),
      },
    });
  }

  async searchMaterials(query: string, limit = 50) {
    return this.prisma.material.findMany({
      where: {
        active: true,
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } },
          { sku: { contains: query, mode: 'insensitive' } },
          { category: { contains: query, mode: 'insensitive' } },
        ],
      },
      take: limit,
      orderBy: [
        { timesUsed: 'desc' },
        { name: 'asc' },
      ],
      select: {
        id: true,
        name: true,
        description: true,
        sku: true,
        trade: true,
        category: true,
        manufacturer: true,
        uom: true,
      },
    });
  }

  async getVendorsForMaterial(materialId: string) {
    const material = await this.prisma.material.findUnique({
      where: { id: materialId },
    });

    if (!material) {
      throw new Error('Material not found');
    }

    return this.prisma.vendor.findMany({
      where: {
        active: true,
        OR: [
          { materials: { has: material.name } },
          { materials: { has: material.sku } },
          { trades: { has: material.trade } },
        ],
      },
      orderBy: {
        rating: 'desc',
      },
    });
  }

  async importFromCSV(file: Express.Multer.File) {
    if (!file) {
      throw new Error('No file provided');
    }

    try {
      // Parse CSV using xlsx
      const workbook = XLSX.read(file.buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(worksheet);

      const imported = [];
      const errors = [];

      for (const row of data as any[]) {
        try {
          // Map CSV columns to material fields
          const materialData = {
            name: row.name || row.Name || row.Material || row.MATERIAL,
            trade: row.trade || row.Trade || row.TRADE || 'A',
            description: row.description || row.Description || row.name,
            category: row.category || row.Category,
            sku: row.sku || row.SKU || row.sku_code,
            manufacturer: row.manufacturer || row.Manufacturer,
            model: row.model || row.Model,
            uom: row.uom || row.UOM || row.unit,
            unitCost: row.unitCost || row.unit_cost || row.cost ? parseFloat(row.unitCost || row.unit_cost || row.cost) : null,
            laborHours: row.laborHours || row.labor_hours ? parseFloat(row.laborHours || row.labor_hours) : null,
            wasteFactor: row.wasteFactor || row.waste_factor ? parseFloat(row.wasteFactor || row.waste_factor) / 100 : 0.07,
          };

          if (!materialData.name || !materialData.trade) {
            errors.push({ row, error: 'Missing required fields: name and trade' });
            continue;
          }

          const material = await this.createOrUpdateMaterial(materialData);
          imported.push(material);
        } catch (error) {
          errors.push({ row, error: error.message });
        }
      }

      return {
        success: true,
        imported: imported.length,
        errors: errors.length,
        details: {
          imported,
          errors,
        },
      };
    } catch (error) {
      throw new Error(`Failed to parse CSV: ${error.message}`);
    }
  }
}

