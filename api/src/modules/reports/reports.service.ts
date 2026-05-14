import { ActivityStatus } from "@prisma/client";
import fs from "fs";
import path from "path";
import PDFDocument from "pdfkit";
import { prisma } from "../../db/prisma";
import { toCsv } from "../../utils/csv";

interface ReportFilters {
  startDate?: Date;
  endDate?: Date;
  companyId?: string;
  responsibleId?: string;
  status?: ActivityStatus;
  openOnly?: boolean;
}

function buildDateFilter(startDate?: Date, endDate?: Date) {
  if (!startDate && !endDate) return undefined;

  const start = startDate ? new Date(startDate) : undefined;
  const end = endDate ? new Date(endDate) : undefined;

  if (start) start.setHours(0, 0, 0, 0);
  if (end) end.setHours(23, 59, 59, 999);

  return {
    gte: start,
    lte: end
  };
}

export async function activityReport(filters: ReportFilters) {
  const statusFilter = filters.openOnly
    ? {
        in: [ActivityStatus.PENDENTE, ActivityStatus.EM_EXECUCAO]
      }
    : filters.status;

  return prisma.activity.findMany({
    where: {
      createdAt: buildDateFilter(filters.startDate, filters.endDate),
      companyId: filters.companyId,
      assignedToId: filters.responsibleId,
      status: statusFilter
    },
    include: {
      company: {
        select: {
          id: true,
          name: true
        }
      },
      assignedTo: {
        select: {
          id: true,
          name: true
        }
      },
      createdBy: {
        select: {
          id: true,
          name: true
        }
      },
      tags: {
        include: {
          tag: true
        }
      }
    },
    orderBy: [{ createdAt: "desc" }]
  });
}

export async function productivityReport(filters: {
  startDate?: Date;
  endDate?: Date;
  companyId?: string;
  openOnly?: boolean;
}) {
  const whereBase = {
    createdAt: buildDateFilter(filters.startDate, filters.endDate),
    companyId: filters.companyId,
    status: filters.openOnly
      ? {
          in: [ActivityStatus.PENDENTE, ActivityStatus.EM_EXECUCAO]
        }
      : undefined
  };

  const [totals, resolved] = await Promise.all([
    prisma.activity.groupBy({
      by: ["assignedToId"],
      where: whereBase,
      _count: {
        _all: true
      }
    }),
    prisma.activity.groupBy({
      by: ["assignedToId"],
      where: {
        createdAt: buildDateFilter(filters.startDate, filters.endDate),
        companyId: filters.companyId,
        status: ActivityStatus.CONCLUIDA
      },
      _count: {
        _all: true
      }
    })
  ]);

  const userIds = totals.map((item) => item.assignedToId);
  const users = await prisma.user.findMany({
    where: {
      id: {
        in: userIds
      }
    },
    select: {
      id: true,
      name: true,
      email: true
    }
  });

  const resolvedMap = new Map(resolved.map((item) => [item.assignedToId, item._count._all]));
  const userMap = new Map(users.map((user) => [user.id, user]));

  return totals.map((item) => {
    const user = userMap.get(item.assignedToId);
    const resolvedCount = filters.openOnly ? 0 : resolvedMap.get(item.assignedToId) ?? 0;
    const total = item._count._all;

    return {
      userId: item.assignedToId,
      userName: user?.name ?? "Usuario removido",
      email: user?.email ?? null,
      totalActivities: total,
      resolvedActivities: resolvedCount,
      unresolvedActivities: total - resolvedCount
    };
  });
}

export async function pendingByCompanyReport(filters: { startDate?: Date; endDate?: Date; companyId?: string }) {
  const pending = await prisma.activity.groupBy({
    by: ["companyId"],
    where: {
      createdAt: buildDateFilter(filters.startDate, filters.endDate),
      companyId: filters.companyId,
      status: {
        in: [ActivityStatus.PENDENTE, ActivityStatus.EM_EXECUCAO]
      }
    },
    _count: {
      _all: true
    }
  });

  const companyIds = pending.map((item) => item.companyId);
  const companies = await prisma.company.findMany({
    where: {
      id: {
        in: companyIds
      }
    },
    select: {
      id: true,
      name: true,
      city: true,
      state: true
    }
  });

  const map = new Map(companies.map((company) => [company.id, company]));

  return pending
    .map((item) => ({
      companyId: item.companyId,
      companyName: map.get(item.companyId)?.name ?? "Empresa removida",
      city: map.get(item.companyId)?.city ?? null,
      state: map.get(item.companyId)?.state ?? null,
      pendingCount: item._count._all
    }))
    .sort((a, b) => b.pendingCount - a.pendingCount);
}

