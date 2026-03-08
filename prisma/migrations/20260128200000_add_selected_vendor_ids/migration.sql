-- AlterTable
ALTER TABLE "projects" ADD COLUMN "selectedVendorIds" TEXT[] DEFAULT ARRAY[]::TEXT[];
