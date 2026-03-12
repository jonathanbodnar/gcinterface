import { Injectable } from '@nestjs/common';
import { PrismaService, TakeoffPrismaService } from '@/common/prisma/prisma.service';
import { MaterialsService } from '../materials/materials.service';

interface TakeoffFeature {
  type: string;
  area?: number;
  length?: number;
  width?: number;
  height?: number;
  diameter?: number;
  count?: number;
  meta?: any;
}

@Injectable()
export class BOMGeneratorService {
  constructor(
    private prisma: PrismaService,
    private takeoffPrisma: TakeoffPrismaService,
    private materialsService: MaterialsService,
  ) {}

  async generateFromTakeoff(projectId: string, userId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new Error('Project not found');
    }

    // Create estimate for this BOM
    const estimate = await this.prisma.estimate.create({
      data: {
        projectId,
        version: '1.0',
        status: 'DRAFT',
        createdById: userId,
      },
    });

    const bomItems = [];

    // Fetch materials from takeoff database
    if (this.takeoffPrisma.client) {
      try {
        // Try to get materials directly from materials table
        const materials: any[] = await this.takeoffPrisma.$queryRaw`
          SELECT * FROM "materials" 
          WHERE "jobId" = ${project.takeoffJobId}
        `;

        console.log(`📦 Found ${materials.length} materials from takeoff database`);

        // Convert takeoff materials to BOM items
        for (const material of materials) {
          try {
            // Try to find matching material in interface database by name similarity
            const materialName = material.name || material.description || 'Material';
            const matchingMaterial = await this.findMatchingMaterial(materialName, material.category);
            
            bomItems.push(
              await this.createBOMItem(projectId, estimate.id, {
                csiDivision: material.csiCode || material.csi || matchingMaterial?.csiDivision || '00 00 00',
                category: material.category || material.type || matchingMaterial?.category || 'General',
                description: materialName,
                sku: matchingMaterial?.sku || material.id || `MAT-${materialName.substring(0, 10)}`,
                quantity: material.quantity || material.count || 1,
                uom: material.unit || material.uom || matchingMaterial?.uom || 'EA',
                wasteFactor: 0.05,
                source: 'Imported from takeoff',
                confidence: material.confidence || 0.85,
                materialId: matchingMaterial?.id, // Link to existing material if found
              }),
            );
          } catch (error) {
            console.warn(`⚠️ Failed to create BOM item for material ${material.id}:`, error.message);
          }
        }

        // If no materials found in materials table, try Feature table as fallback
        if (materials.length === 0) {
          console.log('⚠️ No materials in materials table, using Feature table as fallback');
          
          // Get rooms for flooring, paint, ceiling calculations
          const rooms: any[] = await this.takeoffPrisma.$queryRaw`
            SELECT * FROM "Feature" 
            WHERE "jobId" = ${project.takeoffJobId} 
            AND type = 'ROOM'
          `;

          // Get pipes for plumbing calculations
          const pipes: any[] = await this.takeoffPrisma.$queryRaw`
            SELECT * FROM "Feature"
            WHERE "jobId" = ${project.takeoffJobId}
            AND type = 'PIPE'
          `;

          // Get fixtures
          const fixtures: any[] = await this.takeoffPrisma.$queryRaw`
            SELECT * FROM "Feature"
            WHERE "jobId" = ${project.takeoffJobId}
            AND type IN ('FIXTURE', 'EQUIPMENT')
          `;

          // Generate BOM items from rooms
          for (const room of rooms) {
          // VCT Flooring
          if (room.area && room.area > 0) {
            bomItems.push(
              await this.createBOMItem(projectId, estimate.id, {
                csiDivision: '09 65 00',
                category: 'Flooring',
                description: 'VCT Flooring 12x12',
                sku: 'VCT-12X12-STANDARD',
                quantity: room.area,
                uom: 'SF',
                wasteFactor: 0.1, // 10% waste
                source: 'Generated from takeoff',
                confidence: 0.85,
              }),
            );

            // Paint - walls (estimated at 8ft ceiling)
            const wallArea = this.calculateWallArea(room);
            bomItems.push(
              await this.createBOMItem(projectId, estimate.id, {
                csiDivision: '09 91 00',
                category: 'Painting',
                description: 'Interior Paint - 2 Coats',
                sku: 'PAINT-INT-EGGSHELL',
                quantity: wallArea,
                uom: 'SF',
                wasteFactor: 0.05,
                source: 'Generated from takeoff',
                confidence: 0.80,
              }),
            );

            // Ceiling Tile
            bomItems.push(
              await this.createBOMItem(projectId, estimate.id, {
                csiDivision: '09 51 00',
                category: 'Ceilings',
                description: 'Acoustical Ceiling Tile 2x2',
                sku: 'ACT-2X2-STANDARD',
                quantity: room.area,
                uom: 'SF',
                wasteFactor: 0.08,
                source: 'Generated from takeoff',
                confidence: 0.85,
              }),
            );
          }
          }

          // Generate BOM items from pipes
          for (const pipe of pipes) {
          if (pipe.length && pipe.length > 0) {
            const pipeType = this.identifyPipeType(pipe);
            bomItems.push(
              await this.createBOMItem(projectId, estimate.id, {
                csiDivision: pipeType.csiDivision,
                category: pipeType.category,
                description: pipeType.description,
                sku: pipeType.sku,
                quantity: pipe.length,
                uom: 'LF',
                wasteFactor: 0.15, // 15% for cuts and fittings
                source: 'Generated from takeoff',
                confidence: 0.90,
              }),
            );

            // Add fittings (estimated at 1 per 10 LF)
            const fittingCount = Math.ceil(pipe.length / 10);
            bomItems.push(
              await this.createBOMItem(projectId, estimate.id, {
                csiDivision: pipeType.csiDivision,
                category: pipeType.category,
                description: `${pipeType.description} - Fittings`,
                sku: `${pipeType.sku}-FITTING`,
                quantity: fittingCount,
                uom: 'EA',
                wasteFactor: 0.10,
                source: 'Generated from takeoff',
                confidence: 0.75,
              }),
            );
          }
          }

          // Generate BOM items from fixtures
          for (const fixture of fixtures) {
          const fixtureType = this.identifyFixtureType(fixture);
          bomItems.push(
            await this.createBOMItem(projectId, estimate.id, {
              csiDivision: fixtureType.csiDivision,
              category: fixtureType.category,
              description: fixtureType.description,
              sku: fixtureType.sku,
              quantity: fixture.count || 1,
              uom: 'EA',
              wasteFactor: 0.05,
              source: 'Generated from takeoff',
              confidence: 0.95,
            }),
          );
          }
        }
      } catch (error) {
        console.error('Error generating BOM from takeoff:', error.message);
        throw new Error('Failed to generate BOM from takeoff data');
      }
    } else {
      throw new Error('Takeoff database not configured');
    }

