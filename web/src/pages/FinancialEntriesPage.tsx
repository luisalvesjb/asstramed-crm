import { useEffect, useMemo, useState } from "react";
import { TableProps } from "antd";
import { AxiosError } from "axios";
import { api } from "../services/api";
import {
  CostCenter,
  FinancialCategory,
  FinancialEntry,
  FinancialEntryStatus,
  FinancialRecurrenceCycle,
  PaymentMethod
} from "../types/api";
import {
  AppButton,
  AppCheckbox,
  AppInput,
  AppModal,
  AppTable,
  AppTag,
  DashboardFilterSelect,
  KpiStatCard
} from "../ui/components";
import { notifyError, notifySuccess, showConfirmDialog } from "../ui/feedback/notifications";
import { formatCurrency, formatDate } from "../utils/format";

interface EntryFormState {
  title: string;
  description: string;
  amount: string;
  dueDate: string;
  paymentDate: string;
  launchDate: string;
  status: FinancialEntryStatus;
  categoryId: string;
  costCenterId: string;
  paymentMethodId: string;
  isFixed: boolean;
  recurrenceCycle: FinancialRecurrenceCycle;
  recurrenceEndDate: string;
}

const STATUS_OPTIONS: Array<{ label: string; value: FinancialEntryStatus }> = [
  { label: "Pendente", value: "PENDENTE" },
  { label: "Pago", value: "PAGO" },
  { label: "Vencido", value: "VENCIDO" },
  { label: "Cancelado", value: "CANCELADO" }
];

const RECURRENCE_OPTIONS: Array<{ label: string; value: FinancialRecurrenceCycle }> = [
  { label: "Sem repeticao", value: "NONE" },
  { label: "Semanal", value: "WEEKLY" },
  { label: "Mensal", value: "MONTHLY" },
  { label: "Trimestral", value: "QUARTERLY" },
  { label: "Semestral", value: "SEMIANNUAL" },
  { label: "Anual", value: "YEARLY" }
];

function todayInputDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function toInputDate(value?: string | null): string {
  if (!value) return "";
  return new Date(value).toISOString().slice(0, 10);
}

function statusLabel(status: FinancialEntryStatus): string {
  switch (status) {
    case "PENDENTE":
      return "Pendente";
    case "PAGO":
      return "Pago";
    case "VENCIDO":
      return "Vencido";
    case "CANCELADO":
      return "Cancelado";
    default:
      return status;
  }
}

function statusColor(status: FinancialEntryStatus): "red" | "green" | "orange" | "default" {
  switch (status) {
    case "PAGO":
      return "green";
    case "VENCIDO":
      return "orange";
    case "CANCELADO":
      return "default";
    case "PENDENTE":
    default:
      return "red";
  }
}

const INITIAL_FORM: EntryFormState = {
  title: "",
  description: "",
  amount: "",
  dueDate: todayInputDate(),
  paymentDate: "",
  launchDate: todayInputDate(),
  status: "PENDENTE",
  categoryId: "",
  costCenterId: "",
  paymentMethodId: "",
  isFixed: false,
  recurrenceCycle: "NONE",
  recurrenceEndDate: ""
};

