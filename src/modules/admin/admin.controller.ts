import { Controller, Get, Post, Put, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('Admin')
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class AdminController {
  constructor(private adminService: AdminService) {}

  // Material Rules
  @Post('material-rules')
  @Roles('ADMIN', 'PRECONSTRUCTION_MANAGER')
  @ApiOperation({ summary: 'Create material rule' })
  async createMaterialRule(@Body() data: any) {
    return this.adminService.createMaterialRule(data);
  }

  @Put('material-rules/:id')
  @Roles('ADMIN', 'PRECONSTRUCTION_MANAGER')
  @ApiOperation({ summary: 'Update material rule' })
  async updateMaterialRule(@Param('id') id: string, @Body() data: any) {
    return this.adminService.updateMaterialRule(id, data);
  }

  @Get('material-rules')
  @ApiOperation({ summary: 'List material rules' })
  async listMaterialRules(@Query('trade') trade?: string) {
    return this.adminService.listMaterialRules(trade);
  }

  // Trade Markups
  @Post('trade-markups')
  @Roles('ADMIN', 'PRECONSTRUCTION_MANAGER')
  @ApiOperation({ summary: 'Set trade markup' })
  async setTradeMarkup(@Body() body: { trade: string; markup: number }) {
    return this.adminService.setTradeMarkup(body.trade, body.markup);
  }

  @Get('trade-markups')
  @ApiOperation({ summary: 'Get all trade markups' })
  async getTradeMarkups() {
    return this.adminService.getTradeMarkups();
  }

  // Email Templates
  @Post('email-templates')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Create email template' })
  async createEmailTemplate(@Body() data: any) {
    return this.adminService.createEmailTemplate(data);
  }

  @Put('email-templates/:id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Update email template' })
  async updateEmailTemplate(@Param('id') id: string, @Body() data: any) {
    return this.adminService.updateEmailTemplate(id, data);
  }

  @Get('email-templates')
  @ApiOperation({ summary: 'List email templates' })
  async listEmailTemplates(@Query('type') type?: string) {
    return this.adminService.listEmailTemplates(type);
  }

  // System Stats
  @Get('stats')
  @Roles('ADMIN', 'EXECUTIVE')
  @ApiOperation({ summary: 'Get system statistics' })
  async getSystemStats() {
    return this.adminService.getSystemStats();
  }
}
