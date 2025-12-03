-- CreateTable
CREATE TABLE IF NOT EXISTS "clients" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contactName" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "zipCode" TEXT,
    "defaultMarkup" DOUBLE PRECISION,
    "paymentTerms" TEXT,
    "creditLimit" DOUBLE PRECISION,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "material_markups" (
    "id" TEXT NOT NULL,
    "clientId" TEXT,
    "materialId" TEXT NOT NULL,
    "markup" DOUBLE PRECISION NOT NULL,
    "applicableTrades" TEXT[],
    "notes" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "material_markups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "vendor_labor_pricing" (
    "id" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "materialId" TEXT,
    "trade" TEXT NOT NULL,
    "laborRate" DOUBLE PRECISION NOT NULL,
    "hoursPerUnit" DOUBLE PRECISION,
    "uom" TEXT,
    "minimumCharge" DOUBLE PRECISION,
    "mobilizationCost" DOUBLE PRECISION,
    "leadTimeDays" INTEGER,
    "effectiveDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiryDate" TIMESTAMP(3),
    "lastQuoteDate" TIMESTAMP(3),
    "quotedBy" TEXT,
    "sourceQuoteId" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vendor_labor_pricing_pkey" PRIMARY KEY ("id")
);

-- AlterTable: Add new columns to existing tables
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "clientId" TEXT;
ALTER TABLE "vendors" ADD COLUMN IF NOT EXISTS "laborRate" DOUBLE PRECISION;
ALTER TABLE "vendors" ADD COLUMN IF NOT EXISTS "materialCapabilities" TEXT[];
ALTER TABLE "material_rules" ADD COLUMN IF NOT EXISTS "laborRate" DOUBLE PRECISION;
ALTER TABLE "material_rules" ADD COLUMN IF NOT EXISTS "crewSize" INTEGER;
ALTER TABLE "material_rules" ADD COLUMN IF NOT EXISTS "equipmentCostPerDay" DOUBLE PRECISION;

-- AlterTable: Add clientId to trade_markups (but keep old data)
ALTER TABLE "trade_markups" ADD COLUMN IF NOT EXISTS "clientId" TEXT;
ALTER TABLE "trade_markups" ADD COLUMN IF NOT EXISTS "notes" TEXT;

-- Drop old unique constraint on trade_markups if it exists
ALTER TABLE "trade_markups" DROP CONSTRAINT IF EXISTS "trade_markups_trade_key";

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "material_markups_clientId_materialId_key" ON "material_markups"("clientId", "materialId");
CREATE UNIQUE INDEX IF NOT EXISTS "trade_markups_clientId_trade_key" ON "trade_markups"("clientId", "trade");
CREATE UNIQUE INDEX IF NOT EXISTS "vendor_labor_pricing_vendorId_materialId_trade_key" ON "vendor_labor_pricing"("vendorId", "materialId", "trade");

-- AddForeignKey
ALTER TABLE "material_markups" ADD CONSTRAINT "material_markups_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "material_markups" ADD CONSTRAINT "material_markups_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "materials"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "trade_markups" ADD CONSTRAINT "trade_markups_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "projects" ADD CONSTRAINT "projects_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "vendor_labor_pricing" ADD CONSTRAINT "vendor_labor_pricing_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "vendors"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "vendor_labor_pricing" ADD CONSTRAINT "vendor_labor_pricing_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "materials"("id") ON DELETE CASCADE ON UPDATE CASCADE;
