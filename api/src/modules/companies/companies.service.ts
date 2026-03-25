import fs from "fs";
import path from "path";
import { prisma } from "../../db/prisma";
import { AppError } from "../../errors/app-error";
import { registerAuditLog } from "../../services/audit.service";
import { ListCompaniesFilters } from "./companies.interfaces";

function normalizeNullableText(input?: string): string | null {
  const normalized = input?.trim();
  return normalized ? normalized : null;
}

export async function listCompanies(filters: ListCompaniesFilters) {
  return prisma.company.findMany({
    where: {
      status: filters.status,
      OR: filters.search
        ? [
            { name: { contains: filters.search, mode: "insensitive" } },
            { legalName: { contains: filters.search, mode: "insensitive" } },
            { city: { contains: filters.search, mode: "insensitive" } }
          ]
        : undefined
    },
    orderBy: { name: "asc" }
  });
}

export async function createCompany(
  actorId: string,
  input: {
    name: string;
    legalName?: string;
    city?: string;
    state?: string;
    status?: string;
    nextCycleDate?: Date;
  }
) {
  const company = await prisma.company.create({
    data: {
      name: input.name,
      legalName: input.legalName,
      city: input.city,
      state: input.state,
      status: input.status ?? "ATIVA",
      nextCycleDate: input.nextCycleDate
    }
  });

  await registerAuditLog({
    actorId,
    action: "COMPANY_CREATED",
    entity: "COMPANY",
    entityId: company.id,
    payload: input
  });

  return company;
}

export async function updateCompany(
  actorId: string,
  companyId: string,
  input: {
    name: string;
    legalName?: string;
    city?: string;
    state?: string;
    status?: string;
    nextCycleDate?: Date;
  }
) {
  const company = await prisma.company.findUnique({ where: { id: companyId } });

  if (!company) {
    throw new AppError("Empresa nao encontrada", 404);
  }

  const updated = await prisma.company.update({
    where: { id: companyId },
    data: {
      name: input.name,
      legalName: normalizeNullableText(input.legalName),
      city: normalizeNullableText(input.city),
      state: normalizeNullableText(input.state),
      status: input.status ?? "ATIVA",
      nextCycleDate: input.nextCycleDate ?? null
    }
  });

  await registerAuditLog({
    actorId,
    action: "COMPANY_UPDATED",
    entity: "COMPANY",
    entityId: companyId,
    payload: input
  });

  return updated;
}

export async function getCompanyById(companyId: string) {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    include: {
      contacts: true,
      address: true,
      contracts: {
        orderBy: { createdAt: "desc" },
        include: {
          documents: {
            include: {
              document: true
            }
          }
        }
      },
      documents: {
        where: { deletedAt: null },
        orderBy: { createdAt: "desc" }
      }
    }
  });

  if (!company) {
    throw new AppError("Empresa nao encontrada", 404);
  }

  return company;
}

export async function getCompanyByIdWithAccess(
  companyId: string,
  access: {
    canReadDocuments: boolean;
    canReadContracts: boolean;
    canReadContractValues: boolean;
  }
) {
  const company = await getCompanyById(companyId);

  if (!access.canReadDocuments) {
    company.documents = [];
  }

  if (!access.canReadContracts) {
    company.contracts = [];
  } else {
    company.contracts = company.contracts.map((contract) => ({
      ...contract,
      value: access.canReadContractValues ? contract.value : null,
      documents: access.canReadDocuments ? contract.documents : []
    }));
  }

  return company;
}

export async function addCompanyContact(
  actorId: string,
  companyId: string,
  input: {
    name: string;
    role?: string;
    phone?: string;
    hasWhatsapp?: boolean;
    email?: string;
  }
) {
  const company = await prisma.company.findUnique({ where: { id: companyId } });

  if (!company) {
    throw new AppError("Empresa nao encontrada", 404);
  }

  const contact = await prisma.companyContact.create({
    data: {
      companyId,
      name: input.name,
      role: input.role,
      phone: input.phone,
      hasWhatsapp: input.hasWhatsapp ?? false,
      email: input.email
    }
  });

  await registerAuditLog({
    actorId,
    action: "COMPANY_CONTACT_CREATED",
    entity: "COMPANY",
    entityId: companyId,
    payload: input
  });

  return contact;
}