    // Consolidate duplicate materials (same description + uom)
    const consolidationMap = new Map<string, any[]>();
    for (const item of bomItems) {
      const key = `${(item.description || '').toLowerCase().trim()}||${(item.uom || '').toLowerCase()}`;
      if (!consolidationMap.has(key)) consolidationMap.set(key, []);
      consolidationMap.get(key)!.push(item);
    }

    for (const [, group] of consolidationMap) {
      if (group.length <= 1) continue;
      // Keep the first item, sum quantities into it, delete the rest
      const keep = group[0];
      const others = group.slice(1);
      const totalQty = group.reduce((s, g) => s + (g.quantity || 0), 0);
      const totalFinalQty = group.reduce((s, g) => s + (g.finalQty || 0), 0);
      const maxConf = Math.max(...group.map(g => g.confidence || 0));
      const unitCost = keep.unitCost || 0;

      try {
        await this.prisma.bOM.update({
          where: { id: keep.id },
          data: {
            quantity: totalQty,
            finalQty: totalFinalQty,
            totalCost: totalFinalQty * unitCost,
            confidence: maxConf,
            notes: `Consolidated from ${group.length} locations`,
          },
        });
        for (const other of others) {
          await this.prisma.bOM.delete({ where: { id: other.id } });
        }
      } catch (err) {
        console.warn(`Consolidation failed for "${keep.description}":`, err.message);
      }
    }

    // Refresh consolidated items
    const finalItems = await this.prisma.bOM.findMany({
      where: { projectId, estimateId: estimate.id },
      orderBy: [{ category: 'asc' }, { description: 'asc' }],
    });

