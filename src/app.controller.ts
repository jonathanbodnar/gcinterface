import { Controller, Get, Post } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

@ApiTags('System')
@Controller()
export class AppController {
  @Get()
  @ApiOperation({ summary: 'API root' })
  getRoot() {
    return {
      name: 'GC Interface API',
      version: '1.0.0',
      description: 'Post-Takeoff Estimation & Procurement SaaS',
      documentation: '/api/docs',
      health: '/health',
    };
  }

  @Get('health')
  @ApiOperation({ summary: 'Health check' })
  getHealth() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  }

  @Post('migrate')
  @ApiOperation({ summary: 'Run database migrations (admin only)' })
  async runMigrations() {
    try {
      console.log('🔄 Running database migrations...');
      const { stdout, stderr } = await execAsync('npx prisma db push --accept-data-loss');
      
      console.log('✅ Migrations complete');
      console.log('STDOUT:', stdout);
      if (stderr) console.warn('STDERR:', stderr);
      
      return {
        success: true,
        message: 'Database migrations completed successfully',
        output: stdout,
      };
    } catch (error) {
      console.error('❌ Migration failed:', error);
      return {
        success: false,
        message: 'Migration failed',
        error: error.message,
        output: error.stdout,
        errorOutput: error.stderr,
      };
    }
  }

  @Post('seed-mock-project')
  @ApiOperation({ summary: 'Seed mock project for testing (admin only)' })
  async seedMockProject() {
    try {
      console.log('🌱 Seeding mock project...');
      const { stdout, stderr } = await execAsync('npm run seed:mock-project');
      
      console.log('✅ Mock project seeded');
      console.log('STDOUT:', stdout);
      if (stderr) console.warn('STDERR:', stderr);
      
      return {
        success: true,
        message: 'Mock project created successfully',
        output: stdout,
      };
    } catch (error) {
      console.error('❌ Seed failed:', error);
      return {
        success: false,
        message: 'Seed failed',
        error: error.message,
        output: error.stdout,
        errorOutput: error.stderr,
      };
    }
  }
}
