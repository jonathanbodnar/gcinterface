import { Controller, Get, Post, Put, Body, Param, Query, UseGuards, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
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
}

