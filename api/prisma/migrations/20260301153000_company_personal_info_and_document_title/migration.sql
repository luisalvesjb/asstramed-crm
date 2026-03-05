-- AlterTable
ALTER TABLE "Company"
  ADD COLUMN "personalDocument" TEXT,
  ADD COLUMN "personalEmail" TEXT,
  ADD COLUMN "personalPhone" TEXT,
  ADD COLUMN "personalResponsible" TEXT,
  ADD COLUMN "personalNotes" TEXT,
  ADD COLUMN "logoPath" TEXT,
  ADD COLUMN "logoMimeType" TEXT;

-- AlterTable
ALTER TABLE "Document"
  ADD COLUMN "title" TEXT,
  ADD COLUMN "description" TEXT;

-- Backfill title from existing data
UPDATE "Document"
SET "title" = COALESCE("category", "name")
WHERE "title" IS NULL;

-- Make title required after backfill
ALTER TABLE "Document"
  ALTER COLUMN "title" SET NOT NULL;

-- Drop deprecated column
ALTER TABLE "Document"
  DROP COLUMN "category";
