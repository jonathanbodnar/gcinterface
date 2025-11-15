import { Global, Module } from '@nestjs/common';
import { PrismaService, TakeoffPrismaService } from './prisma.service';

@Global()
@Module({
  providers: [PrismaService, TakeoffPrismaService],
  exports: [PrismaService, TakeoffPrismaService],
})
export class PrismaModule {}

