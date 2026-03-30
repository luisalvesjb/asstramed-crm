import "dotenv/config";
import fs from "fs";
import path from "path";
import bcrypt from "bcryptjs";
import { ActivityStatus, PrismaClient } from "@prisma/client";
import { ALL_PERMISSION_KEYS, SYSTEM_PROFILE_TEMPLATES } from "../src/config/permissions";

const prisma = new PrismaClient();

interface SeedOptions {
  dryRun: boolean;
  withDemo: boolean;
}

function parseOptions(): SeedOptions {
  const args = new Set(process.argv.slice(2));
  return {
    dryRun: args.has("--dry-run"),
    withDemo: args.has("--with-demo")
  };
}

async function syncPermissionCatalog(dryRun: boolean): Promise<void> {
  if (dryRun) {
    console.log(`[seed] dry-run: ${ALL_PERMISSION_KEYS.length} permissoes seriam sincronizadas.`);
    return;
  }

  await Promise.all(
    ALL_PERMISSION_KEYS.map((key) =>
      prisma.permission.upsert({
        where: { key },
        update: {},
        create: {
          key,
          description: key
        }
      })
    )
  );
}

async function syncSystemProfiles(dryRun: boolean): Promise<void> {
  if (dryRun) {
    console.log(`[seed] dry-run: ${SYSTEM_PROFILE_TEMPLATES.length} perfis de sistema seriam sincronizados.`);
    return;
  }

  const permissions = await prisma.permission.findMany({
    where: { key: { in: ALL_PERMISSION_KEYS } },
    select: { id: true, key: true }
  });

  const permissionIdByKey = new Map(permissions.map((permission) => [permission.key, permission.id]));

  for (const template of SYSTEM_PROFILE_TEMPLATES) {
    const profile = await prisma.profile.upsert({
      where: { key: template.key },
      update: {
        name: template.name,
        description: template.description,
        isAdmin: template.isAdmin,
        isSystem: true,
        isActive: true
      },
      create: {
        key: template.key,
        name: template.name,
        description: template.description,
        isAdmin: template.isAdmin,
        isSystem: true,
        isActive: true
      }
    });

    const permissionIds = template.permissions
      .map((permissionKey) => permissionIdByKey.get(permissionKey))
      .filter((permissionId): permissionId is string => Boolean(permissionId));

    await prisma.$transaction([
      prisma.profilePermission.deleteMany({
        where: {
          profileId: profile.id
        }
      }),
      prisma.profilePermission.createMany({
        data: permissionIds.map((permissionId) => ({
          profileId: profile.id,
          permissionId
        })),
        skipDuplicates: true
      })
    ]);
  }

  await prisma.user.updateMany({
    data: {
      isAdmin: false
    }
  });

  await prisma.user.updateMany({
    where: {
      profile: {
        isAdmin: true
      }
    },
    data: {
      isAdmin: true
    }
  });
}

async function ensureUser(input: {
  login: string;
  email: string;
  password: string;
  name: string;
  profileKey: string;
  dryRun: boolean;
}) {
  const profile = await prisma.profile.findUnique({
    where: {
      key: input.profileKey
    },
    select: {
      id: true,
      key: true,
      isAdmin: true
    }
  });

  if (!profile) {
    throw new Error(`Perfil nao encontrado para seed (${input.profileKey}).`);
  }

  const existing =
    (await prisma.user.findUnique({ where: { login: input.login } })) ??
    (await prisma.user.findUnique({ where: { email: input.email } }));

  if (existing) {
    console.log(`[seed] usuario ja existe (${input.email}).`);
    return existing;
  }

  if (input.dryRun) {
    console.log(`[seed] dry-run: usuario seria criado (${input.email}).`);
    return null;
  }

  const passwordHash = await bcrypt.hash(input.password, 10);

  const user = await prisma.user.create({
    data: {
      name: input.name,
      login: input.login,
      email: input.email,
      passwordHash,
      profileId: profile.id,
      isAdmin: profile.isAdmin,
      isActive: true
    }
  });

  console.log(`[seed] usuario criado (${input.email}).`);
  return user;
}

