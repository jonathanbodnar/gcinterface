import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  // Material Rules
  async createMaterialRule(data: any) {
    return this.prisma.materialRule.create({ data });
  }

  async updateMaterialRule(id: string, data: any) {
    return this.prisma.materialRule.update({
      where: { id },
      data,
    });
  }

  async listMaterialRules(trade?: string) {
    const where = trade ? { trade, active: true } : { active: true };
    return this.prisma.materialRule.findMany({ where });
  }

  // Trade Markups
  async setTradeMarkup(trade: string, markup: number) {
    return this.prisma.tradeMarkup.upsert({
      where: { trade },
      update: { markup },
      create: { trade, markup },
    });
  }

  async getTradeMarkups() {
    return this.prisma.tradeMarkup.findMany();
  }

  // Email Templates
  async createEmailTemplate(data: any) {
    return this.prisma.emailTemplate.create({ data });
  }

  async updateEmailTemplate(id: string, data: any) {
    return this.prisma.emailTemplate.update({
      where: { id },
      data,
    });
  }

  async listEmailTemplates(type?: string) {
    const where = type ? { type, active: true } : { active: true };
    return this.prisma.emailTemplate.findMany({ where });
  }

  // Vendor Management
  async updateVendor(id: string, data: any) {
    return this.prisma.vendor.update({
      where: { id },
      data,
    });
  }

  async deactivateVendor(id: string) {
    return this.prisma.vendor.update({
      where: { id },
      data: { active: false },
    });
  }

  // System Stats
  async getSystemStats() {
    const [
      totalProjects,
      totalVendors,
      totalRFQs,
      totalQuotes,
      totalSubcontracts,
    ] = await Promise.all([
      this.prisma.project.count(),
      this.prisma.vendor.count({ where: { active: true } }),
      this.prisma.rFQ.count(),
      this.prisma.quote.count(),
      this.prisma.subcontract.count({ where: { status: 'AWARDED' } }),
    ]);

    return {
      totalProjects,
      totalVendors,
      totalRFQs,
      totalQuotes,
      totalSubcontracts,
    };
  }
}
