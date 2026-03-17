-- CreateEnum
CREATE TYPE "MessagePriority" AS ENUM ('ALTA', 'MEDIA', 'BAIXA');

-- AlterTable Company: sequential code
CREATE SEQUENCE IF NOT EXISTS "Company_code_seq";
ALTER TABLE "Company" ADD COLUMN "code" INTEGER;
ALTER TABLE "Company" ALTER COLUMN "code" SET DEFAULT nextval('"Company_code_seq"');
UPDATE "Company" SET "code" = nextval('"Company_code_seq"') WHERE "code" IS NULL;
SELECT setval('"Company_code_seq"', COALESCE((SELECT MAX("code") FROM "Company"), 1));
ALTER TABLE "Company" ALTER COLUMN "code" SET NOT NULL;

-- AlterTable FinancialEntry: payment details and attachments
ALTER TABLE "FinancialEntry"
ADD COLUMN "paymentKey" TEXT,
ADD COLUMN "bankSlipPath" TEXT,
ADD COLUMN "bankSlipMimeType" TEXT,
ADD COLUMN "paymentReceiptPath" TEXT,
ADD COLUMN "paymentReceiptMimeType" TEXT;

-- CreateTable CompanyMessage
CREATE TABLE "CompanyMessage" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "parentMessageId" TEXT,
  "content" TEXT NOT NULL,
  "priority" "MessagePriority" NOT NULL DEFAULT 'MEDIA',
  "directedToId" TEXT,
  "createdById" TEXT NOT NULL,
  "resolvedAt" TIMESTAMP(3),
  "resolvedById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "deletedAt" TIMESTAMP(3),

  CONSTRAINT "CompanyMessage_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE UNIQUE INDEX "Company_code_key" ON "Company"("code");
CREATE INDEX "CompanyMessage_companyId_parentMessageId_createdAt_idx" ON "CompanyMessage"("companyId", "parentMessageId", "createdAt");
CREATE INDEX "CompanyMessage_companyId_resolvedAt_priority_idx" ON "CompanyMessage"("companyId", "resolvedAt", "priority");

-- Foreign keys
ALTER TABLE "CompanyMessage" ADD CONSTRAINT "CompanyMessage_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CompanyMessage" ADD CONSTRAINT "CompanyMessage_parentMessageId_fkey" FOREIGN KEY ("parentMessageId") REFERENCES "CompanyMessage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CompanyMessage" ADD CONSTRAINT "CompanyMessage_directedToId_fkey" FOREIGN KEY ("directedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CompanyMessage" ADD CONSTRAINT "CompanyMessage_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CompanyMessage" ADD CONSTRAINT "CompanyMessage_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
