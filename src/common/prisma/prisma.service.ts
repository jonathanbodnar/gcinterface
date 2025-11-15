import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    super({
      log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    });
  }

  async onModuleInit() {
    await this.$connect();
    console.log('✅ GC Interface database connected');
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}

// Takeoff database client (READ ONLY)
// Uses Prisma with raw SQL queries for the takeoff database
// Note: In production, consider using a separate Prisma schema or pg client
@Injectable()
export class TakeoffPrismaService implements OnModuleInit, OnModuleDestroy {
  public client: PrismaClient | null = null;

  constructor() {
    const takeoffUrl = process.env.TAKEOFF_DATABASE_URL;
    
    if (takeoffUrl) {
      // Create Prisma client with takeoff database URL
      // Note: Prisma reads schema from schema.prisma, but we can override the URL
      // For production, you may want to use pg (PostgreSQL client) directly
      this.client = new PrismaClient({
        datasources: {
          db: {
            url: takeoffUrl,
          },
        },
        log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
      });
    }
  }

  async onModuleInit() {
    if (this.client && process.env.TAKEOFF_DATABASE_URL) {
      try {
        await this.client.$connect();
        console.log('✅ Takeoff database connected (READ ONLY)');
      } catch (error) {
        console.warn('⚠️  Failed to connect to takeoff database:', error.message);
        this.client = null;
      }
    } else {
      console.warn('⚠️  TAKEOFF_DATABASE_URL not set - takeoff features disabled');
    }
  }

  async onModuleDestroy() {
    if (this.client) {
      await this.client.$disconnect();
    }
  }

  // Raw SQL query method for takeoff database
  async $queryRaw<T = any>(query: TemplateStringsArray, ...values: any[]): Promise<T> {
    if (!this.client) {
      throw new Error('Takeoff database not configured');
    }
    return this.client.$queryRaw<T>(query, ...values);
  }
}