export async function contractsByDueReport() {
  const contracts = await prisma.contract.findMany({
    where: {
      dueDay: {
        not: null
      }
    },
    include: {
      company: {
        select: {
          id: true,
          name: true
        }
      },
      documents: {
        select: {
          documentId: true
        }
      }
    },
    orderBy: [{ dueDay: "asc" }, { createdAt: "desc" }]
  });

  return contracts.map((contract) => ({
    contractId: contract.id,
    companyId: contract.companyId,
    companyName: contract.company.name,
    dueDay: contract.dueDay,
    billingCycle: contract.billingCycle,
    value: contract.value,
    documentCount: contract.documents.length,
    createdAt: contract.createdAt
  }));
}

export async function activitiesCsv(filters: ReportFilters) {
  const rows = await activityReport(filters);

  return toCsv(
    rows.map((activity) => ({
      id: activity.id,
      company: activity.company.name,
      orderExec: activity.orderExec,
      title: activity.title,
      status: activity.status,
      responsible: activity.assignedTo.name,
      createdBy: activity.createdBy.name,
      tags: activity.tags.map((item) => item.tag.key).join("|") || "",
      createdAt: activity.createdAt.toISOString(),
      updatedAt: activity.updatedAt.toISOString(),
      completedAt: activity.completedAt?.toISOString() ?? ""
    }))
  );
}

function resolveLogoPath(): string | undefined {
  const candidates = [
    path.resolve(process.cwd(), "assets/brand/logo.png"),
    path.resolve(process.cwd(), "../site/assets/img/logo.png")
  ];

  return candidates.find((candidate) => fs.existsSync(candidate));
}

function formatPdfDate(value?: Date | null): string {
  if (!value) return "-";

  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo"
  }).format(value);
}

function formatPdfDateTime(value?: Date | null): string {
  if (!value) return "-";

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo"
  }).format(value);
}

function formatReportPeriod(filters: ReportFilters): string {
  if (filters.startDate && filters.endDate) {
    const start = formatPdfDate(filters.startDate);
    const end = formatPdfDate(filters.endDate);
    return start === end ? start : `${start} a ${end}`;
  }

  if (filters.startDate) return `A partir de ${formatPdfDate(filters.startDate)}`;
  if (filters.endDate) return `Ate ${formatPdfDate(filters.endDate)}`;
  return "Todos os registros";
}

function statusLabel(status: ActivityStatus): string {
  switch (status) {
    case ActivityStatus.CONCLUIDA:
      return "Concluida";
    case ActivityStatus.EM_EXECUCAO:
      return "Em execucao";
    case ActivityStatus.CANCELADA:
      return "Cancelada";
    case ActivityStatus.PENDENTE:
    default:
      return "Pendente";
  }
}

