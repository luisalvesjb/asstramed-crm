import fs from "fs";
import path from "path";
import PDFDocument from "pdfkit";
import { FinancialEntryStatus, Prisma } from "@prisma/client";
import { prisma } from "../../db/prisma";
import { formatDateKey } from "../../utils/date";
import {
  ensureRecurringEntriesGenerated,
  listFinancialEntries,
  syncOverdueStatuses as syncCalculatedFinancialStatuses
} from "../financial-entries/financial-entries.service";

interface FinancialReportPdfFilters {
  dueDateFrom?: Date;
  dueDateTo?: Date;
  paymentDateFrom?: Date;
  paymentDateTo?: Date;
  categoryId?: string;
  costCenterId?: string;
  paymentMethodId?: string;
  status?: FinancialEntryStatus;
}

function startOfDay(date: Date): Date {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
}

function endOfDay(date: Date): Date {
  const value = new Date(date);
  value.setHours(23, 59, 59, 999);
  return value;
}

function resolvePaidAmount(entry: { amount: Prisma.Decimal | number; amountPaid?: Prisma.Decimal | number | null }): number {
  return Number(entry.amountPaid ?? entry.amount);
}

export async function dailyReport(date?: Date) {
  const target = date ?? new Date();
  const start = startOfDay(target);
  const end = endOfDay(target);

  await ensureRecurringEntriesGenerated(end);
  await syncCalculatedFinancialStatuses();

  const [dueToday, paidToday, overdue, pending] = await Promise.all([
    prisma.financialEntry.findMany({
      where: {
        deletedAt: null,
        dueDate: {
          gte: start,
          lte: end
        },
        status: {
          in: [FinancialEntryStatus.PENDENTE, FinancialEntryStatus.VENCIDO, FinancialEntryStatus.PAGO]
        }
      },
      include: {
        category: true,
        costCenter: true,
        paymentMethod: true
      },
      orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }]
    }),
    prisma.financialEntry.findMany({
      where: {
        deletedAt: null,
        status: FinancialEntryStatus.PAGO,
        paymentDate: {
          gte: start,
          lte: end
        }
      },
      include: {
        category: true,
        costCenter: true,
        paymentMethod: true
      },
      orderBy: [{ paymentDate: "desc" }, { createdAt: "desc" }]
    }),
    prisma.financialEntry.findMany({
      where: {
        deletedAt: null,
        status: {
          in: [FinancialEntryStatus.PENDENTE, FinancialEntryStatus.VENCIDO]
        },
        dueDate: {
          lt: start
        }
      },
      include: {
        category: true,
        costCenter: true,
        paymentMethod: true
      },
      orderBy: { dueDate: "asc" }
    }),
    prisma.financialEntry.findMany({
      where: {
        deletedAt: null,
        status: FinancialEntryStatus.PENDENTE
      },
      include: {
        category: true,
        costCenter: true,
        paymentMethod: true
      },
      orderBy: { dueDate: "asc" }
    })
  ]);

  const paidOut = paidToday.reduce((acc, entry) => acc + resolvePaidAmount(entry), 0);
  const dueTodayAmount = dueToday.reduce((acc, entry) => acc + Number(entry.amount), 0);
  const overdueAmount = overdue.reduce((acc, entry) => acc + Number(entry.amount), 0);
  const pendingAmount = pending.reduce((acc, entry) => acc + Number(entry.amount), 0);

  return {
    date: formatDateKey(target),
    kpis: {
      paidOut,
      dueToday: dueTodayAmount,
      overdue: overdueAmount,
      pending: pendingAmount,
      paidCount: paidToday.length,
      dueCount: dueToday.length,
      overdueCount: overdue.length,
      pendingCount: pending.length
    },
    paidToday,
    dueToday,
    overdue
  };
}

