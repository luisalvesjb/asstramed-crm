import { useEffect, useMemo, useState } from "react";
import { AxiosError } from "axios";
import { TableProps } from "antd";
import { api } from "../services/api";
import {
  CostCenter,
  FinancialCategory,
  FinancialEntry,
  PaymentMethod
} from "../types/api";
import {
  AppButton,
  AppCheckbox,
  AppInput,
  AppTable,
  AppTag,
  DashboardFilterSelect,
  KpiStatCard
} from "../ui/components";
import { notifyError } from "../ui/feedback/notifications";
import { getTodayDateInputValue, toDateInputValue } from "../utils/date";
import { formatCurrency, formatDate } from "../utils/format";

type FinancialKpiKey = "paid" | "dueToday" | "overdue" | "pending";

function dateDaysAgo(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return toDateInputValue(date);
}

function resolvePaidAmount(entry: FinancialEntry): number {
  return Number(entry.amountPaid ?? entry.amount ?? 0);
}

function statusLabel(status: FinancialEntry["status"]): string {
  switch (status) {
    case "PAGO":
      return "Pago";
    case "VENCIDO":
      return "Vencido";
    case "CANCELADO":
      return "Cancelado";
    case "PENDENTE":
    default:
      return "A vencer";
  }
}

function statusColor(status: FinancialEntry["status"]): "green" | "orange" | "default" | "blue" {
  switch (status) {
    case "PAGO":
      return "green";
    case "VENCIDO":
      return "orange";
    case "CANCELADO":
      return "default";
    case "PENDENTE":
    default:
      return "blue";
  }
}

