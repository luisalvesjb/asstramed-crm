-- AlterTable User: add login and relax email requirement
ALTER TABLE "User" ADD COLUMN "login" TEXT;
ALTER TABLE "User" ALTER COLUMN "email" DROP NOT NULL;

WITH ranked AS (
  SELECT
    id,
    "createdAt",
    CASE
      WHEN email IS NOT NULL AND split_part(email, '@', 1) <> ''
        THEN regexp_replace(lower(split_part(email, '@', 1)), '[^a-z0-9._-]', '_', 'g')
      ELSE 'usuario'
    END AS base_login,
    row_number() OVER (
      PARTITION BY CASE
        WHEN email IS NOT NULL AND split_part(email, '@', 1) <> ''
          THEN regexp_replace(lower(split_part(email, '@', 1)), '[^a-z0-9._-]', '_', 'g')
        ELSE 'usuario'
      END
      ORDER BY "createdAt", id
    ) AS rn
  FROM "User"
)
UPDATE "User" AS u
SET "login" = CASE
  WHEN ranked.rn = 1 THEN ranked.base_login
  ELSE ranked.base_login || '_' || substring(ranked.id from 1 for 8)
END
FROM ranked
WHERE ranked.id = u.id;

ALTER TABLE "User" ALTER COLUMN "login" SET NOT NULL;
CREATE UNIQUE INDEX "User_login_key" ON "User"("login");

-- AlterTable FinancialEntry: add amount paid
ALTER TABLE "FinancialEntry" ADD COLUMN "amountPaid" DECIMAL(65,30);

UPDATE "FinancialEntry"
SET "amountPaid" = "amount"
WHERE "status" = 'PAGO' AND "amountPaid" IS NULL;
