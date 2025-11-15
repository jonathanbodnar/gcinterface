import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@Controller()
export class AppController {
  @Get()
  @ApiOperation({ summary: 'Root endpoint - API info' })
  getRoot() {
    return {
      name: 'GC Interface API',
      version: '1.0.0',
      description: 'Post-Takeoff Estimation & Procurement SaaS',
      status: 'running',
      endpoints: {
        docs: '/api/docs',
        health: '/health',
        auth: '/api/auth',
        projects: '/api/projects',
        vendors: '/api/vendors',
        rfq: '/api/rfq',
        quotes: '/api/quotes',
        subcontracts: '/api/subcontracts',
        bom: '/api/bom',
        labor: '/api/labor',
        admin: '/api/admin',
      },
    };
  }

  @Get('health')
  @ApiTags('Health')
  @ApiOperation({ summary: 'Health check' })
  getHealth() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'gcinterface-api',
      version: '1.0.0',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
    };
  }
}
