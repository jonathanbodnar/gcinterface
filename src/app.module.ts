import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './common/prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { ProjectsModule } from './modules/projects/projects.module';
import { VendorsModule } from './modules/vendors/vendors.module';
import { RFQModule } from './modules/rfq/rfq.module';
import { QuotesModule } from './modules/quotes/quotes.module';
import { SubcontractsModule } from './modules/subcontracts/subcontracts.module';
import { AdminModule } from './modules/admin/admin.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    AuthModule,
    ProjectsModule,
    VendorsModule,
    RFQModule,
    QuotesModule,
    SubcontractsModule,
    AdminModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
