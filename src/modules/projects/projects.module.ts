import { Module } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { ProjectsController } from './projects.controller';
import { PrismaModule } from '@/common/prisma/prisma.module';
import { BOMModule } from '../bom/bom.module';
import { TakeoffModule } from '../takeoff/takeoff.module';

@Module({
  imports: [PrismaModule, BOMModule, TakeoffModule],
  controllers: [ProjectsController],
  providers: [ProjectsService],
  exports: [ProjectsService],
})
export class ProjectsModule {}
