import { Module } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { ProjectsController } from './projects.controller';
import { PrismaModule } from '@/common/prisma/prisma.module';
import { BOMModule } from '../bom/bom.module';

@Module({
  imports: [PrismaModule, BOMModule],
  controllers: [ProjectsController],
  providers: [ProjectsService],
  exports: [ProjectsService],
})
export class ProjectsModule {}
