import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.$executeRawUnsafe(`
    TRUNCATE TABLE
      "FinancialEntry",
      "FinancialCategory",
      "CostCenter"
    RESTART IDENTITY CASCADE;
  `);

  console.log("Lancamentos financeiros, categorias e centros de custo apagados.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
