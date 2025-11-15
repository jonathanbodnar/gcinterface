import { Module } from '@nestjs/common';
import { RFQService } from './rfq.service';
import { RFQController } from './rfq.controller';

@Module({
  controllers: [RFQController],
  providers: [RFQService],
  exports: [RFQService],
})
export class RFQModule {}

