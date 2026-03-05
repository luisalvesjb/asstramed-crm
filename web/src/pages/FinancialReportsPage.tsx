import { useEffect, useMemo, useState } from "react";
import { AxiosError } from "axios";
import { api } from "../services/api";
import { CostCenter, FinancialCategory, PaymentMethod } from "../types/api";
import {
  AppButton,
  AppInput,
  AppTable,
  DashboardFilterSelect,
  KpiStatCard
} from "../ui/components";
import { notifyError } from "../ui/feedback/notifications";
import { formatCurrency, formatDate } from "../utils/format";

interface DailyEntryItem {
  id: string;
  title: string;
  amount: string | number;
  status: string;
  dueDate: string;
  paymentDate?: string | null;
  category?: { name: string } | null;
  costCenter?: { name: string } | null;
  paymentMethod?: { name: string } | null;
}

interface DailyReportResponse {
  date: string;
  kpis: {
    paidOut: number;
    dueToday: number;
    overdue: number;
    pending: number;
    paidCount: number;
    dueCount: number;
    overdueCount: number;
    pendingCount: number;
  };
  paidToday: DailyEntryItem[];
  dueToday: DailyEntryItem[];
  overdue: DailyEntryItem[];
}

interface OutflowByDayResponse {
  period: {
    startDate: string;
    endDate: string;
  };
  totalOutflow: number;
  totalCount: number;
  grouped: Array<{ date: string; total: number; count: number }>;
  entries: DailyEntryItem[];
}

function todayInputDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function dateDaysAgo(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().slice(0, 10);
}

export function FinancialReportsPage() {
  const [loading, setLoading] = useState(true);
  const [dailyDate, setDailyDate] = useState(todayInputDate());
  const [startDate, setStartDate] = useState(dateDaysAgo(30));
  const [endDate, setEndDate] = useState(todayInputDate());
  const [categoryId, setCategoryId] = useState("");
  const [costCenterId, setCostCenterId] = useState("");
  const [paymentMethodId, setPaymentMethodId] = useState("");

  const [categories, setCategories] = useState<FinancialCategory[]>([]);
  const [costCenters, setCostCenters] = useState<CostCenter[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);

  const [dailyReport, setDailyReport] = useState<DailyReportResponse | null>(null);
  const [outflowByDay, setOutflowByDay] = useState<OutflowByDayResponse | null>(null);

  const paidTodayRows = useMemo(() => dailyReport?.paidToday ?? [], [dailyReport]);

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

  async function loadDailyReport() {
    const response = await api.get<DailyReportResponse>("/financial/reports/daily", {
      params: {
        date: dailyDate
      }
    });

    setDailyReport(response.data);
  }

  async function loadOutflowByDay() {
    const response = await api.get<OutflowByDayResponse>("/financial/reports/outflow-by-day", {
      params: {
        startDate,
        endDate,
        categoryId: categoryId || undefined,
        costCenterId: costCenterId || undefined,
        paymentMethodId: paymentMethodId || undefined
      }
    });

    setOutflowByDay(response.data);
  }

  async function loadReports() {
    setLoading(true);

    try {
      await Promise.all([loadDailyReport(), loadOutflowByDay()]);
    } catch (error) {
      const message =
        error instanceof AxiosError
          ? (error.response?.data?.message as string | undefined)
          : "Nao foi possivel carregar relatorios financeiros.";
      notifyError("Financeiro", message ?? "Nao foi possivel carregar relatorios financeiros.");
      setDailyReport(null);
      setOutflowByDay(null);
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

  return (
    <div className="page">
      <div className="page-header">
        <h1>Relatorios Financeiros</h1>
      </div>

      <div className="asstramed-dashboard-filters">
        <AppInput type="date" value={dailyDate} onChange={(event) => setDailyDate(event.target.value)} />
        <AppInput type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
        <AppInput type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} />

        <DashboardFilterSelect
          value={categoryId || undefined}
          allowClear
          placeholder="Categoria"
          options={categories.map((item) => ({ value: item.id, label: item.name }))}
          onChange={(value) => setCategoryId((value as string) || "")}
        />

        <DashboardFilterSelect
          value={costCenterId || undefined}
          allowClear
          placeholder="Centro de custo"
          options={costCenters.map((item) => ({ value: item.id, label: item.name }))}
          onChange={(value) => setCostCenterId((value as string) || "")}
        />

        <DashboardFilterSelect
          value={paymentMethodId || undefined}
          allowClear
          placeholder="Forma pagamento"
          options={paymentMethods.map((item) => ({ value: item.id, label: item.name }))}
          onChange={(value) => setPaymentMethodId((value as string) || "")}
        />

        <AppButton type="primary" loading={loading} onClick={() => void loadReports()}>
          Atualizar
        </AppButton>
      </div>

      <div className="asstramed-kpi-grid">
        <KpiStatCard
          title="Saida paga no dia"
          value={formatCurrency(dailyReport?.kpis.paidOut ?? 0)}
          tone="positive"
          icon="check"
        />
        <KpiStatCard
          title="Vencendo hoje"
          value={formatCurrency(dailyReport?.kpis.dueToday ?? 0)}
          tone="neutral"
          icon="list"
        />
        <KpiStatCard
          title="Em atraso"
          value={formatCurrency(dailyReport?.kpis.overdue ?? 0)}
          tone="negative"
          icon="warning"
        />
      </div>

      <div className="card card-stack">
        <h3>Pagamentos do dia ({formatDate(dailyDate)})</h3>
        <AppTable<DailyEntryItem>
          rowKey="id"
          loading={loading}
          pagination={false}
          columns={[
            { title: "Titulo", dataIndex: "title", key: "title" },
            {
              title: "Valor",
              key: "amount",
              render: (_, record) => formatCurrency(record.amount)
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
              title: "Forma",
              key: "paymentMethod",
              render: (_, record) => record.paymentMethod?.name ?? "-"
            },
            {
              title: "Pago em",
              key: "paymentDate",
              render: (_, record) => formatDate(record.paymentDate)
            }
          ]}
          dataSource={paidTodayRows}
        />
      </div>

      <div className="card card-stack">
        <h3>Saida por dia ({formatDate(outflowByDay?.period.startDate)} a {formatDate(outflowByDay?.period.endDate)})</h3>
        <AppTable<{ date: string; total: number; count: number }>
          rowKey="date"
          loading={loading}
          pagination={false}
          columns={[
            { title: "Data", key: "date", render: (_, record) => formatDate(record.date) },
            { title: "Quantidade", dataIndex: "count", key: "count" },
            { title: "Total", key: "total", render: (_, record) => formatCurrency(record.total) }
          ]}
          dataSource={outflowByDay?.grouped ?? []}
        />
        <div>
          <strong>Total do periodo:</strong> {formatCurrency(outflowByDay?.totalOutflow ?? 0)} ({outflowByDay?.totalCount ?? 0} lancamentos)
        </div>
      </div>
    </div>
  );
}