export async function outflowByDay(filters: {
  startDate?: Date;
  endDate?: Date;
  categoryId?: string;
  costCenterId?: string;
  paymentMethodId?: string;
}) {
  const from = filters.startDate ? startOfDay(filters.startDate) : startOfDay(new Date(Date.now() - 1000 * 60 * 60 * 24 * 29));
  const to = filters.endDate ? endOfDay(filters.endDate) : endOfDay(new Date());

  await ensureRecurringEntriesGenerated(to);
  await syncCalculatedFinancialStatuses();

  const entries = await prisma.financialEntry.findMany({
    where: {
      deletedAt: null,
      status: FinancialEntryStatus.PAGO,
      paymentDate: {
        gte: from,
        lte: to
      },
      categoryId: filters.categoryId,
      costCenterId: filters.costCenterId,
      paymentMethodId: filters.paymentMethodId
    },
    include: {
      category: true,
      costCenter: true,
      paymentMethod: true
    },
    orderBy: [{ paymentDate: "asc" }, { createdAt: "asc" }]
  });

  const map = new Map<string, { date: string; total: number; count: number }>();

  for (const entry of entries) {
    if (!entry.paymentDate) {
      continue;
    }

    const key = formatDateKey(entry.paymentDate);
    const current = map.get(key) ?? { date: key, total: 0, count: 0 };
    current.total += resolvePaidAmount(entry);
    current.count += 1;
    map.set(key, current);
  }

  return {
    period: {
      startDate: formatDateKey(from),
      endDate: formatDateKey(to)
    },
    totalOutflow: entries.reduce((acc, entry) => acc + resolvePaidAmount(entry), 0),
    totalCount: entries.length,
    grouped: [...map.values()].sort((a, b) => a.date.localeCompare(b.date)),
    entries
  };
}

function resolveLogoPath(): string | undefined {
  const candidates = [
    path.resolve(process.cwd(), "assets/brand/logo.png"),
    path.resolve(process.cwd(), "../site/assets/img/logo.png")
  ];

  return candidates.find((candidate) => fs.existsSync(candidate));
}

function collectPdf(doc: PDFKit.PDFDocument): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];

    doc.on("data", (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });
}

function formatPdfDate(value?: Date | null): string {
  if (!value) return "-";

  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo"
  }).format(value);
}

function formatCurrency(value: Prisma.Decimal | number | null | undefined): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL"
  }).format(Number(value ?? 0));
}

function statusLabel(status: FinancialEntryStatus): string {
  switch (status) {
    case FinancialEntryStatus.PAGO:
      return "Pago";
    case FinancialEntryStatus.VENCIDO:
      return "Vencido";
    case FinancialEntryStatus.CANCELADO:
      return "Cancelado";
    case FinancialEntryStatus.PENDENTE:
    default:
      return "A vencer";
  }
}

function formatRange(from?: Date, to?: Date): string {
  if (from && to) {
    const start = formatPdfDate(from);
    const end = formatPdfDate(to);
    return start === end ? start : `${start} a ${end}`;
  }

  if (from) return `A partir de ${formatPdfDate(from)}`;
  if (to) return `Ate ${formatPdfDate(to)}`;
  return "Todos";
}

