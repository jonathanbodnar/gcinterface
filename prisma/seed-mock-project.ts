import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const MOCK_PROJECT_ID = 'mock-project-001';

async function resetMockProject() {
  console.log('🧹 Cleaning up existing mock project...');
  
  // Delete in reverse order of dependencies
  await prisma.rFQ.deleteMany({ where: { projectId: MOCK_PROJECT_ID } });
  await prisma.quote.deleteMany({ where: { projectId: MOCK_PROJECT_ID } });
  await prisma.subcontract.deleteMany({ where: { projectId: MOCK_PROJECT_ID } });
  await prisma.bOM.deleteMany({ where: { projectId: MOCK_PROJECT_ID } });
  await prisma.estimate.deleteMany({ where: { projectId: MOCK_PROJECT_ID } });
  await prisma.project.deleteMany({ where: { id: MOCK_PROJECT_ID } });
  
  console.log('✅ Cleanup complete');
}

async function seedMockProject() {
  console.log('🌱 Seeding mock project for testing GC Interface...\n');

  // Reset first
  await resetMockProject();

  // Ensure test user exists
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

  // Create mock project
  const project = await prisma.project.create({
    data: {
      id: MOCK_PROJECT_ID,
      name: 'Mock Commercial Building - Complete Test',
      location: '123 Main St, San Francisco, CA',
      clientName: 'Test Client Corp',
      totalSF: 3840,
      takeoffJobId: 'mock-takeoff-ref-001',
      status: 'BOM_GENERATION',
      createdById: admin.id,
    },
  });
  console.log('📋 Created project:', project.name);

  // Create estimate
  const estimate = await prisma.estimate.create({
    data: {
      projectId: project.id,
      version: '1.0',
      status: 'DRAFT',
      createdById: admin.id,
    },
  });
  console.log('💰 Created estimate');

  // Create materials in materials database
  console.log('\n💎 Creating materials database entries...');
  const materialsData = [
    { name: 'VCT Flooring 12x12', trade: 'A', category: 'Flooring', sku: 'VCT-12X12-STANDARD', uom: 'SF' },
    { name: 'Interior Paint - Eggshell', trade: 'A', category: 'Painting', sku: 'PAINT-INT-EGGSHELL', uom: 'SF' },
    { name: 'Acoustical Ceiling Tile 2x2', trade: 'A', category: 'Ceilings', sku: 'ACT-2X2-STANDARD', uom: 'SF' },
    { name: 'Copper Pipe Type L 1"', trade: 'P', category: 'Plumbing', sku: 'COPPER-L-1IN', uom: 'LF' },
    { name: 'PVC DWV Pipe 3"', trade: 'P', category: 'Plumbing', sku: 'PVC-DWV-3IN', uom: 'LF' },
    { name: 'PVC DWV Pipe 4"', trade: 'P', category: 'Plumbing', sku: 'PVC-DWV-4IN', uom: 'LF' },
    { name: '90° Elbow Copper 1"', trade: 'P', category: 'Plumbing Fittings', sku: 'ELBOW-90-1IN-COPPER', uom: 'EA' },
    { name: 'Tee Copper 1"', trade: 'P', category: 'Plumbing Fittings', sku: 'TEE-1IN-COPPER', uom: 'EA' },
    { name: 'Water Closet - Kohler K-3989', trade: 'P', category: 'Plumbing Fixtures', sku: 'WC-KOHLER-K3989', uom: 'EA', manufacturer: 'Kohler', model: 'K-3989' },
    { name: 'Lavatory - American Standard Studio', trade: 'P', category: 'Plumbing Fixtures', sku: 'LAV-AS-STUDIO', uom: 'EA', manufacturer: 'American Standard', model: 'Studio' },
    { name: 'Urinal - Sloan WEUS-1000', trade: 'P', category: 'Plumbing Fixtures', sku: 'URINAL-SLOAN-WEUS1000', uom: 'EA', manufacturer: 'Sloan', model: 'WEUS-1000' },
    { name: 'Water Heater - Rheem RTGH-95', trade: 'P', category: 'Plumbing Equipment', sku: 'WH-RHEEM-RTGH95', uom: 'EA', manufacturer: 'Rheem', model: 'RTGH-95DVLN' },
    { name: 'Galvanized Duct 12x8', trade: 'M', category: 'HVAC Ductwork', sku: 'DUCT-GALV-12X8', uom: 'LF' },
    { name: 'Galvanized Duct 10x6', trade: 'M', category: 'HVAC Ductwork', sku: 'DUCT-GALV-10X6', uom: 'LF' },
    { name: 'RTU - Carrier 48VL-A06A', trade: 'M', category: 'HVAC Equipment', sku: 'RTU-CARRIER-48VL', uom: 'EA', manufacturer: 'Carrier', model: '48VL-A06A' },
    { name: 'VAV Box - Trane CVHE', trade: 'M', category: 'HVAC Equipment', sku: 'VAV-TRANE-CVHE', uom: 'EA', manufacturer: 'Trane', model: 'CVHE' },
    { name: 'Electrical Panel - Square D QO', trade: 'E', category: 'Electrical', sku: 'PANEL-SQUARED-QO', uom: 'EA', manufacturer: 'Square D', model: 'QO' },
  ];

  const materials: Record<string, any> = {};
  for (const matData of materialsData) {
    const material = await prisma.material.upsert({
      where: {
        name_trade: {
          name: matData.name,
          trade: matData.trade,
        },
      },
      update: {
        timesUsed: { increment: 1 },
        lastUsed: new Date(),
      },
      create: {
        name: matData.name,
        trade: matData.trade,
        category: matData.category,
        sku: matData.sku,
        uom: matData.uom,
        manufacturer: matData.manufacturer,
        model: matData.model,
        timesUsed: 1,
        lastUsed: new Date(),
        wasteFactor: 0.07,
        active: true,
      },
    });
    materials[matData.sku] = material;
  }
  console.log(`  ✓ ${materialsData.length} materials created/updated`);

  // Create BOM items
  console.log('\n📊 Creating BOM items...');
  const bomData = [
    { materialSku: 'VCT-12X12-STANDARD', description: 'VCT Flooring 12x12', qty: 3840, waste: 0.1, csi: '09 65 00', category: 'Flooring', confidence: 0.90 },
    { materialSku: 'PAINT-INT-EGGSHELL', description: 'Interior Paint - 2 Coats', qty: 4200, waste: 0.05, csi: '09 91 00', category: 'Painting', confidence: 0.85 },
    { materialSku: 'ACT-2X2-STANDARD', description: 'Acoustical Ceiling Tile 2x2', qty: 3840, waste: 0.08, csi: '09 51 00', category: 'Ceilings', confidence: 0.88 },
    { materialSku: 'COPPER-L-1IN', description: 'Copper Pipe Type L 1"', qty: 500, waste: 0.1, csi: '22 11 00', category: 'Plumbing', confidence: 0.92 },
    { materialSku: 'PVC-DWV-3IN', description: 'PVC DWV Pipe 3"', qty: 180, waste: 0.05, csi: '22 13 00', category: 'Plumbing', confidence: 0.90 },
    { materialSku: 'PVC-DWV-4IN', description: 'PVC DWV Pipe 4"', qty: 120, waste: 0.05, csi: '22 13 00', category: 'Plumbing', confidence: 0.90 },
    { materialSku: 'ELBOW-90-1IN-COPPER', description: '90° Elbow Copper 1"', qty: 45, waste: 0, csi: '22 11 00', category: 'Plumbing Fittings', confidence: 0.85 },
    { materialSku: 'TEE-1IN-COPPER', description: 'Tee Copper 1"', qty: 20, waste: 0, csi: '22 11 00', category: 'Plumbing Fittings', confidence: 0.85 },
    { materialSku: 'WC-KOHLER-K3989', description: 'Water Closet - Wall Hung', qty: 4, waste: 0, csi: '22 41 00', category: 'Plumbing Fixtures', confidence: 0.95, manufacturer: 'Kohler', model: 'K-3989' },
    { materialSku: 'LAV-AS-STUDIO', description: 'Lavatory - Undermount', qty: 4, waste: 0, csi: '22 41 00', category: 'Plumbing Fixtures', confidence: 0.95, manufacturer: 'American Standard', model: 'Studio' },
    { materialSku: 'URINAL-SLOAN-WEUS1000', description: 'Urinal - Wall Hung', qty: 2, waste: 0, csi: '22 41 00', category: 'Plumbing Fixtures', confidence: 0.95, manufacturer: 'Sloan', model: 'WEUS-1000' },
    { materialSku: 'WH-RHEEM-RTGH95', description: 'Tankless Water Heater', qty: 1, waste: 0, csi: '22 33 00', category: 'Plumbing Equipment', confidence: 0.95, manufacturer: 'Rheem', model: 'RTGH-95DVLN' },
    { materialSku: 'DUCT-GALV-12X8', description: 'Galvanized Duct 12"x8"', qty: 180, waste: 0.05, csi: '23 31 00', category: 'HVAC Ductwork', confidence: 0.88 },
    { materialSku: 'DUCT-GALV-10X6', description: 'Galvanized Duct 10"x6"', qty: 120, waste: 0.05, csi: '23 31 00', category: 'HVAC Ductwork', confidence: 0.88 },
    { materialSku: 'RTU-CARRIER-48VL', description: 'Rooftop Unit 5-Ton', qty: 2, waste: 0, csi: '23 74 00', category: 'HVAC Equipment', confidence: 0.95, manufacturer: 'Carrier', model: '48VL-A06A' },
    { materialSku: 'VAV-TRANE-CVHE', description: 'VAV Box with Reheat', qty: 8, waste: 0, csi: '23 36 00', category: 'HVAC Equipment', confidence: 0.92, manufacturer: 'Trane', model: 'CVHE' },
    { materialSku: 'PANEL-SQUARED-QO', description: 'Electrical Panel 200A', qty: 2, waste: 0, csi: '26 24 00', category: 'Electrical', confidence: 0.95, manufacturer: 'Square D', model: 'QO' },
  ];

  const bomItems = [];
  for (const bom of bomData) {
    const material = materials[bom.materialSku];
    const finalQty = bom.qty * (1 + bom.waste);
    const unitCost = estimateUnitCost(bom.category, material.uom);
    
    const bomItem = await prisma.bOM.create({
      data: {
        projectId: project.id,
        estimateId: estimate.id,
        materialId: material.id,
        csiDivision: bom.csi,
        category: bom.category,
        description: bom.description,
        sku: bom.materialSku,
        manufacturer: bom.manufacturer,
        model: bom.model,
        quantity: bom.qty,
        uom: material.uom,
        wasteFactor: bom.waste,
        finalQty: finalQty,
        unitCost: unitCost,
        totalCost: finalQty * unitCost,
        confidence: bom.confidence,
        source: 'Mock data for testing',
      },
    });
    bomItems.push(bomItem);
  }
  console.log(`  ✓ ${bomItems.length} BOM items created`);
  console.log('\n💰 Updating estimate totals...');

  // Update estimate totals
  const totalMaterialCost = bomItems.reduce((sum, item) => sum + item.totalCost, 0);
  await prisma.estimate.update({
    where: { id: estimate.id },
    data: {
      materialCost: totalMaterialCost,
      subtotal: totalMaterialCost,
      totalCost: totalMaterialCost * 1.15, // 15% markup
      confidenceScore: bomItems.reduce((sum, item) => sum + item.confidence, 0) / bomItems.length,
    },
  });
  console.log(`  ✓ Estimate updated: $${totalMaterialCost.toLocaleString()}`);

  // Create vendors that match the materials
  console.log('\n👥 Creating vendors...');
  console.log('🧹 Cleaning existing test vendors...');
  
  // Delete existing test vendors first
  await prisma.vendor.deleteMany({
    where: {
      email: {
        contains: '@',
        endsWith: '.com',
      },
      name: {
        in: [
          'ABC Building Supply',
          'Premier Paint & Coatings',
          'Bay Area Plumbing Supply',
          'Ferguson Plumbing Fixtures',
          'West Coast HVAC Supply',
          'NorCal Electrical Distributors',
          'Golden State Contractors',
          'Pacific Plumbing Contractors',
          'Bay Mechanical Services',
          'Elite Electrical Contractors',
        ],
      },
    },
  });
  const vendorsData = [
    {
      name: 'ABC Building Supply',
      type: 'MATERIAL_SUPPLIER',
      email: 'quotes@abcbuildingsupply.com',
      phone: '(415) 555-0101',
      address: '123 Supply Way, San Francisco, CA 94105',
      trades: ['A'],
      materials: ['VCT Flooring 12x12', 'Acoustical Ceiling Tile 2x2'],
      serviceRadius: 50,
      rating: 4.5,
    },
    {
      name: 'Premier Paint & Coatings',
      type: 'MATERIAL_SUPPLIER',
      email: 'sales@premierpaint.com',
      phone: '(415) 555-0102',
      address: '456 Paint Blvd, Oakland, CA 94601',
      trades: ['A'],
      materials: ['Interior Paint - Eggshell'],
      alternates: ['Sherwin Williams, Benjamin Moore'],
      serviceRadius: 75,
      rating: 4.8,
    },
    {
      name: 'Bay Area Plumbing Supply',
      type: 'MATERIAL_SUPPLIER',
      email: 'orders@bayareaplumbing.com',
      phone: '(415) 555-0103',
      address: '789 Pipe Street, San Jose, CA 95110',
      trades: ['P'],
      materials: ['Copper Pipe Type L 1"', 'PVC DWV Pipe 3"', 'PVC DWV Pipe 4"', '90° Elbow Copper 1"', 'Tee Copper 1"'],
      serviceRadius: 60,
      rating: 4.6,
    },
    {
      name: 'Ferguson Plumbing Fixtures',
      type: 'MATERIAL_SUPPLIER',
      email: 'commercial@ferguson.com',
      phone: '(415) 555-0104',
      address: '321 Fixture Ave, Fremont, CA 94538',
      trades: ['P'],
      materials: ['Water Closet - Kohler K-3989', 'Lavatory - American Standard Studio', 'Urinal - Sloan WEUS-1000', 'Water Heater - Rheem RTGH-95'],
      alternates: ['Toto, American Standard, Moen alternatives available'],
      serviceRadius: 100,
      rating: 4.9,
      isRequired: true,
      requiredFor: ['Water Closet - Kohler K-3989'],
    },
    {
      name: 'West Coast HVAC Supply',
      type: 'MATERIAL_SUPPLIER',
      email: 'info@westcoasthvac.com',
      phone: '(415) 555-0105',
      address: '555 HVAC Drive, Sacramento, CA 95814',
      trades: ['M'],
      materials: ['Galvanized Duct 12x8', 'Galvanized Duct 10x6', 'RTU - Carrier 48VL-A06A', 'VAV Box - Trane CVHE'],
      serviceRadius: 150,
      rating: 4.4,
    },
    {
      name: 'NorCal Electrical Distributors',
      type: 'MATERIAL_SUPPLIER',
      email: 'sales@norcalelec.com',
      phone: '(415) 555-0106',
      address: '987 Electric Way, Hayward, CA 94544',
      trades: ['E'],
      materials: ['Electrical Panel - Square D QO'],
      serviceRadius: 80,
      rating: 4.7,
    },
    {
      name: 'Golden State Contractors',
      type: 'SUBCONTRACTOR',
      email: 'bids@goldenstatecontractors.com',
      phone: '(415) 555-0201',
      address: '111 Construction Blvd, San Mateo, CA 94402',
      trades: ['A'],
      services: ['Flooring Installation', 'Ceiling Installation', 'Painting'],
      crewSize: 12,
      equipmentList: ['Lifts', 'Floor Sanders', 'Spray Equipment'],
      certifications: ['OSHA 30-Hour', 'CA Contractors License'],
      insurance: { liability: 2000000, workers_comp: 1000000, expiry: '2025-12-31' },
      serviceRadius: 100,
      rating: 4.6,
    },
    {
      name: 'Pacific Plumbing Contractors',
      type: 'SUBCONTRACTOR',
      email: 'estimating@pacificplumbing.com',
      phone: '(415) 555-0202',
      address: '222 Plumber Lane, Concord, CA 94520',
      trades: ['P'],
      services: ['Rough-in Plumbing', 'Fixture Installation', 'Water Heater Installation', 'Backflow Testing'],
      crewSize: 8,
      equipmentList: ['Pipe Threading Machines', 'Drain Cameras', 'Service Trucks'],
      certifications: ['Master Plumber', 'C-36 License', 'Backflow Certified'],
      insurance: { liability: 3000000, workers_comp: 1500000, expiry: '2025-10-15' },
      serviceRadius: 75,
      rating: 4.8,
    },
    {
      name: 'Bay Mechanical Services',
      type: 'SUBCONTRACTOR',
      email: 'quotes@baymechanical.com',
      phone: '(415) 555-0203',
      address: '333 HVAC Court, Richmond, CA 94801',
      trades: ['M'],
      services: ['HVAC Installation', 'Ductwork Fabrication', 'Balancing & Testing'],
      crewSize: 10,
      equipmentList: ['Cranes', 'Sheet Metal Shop', 'Test Equipment'],
      certifications: ['C-20 HVAC License', 'EPA Universal', 'NATE Certified'],
      insurance: { liability: 2500000, workers_comp: 1500000, expiry: '2025-11-30' },
      serviceRadius: 90,
      rating: 4.7,
    },
    {
      name: 'Elite Electrical Contractors',
      type: 'SUBCONTRACTOR',
      email: 'bids@eliteelectrical.com',
      phone: '(415) 555-0204',
      address: '444 Electric Plaza, Walnut Creek, CA 94596',
      trades: ['E'],
      services: ['Electrical Installation', 'Panel Installation', 'Testing & Commissioning'],
      crewSize: 15,
      equipmentList: ['Lifts', 'Wire Pulling Equipment', 'Test Instruments'],
      certifications: ['C-10 Electrical License', 'OSHA 30-Hour', 'NFPA 70E'],
      insurance: { liability: 3000000, workers_comp: 2000000, expiry: '2025-09-01' },
      serviceRadius: 100,
      rating: 4.9,
    },
  ];

  const vendors = [];
  for (const vendorData of vendorsData) {
    try {
      const vendor = await prisma.vendor.upsert({
        where: {
          // Use email as unique identifier for upsert
          email: vendorData.email,
        },
        update: {},
        create: {
          name: vendorData.name,
          type: vendorData.type as any,
          email: vendorData.email,
          phone: vendorData.phone,
          address: vendorData.address,
          trades: vendorData.trades,
          materials: vendorData.materials || [],
          alternates: typeof vendorData.alternates === 'string' 
            ? vendorData.alternates.split(',').map(a => a.trim()) 
            : (vendorData.alternates || []),
          isRequired: vendorData.isRequired || false,
          requiredFor: vendorData.requiredFor || [],
          services: vendorData.services || [],
          crewSize: vendorData.crewSize || null,
          equipmentList: vendorData.equipmentList || [],
          certifications: vendorData.certifications || [],
          insurance: vendorData.insurance || null,
          serviceRadius: vendorData.serviceRadius || null,
          rating: vendorData.rating || 0,
          active: true,
        },
      });
      vendors.push(vendor);
    } catch (error) {
      console.error(`Failed to create vendor ${vendorData.name}:`, error.message);
    }
  }
  console.log(`  ✓ ${vendors.length} vendors created (${vendors.filter(v => v.type === 'MATERIAL_SUPPLIER').length} suppliers, ${vendors.filter(v => v.type === 'SUBCONTRACTOR').length} contractors)`);

  console.log('\n' + '='.repeat(60));
  console.log('🎉 Mock project seeded successfully!\n');
  console.log(`📋 Project ID: ${project.id}`);
  console.log(`📁 Project Name: ${project.name}`);
  console.log(`📊 Total Area: ${project.totalSF.toLocaleString()} SF`);
  console.log(`💎 Materials: ${materialsData.length} unique materials`);
  console.log(`📦 BOM Items: ${bomItems.length} items`);
  console.log(`👥 Vendors: ${vendors.length} (${vendors.filter(v => v.type === 'MATERIAL_SUPPLIER').length} suppliers, ${vendors.filter(v => v.type === 'SUBCONTRACTOR').length} contractors)`);
  console.log(`💰 Estimated Cost: $${totalMaterialCost.toLocaleString()}`);
  console.log('='.repeat(60));
  console.log('\n✨ Project ready for testing in GC Interface!');
  console.log(`🔗 View at: https://gcinterface-development.up.railway.app/projects`);
  console.log(`\n💡 To reset: npm run seed:mock-reset\n`);
}

function estimateUnitCost(category: string, uom: string): number {
  // Simple cost estimation
  const costs: Record<string, number> = {
    'Flooring': 3.50,
    'Painting': 2.00,
    'Ceilings': 4.00,
    'Plumbing': 8.50,
    'Plumbing Fittings': 12.00,
    'Plumbing Fixtures': 450.00,
    'Plumbing Equipment': 2500.00,
    'HVAC Ductwork': 15.00,
    'HVAC Equipment': 8500.00,
    'Electrical': 3500.00,
  };
  
  return costs[category] || 10.00;
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--reset-only')) {
    await resetMockProject();
    console.log('✅ Mock project data cleared');
  } else {
    await seedMockProject();
  }
}

main()
  .catch((e) => {
    console.error('❌ Error seeding mock project:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

