-- AlterTable: make takeoffJobId optional so projects can be created before plans are uploaded
ALTER TABLE "projects" ALTER COLUMN "takeoffJobId" DROP NOT NULL;

-- Add wizard tracking and notes fields
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "notes" TEXT;
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "wizardStep" TEXT;