function truncate(value: string, maxLength: number): string {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, Math.max(0, maxLength - 3))}...`;
}

function collectPdf(doc: PDFKit.PDFDocument): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];

    doc.on("data", (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });
}

function ensurePageSpace(doc: PDFKit.PDFDocument, y: number, neededHeight: number): number {
  const bottom = doc.page.height - doc.page.margins.bottom;

  if (y + neededHeight <= bottom) {
    return y;
  }

  doc.addPage();
  return doc.page.margins.top;
}

function drawTableHeader(doc: PDFKit.PDFDocument, x: number, y: number, widths: number[]): number {
  const labels = ["Empresa", "Atividade", "Status", "Responsavel", "Cadastrado por", "Tags", "Criada em"];
  let cursorX = x;

  doc.rect(x, y, widths.reduce((acc, width) => acc + width, 0), 22).fill("#eef3ff");
  doc.fillColor("#1f2d44").font("Helvetica-Bold").fontSize(8);

  labels.forEach((label, index) => {
    doc.text(label, cursorX + 5, y + 7, { width: widths[index] - 10 });
    cursorX += widths[index];
  });

  return y + 22;
}

function drawFooter(doc: PDFKit.PDFDocument): void {
  const range = doc.bufferedPageRange();

  for (let index = range.start; index < range.start + range.count; index += 1) {
    doc.switchToPage(index);
    doc
      .font("Helvetica")
      .fontSize(8)
      .fillColor("#7a8496")
      .text(
        `Pagina ${index + 1} de ${range.count}`,
        doc.page.margins.left,
        doc.page.height - 28,
        { align: "right", width: doc.page.width - doc.page.margins.left - doc.page.margins.right }
      );
  }
}

export async function activitiesPdf(filters: ReportFilters): Promise<Buffer> {
  const [rows, pendingByCompany, company] = await Promise.all([
    activityReport(filters),
    pendingByCompanyReport({
      startDate: filters.startDate,
      endDate: filters.endDate,
      companyId: filters.companyId
    }),
    filters.companyId
      ? prisma.company.findUnique({ where: { id: filters.companyId }, select: { name: true } })
      : Promise.resolve(null)
  ]);

  const totalResolved = rows.filter((activity) => activity.status === ActivityStatus.CONCLUIDA).length;
  const period = formatReportPeriod(filters);
  const logoPath = resolveLogoPath();
  const doc = new PDFDocument({
    size: "A4",
    layout: "landscape",
    margin: 36,
    bufferPages: true,
    info: {
      Title: "Relatorio de Atividades",
      Author: "Asstramed CRM"
    }
  });
  const pdfPromise = collectPdf(doc);

  if (logoPath) {
    doc.image(logoPath, 36, 28, { fit: [128, 42] });
  }

  doc
    .font("Helvetica-Bold")
    .fontSize(18)
    .fillColor("#17243a")
    .text("Relatorio de Atividades", 184, 32);
  doc.font("Helvetica").fontSize(10).fillColor("#647086").text(`Periodo: ${period}`, 184, 57);

  const filtersText = [
    `Empresa: ${company?.name ?? "Todas"}`,
    `Status: ${filters.openOnly ? "Em aberto" : "Todos"}`
  ].join(" | ");
  doc.text(`Filtros: ${filtersText}`, 184, 73);

  doc.moveTo(36, 100).lineTo(doc.page.width - 36, 100).strokeColor("#dbe3f2").stroke();

  const kpis = [
    { label: "Resolvidas", value: String(totalResolved) },
    { label: "Atividades", value: String(rows.length) },
    { label: "Pendencias por empresa", value: String(pendingByCompany.length) }
  ];
  const kpiY = 118;
  const kpiWidth = 160;

  kpis.forEach((kpi, index) => {
    const x = 36 + index * (kpiWidth + 12);
    doc.roundedRect(x, kpiY, kpiWidth, 54, 6).fillAndStroke("#f6f8ff", "#dfe6f4");
    doc.font("Helvetica").fontSize(9).fillColor("#6b7588").text(kpi.label, x + 12, kpiY + 10);
    doc.font("Helvetica-Bold").fontSize(20).fillColor("#17243a").text(kpi.value, x + 12, kpiY + 27);
  });

  doc.font("Helvetica-Bold").fontSize(13).fillColor("#17243a").text("Listagem dos itens", 36, 194);

  const widths = [105, 188, 72, 95, 95, 92, 82];
  const tableX = 36;
  let y = drawTableHeader(doc, tableX, 216, widths);

  if (rows.length === 0) {
    doc.font("Helvetica").fontSize(10).fillColor("#647086").text("Nenhum registro encontrado para o filtro.", tableX, y + 16);
  }

  rows.forEach((activity, index) => {
    y = ensurePageSpace(doc, y, 26);

    if (y === doc.page.margins.top) {
      y = drawTableHeader(doc, tableX, y, widths);
    }

    const rowColor = index % 2 === 0 ? "#ffffff" : "#f8faff";
    doc.rect(tableX, y, widths.reduce((acc, width) => acc + width, 0), 26).fill(rowColor);

    const values = [
      activity.company.name,
      activity.title,
      statusLabel(activity.status),
      activity.assignedTo.name,
      activity.createdBy.name,
      activity.tags.map((item) => item.tag.key).join(", ") || "-",
      formatPdfDateTime(activity.createdAt)
    ];

    let cursorX = tableX;
    doc.font("Helvetica").fontSize(8).fillColor("#25324a");
    values.forEach((value, valueIndex) => {
      doc.text(truncate(value, valueIndex === 1 ? 42 : 24), cursorX + 5, y + 8, {
        width: widths[valueIndex] - 10,
        lineBreak: false
      });
      cursorX += widths[valueIndex];
    });

    y += 26;
  });

  drawFooter(doc);
  doc.end();

  return pdfPromise;
}
