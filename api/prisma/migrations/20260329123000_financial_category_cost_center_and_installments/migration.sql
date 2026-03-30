ALTER TABLE "FinancialCategory"
ADD COLUMN "costCenterId" TEXT;

ALTER TABLE "FinancialEntry"
ADD COLUMN "installmentNumber" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN "installmentCount" INTEGER NOT NULL DEFAULT 1;

CREATE INDEX "FinancialCategory_costCenterId_idx" ON "FinancialCategory"("costCenterId");

ALTER TABLE "FinancialCategory"
ADD CONSTRAINT "FinancialCategory_costCenterId_fkey"
FOREIGN KEY ("costCenterId") REFERENCES "CostCenter"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;
