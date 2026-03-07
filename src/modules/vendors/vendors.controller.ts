import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { VendorsService } from './vendors.service';
import { VendorRankingService } from './vendor-ranking.service';
import { SubcontractorRankingService } from './subcontractor-ranking.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Vendors')
@Controller('vendors')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class VendorsController {
  constructor(
    private vendorsService: VendorsService,
    private vendorRanking: VendorRankingService,
    private subcontractorRanking: SubcontractorRankingService,
  ) {}

  @Get('match/:projectId')
  @ApiOperation({ summary: 'Match vendors to project materials' })
  async matchVendors(@Param('projectId') projectId: string) {
    return this.vendorsService.matchVendorsToMaterials(projectId);
  }

  @Get('rank/:projectId')
  @ApiOperation({ summary: 'Rank vendors by price competitiveness for project' })
  async rankVendors(@Param('projectId') projectId: string) {
    return this.vendorRanking.getVendorPriceComparison(projectId);
  }

  @Get('rank-subcontractors/:projectId')
  @ApiOperation({ summary: 'Rank subcontractors by labor capabilities for project' })
  async rankSubcontractors(@Param('projectId') projectId: string) {
    const rankings = await this.subcontractorRanking.rankSubcontractorsByProject(projectId);
    return {
      hasData: rankings.length > 0,
      rankings: rankings.map(r => ({
        vendorId: r.vendor.id,
        vendorName: r.vendor.name,
        estimatedLaborCost: r.estimatedLaborCost,
        materialCoverage: r.materialCoverage,
        competitiveScore: r.competitiveScore,
        avgRateVsMarket: r.avgRateVsMarket,
        materialsWithPricing: r.materialsWithPricing,
        totalMaterials: r.totalMaterials,
        crewSize: r.vendor.crewSize,
        laborRate: r.vendor.laborRate,
      })),
    };
  }

  @Get(':vendorId/coverage/:projectId')
  @ApiOperation({ summary: 'Get detailed material coverage for vendor on project' })
  async getVendorCoverage(
    @Param('vendorId') vendorId: string,
    @Param('projectId') projectId: string,
  ) {
    return this.vendorRanking.getVendorMaterialCoverage(vendorId, projectId);
  }

  @Get(':vendorId/labor-coverage/:projectId')
  @ApiOperation({ summary: 'Get detailed labor coverage for subcontractor on project' })
  async getSubcontractorCoverage(
    @Param('vendorId') vendorId: string,
    @Param('projectId') projectId: string,
  ) {
    return this.subcontractorRanking.getSubcontractorMaterialCoverage(vendorId, projectId);
  }

  @Get()
  @ApiOperation({ summary: 'List vendors' })
  async listVendors(@Query('trade') trade?: string, @Query('proximity') proximity?: string) {
    return this.vendorsService.listVendors({ trade, proximity });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get vendor details' })
  async getVendor(@Param('id') id: string) {
    return this.vendorsService.getVendor(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create new vendor' })
  async createVendor(@Body() data: any) {
    return this.vendorsService.createVendor(data);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update vendor' })
  async updateVendor(@Param('id') id: string, @Body() data: any) {
    return this.vendorsService.updateVendor(id, data);
  }

  @Post(':id/upload-materials')
  @ApiOperation({ summary: 'Upload vendor material catalog (CSV/Excel)' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  async uploadMaterialCatalog(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.vendorsService.uploadMaterialCatalog(id, file);
  }

  @Post('bulk-import')
  @ApiOperation({ summary: 'Bulk import vendors from Excel' })
  async bulkImport(@Body() vendorsData: any[]) {
    return this.vendorsService.bulkImportVendors(vendorsData);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a vendor' })
  async deleteVendor(@Param('id') id: string) {
    return this.vendorsService.deleteVendor(id);
  }
}

