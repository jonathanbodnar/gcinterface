-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'PRECONSTRUCTION_MANAGER', 'ESTIMATOR', 'PROCUREMENT_BUYER', 'EXECUTIVE');

-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('SCOPE_DIAGNOSIS', 'BOM_GENERATION', 'VENDOR_MATCHING', 'RFQ_SENT', 'QUOTE_COMPARISON', 'AWARD_PENDING', 'AWARDED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "EstimateStatus" AS ENUM ('DRAFT', 'UNDER_REVIEW', 'APPROVED', 'AWARDED', 'REJECTED');

-- CreateEnum
CREATE TYPE "VendorType" AS ENUM ('MATERIAL_SUPPLIER', 'SUBCONTRACTOR', 'BOTH');

-- CreateEnum
CREATE TYPE "RFQStatus" AS ENUM ('DRAFT', 'SENT', 'RESPONDED', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "QuoteStatus" AS ENUM ('RECEIVED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'AWARDED');

-- CreateEnum
CREATE TYPE "SubcontractStatus" AS ENUM ('DRAFT', 'SENT_FOR_REVIEW', 'AWARDED', 'DECLINED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "EmailTemplateType" AS ENUM ('RFQ', 'AWARD', 'NON_AWARD', 'CLARIFICATION');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'ESTIMATOR',
    "password" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projects" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "clientName" TEXT,
    "totalSF" DOUBLE PRECISION,
    "takeoffJobId" TEXT NOT NULL,
    "planDate" TIMESTAMP(3),
    "bidDate" TIMESTAMP(3),
    "status" "ProjectStatus" NOT NULL DEFAULT 'SCOPE_DIAGNOSIS',
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "estimates" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "version" TEXT NOT NULL DEFAULT '1.0',
    "status" "EstimateStatus" NOT NULL DEFAULT 'DRAFT',
    "materialCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "laborCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "equipmentCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "subtotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "markup" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "contingency" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "confidenceScore" DOUBLE PRECISION,
    "riskScore" DOUBLE PRECISION,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "estimates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bom_items" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "estimateId" TEXT,
    "csiDivision" TEXT,
    "category" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "sku" TEXT,
    "quantity" DOUBLE PRECISION NOT NULL,
    "uom" TEXT NOT NULL,
    "wasteFactor" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "finalQty" DOUBLE PRECISION NOT NULL,
    "unitCost" DOUBLE PRECISION,
    "laborHours" DOUBLE PRECISION,
    "laborRate" DOUBLE PRECISION,
    "totalCost" DOUBLE PRECISION,
    "confidence" DOUBLE PRECISION,
    "source" TEXT,
    "notes" TEXT,
    "hasAlternate" BOOLEAN NOT NULL DEFAULT false,
    "alternates" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bom_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vendors" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "VendorType" NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "zipCode" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "trades" TEXT[],
    "materials" TEXT[],
    "rating" DOUBLE PRECISION DEFAULT 0,
    "reliability" DOUBLE PRECISION DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vendors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rfqs" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "rfqNumber" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "dueDate" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "sentBy" TEXT,
    "emailBody" TEXT,
    "status" "RFQStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rfqs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rfq_items" (
    "id" TEXT NOT NULL,
    "rfqId" TEXT NOT NULL,
    "bomItemId" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "uom" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rfq_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quotes" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "rfqId" TEXT NOT NULL,
    "quoteNumber" TEXT,
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "validUntil" TIMESTAMP(3),
    "hasVE" BOOLEAN NOT NULL DEFAULT false,
    "veNotes" TEXT,
    "status" "QuoteStatus" NOT NULL DEFAULT 'RECEIVED',
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quotes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quote_items" (
    "id" TEXT NOT NULL,
    "quoteId" TEXT NOT NULL,
    "bomItemId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "uom" TEXT NOT NULL,
    "unitPrice" DOUBLE PRECISION NOT NULL,
    "totalPrice" DOUBLE PRECISION NOT NULL,
    "isAlternate" BOOLEAN NOT NULL DEFAULT false,
    "alternateFor" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "quote_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subcontracts" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "trade" TEXT NOT NULL,
    "contractNumber" TEXT NOT NULL,
    "scopeOfWork" TEXT NOT NULL,
    "materials" JSONB NOT NULL,
    "schedule" JSONB,
    "contractAmount" DOUBLE PRECISION NOT NULL,
    "paymentTerms" TEXT,
    "status" "SubcontractStatus" NOT NULL DEFAULT 'DRAFT',
    "awardedAt" TIMESTAMP(3),
    "awardedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subcontracts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "material_rules" (
    "id" TEXT NOT NULL,
    "trade" TEXT NOT NULL,
    "material" TEXT NOT NULL,
    "costPerUnit" DOUBLE PRECISION NOT NULL,
    "laborPerUnit" DOUBLE PRECISION,
    "uom" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "material_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trade_markups" (
    "id" TEXT NOT NULL,
    "trade" TEXT NOT NULL,
    "markup" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trade_markups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "EmailTemplateType" NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "email_templates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "projects_takeoffJobId_key" ON "projects"("takeoffJobId");

-- CreateIndex
CREATE UNIQUE INDEX "rfqs_rfqNumber_key" ON "rfqs"("rfqNumber");

-- CreateIndex
CREATE UNIQUE INDEX "quotes_rfqId_key" ON "quotes"("rfqId");

-- CreateIndex
CREATE UNIQUE INDEX "subcontracts_contractNumber_key" ON "subcontracts"("contractNumber");

-- CreateIndex
CREATE UNIQUE INDEX "trade_markups_trade_key" ON "trade_markups"("trade");

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "estimates" ADD CONSTRAINT "estimates_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "estimates" ADD CONSTRAINT "estimates_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bom_items" ADD CONSTRAINT "bom_items_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bom_items" ADD CONSTRAINT "bom_items_estimateId_fkey" FOREIGN KEY ("estimateId") REFERENCES "estimates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rfqs" ADD CONSTRAINT "rfqs_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rfqs" ADD CONSTRAINT "rfqs_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "vendors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rfqs" ADD CONSTRAINT "rfqs_sentBy_fkey" FOREIGN KEY ("sentBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rfq_items" ADD CONSTRAINT "rfq_items_rfqId_fkey" FOREIGN KEY ("rfqId") REFERENCES "rfqs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rfq_items" ADD CONSTRAINT "rfq_items_bomItemId_fkey" FOREIGN KEY ("bomItemId") REFERENCES "bom_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "vendors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_rfqId_fkey" FOREIGN KEY ("rfqId") REFERENCES "rfqs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quote_items" ADD CONSTRAINT "quote_items_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "quotes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quote_items" ADD CONSTRAINT "quote_items_bomItemId_fkey" FOREIGN KEY ("bomItemId") REFERENCES "bom_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subcontracts" ADD CONSTRAINT "subcontracts_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subcontracts" ADD CONSTRAINT "subcontracts_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "vendors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subcontracts" ADD CONSTRAINT "subcontracts_awardedBy_fkey" FOREIGN KEY ("awardedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
