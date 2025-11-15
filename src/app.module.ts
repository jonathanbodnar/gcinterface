import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { PrismaModule } from './common/prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { ProjectsModule } from './modules/projects/projects.module';
import { VendorsModule } from './modules/vendors/vendors.module';
import { RFQModule } from './modules/rfq/rfq.module';
import { QuotesModule } from './modules/quotes/quotes.module';
import { SubcontractsModule } from './modules/subcontracts/subcontracts.module';
import { AdminModule } from './modules/admin/admin.module';
import { BOMModule } from './modules/bom/bom.module';
import { LaborModule } from './modules/labor/labor.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    AuthModule,
    ProjectsModule,
    BOMModule,
    LaborModule,
    VendorsModule,
    RFQModule,
    QuotesModule,
    SubcontractsModule,
    AdminModule,
  ],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}
