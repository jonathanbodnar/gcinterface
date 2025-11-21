import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PricingService } from './pricing.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Pricing')
@Controller('pricing')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class PricingController {
  constructor(private pricingService: PricingService) {}

  @Get('materials/:materialId')
  @ApiOperation({ summary: 'Get all vendor pricing for a material' })
  async getMaterialPricing(@Param('materialId') materialId: string) {
    return this.pricingService.getAllPricingForMaterial(materialId);
  }

  @Get('materials/:materialId/best')
  @ApiOperation({ summary: 'Get best price for material' })
  async getBestPrice(@Param('materialId') materialId: string) {
    return this.pricingService.getBestPriceForMaterial(materialId);
  }

  @Get('materials/:materialId/suggest')
  @ApiOperation({ summary: 'Get AI price suggestion for material' })
  async suggestPrice(@Param('materialId') materialId: string) {
    return this.pricingService.suggestPriceForMaterial(materialId);
  }

  @Post('vendors/:vendorId/materials/:materialId')
  @ApiOperation({ summary: 'Set vendor price for material' })
  async setVendorPrice(
    @Param('vendorId') vendorId: string,
    @Param('materialId') materialId: string,
    @Body() data: { unitCost: number; uom?: string; leadTimeDays?: number; minimumOrder?: number },
  ) {
    return this.pricingService.setVendorPricing({
      vendorId,
      materialId,
      ...data,
    });
  }

  @Get('vendors/:vendorId/catalog')
  @ApiOperation({ summary: 'Get vendor\'s complete pricing catalog' })
  async getVendorCatalog(@Param('vendorId') vendorId: string) {
    const pricing = await this.prisma.vendorMaterialPricing.findMany({
      where: { vendorId, active: true },
      include: {
        material: {
          select: {
            id: true,
            name: true,
            trade: true,
            category: true,
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

  private prisma = this.pricingService['prisma']; // Access prisma from service
}