export async function replaceCompanyContacts(
  actorId: string,
  companyId: string,
  contacts: Array<{
    name: string;
    role?: string;
    phone?: string;
    hasWhatsapp?: boolean;
    email?: string;
  }>
) {
  const company = await prisma.company.findUnique({ where: { id: companyId } });

  if (!company) {
    throw new AppError("Empresa nao encontrada", 404);
  }

  const sanitizedContacts = contacts
    .map((contact) => ({
      name: contact.name.trim(),
      role: normalizeNullableText(contact.role),
      phone: normalizeNullableText(contact.phone),
      hasWhatsapp: Boolean(contact.hasWhatsapp),
      email: normalizeNullableText(contact.email)
    }))
    .filter((contact) => contact.name.length >= 2);

  await prisma.$transaction([
    prisma.companyContact.deleteMany({
      where: { companyId }
    }),
    ...(sanitizedContacts.length
      ? [
          prisma.companyContact.createMany({
            data: sanitizedContacts.map((contact) => ({
              companyId,
              ...contact
            }))
          })
        ]
      : [])
  ]);

  await registerAuditLog({
    actorId,
    action: "COMPANY_CONTACTS_REPLACED",
    entity: "COMPANY",
    entityId: companyId,
    payload: {
      count: sanitizedContacts.length
    }
  });

  return prisma.companyContact.findMany({
    where: { companyId },
    orderBy: { createdAt: "asc" }
  });
}

export async function upsertCompanyAddress(
  actorId: string,
  companyId: string,
  input: {
    street?: string;
    number?: string;
    complement?: string;
    district?: string;
    city?: string;
    state?: string;
    zipCode?: string;
  }
) {
  const company = await prisma.company.findUnique({ where: { id: companyId } });

  if (!company) {
    throw new AppError("Empresa nao encontrada", 404);
  }

  const address = await prisma.companyAddress.upsert({
    where: { companyId },
    update: input,
    create: {
      companyId,
      ...input
    }
  });

  await registerAuditLog({
    actorId,
    action: "COMPANY_ADDRESS_UPSERTED",
    entity: "COMPANY",
    entityId: companyId,
    payload: input
  });

  return address;
}

export async function upsertCompanyPersonalInfo(
  actorId: string,
  companyId: string,
  input: {
    personalDocument?: string;
    personalEmail?: string;
    personalPhone?: string;
    personalResponsible?: string;
    personalNotes?: string;
    logo?: Express.Multer.File;
  }
) {
  const company = await prisma.company.findUnique({ where: { id: companyId } });

  if (!company) {
    throw new AppError("Empresa nao encontrada", 404);
  }

  let logoPath: string | undefined;
  let logoMimeType: string | undefined;

  if (input.logo) {
    const extension = path.extname(input.logo.originalname).toLowerCase() || ".png";
    const fileName = `logo-${Date.now()}${extension}`;
    const absoluteDirectory = path.resolve(process.cwd(), "assets/logos", companyId);
    const absolutePath = path.resolve(absoluteDirectory, fileName);

    fs.mkdirSync(absoluteDirectory, { recursive: true });
    fs.writeFileSync(absolutePath, input.logo.buffer);

    logoPath = `assets/logos/${companyId}/${fileName}`;
    logoMimeType = input.logo.mimetype;
  }

  const updated = await prisma.company.update({
    where: { id: companyId },
    data: {
      personalDocument: normalizeNullableText(input.personalDocument),
      personalEmail: normalizeNullableText(input.personalEmail),
      personalPhone: normalizeNullableText(input.personalPhone),
      personalResponsible: normalizeNullableText(input.personalResponsible),
      personalNotes: normalizeNullableText(input.personalNotes),
      logoPath: logoPath ?? undefined,
      logoMimeType: logoMimeType ?? undefined
    }
  });

  await registerAuditLog({
    actorId,
    action: "COMPANY_PERSONAL_INFO_UPSERTED",
    entity: "COMPANY",
    entityId: companyId,
    payload: {
      personalDocument: input.personalDocument,
      personalEmail: input.personalEmail,
      personalPhone: input.personalPhone,
      personalResponsible: input.personalResponsible,
      hasLogo: Boolean(input.logo)
    }
  });

  return updated;
}