async function ensureAdminUser(dryRun: boolean) {
  const login = process.env.SEED_ADMIN_LOGIN ?? "admin";
  const email = process.env.SEED_ADMIN_EMAIL ?? "admin@asstramed.com";
  const password = process.env.SEED_ADMIN_PASSWORD ?? "123456";
  const name = process.env.SEED_ADMIN_NAME ?? "Admin Asstramed";

  return ensureUser({
    login,
    email,
    password,
    name,
    profileKey: "ADMIN",
    dryRun
  });
}

async function ensureDemoFile(companyId: string, fileName: string, dryRun: boolean): Promise<string> {
  const absoluteDir = path.resolve(process.cwd(), "assets/documents", companyId);
  const absolutePath = path.join(absoluteDir, fileName);

  if (dryRun) {
    console.log(`[seed] dry-run: arquivo demo seria garantido em ${absolutePath}.`);
    return absolutePath;
  }

  fs.mkdirSync(absoluteDir, { recursive: true });

  if (!fs.existsSync(absolutePath)) {
    fs.writeFileSync(absolutePath, "Documento demo Asstramed CRM\n", "utf8");
  }

  return absolutePath;
}

async function ensureFinancialDefaults(dryRun: boolean): Promise<void> {
  const costCenters = [
    { name: "CREDENCIAMENTO", description: "Credenciamento" },
    { name: "DESPESAS ADMINISTRATIVAS", description: "Despesas administrativas" },
    { name: "DESPESA PESSOAL", description: "Despesa pessoal" },
    { name: "DESPESAS PRESTADORES SST", description: "Prestadores SST" },
    { name: "CONTRATOS FIXOS", description: "Contratos fixos" },
    { name: "IMPOSTOS/ACORDOS", description: "Impostos e acordos" }
  ];

  const categories = [
    { name: "PGT CRED À VISTA", costCenterName: "CREDENCIAMENTO" },
    { name: "PGT CRED FATURADO", costCenterName: "CREDENCIAMENTO" },
    { name: "ACORDO CREDENCIADA", costCenterName: "CREDENCIAMENTO" },
    { name: "ENERGIA - ÁGUA", costCenterName: "DESPESAS ADMINISTRATIVAS" },
    { name: "TELEFONE CELULAR", costCenterName: "DESPESAS ADMINISTRATIVAS" },
    { name: "INTERNET", costCenterName: "DESPESAS ADMINISTRATIVAS" },
    { name: "VIAGENS / DIÁRIAS", costCenterName: "DESPESAS ADMINISTRATIVAS" },
    { name: "ALUGUEL - IPTU", costCenterName: "DESPESAS ADMINISTRATIVAS" },
    { name: "SUPLIMENTOS ADMINISTRATIVOS", costCenterName: "DESPESAS ADMINISTRATIVAS" },
    { name: "COMPRAS COPA / LIMPEZA", costCenterName: "DESPESAS ADMINISTRATIVAS" },
    { name: "MANUTENÇÃO PREDIAL", costCenterName: "DESPESAS ADMINISTRATIVAS" },
    { name: "MANUTENÇÃO EQUIPAMENTOS", costCenterName: "DESPESAS ADMINISTRATIVAS" },
    { name: "MANUTENÇÃO VEÍCULOS", costCenterName: "DESPESAS ADMINISTRATIVAS" },
    { name: "MANUTENÇÃO EQUIPAMENTOS TÉCNICOS", costCenterName: "DESPESAS ADMINISTRATIVAS" },
    { name: "INVESTIMENTO EQUIPAMENTOS", costCenterName: "DESPESAS ADMINISTRATIVAS" },
    { name: "DESPESAS VARIÁVEIS", costCenterName: "DESPESAS ADMINISTRATIVAS" },
    { name: "VALE TRANSPORTE", costCenterName: "DESPESA PESSOAL" },
    { name: "VALE ALIMENTAÇÃO", costCenterName: "DESPESA PESSOAL" },
    { name: "SALÁRIO", costCenterName: "DESPESA PESSOAL" },
    { name: "FGTS / IRRF", costCenterName: "DESPESA PESSOAL" },
    { name: "FÉRIAS", costCenterName: "DESPESA PESSOAL" },
    { name: "RESCISÃO DE CONTRATO", costCenterName: "DESPESA PESSOAL" },
    { name: "ACORDOS TRABALHISTAS", costCenterName: "DESPESA PESSOAL" },
    { name: "GRATIFICAÇÃO", costCenterName: "DESPESA PESSOAL" },
    { name: "MÉDICO COORDENADOR", costCenterName: "DESPESAS PRESTADORES SST" },
    { name: "MÉDICO EXAMINADOR", costCenterName: "DESPESAS PRESTADORES SST" },
    { name: "EXAMES PERIÓDICOS", costCenterName: "DESPESAS PRESTADORES SST" },
    { name: "EXAMES DE IMAGEM", costCenterName: "DESPESAS PRESTADORES SST" },
    { name: "EXAMES LABORATORIAIS", costCenterName: "DESPESAS PRESTADORES SST" },
    { name: "ECC / EEG", costCenterName: "DESPESAS PRESTADORES SST" },
    { name: "AUDIOMETRIA", costCenterName: "DESPESAS PRESTADORES SST" },
    { name: "ESPIROMETRIA", costCenterName: "DESPESAS PRESTADORES SST" },
    { name: "OFTALMOLOGIA", costCenterName: "DESPESAS PRESTADORES SST" },
    { name: "PSICOLOGIA", costCenterName: "DESPESAS PRESTADORES SST" },
    { name: "OUTROS EXAMES", costCenterName: "DESPESAS PRESTADORES SST" },
    { name: "PERÍCIAS MÉDICAS / ENGENHARIA", costCenterName: "DESPESAS PRESTADORES SST" },
    { name: "TREINAMENTOS / CURSO", costCenterName: "DESPESAS PRESTADORES SST" },
    { name: "SOC / SGG", costCenterName: "CONTRATOS FIXOS" },
    { name: "LINITEL", costCenterName: "CONTRATOS FIXOS" },
    { name: "D4-SING", costCenterName: "CONTRATOS FIXOS" },
    { name: "ISSQN-ONLINE", costCenterName: "CONTRATOS FIXOS" },
    { name: "ABRESST", costCenterName: "CONTRATOS FIXOS" },
    { name: "E-MAIL GOOGLE", costCenterName: "CONTRATOS FIXOS" },
    { name: "MUNDEL - INFORMÁTICA", costCenterName: "CONTRATOS FIXOS" },
    { name: "FORMASEG", costCenterName: "CONTRATOS FIXOS" },
    { name: "ISSQN", costCenterName: "IMPOSTOS/ACORDOS" },
    { name: "ACORDO TRIBUTÁRIO", costCenterName: "IMPOSTOS/ACORDOS" },
    { name: "ASSESSORIA TRIBUTÁRIA", costCenterName: "IMPOSTOS/ACORDOS" },
    { name: "ASSESSORIA CONTÁBIL", costCenterName: "IMPOSTOS/ACORDOS" },
    { name: "ASSESSORIA TRABALHISTA", costCenterName: "IMPOSTOS/ACORDOS" },
    { name: "ACORDO JUDICIAL", costCenterName: "IMPOSTOS/ACORDOS" },
    { name: "RECEITA FEDERAL / PGFN", costCenterName: "IMPOSTOS/ACORDOS" }
  ];

  const paymentMethods = [
    { name: "PIX", description: "Pagamento via PIX" },
    { name: "Boleto", description: "Pagamento por boleto bancario" },
    { name: "Permuta", description: "Pagamento via permuta" },
    { name: "Cartao Credito", description: "Pagamento via cartao de credito" },
    { name: "Cartao Debito", description: "Pagamento via cartao de debito" },
    { name: "Dinheiro", description: "Pagamento em dinheiro" }
  ];

  if (dryRun) {
    console.log("[seed] dry-run: configuracoes financeiras padrao seriam sincronizadas.");
    return;
  }

  await Promise.all(
    costCenters.map((item) =>
      prisma.costCenter.upsert({
        where: { name: item.name },
        update: { description: item.description, isActive: true },
        create: { name: item.name, description: item.description, isActive: true }
      })
    )
  );

  const persistedCostCenters = await prisma.costCenter.findMany({
    where: {
      name: {
        in: costCenters.map((item) => item.name)
      }
    }
  });

  const costCenterByName = new Map(persistedCostCenters.map((item) => [item.name, item.id] as const));

  await Promise.all(
    categories.map((item) =>
      prisma.financialCategory.upsert({
        where: { name: item.name },
        update: {
          description: null,
          costCenterId: costCenterByName.get(item.costCenterName),
          isActive: true
        },
        create: {
          name: item.name,
          description: null,
          costCenterId: costCenterByName.get(item.costCenterName),
          isActive: true
        }
      })
    )
  );

  await Promise.all(
    paymentMethods.map((item) =>
      prisma.paymentMethod.upsert({
        where: { name: item.name },
        update: { description: item.description, isActive: true },
        create: { name: item.name, description: item.description, isActive: true }
      })
    )
  );

  await prisma.paymentMethod.updateMany({
    where: {
      name: {
        contains: "transfer",
        mode: "insensitive"
      }
    },
    data: {
      isActive: false
    }
  });

  const persistedCategories = await prisma.financialCategory.findMany({
    where: {
      name: {
        in: categories.map((item) => item.name)
      }
    },
    select: {
      id: true,
      costCenterId: true
    }
  });

  for (const category of persistedCategories) {
    if (!category.costCenterId) {
      continue;
    }

    await prisma.financialEntry.updateMany({
      where: {
        categoryId: category.id,
        costCenterId: null,
        deletedAt: null
      },
      data: {
        costCenterId: category.costCenterId
      }
    });
  }

  console.log("[seed] configuracoes financeiras padrao sincronizadas.");
}

