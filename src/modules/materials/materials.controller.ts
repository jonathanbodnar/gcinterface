import { Controller, Get, Put, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { MaterialsService } from './materials.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Materials')
@Controller('materials')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class MaterialsController {
  constructor(private materialsService: MaterialsService) {}

  @Get()
  @ApiOperation({ summary: 'List all materials' })
  async listMaterials(
    @Query('trade') trade?: string,
    @Query('category') category?: string,
    @Query('search') search?: string,
  ) {
    return this.materialsService.listMaterials({ trade, category, search });
  }

  @Get('search')
  @ApiOperation({ summary: 'Search materials for multi-select' })
  async searchMaterials(@Query('q') query: string) {
    return this.materialsService.searchMaterials(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get material details with vendors' })
  async getMaterial(@Param('id') id: string) {
    return this.materialsService.getMaterial(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update material configuration' })
  async updateMaterial(@Param('id') id: string, @Body() data: any) {
    return this.materialsService.updateMaterial(id, data);
  }

  @Get(':id/vendors')
  @ApiOperation({ summary: 'Get vendors that supply this material' })
  async getVendorsForMaterial(@Param('id') id: string) {
    return this.materialsService.getVendorsForMaterial(id);
  }
}

