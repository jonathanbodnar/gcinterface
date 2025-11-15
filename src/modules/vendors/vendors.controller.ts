import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { VendorsService } from './vendors.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Vendors')
@Controller('vendors')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class VendorsController {
  constructor(private vendorsService: VendorsService) {}

  @Get('match/:projectId')
  @ApiOperation({ summary: 'Match vendors to project materials' })
  async matchVendors(@Param('projectId') projectId: string) {
    return this.vendorsService.matchVendorsToMaterials(projectId);
  }

  @Get()
  @ApiOperation({ summary: 'List vendors' })
  async listVendors(@Query('trade') trade?: string, @Query('proximity') proximity?: string) {
    return this.vendorsService.listVendors({ trade, proximity });
  }

  @Post()
  @ApiOperation({ summary: 'Create new vendor' })
  async createVendor(@Body() data: any) {
    return this.vendorsService.createVendor(data);
  }

  @Post('bulk-import')
  @ApiOperation({ summary: 'Bulk import vendors from Excel' })
  async bulkImport(@Body() vendorsData: any[]) {
    return this.vendorsService.bulkImportVendors(vendorsData);
  }
}

