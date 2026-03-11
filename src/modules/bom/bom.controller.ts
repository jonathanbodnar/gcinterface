import { Controller, Get, Post, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { BOMGeneratorService } from './bom-generator.service';
import { PrismaService } from '@/common/prisma/prisma.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('BOM')
@Controller('bom')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class BOMController {
  constructor(
    private bomGenerator: BOMGeneratorService,
    private prisma: PrismaService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get BOM items for a project' })
  async getBOM(@Query('projectId') projectId: string) {
    if (!projectId) {
      throw new Error('projectId query parameter is required');
    }

    const bomItems = await this.prisma.bOM.findMany({
      where: { projectId },
      include: {
        material: {
          select: {
            id: true,
            name: true,
            trade: true,
            category: true,
          },
        },
        estimate: {
          select: {
            id: true,
            version: true,
          },
        },
      },
      orderBy: [
        { category: 'asc' },
        { description: 'asc' },
      ],
    });

    // Calculate summary
    const summary = {
      totalItems: bomItems.length,
      totalCost: bomItems.reduce((sum, item) => sum + (item.totalCost || 0), 0),
      averageConfidence: bomItems.length > 0
        ? bomItems.reduce((sum, item) => sum + (item.confidence || 0), 0) / bomItems.length
        : 0,
      byTrade: this.groupByTrade(bomItems),
    };

    return {
      items: bomItems,
      summary,
    };
  }

  @Get('status')
  @ApiOperation({ summary: 'Get RFQ/quote status for each BOM item' })
  async getBOMStatus(@Query('projectId') projectId: string) {
    if (!projectId) throw new Error('projectId query parameter is required');

    const bomItems = await this.prisma.bOM.findMany({
      where: { projectId },
      select: {
        id: true,
        description: true,
        category: true,
        finalQty: true,
        uom: true,
        material: { select: { id: true, name: true, trade: true } },
        rfqItems: {
          select: {
            id: true,
            rfq: {
              select: {
                id: true,
                status: true,
                vendor: { select: { id: true, name: true } },
              },
            },
          },
        },
        quoteItems: {
          select: {
            id: true,
            unitPrice: true,
            totalPrice: true,
            quote: {
              select: {
                id: true,
                status: true,
                vendor: { select: { id: true, name: true } },
              },
            },
          },
        },
      },
      orderBy: [{ category: 'asc' }, { description: 'asc' }],
    });

    return bomItems.map(item => {
      const rfqStatuses = item.rfqItems.map(ri => ({
        rfqId: ri.rfq.id,
        status: ri.rfq.status,
        vendorName: ri.rfq.vendor.name,
        vendorId: ri.rfq.vendor.id,
      }));

      const quoteStatuses = item.quoteItems.map(qi => ({
        quoteId: qi.quote.id,
        status: qi.quote.status,
        vendorName: qi.quote.vendor.name,
        vendorId: qi.quote.vendor.id,
        unitPrice: qi.unitPrice,
        totalPrice: qi.totalPrice,
      }));

      const hasAward = quoteStatuses.some(q => q.status === 'AWARDED');
      const hasQuote = quoteStatuses.length > 0;
      const hasRFQ = rfqStatuses.some(r => r.status === 'SENT' || r.status === 'RESPONDED');

      let overallStatus: 'AVAILABLE' | 'RFQ_SENT' | 'QUOTED' | 'AWARDED' = 'AVAILABLE';
      if (hasAward) overallStatus = 'AWARDED';
      else if (hasQuote) overallStatus = 'QUOTED';
      else if (hasRFQ) overallStatus = 'RFQ_SENT';

      return {
        id: item.id,
        description: item.description,
        category: item.category,
        trade: item.material?.trade || item.category?.charAt(0) || '?',
        finalQty: item.finalQty,
        uom: item.uom,
        overallStatus,
        rfqs: rfqStatuses,
        quotes: quoteStatuses,
      };
    });
  }

  @Post('generate/:projectId')
  @ApiOperation({ summary: 'Generate BOM from takeoff data' })
  async generateBOM(@Param('projectId') projectId: string, @Request() req) {
    return this.bomGenerator.generateFromTakeoff(projectId, req.user.userId);
  }

  private groupByTrade(bomItems: any[]) {
    const byTrade: Record<string, any> = {};
    
    bomItems.forEach(item => {
      const trade = item.material?.trade || 'Unknown';
      if (!byTrade[trade]) {
        byTrade[trade] = {
          items: 0,
          totalCost: 0,
        };
      }
      byTrade[trade].items++;
      byTrade[trade].totalCost += item.totalCost || 0;
    });

    return byTrade;
  }
}