async function seedDemoData(dryRun: boolean): Promise<void> {
  console.log(`[seed] iniciando dados demo${dryRun ? " (dry-run)" : ""}...`);

  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? "admin@asstramed.com";
  const adminLogin = process.env.SEED_ADMIN_LOGIN ?? "admin";
  const admin =
    (await prisma.user.findUnique({ where: { login: adminLogin } })) ??
    (await prisma.user.findUnique({ where: { email: adminEmail } }));

  if (!admin && !dryRun) {
    throw new Error("Usuario admin nao encontrado para vincular dados demo.");
  }

  const gestor = await ensureUser({
    login: "gestor",
    email: "gestor@asstramed.com",
    password: "123456",
    name: "Gestor Asstramed",
    profileKey: "GESTOR",
    dryRun
  });

  const tecnico = await ensureUser({
    login: "tecnico",
    email: "tecnico@asstramed.com",
    password: "123456",
    name: "Tecnico Asstramed",
    profileKey: "TECNICO",
    dryRun
  });

  await ensureUser({
    login: "financeiro",
    email: "financeiro@asstramed.com",
    password: "123456",
    name: "Financeiro Asstramed",
    profileKey: "FINANCEIRO",
    dryRun
  });

  const existingCompany = await prisma.company.findFirst({
    where: { name: "ACME LTDA" }
  });

  let companyId = existingCompany?.id ?? "";

  if (!existingCompany) {
    if (dryRun) {
      console.log("[seed] dry-run: empresa demo seria criada (ACME LTDA).");
    } else {
      const company = await prisma.company.create({
        data: {
          name: "ACME LTDA",
          legalName: "ACME LTDA",
          city: "Sao Paulo",
          state: "SP",
          status: "ATIVA",
          nextCycleDate: new Date(),
          personalDocument: "12.345.678/0001-90",
          personalEmail: "contato@acme.com",
          personalPhone: "(11) 4000-1000",
          personalResponsible: "Maria Souza",
          personalNotes: "Cliente prioritario"
        }
      });

      companyId = company.id;
      console.log("[seed] empresa demo criada (ACME LTDA).");
    }
  } else {
    companyId = existingCompany.id;
    await prisma.company.update({
      where: { id: companyId },
      data: {
        personalDocument: "12.345.678/0001-90",
        personalEmail: "contato@acme.com",
        personalPhone: "(11) 4000-1000",
        personalResponsible: "Maria Souza",
        personalNotes: "Cliente prioritario"
      }
    });
    console.log("[seed] empresa demo ja existe (ACME LTDA).");
  }

  if (dryRun || !companyId) {
    console.log("[seed] dry-run: contatos/endereco/atividade/documento/contrato demo seriam sincronizados.");
    return;
  }

  await prisma.companyContact.upsert({
    where: { id: `${companyId}-contact-main` },
    update: {
      name: "Maria Contato",
      role: "RH",
      phone: "(11) 99999-9999",
      email: "rh@acme.com"
    },
    create: {
      id: `${companyId}-contact-main`,
      companyId,
      name: "Maria Contato",
      role: "RH",
      phone: "(11) 99999-9999",
      email: "rh@acme.com"
    }
  });

  await prisma.companyAddress.upsert({
    where: { companyId },
    update: {
      street: "Avenida Paulista",
      number: "1000",
      district: "Bela Vista",
      city: "Sao Paulo",
      state: "SP",
      zipCode: "01310-100"
    },
    create: {
      companyId,
      street: "Avenida Paulista",
      number: "1000",
      district: "Bela Vista",
      city: "Sao Paulo",
      state: "SP",
      zipCode: "01310-100"
    }
  });

  const tag = await prisma.tag.upsert({
    where: { key: "NR12" },
    update: {
      label: "NR12"
    },
    create: {
      key: "NR12",
      label: "NR12",
      color: "#3C8DBC"
    }
  });

  const assignedToId = tecnico?.id ?? admin!.id;
  const createdById = gestor?.id ?? admin!.id;

  const activity = await prisma.activity.upsert({
    where: { id: `${companyId}-activity-1` },
    update: {
      title: "Visita tecnica - PCMSO",
      description: "Atividade demo inicial",
      status: ActivityStatus.PENDENTE,
      assignedToId,
      createdById,
      orderExec: 1
    },
    create: {
      id: `${companyId}-activity-1`,
      companyId,
      orderExec: 1,
      title: "Visita tecnica - PCMSO",
      description: "Atividade demo inicial",
      status: ActivityStatus.PENDENTE,
      assignedToId,
      createdById,
      dueDate: new Date()
    }
  });

  await prisma.activityTag.upsert({
    where: {
      activityId_tagId: {
        activityId: activity.id,
        tagId: tag.id
      }
    },
    update: {},
    create: {
      activityId: activity.id,
      tagId: tag.id
    }
  });

  const statusHistoryExists = await prisma.activityStatusHistory.findFirst({
    where: {
      activityId: activity.id
    }
  });

  if (!statusHistoryExists) {
    await prisma.activityStatusHistory.create({
      data: {
        activityId: activity.id,
        fromStatus: null,
        toStatus: ActivityStatus.PENDENTE,
        changedById: createdById
      }
    });
  }

  const fileName = "contrato-demo.pdf";
  const absolutePath = await ensureDemoFile(companyId, fileName, false);
  const relativePath = `assets/documents/${companyId}/${fileName}`;

  const existingDocument = await prisma.document.findFirst({
    where: {
      companyId,
      title: "Contrato Inicial",
      deletedAt: null
    }
  });

  const document =
    existingDocument ??
    (await prisma.document.create({
      data: {
        companyId,
        name: fileName,
        title: "Contrato Inicial",
        description: "Documento inicial do contrato",
        filePath: relativePath,
        fileSize: fs.statSync(absolutePath).size,
        mimeType: "application/pdf",
        uploadedById: createdById
      }
    }));

  const existingContract = await prisma.contract.findFirst({
    where: {
      companyId,
      notes: "Contrato demo seed"
    }
  });

  if (!existingContract) {
    const contract = await prisma.contract.create({
      data: {
        companyId,
        value: 15000,
        billingCycle: "MENSAL",
        dueDay: 15,
        notes: "Contrato demo seed"
      }
    });

    await prisma.contractDocument.create({
      data: {
        contractId: contract.id,
        documentId: document.id
      }
    });
  }

  console.log("[seed] dados demo sincronizados.");
}

async function main() {
  const options = parseOptions();
  console.log(`[seed] iniciando seed safe${options.dryRun ? " (dry-run)" : ""}...`);

  await syncPermissionCatalog(options.dryRun);
  await syncSystemProfiles(options.dryRun);
  await ensureAdminUser(options.dryRun);
  await ensureFinancialDefaults(options.dryRun);

  if (options.withDemo) {
    await seedDemoData(options.dryRun);
  }

  console.log("[seed] concluido.");
}

main()
  .catch((error) => {
    console.error("[seed] erro:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