export function FinancialEntriesPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [entries, setEntries] = useState<FinancialEntry[]>([]);
  const [categories, setCategories] = useState<FinancialCategory[]>([]);
  const [costCenters, setCostCenters] = useState<CostCenter[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [form, setForm] = useState<EntryFormState>(INITIAL_FORM);

  const [dueDateFrom, setDueDateFrom] = useState(todayInputDate());
  const [dueDateTo, setDueDateTo] = useState(todayInputDate());
  const [paymentDateFrom, setPaymentDateFrom] = useState("");
  const [paymentDateTo, setPaymentDateTo] = useState("");
  const [statusFilter, setStatusFilter] = useState<FinancialEntryStatus | "">("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [costCenterFilter, setCostCenterFilter] = useState("");
  const [paymentMethodFilter, setPaymentMethodFilter] = useState("");
  const [search, setSearch] = useState("");

  const kpis = useMemo(() => {
    const paid = entries.filter((item) => item.status === "PAGO");
    const overdue = entries.filter((item) => item.status === "VENCIDO");
    const pending = entries.filter((item) => item.status === "PENDENTE");

    return {
      paidCount: paid.length,
      paidValue: paid.reduce((acc, item) => acc + Number(item.amount), 0),
      pendingCount: pending.length,
      pendingValue: pending.reduce((acc, item) => acc + Number(item.amount), 0),
      overdueCount: overdue.length,
      overdueValue: overdue.reduce((acc, item) => acc + Number(item.amount), 0)
    };
  }, [entries]);

  const columns: TableProps<FinancialEntry>["columns"] = [
    {
      title: "Titulo",
      key: "title",
      render: (_, record) => (
        <div>
          <strong>{record.title}</strong>
          <div>{record.description || "-"}</div>
        </div>
      )
    },
    {
      title: "Valor",
      key: "amount",
      render: (_, record) => formatCurrency(record.amount)
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
      title: "Centro Custo",
      key: "costCenter",
      render: (_, record) => record.costCenter?.name ?? "-"
    },
    {
      title: "Forma Pgto",
      key: "paymentMethod",
      render: (_, record) => record.paymentMethod?.name ?? "-"
    },
    {
      title: "Fixo",
      key: "fixed",
      render: (_, record) => (record.isFixed ? "Sim" : "Nao")
    },
    {
      title: "Acoes",
      key: "actions",
      render: (_, record) => (
        <div className="status-actions">
          {record.status !== "PAGO" && record.status !== "CANCELADO" && (
            <AppButton
              size="small"
              onClick={() => {
                showConfirmDialog({
                  title: "Marcar como pago",
                  content: "Deseja marcar este lancamento como pago?",
                  onConfirm: async () => {
                    await payEntry(record.id);
                  }
                });
              }}
            >
              Pagar
            </AppButton>
          )}
          <AppButton size="small" onClick={() => openEdit(record)}>
            Editar
          </AppButton>
          <AppButton
            size="small"
            danger
            onClick={() => {
              showConfirmDialog({
                title: "Excluir lancamento",
                content: "Deseja excluir este lancamento?",
                onConfirm: async () => {
                  await deleteEntry(record.id);
                }
              });
            }}
          >
            Excluir
          </AppButton>
        </div>
      )
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

  async function loadEntries() {
    setLoading(true);

    try {
      const response = await api.get<FinancialEntry[]>("/financial/entries", {
        params: {
          dueDateFrom: dueDateFrom || undefined,
          dueDateTo: dueDateTo || undefined,
          paymentDateFrom: paymentDateFrom || undefined,
          paymentDateTo: paymentDateTo || undefined,
          status: statusFilter || undefined,
          categoryId: categoryFilter || undefined,
          costCenterId: costCenterFilter || undefined,
          paymentMethodId: paymentMethodFilter || undefined,
          search: search || undefined
        }
      });

      setEntries(response.data);
    } catch {
      notifyError("Financeiro", "Nao foi possivel carregar lancamentos.");
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

      await loadEntries();
    })();
  }, []);

  function openCreate() {
    setEditingEntryId(null);
    setForm({ ...INITIAL_FORM });
    setModalOpen(true);
  }

  function openEdit(entry: FinancialEntry) {
    setEditingEntryId(entry.id);
    setForm({
      title: entry.title,
      description: entry.description ?? "",
      amount: String(entry.amount ?? ""),
      dueDate: toInputDate(entry.dueDate),
      paymentDate: toInputDate(entry.paymentDate),
      launchDate: toInputDate(entry.launchDate),
      status: entry.status,
      categoryId: entry.categoryId,
      costCenterId: entry.costCenterId ?? "",
      paymentMethodId: entry.paymentMethodId ?? "",
      isFixed: entry.isFixed,
      recurrenceCycle: entry.recurrenceCycle,
      recurrenceEndDate: toInputDate(entry.recurrenceEndDate)
    });
    setModalOpen(true);
  }

  async function saveEntry() {
    if (!form.title.trim() || !form.amount || !form.dueDate || !form.categoryId) {
      notifyError("Financeiro", "Preencha titulo, valor, vencimento e categoria.");
      return;
    }

    setSaving(true);

    try {
      const payload = {
        title: form.title,
        description: form.description,
        amount: Number(form.amount),
        dueDate: form.dueDate,
        paymentDate: form.paymentDate || undefined,
        launchDate: form.launchDate || undefined,
        status: form.status,
        categoryId: form.categoryId,
        costCenterId: form.costCenterId || undefined,
        paymentMethodId: form.paymentMethodId || undefined,
        isFixed: form.isFixed,
        recurrenceCycle: form.isFixed ? form.recurrenceCycle : "NONE",
        recurrenceEndDate: form.isFixed ? form.recurrenceEndDate || undefined : undefined
      };

      if (editingEntryId) {
        await api.patch(`/financial/entries/${editingEntryId}`, payload);
        notifySuccess("Lancamento atualizado");
      } else {
        await api.post("/financial/entries", payload);
        notifySuccess("Lancamento criado");
      }

      setModalOpen(false);
      await loadEntries();
    } catch (error) {
      const message =
        error instanceof AxiosError
          ? (error.response?.data?.message as string | undefined)
          : "Nao foi possivel salvar lancamento.";
      notifyError("Financeiro", message ?? "Nao foi possivel salvar lancamento.");
    } finally {
      setSaving(false);
    }
  }

  async function payEntry(id: string) {
    try {
      await api.patch(`/financial/entries/${id}/pay`, {
        paymentDate: new Date().toISOString(),
        paymentMethodId: paymentMethodFilter || undefined
      });
      notifySuccess("Lancamento marcado como pago");
      await loadEntries();
    } catch {
      notifyError("Financeiro", "Nao foi possivel marcar lancamento como pago.");
    }
  }

  async function deleteEntry(id: string) {
    try {
      await api.delete(`/financial/entries/${id}`);
      notifySuccess("Lancamento excluido");
      await loadEntries();
    } catch {
      notifyError("Financeiro", "Nao foi possivel excluir lancamento.");
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1>Lancamentos Financeiros</h1>
        <AppButton type="primary" onClick={openCreate}>
          Novo Lancamento
        </AppButton>
      </div>

      <div className="asstramed-kpi-grid">
        <KpiStatCard title="Pagos" value={`${kpis.paidCount} • ${formatCurrency(kpis.paidValue)}`} tone="positive" icon="check" />
        <KpiStatCard title="Pendentes" value={`${kpis.pendingCount} • ${formatCurrency(kpis.pendingValue)}`} tone="neutral" icon="list" />
        <KpiStatCard title="Vencidos" value={`${kpis.overdueCount} • ${formatCurrency(kpis.overdueValue)}`} tone="negative" icon="warning" />
      </div>

      <div className="asstramed-dashboard-filters">
        <AppInput type="date" value={dueDateFrom} onChange={(event) => setDueDateFrom(event.target.value)} />
        <AppInput type="date" value={dueDateTo} onChange={(event) => setDueDateTo(event.target.value)} />
        <AppInput type="date" value={paymentDateFrom} onChange={(event) => setPaymentDateFrom(event.target.value)} />
        <AppInput type="date" value={paymentDateTo} onChange={(event) => setPaymentDateTo(event.target.value)} />

        <DashboardFilterSelect
          value={statusFilter || undefined}
          allowClear
          placeholder="Status"
          options={STATUS_OPTIONS}
          onChange={(value) => setStatusFilter((value as FinancialEntryStatus) || "")}
        />

        <DashboardFilterSelect
          value={categoryFilter || undefined}
          allowClear
          placeholder="Categoria"
          options={categories.map((item) => ({ value: item.id, label: item.name }))}
          onChange={(value) => setCategoryFilter((value as string) || "")}
        />

        <DashboardFilterSelect
          value={costCenterFilter || undefined}
          allowClear
          placeholder="Centro de custo"
          options={costCenters.map((item) => ({ value: item.id, label: item.name }))}
          onChange={(value) => setCostCenterFilter((value as string) || "")}
        />

        <DashboardFilterSelect
          value={paymentMethodFilter || undefined}
          allowClear
          placeholder="Forma de pagamento"
          options={paymentMethods.map((item) => ({ value: item.id, label: item.name }))}
          onChange={(value) => setPaymentMethodFilter((value as string) || "")}
        />

        <AppInput placeholder="Buscar titulo/descricao" value={search} onChange={(event) => setSearch(event.target.value)} />

        <div className="filters-actions">
          <AppButton type="primary" onClick={() => void loadEntries()}>
            Aplicar
          </AppButton>
          <AppButton
            onClick={() => {
              setDueDateFrom(todayInputDate());
              setDueDateTo(todayInputDate());
              setPaymentDateFrom("");
              setPaymentDateTo("");
              setStatusFilter("");
              setCategoryFilter("");
              setCostCenterFilter("");
              setPaymentMethodFilter("");
              setSearch("");
              void loadEntries();
            }}
          >
            Limpar
          </AppButton>
        </div>
      </div>

      <AppTable<FinancialEntry>
        rowKey="id"
        loading={loading}
        columns={columns}
        dataSource={entries}
        pagination={false}
      />

      <AppModal
        open={modalOpen}
        title={editingEntryId ? "Editar lancamento" : "Novo lancamento"}
        onCancel={() => setModalOpen(false)}
        footer={[
          <AppButton key="cancel" onClick={() => setModalOpen(false)}>
            Cancelar
          </AppButton>,
          <AppButton key="save" type="primary" loading={saving} onClick={() => void saveEntry()}>
            Salvar
          </AppButton>
        ]}
      >
        <div className="form-grid">
          <AppInput
            placeholder="Titulo"
            value={form.title}
            onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
          />
          <AppInput
            placeholder="Descricao"
            value={form.description}
            onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
          />
          <AppInput
            type="number"
            placeholder="Valor"
            value={form.amount}
            onChange={(event) => setForm((prev) => ({ ...prev, amount: event.target.value }))}
          />
          <AppInput
            type="date"
            value={form.dueDate}
            onChange={(event) => setForm((prev) => ({ ...prev, dueDate: event.target.value }))}
          />
          <AppInput
            type="date"
            value={form.launchDate}
            onChange={(event) => setForm((prev) => ({ ...prev, launchDate: event.target.value }))}
          />
          <AppInput
            type="date"
            value={form.paymentDate}
            onChange={(event) => setForm((prev) => ({ ...prev, paymentDate: event.target.value }))}
          />

          <DashboardFilterSelect
            value={form.status}
            options={STATUS_OPTIONS}
            onChange={(value) => setForm((prev) => ({ ...prev, status: value as FinancialEntryStatus }))}
          />

          <DashboardFilterSelect
            value={form.categoryId || undefined}
            placeholder="Categoria"
            options={categories.map((item) => ({ value: item.id, label: item.name }))}
            onChange={(value) => setForm((prev) => ({ ...prev, categoryId: String(value) }))}
          />

          <DashboardFilterSelect
            value={form.costCenterId || undefined}
            placeholder="Centro de custo"
            allowClear
            options={costCenters.map((item) => ({ value: item.id, label: item.name }))}
            onChange={(value) => setForm((prev) => ({ ...prev, costCenterId: String(value || "") }))}
          />

          <DashboardFilterSelect
            value={form.paymentMethodId || undefined}
            placeholder="Forma de pagamento"
            allowClear
            options={paymentMethods.map((item) => ({ value: item.id, label: item.name }))}
            onChange={(value) => setForm((prev) => ({ ...prev, paymentMethodId: String(value || "") }))}
          />

          <label className="permission-item" style={{ gridColumn: "1 / -1" }}>
            <AppCheckbox
              checked={form.isFixed}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  isFixed: event.target.checked,
                  recurrenceCycle: event.target.checked ? prev.recurrenceCycle : "NONE",
                  recurrenceEndDate: event.target.checked ? prev.recurrenceEndDate : ""
                }))
              }
            />
            <span>Lancamento fixo (repeticao por ciclo)</span>
          </label>

          {form.isFixed && (
            <>
              <DashboardFilterSelect
                value={form.recurrenceCycle}
                options={RECURRENCE_OPTIONS}
                onChange={(value) =>
                  setForm((prev) => ({ ...prev, recurrenceCycle: value as FinancialRecurrenceCycle }))
                }
              />
              <AppInput
                type="date"
                value={form.recurrenceEndDate}
                onChange={(event) => setForm((prev) => ({ ...prev, recurrenceEndDate: event.target.value }))}
                placeholder="Fim da recorrencia"
              />
            </>
          )}
        </div>
      </AppModal>
    </div>
  );
}