    console.log(`🔄 Consolidated ${bomItems.length} items → ${finalItems.length} unique materials`);

    // Calculate estimate totals
    const materialCost = finalItems.reduce((sum, item) => sum + (item.totalCost || 0), 0);
    await this.prisma.estimate.update({
      where: { id: estimate.id },
      data: {
        materialCost,
        subtotal: materialCost,
        totalCost: materialCost,
      },
    });

    console.log(`✅ Generated ${finalItems.length} BOM items for project ${projectId}`);

    return {
      estimate,
      bomItems: finalItems,
      summary: {
        totalItems: finalItems.length,
        totalMaterialCost: materialCost,
        averageConfidence: finalItems.length > 0
          ? finalItems.reduce((sum, item) => sum + (item.confidence || 0), 0) / finalItems.length
          : 0,
      },
    };
  }

  private async createBOMItem(projectId: string, estimateId: string, data: any) {
    const finalQty = data.quantity * (1 + data.wasteFactor);
    
    // Estimate unit cost (will be replaced by actual quotes)
    const estimatedUnitCost = this.estimateUnitCost(data.category, data.uom);
    const totalCost = finalQty * estimatedUnitCost;

    // Determine trade from CSI division or category
    const trade = this.inferTrade(data.csiDivision, data.category);

    // Create or update material in materials database
    let materialId: string | undefined;
    try {
      const material = await this.materialsService.createOrUpdateMaterial({
        name: data.description,
        trade,
        description: data.description,
        sku: data.sku,
        category: data.category,
        manufacturer: data.manufacturer,
        model: data.model,
        specs: data.specs,
        uom: data.uom,
      });
      materialId = material.id;
    } catch (error) {
      console.error('Failed to create/update material:', error);
      // Continue without materialId if it fails
    }

    return this.prisma.bOM.create({
      data: {
        projectId,
        estimateId,
        materialId,
        csiDivision: data.csiDivision,
        category: data.category,
        description: data.description,
        sku: data.sku,
        manufacturer: data.manufacturer,
        model: data.model,
        specs: data.specs,
        quantity: data.quantity,
        uom: data.uom,
        wasteFactor: data.wasteFactor,
        finalQty,
        unitCost: estimatedUnitCost,
        totalCost,
        confidence: data.confidence,
        source: data.source,
      },
    });
  }

  private inferTrade(csiDivision: string, category: string): string {
    // Infer trade from CSI division
    const division = csiDivision?.substring(0, 2);
    const tradeMap: Record<string, string> = {
      '09': 'A', // Finishes
      '22': 'P', // Plumbing
      '23': 'M', // HVAC
      '26': 'E', // Electrical
      '27': 'E', // Communications
      '28': 'E', // Electronic Safety
      '03': 'S', // Concrete
      '05': 'S', // Metals/Structural
      '21': 'F', // Fire Protection
    };

    if (division && tradeMap[division]) {
      return tradeMap[division];
    }

    // Fallback: infer from category
    const categoryLower = category?.toLowerCase() || '';
    if (categoryLower.includes('plumb') || categoryLower.includes('pipe')) return 'P';
    if (categoryLower.includes('hvac') || categoryLower.includes('mechanical') || categoryLower.includes('duct')) return 'M';
    if (categoryLower.includes('electric') || categoryLower.includes('wire') || categoryLower.includes('conduit')) return 'E';
    if (categoryLower.includes('floor') || categoryLower.includes('wall') || categoryLower.includes('ceiling')) return 'A';
    if (categoryLower.includes('fire') || categoryLower.includes('sprinkler')) return 'F';
    if (categoryLower.includes('concrete') || categoryLower.includes('steel') || categoryLower.includes('structural')) return 'S';

    return 'A'; // Default to Architectural
  }

  private calculateWallArea(room: any): number {
    // Estimate wall area assuming 8ft ceiling
    const ceilingHeight = 8;
    const perimeter = Math.sqrt(room.area) * 4; // Approximate square room
    return perimeter * ceilingHeight;
  }

  private identifyPipeType(pipe: any): any {
    const meta = pipe.meta || {};
    const description = pipe.description || '';

    // Identify pipe type from metadata or description
    if (description.includes('Copper') || meta.material === 'Copper') {
      return {
        csiDivision: '22 11 00',
        category: 'Plumbing',
        description: `Copper Pipe Type L ${pipe.diameterIn || 3/4}"`,
        sku: `COPPER-L-${pipe.diameterIn || 0.75}`,
      };
    } else if (description.includes('PVC') || meta.material === 'PVC') {
      return {
        csiDivision: '22 13 00',
        category: 'Plumbing',
        description: `PVC DWV Pipe ${pipe.diameterIn || 2}"`,
        sku: `PVC-DWV-${pipe.diameterIn || 2}`,
      };
    } else {
      return {
        csiDivision: '22 00 00',
        category: 'Plumbing',
        description: `Pipe ${pipe.diameterIn || 1}"`,
        sku: `PIPE-${pipe.diameterIn || 1}`,
      };
    }
  }

  private identifyFixtureType(fixture: any): any {
    const description = (fixture.description || '').toLowerCase();
    const meta = fixture.meta || {};

    if (description.includes('water closet') || description.includes('toilet')) {
      return {
        csiDivision: '22 41 00',
        category: 'Plumbing Fixtures',
        description: 'Water Closet - Wall Hung',
        sku: meta.model || 'WC-WALL-HUNG',
      };
    } else if (description.includes('lavatory') || description.includes('sink')) {
      return {
        csiDivision: '22 41 00',
        category: 'Plumbing Fixtures',
        description: 'Lavatory - Undermount',
        sku: meta.model || 'LAV-UNDERMOUNT',
      };
    } else if (description.includes('rtl') || description.includes('rooftop')) {
      return {
        csiDivision: '23 74 00',
        category: 'HVAC Equipment',
        description: 'Rooftop Unit',
        sku: meta.model || 'RTU-5TON',
      };
    } else {
      return {
        csiDivision: '00 00 00',
        category: 'Equipment',
        description: fixture.description || 'Equipment',
        sku: meta.model || 'EQUIPMENT',
      };
    }
  }

  private estimateUnitCost(category: string, uom: string): number {
    // Placeholder unit costs (will be replaced by MaterialRules or actual quotes)
    const estimates = {
      'Flooring': { SF: 3.50 },
      'Painting': { SF: 2.00 },
      'Ceilings': { SF: 4.00 },
      'Plumbing': { LF: 8.00, EA: 50.00 },
      'Plumbing Fixtures': { EA: 350.00 },
      'HVAC Equipment': { EA: 5000.00 },
    };

    return estimates[category]?.[uom] || 10.00;
  }

  /**
   * Find matching material in interface database by name similarity
   * Uses fuzzy matching to handle variations like:
   * - "VCT Flooring 12x12" vs "VCT Flooring 12x12 Tile"
   * - "Copper Pipe Type L 1"" vs "Copper Pipe 1" Type L"
   */
  private async findMatchingMaterial(name: string, category?: string): Promise<any | null> {
    try {
      // Get all materials from interface database
      const allMaterials = await this.prisma.material.findMany({
        where: category ? { category } : {},
      });

      if (allMaterials.length === 0) return null;

      // Calculate similarity score for each material
      const matches = allMaterials.map(m => ({
        material: m,
        score: this.calculateSimilarity(name, m.name),
      }));

      // Sort by score and take best match
      matches.sort((a, b) => b.score - a.score);
      const bestMatch = matches[0];

      // Only use match if similarity is above 70%
      if (bestMatch.score > 0.7) {
        console.log(`🔗 Matched "${name}" to "${bestMatch.material.name}" (${(bestMatch.score * 100).toFixed(0)}% similar)`);
        return bestMatch.material;
      }

      return null;
    } catch (error) {
      console.warn('Error finding matching material:', error.message);
      return null;
    }
  }

  /**
   * Calculate similarity between two strings (0-1 score)
   * Uses a simple word-based comparison
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
    const words1 = n1.split(' ');
    const words2 = n2.split(' ');
    
    const commonWords = words1.filter(w => words2.includes(w));
    const totalWords = Math.max(words1.length, words2.length);
    
    if (totalWords === 0) return 0;
    
    const wordMatchScore = commonWords.length / totalWords;

    // Substring matching bonus
    const substringBonus = (s1.includes(s2) || s2.includes(s1)) ? 0.1 : 0;

    return Math.min(wordMatchScore + substringBonus, 1.0);
  }
}

