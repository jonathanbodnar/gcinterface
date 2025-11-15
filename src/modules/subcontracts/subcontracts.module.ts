import { Module } from '@nestjs/common';
import { SubcontractsService } from './subcontracts.service';
import { SubcontractsController } from './subcontracts.controller';

@Module({
  controllers: [SubcontractsController],
  providers: [SubcontractsService],
  exports: [SubcontractsService],
})
export class SubcontractsModule {}

