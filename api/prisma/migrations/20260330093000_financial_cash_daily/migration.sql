CREATE TYPE "CashBoxStatus" AS ENUM ('ABERTO', 'FECHADO');
CREATE TYPE "CashMovementType" AS ENUM ('RECEBIMENTO', 'SAIDA', 'SANGRIA', 'SUPRIMENTO', 'AJUSTE_POSITIVO', 'AJUSTE_NEGATIVO');
CREATE TYPE "CashReceiptCategory" AS ENUM ('PIX', 'CARTAO_CREDITO', 'CARTAO_DEBITO', 'DINHEIRO');

CREATE TABLE "CashBox" (
    "id" TEXT NOT NULL,
    "referenceDate" TIMESTAMP(3) NOT NULL,
    "openingAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "openingNotes" TEXT,
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "openedById" TEXT NOT NULL,
    "status" "CashBoxStatus" NOT NULL DEFAULT 'ABERTO',
    "closingAmountExpected" DECIMAL(65,30),
    "closingAmountCounted" DECIMAL(65,30),
    "differenceAmount" DECIMAL(65,30),
    "closingNotes" TEXT,
    "closedAt" TIMESTAMP(3),
    "closedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CashBox_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CashMovement" (
    "id" TEXT NOT NULL,
    "cashBoxId" TEXT NOT NULL,
    "type" "CashMovementType" NOT NULL,
    "receiptCategory" "CashReceiptCategory" NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "description" TEXT,
    "reference" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CashMovement_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CashBox_referenceDate_key" ON "CashBox"("referenceDate");
CREATE INDEX "CashBox_referenceDate_status_idx" ON "CashBox"("referenceDate", "status");
CREATE INDEX "CashMovement_cashBoxId_createdAt_idx" ON "CashMovement"("cashBoxId", "createdAt");
CREATE INDEX "CashMovement_receiptCategory_createdAt_idx" ON "CashMovement"("receiptCategory", "createdAt");

ALTER TABLE "CashBox" ADD CONSTRAINT "CashBox_openedById_fkey" FOREIGN KEY ("openedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CashBox" ADD CONSTRAINT "CashBox_closedById_fkey" FOREIGN KEY ("closedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CashMovement" ADD CONSTRAINT "CashMovement_cashBoxId_fkey" FOREIGN KEY ("cashBoxId") REFERENCES "CashBox"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CashMovement" ADD CONSTRAINT "CashMovement_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
