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

