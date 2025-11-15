import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '@/common/prisma/prisma.service';
import { UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async validateUser(email: string, password: string): Promise<any> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { email },
      });

      if (!user) {
        return null;
      }

      if (!user.active) {
        return null;
      }

      const isPasswordValid = await bcrypt.compare(password, user.password);
      
      if (!isPasswordValid) {
        return null;
      }

      const { password: _, ...result } = user;
      return result;
    } catch (error) {
      console.error('Error validating user:', error);
      return null;
    }
  }

  async login(user: any) {
    const payload = {
      email: user.email,
      sub: user.id,
      role: user.role,
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    };
  }

  async register(email: string, password: string, name: string, role: string = 'ESTIMATOR') {
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await this.prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        role: role as any, // Cast to UserRole enum
      },
    });

    const { password: _, ...result } = user;
    return result;
  }

  async validateToken(token: string) {
    try {
      return this.jwtService.verify(token);
    } catch (error) {
      throw new UnauthorizedException('Invalid token');
    }
  }

  async seedTestAccounts() {
    try {
      console.log('🌱 Seeding test accounts...');

      const results = [];

      // Create Admin Test Account
      const adminPassword = await bcrypt.hash('admin123', 10);
      const admin = await this.prisma.user.upsert({
        where: { email: 'admin@test.com' },
        update: {},
        create: {
          email: 'admin@test.com',
          name: 'Admin User',
          password: adminPassword,
          role: UserRole.ADMIN,
          active: true,
        },
      });
      results.push({ email: admin.email, role: admin.role, status: 'created' });
      console.log('✅ Created admin user:', admin.email);

      // Create Estimator Test Account
      const estimatorPassword = await bcrypt.hash('user123', 10);
      const estimator = await this.prisma.user.upsert({
        where: { email: 'user@test.com' },
        update: {},
        create: {
          email: 'user@test.com',
          name: 'Test Estimator',
          password: estimatorPassword,
          role: UserRole.ESTIMATOR,
          active: true,
        },
      });
      results.push({ email: estimator.email, role: estimator.role, status: 'created' });
      console.log('✅ Created estimator user:', estimator.email);

      // Create Preconstruction Manager Test Account
      const pmPassword = await bcrypt.hash('pm123', 10);
      const pm = await this.prisma.user.upsert({
        where: { email: 'pm@test.com' },
        update: {},
        create: {
          email: 'pm@test.com',
          name: 'Preconstruction Manager',
          password: pmPassword,
          role: UserRole.PRECONSTRUCTION_MANAGER,
          active: true,
        },
      });
      results.push({ email: pm.email, role: pm.role, status: 'created' });
      console.log('✅ Created preconstruction manager user:', pm.email);

      return {
        message: 'Test accounts seeded successfully',
        accounts: results,
        testAccounts: {
          admin: { email: 'admin@test.com', password: 'admin123' },
          estimator: { email: 'user@test.com', password: 'user123' },
          pm: { email: 'pm@test.com', password: 'pm123' },
        },
      };
    } catch (error) {
      console.error('❌ Error seeding test accounts:', error);
      throw new Error(`Failed to seed accounts: ${error.message}`);
    }
  }
}