export function FinancialReportsPage() {
  const [loading, setLoading] = useState(true);
  const [dueDateFrom, setDueDateFrom] = useState(dateDaysAgo(30));
  const [dueDateTo, setDueDateTo] = useState(getTodayDateInputValue());
  const [paymentDateFrom, setPaymentDateFrom] = useState("");
  const [paymentDateTo, setPaymentDateTo] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [costCenterId, setCostCenterId] = useState("");
  const [paymentMethodId, setPaymentMethodId] = useState("");
  const [pendingOnly, setPendingOnly] = useState(false);
  const [selectedKpi, setSelectedKpi] = useState<FinancialKpiKey>("paid");

  const [categories, setCategories] = useState<FinancialCategory[]>([]);
  const [costCenters, setCostCenters] = useState<CostCenter[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [entries, setEntries] = useState<FinancialEntry[]>([]);

  const today = getTodayDateInputValue();

  const paidEntries = useMemo(() => entries.filter((item) => item.status === "PAGO"), [entries]);
  const dueTodayEntries = useMemo(
    () =>
      entries.filter(
        (item) =>
          item.status !== "PAGO" &&
          item.status !== "CANCELADO" &&
          toDateInputValue(item.dueDate) === today
      ),
    [entries, today]
  );
  const overdueEntries = useMemo(() => entries.filter((item) => item.status === "VENCIDO"), [entries]);
  const pendingEntries = useMemo(() => entries.filter((item) => item.status === "PENDENTE"), [entries]);

  const selectedRows = useMemo(() => {
    switch (selectedKpi) {
      case "dueToday":
        return dueTodayEntries;
      case "overdue":
        return overdueEntries;
      case "pending":
        return pendingEntries;
      case "paid":
      default:
        return paidEntries;
    }
  }, [dueTodayEntries, overdueEntries, paidEntries, pendingEntries, selectedKpi]);

  const selectedTitle = useMemo(() => {
    switch (selectedKpi) {
      case "dueToday":
        return "Lancamentos vencendo hoje";
      case "overdue":
        return "Lancamentos vencidos";
      case "pending":
        return "Lancamentos a vencer";
      case "paid":
      default:
        return "Lancamentos pagos";
    }
  }, [selectedKpi]);

  const groupedPaidByDay = useMemo(() => {
    const map = new Map<string, { date: string; total: number; count: number }>();

    for (const entry of paidEntries) {
      const date = toDateInputValue(entry.paymentDate);

      if (!date) {
        continue;
      }

      const current = map.get(date) ?? { date, total: 0, count: 0 };
      current.total += resolvePaidAmount(entry);
      current.count += 1;
      map.set(date, current);
    }

    return [...map.values()].sort((a, b) => a.date.localeCompare(b.date));
  }, [paidEntries]);

  const categoryOptions = useMemo(
    () =>
      categories
        .filter((item) => !costCenterId || item.costCenterId === costCenterId)
        .map((item) => ({ value: item.id, label: item.name })),
    [categories, costCenterId]
  );

  const kpis = useMemo(
    () => ({
      paidValue: paidEntries.reduce((acc, item) => acc + resolvePaidAmount(item), 0),
      paidCount: paidEntries.length,
      dueTodayValue: dueTodayEntries.reduce((acc, item) => acc + Number(item.amount), 0),
      dueTodayCount: dueTodayEntries.length,
      overdueValue: overdueEntries.reduce((acc, item) => acc + Number(item.amount), 0),
      overdueCount: overdueEntries.length,
      pendingValue: pendingEntries.reduce((acc, item) => acc + Number(item.amount), 0),
      pendingCount: pendingEntries.length
    }),
    [dueTodayEntries, overdueEntries, paidEntries, pendingEntries]
  );

  const entryColumns: TableProps<FinancialEntry>["columns"] = [
    { title: "Titulo", dataIndex: "title", key: "title" },
    {
      title: "Valor",
      key: "amount",
      render: (_, record) => formatCurrency(record.status === "PAGO" ? resolvePaidAmount(record) : record.amount)
    },
    {
      title: "Status",
      key: "status",
      render: (_, record) => <AppTag color={statusColor(record.status)}>{statusLabel(record.status)}</AppTag>
    },
    {
      title: "Vencimento",
      key: "dueDate",
      render: (_, record) => formatDate(record.dueDate)
    },
    {
      title: "Pagamento",
      key: "paymentDate",
      render: (_, record) => formatDate(record.paymentDate)
    },
    {
      title: "Categoria",
      key: "category",
      render: (_, record) => record.category?.name ?? "-"
    },
    {
      title: "Centro de custo",
      key: "costCenter",
      render: (_, record) => record.costCenter?.name ?? "-"
    },
    {
      title: "Forma de pagamento",
      key: "paymentMethod",
      render: (_, record) => record.paymentMethod?.name ?? "-"
    }
  ];

  async function loadLookups() {
    const [categoryResponse, costCenterResponse, paymentMethodResponse] = await Promise.all([
      api.get<FinancialCategory[]>("/financial/settings/categories"),
      api.get<CostCenter[]>("/financial/settings/cost-centers"),
      api.get<PaymentMethod[]>("/financial/settings/payment-methods")
    ]);

    setCategories(categoryResponse.data.filter((item) => item.isActive));
    setCostCenters(costCenterResponse.data.filter((item) => item.isActive));
    setPaymentMethods(paymentMethodResponse.data.filter((item) => item.isActive));
  }

  async function loadReports() {
    setLoading(true);

    try {
      const response = await api.get<FinancialEntry[]>("/financial/entries", {
        params: {
          dueDateFrom: dueDateFrom || undefined,
          dueDateTo: dueDateTo || undefined,
          paymentDateFrom: paymentDateFrom || undefined,
          paymentDateTo: paymentDateTo || undefined,
          categoryId: categoryId || undefined,
          costCenterId: costCenterId || undefined,
          paymentMethodId: paymentMethodId || undefined,
          status: pendingOnly ? "PENDENTE" : undefined
        }
      });

      setEntries(response.data);
    } catch (error) {
      const message =
        error instanceof AxiosError
          ? (error.response?.data?.message as string | undefined)
          : "Nao foi possivel carregar relatorios financeiros.";
      notifyError("Financeiro", message ?? "Nao foi possivel carregar relatorios financeiros.");
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void (async () => {
      try {
        await loadLookups();
      } catch {
        notifyError("Financeiro", "Falha ao carregar configuracoes financeiras.");
      }

      await loadReports();
    })();
  }, []);

  useEffect(() => {
    if (pendingOnly) {
      setSelectedKpi("pending");
    }
  }, [pendingOnly]);

  return (
    <div className="page">
      <div className="page-header">
        <h1>Relatorios Financeiros</h1>
      </div>

      <div className="asstramed-dashboard-filters">
        <div className="field-block">
          <label className="field-label">Data vencimento inicial</label>
          <AppInput type="date" value={dueDateFrom} onChange={(event) => setDueDateFrom(event.target.value)} />
        </div>

        <div className="field-block">
          <label className="field-label">Data vencimento final</label>
          <AppInput type="date" value={dueDateTo} onChange={(event) => setDueDateTo(event.target.value)} />
        </div>

        <div className="field-block">
          <label className="field-label">Data pagamento inicial</label>
          <AppInput type="date" value={paymentDateFrom} onChange={(event) => setPaymentDateFrom(event.target.value)} />
        </div>

        <div className="field-block">
          <label className="field-label">Data pagamento final</label>
          <AppInput type="date" value={paymentDateTo} onChange={(event) => setPaymentDateTo(event.target.value)} />
        </div>

        <div className="field-block">
          <label className="field-label">Centro de custo</label>
          <DashboardFilterSelect
            value={costCenterId || undefined}
            allowClear
            options={costCenters.map((item) => ({ value: item.id, label: item.name }))}
            onChange={(value) => {
              const nextValue = (value as string) || "";
              setCostCenterId(nextValue);
              setCategoryId((current) => {
                if (!current || !nextValue) {
                  return current;
                }

                const currentCategory = categories.find((item) => item.id === current);
                return currentCategory?.costCenterId === nextValue ? current : "";
              });
            }}
          />
        </div>

        <div className="field-block">
          <label className="field-label">Categoria</label>
          <DashboardFilterSelect
            value={categoryId || undefined}
            allowClear
            options={categoryOptions}
            onChange={(value) => setCategoryId((value as string) || "")}
          />
        </div>

        <div className="field-block">
          <label className="field-label">Forma de pagamento</label>
          <DashboardFilterSelect
            value={paymentMethodId || undefined}
            allowClear
            options={paymentMethods.map((item) => ({ value: item.id, label: item.name }))}
            onChange={(value) => setPaymentMethodId((value as string) || "")}
          />
        </div>

        <div className="field-block">
          <label className="field-label">Filtros rapidos</label>
          <label className="permission-item">
            <AppCheckbox checked={pendingOnly} onChange={(event) => setPendingOnly(event.target.checked)} />
            <span>A vencer</span>
          </label>
        </div>

        <div className="filters-actions">
          <AppButton type="primary" loading={loading} onClick={() => void loadReports()}>
            Aplicar
          </AppButton>
          <AppButton
            onClick={() => {
              setDueDateFrom(dateDaysAgo(30));
              setDueDateTo(getTodayDateInputValue());
              setPaymentDateFrom("");
              setPaymentDateTo("");
              setCategoryId("");
              setCostCenterId("");
              setPaymentMethodId("");
              setPendingOnly(false);
              setSelectedKpi("paid");
              void loadReports();
            }}
          >
            Limpar
          </AppButton>
        </div>
      </div>

      <div className="asstramed-kpi-grid asstramed-kpi-grid-4">
        <KpiStatCard
          title="Pagos"
          value={`${kpis.paidCount} • ${formatCurrency(kpis.paidValue)}`}
          tone="positive"
          icon="check"
          selected={selectedKpi === "paid"}
          onClick={() => setSelectedKpi("paid")}
        />
        <KpiStatCard
          title="Vence hoje"
          value={`${kpis.dueTodayCount} • ${formatCurrency(kpis.dueTodayValue)}`}
          tone="neutral"
          icon="clock"
          selected={selectedKpi === "dueToday"}
          onClick={() => setSelectedKpi("dueToday")}
        />
        <KpiStatCard
          title="Vencidos"
          value={`${kpis.overdueCount} • ${formatCurrency(kpis.overdueValue)}`}
          tone="negative"
          icon="warning"
          selected={selectedKpi === "overdue"}
          onClick={() => setSelectedKpi("overdue")}
        />
        <KpiStatCard
          title="A vencer"
          value={`${kpis.pendingCount} • ${formatCurrency(kpis.pendingValue)}`}
          tone="neutral"
          icon="list"
          selected={selectedKpi === "pending"}
          onClick={() => setSelectedKpi("pending")}
        />
      </div>

      <div className="card card-stack">
        <h3>{selectedTitle}</h3>
        <AppTable<FinancialEntry>
          rowKey="id"
          loading={loading}
          pagination={false}
          columns={entryColumns}
          dataSource={selectedRows}
        />
      </div>

      <div className="card card-stack">
        <h3>Pagamentos agrupados por dia</h3>
        <AppTable<{ date: string; total: number; count: number }>
          rowKey="date"
          loading={loading}
          pagination={false}
          columns={[
            { title: "Data", key: "date", render: (_, record) => formatDate(record.date) },
            { title: "Quantidade", dataIndex: "count", key: "count" },
            { title: "Total pago", key: "total", render: (_, record) => formatCurrency(record.total) }
          ]}
          dataSource={groupedPaidByDay}
        />
      </div>
    </div>
  );
}
