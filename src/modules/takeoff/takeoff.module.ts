import { Module } from '@nestjs/common';
import { TakeoffApiService } from './takeoff-api.service';

@Module({
  providers: [TakeoffApiService],
  exports: [TakeoffApiService],
})
export class TakeoffModule {}

