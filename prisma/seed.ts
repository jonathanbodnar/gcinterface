import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create Admin Test Account
  const adminPassword = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.upsert({
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
  console.log('✅ Created admin user:', admin.email);

  // Create Estimator Test Account
  const estimatorPassword = await bcrypt.hash('user123', 10);
  const estimator = await prisma.user.upsert({
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
  console.log('✅ Created estimator user:', estimator.email);

  // Create Preconstruction Manager Test Account
  const pmPassword = await bcrypt.hash('pm123', 10);
  const pm = await prisma.user.upsert({
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
  console.log('✅ Created preconstruction manager user:', pm.email);

  console.log('\n📝 Test Accounts Created:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('👤 Admin Account:');
  console.log('   Email: admin@test.com');
  console.log('   Password: admin123');
  console.log('   Role: ADMIN');
  console.log('');
  console.log('👤 Estimator Account:');
  console.log('   Email: user@test.com');
  console.log('   Password: user123');
  console.log('   Role: ESTIMATOR');
  console.log('');
  console.log('👤 Preconstruction Manager Account:');
  console.log('   Email: pm@test.com');
  console.log('   Password: pm123');
  console.log('   Role: PRECONSTRUCTION_MANAGER');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