function truncate(value: string, maxLength: number): string {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, Math.max(0, maxLength - 3))}...`;
}

function ensurePageSpace(doc: PDFKit.PDFDocument, y: number, neededHeight: number): number {
  const bottom = doc.page.height - doc.page.margins.bottom;

  if (y + neededHeight <= bottom) return y;

  doc.addPage();
  return doc.page.margins.top;
}

function drawFooter(doc: PDFKit.PDFDocument): void {
  const range = doc.bufferedPageRange();

  for (let index = range.start; index < range.start + range.count; index += 1) {
    doc.switchToPage(index);
    doc
      .font("Helvetica")
      .fontSize(8)
      .fillColor("#7a8496")
      .text(`Pagina ${index + 1} de ${range.count}`, doc.page.margins.left, doc.page.height - 28, {
        align: "right",
        width: doc.page.width - doc.page.margins.left - doc.page.margins.right
      });
  }
}

function drawFinancialTableHeader(doc: PDFKit.PDFDocument, x: number, y: number, widths: number[]): number {
  const labels = ["Titulo", "Status", "Vencimento", "Pagamento", "Valor", "Valor pago", "Categoria", "Centro", "Forma"];
  let cursorX = x;

  doc.rect(x, y, widths.reduce((acc, width) => acc + width, 0), 22).fill("#eef3ff");
  doc.fillColor("#1f2d44").font("Helvetica-Bold").fontSize(8);

  labels.forEach((label, index) => {
    doc.text(label, cursorX + 5, y + 7, { width: widths[index] - 10 });
    cursorX += widths[index];
  });

  return y + 22;
}

export async function entriesPdf(filters: FinancialReportPdfFilters): Promise<Buffer> {
  const entries = await listFinancialEntries(filters);
  const paid = entries.filter((entry) => entry.status === FinancialEntryStatus.PAGO);
  const overdue = entries.filter((entry) => entry.status === FinancialEntryStatus.VENCIDO);
  const pending = entries.filter((entry) => entry.status === FinancialEntryStatus.PENDENTE);
  const today = formatDateKey(new Date());
  const dueToday = entries.filter(
    (entry) =>
      entry.status !== FinancialEntryStatus.PAGO &&
      entry.status !== FinancialEntryStatus.CANCELADO &&
      formatDateKey(entry.dueDate) === today
  );

  const paidAmount = paid.reduce((acc, entry) => acc + Number(entry.amountPaid ?? entry.amount), 0);
  const dueTodayAmount = dueToday.reduce((acc, entry) => acc + Number(entry.amount), 0);
  const overdueAmount = overdue.reduce((acc, entry) => acc + Number(entry.amount), 0);
  const pendingAmount = pending.reduce((acc, entry) => acc + Number(entry.amount), 0);

  const logoPath = resolveLogoPath();
  const doc = new PDFDocument({
    size: "A4",
    layout: "landscape",
    margin: 32,
    bufferPages: true,
    info: {
      Title: "Relatorio Financeiro",
      Author: "Asstramed CRM"
    }
  });
  const pdfPromise = collectPdf(doc);

  if (logoPath) {
    doc.image(logoPath, 32, 24, { fit: [128, 42] });
  }

  doc.font("Helvetica-Bold").fontSize(18).fillColor("#17243a").text("Relatorio Financeiro", 178, 28);
  doc.font("Helvetica").fontSize(10).fillColor("#647086").text(`Vencimento: ${formatRange(filters.dueDateFrom, filters.dueDateTo)}`, 178, 54);
  doc.text(`Pagamento: ${formatRange(filters.paymentDateFrom, filters.paymentDateTo)}`, 178, 70);

  const filtersText = [
    `Status: ${filters.status ? statusLabel(filters.status) : "Todos"}`,
    `Itens: ${entries.length}`
  ].join(" | ");
  doc.text(`Filtros: ${filtersText}`, 178, 86);

  doc.moveTo(32, 112).lineTo(doc.page.width - 32, 112).strokeColor("#dbe3f2").stroke();

  const kpis = [
    { label: "Pagos", value: `${paid.length} - ${formatCurrency(paidAmount)}` },
    { label: "Vence hoje", value: `${dueToday.length} - ${formatCurrency(dueTodayAmount)}` },
    { label: "Vencidos", value: `${overdue.length} - ${formatCurrency(overdueAmount)}` },
    { label: "A vencer", value: `${pending.length} - ${formatCurrency(pendingAmount)}` }
  ];

  kpis.forEach((kpi, index) => {
    const x = 32 + index * 193;
    doc.roundedRect(x, 130, 181, 54, 6).fillAndStroke("#f6f8ff", "#dfe6f4");
    doc.font("Helvetica").fontSize(9).fillColor("#6b7588").text(kpi.label, x + 12, 140);
    doc.font("Helvetica-Bold").fontSize(14).fillColor("#17243a").text(kpi.value, x + 12, 159, { width: 158 });
  });

  doc.font("Helvetica-Bold").fontSize(13).fillColor("#17243a").text("Listagem dos itens", 32, 208);

  const widths = [126, 58, 66, 66, 72, 72, 100, 100, 82];
  const tableX = 32;
  let y = drawFinancialTableHeader(doc, tableX, 230, widths);

  if (entries.length === 0) {
    doc.font("Helvetica").fontSize(10).fillColor("#647086").text("Nenhum registro encontrado para o filtro.", tableX, y + 16);
  }

  entries.forEach((entry, index) => {
    y = ensurePageSpace(doc, y, 26);

    if (y === doc.page.margins.top) {
      y = drawFinancialTableHeader(doc, tableX, y, widths);
    }

    const rowColor = index % 2 === 0 ? "#ffffff" : "#f8faff";
    doc.rect(tableX, y, widths.reduce((acc, width) => acc + width, 0), 26).fill(rowColor);

    const values = [
      entry.title,
      statusLabel(entry.status),
      formatPdfDate(entry.dueDate),
      formatPdfDate(entry.paymentDate),
      formatCurrency(entry.amount),
      entry.amountPaid != null ? formatCurrency(entry.amountPaid) : "-",
      entry.category?.name ?? "-",
      entry.costCenter?.name ?? "-",
      entry.paymentMethod?.name ?? "-"
    ];

    let cursorX = tableX;
    doc.font("Helvetica").fontSize(7.5).fillColor("#25324a");
    values.forEach((value, valueIndex) => {
      doc.text(truncate(value, valueIndex === 0 ? 28 : 22), cursorX + 5, y + 8, {
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
