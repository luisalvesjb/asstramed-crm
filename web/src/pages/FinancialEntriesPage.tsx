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
  AppFileDragger,
  AppInput,
  AppModal,
  AppTable,
  AppTag,
  DashboardFilterSelect,
  KpiStatCard
} from "../ui/components";
import { notifyError, notifySuccess, showConfirmDialog } from "../ui/feedback/notifications";
import { formatCurrency, formatDate } from "../utils/format";
import { resolveAssetUrl } from "../utils/asset-url";

interface EntryFormState {
  title: string;
  description: string;
  amount: string;
  amountPaid: string;
  dueDate: string;
  paymentDate: string;
  launchDate: string;
  status: FinancialEntryStatus;
  categoryId: string;
  costCenterId: string;
  paymentMethodId: string;
  paymentKey: string;
  isFixed: boolean;
  recurrenceCycle: FinancialRecurrenceCycle;
  recurrenceEndDate: string;
}

interface PayFormState {
  paymentDate: string;
  amountPaid: string;
  paymentMethodId: string;
  paymentKey: string;
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
  amountPaid: "",
  dueDate: todayInputDate(),
  paymentDate: "",
  launchDate: todayInputDate(),
  status: "PENDENTE",
  categoryId: "",
  costCenterId: "",
  paymentMethodId: "",
  paymentKey: "",
  isFixed: false,
  recurrenceCycle: "NONE",
  recurrenceEndDate: ""
};

const INITIAL_PAY_FORM: PayFormState = {
  paymentDate: todayInputDate(),
  amountPaid: "",
  paymentMethodId: "",
  paymentKey: ""
};

function resolvePaidAmount(entry: FinancialEntry): number {
  return Number(entry.amountPaid ?? entry.amount ?? 0);
}

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
  const [bankSlipFile, setBankSlipFile] = useState<File | null>(null);
  const [paymentReceiptFile, setPaymentReceiptFile] = useState<File | null>(null);
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [payingEntryId, setPayingEntryId] = useState<string | null>(null);
  const [payForm, setPayForm] = useState<PayFormState>(INITIAL_PAY_FORM);
  const [payReceiptFile, setPayReceiptFile] = useState<File | null>(null);

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
      paidValue: paid.reduce((acc, item) => acc + resolvePaidAmount(item), 0),
      pendingCount: pending.length,
      pendingValue: pending.reduce((acc, item) => acc + Number(item.amount), 0),
      overdueCount: overdue.length,
      overdueValue: overdue.reduce((acc, item) => acc + Number(item.amount), 0)
    };
  }, [entries]);

  const paymentMethodById = useMemo(() => {
    const map = new Map<string, PaymentMethod>();
    for (const item of paymentMethods) {
      map.set(item.id, item);
    }
    return map;
  }, [paymentMethods]);

  const isPixForm = useMemo(() => {
    const method = paymentMethodById.get(form.paymentMethodId);
    return Boolean(method && /pix/i.test(method.name));
  }, [form.paymentMethodId, paymentMethodById]);

  const isBoletoForm = useMemo(() => {
    const method = paymentMethodById.get(form.paymentMethodId);
    return Boolean(method && /boleto/i.test(method.name));
  }, [form.paymentMethodId, paymentMethodById]);

  const isPixPay = useMemo(() => {
    const method = paymentMethodById.get(payForm.paymentMethodId);
    return Boolean(method && /pix/i.test(method.name));
  }, [payForm.paymentMethodId, paymentMethodById]);

  const paymentMethodFormOptions = useMemo(
    () =>
      paymentMethods
        .filter((item) => item.isActive || item.id === form.paymentMethodId)
        .map((item) => ({
          value: item.id,
          label: item.isActive ? item.name : `${item.name} (inativo)`
        })),
    [form.paymentMethodId, paymentMethods]
  );

  const paymentMethodPayOptions = useMemo(
    () =>
      paymentMethods
        .filter((item) => item.isActive || item.id === payForm.paymentMethodId)
        .map((item) => ({
          value: item.id,
          label: item.isActive ? item.name : `${item.name} (inativo)`
        })),
    [payForm.paymentMethodId, paymentMethods]
  );

  const categoryFormOptions = useMemo(
    () =>
      categories
        .filter((item) => item.isActive || item.id === form.categoryId)
        .map((item) => ({
          value: item.id,
          label: item.isActive ? item.name : `${item.name} (inativa)`
        })),
    [categories, form.categoryId]
  );

  const costCenterFormOptions = useMemo(
    () =>
      costCenters
        .filter((item) => item.isActive || item.id === form.costCenterId)
        .map((item) => ({
          value: item.id,
          label: item.isActive ? item.name : `${item.name} (inativo)`
        })),
    [costCenters, form.costCenterId]
  );

  const editingEntry = useMemo(
    () => entries.find((entry) => entry.id === editingEntryId) ?? null,
    [editingEntryId, entries]
  );

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
      title: "Valor lancamento",
      key: "amount",
      render: (_, record) => formatCurrency(record.amount)
    },
    {
      title: "Valor pago",
      key: "amountPaid",
      render: (_, record) => (record.amountPaid != null ? formatCurrency(record.amountPaid) : "-")
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
      title: "Chave",
      key: "paymentKey",
      render: (_, record) => record.paymentKey ?? "-"
    },
    {
      title: "Boleto",
      key: "bankSlipPath",
      render: (_, record) =>
        record.bankSlipPath ? (
          <a href={resolveAssetUrl(record.bankSlipPath) ?? "#"} target="_blank" rel="noreferrer">
            Ver boleto
          </a>
        ) : (
          "-"
        )
    },
    {
      title: "Comprovante",
      key: "paymentReceiptPath",
      render: (_, record) =>
        record.paymentReceiptPath ? (
          <a href={resolveAssetUrl(record.paymentReceiptPath) ?? "#"} target="_blank" rel="noreferrer">
            Ver comprovante
          </a>
        ) : (
          "-"
        )
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
                openPay(record);
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
      api.get<FinancialCategory[]>("/financial/settings/categories", {
        params: {
          includeUsedInactive: true
        }
      }),
      api.get<CostCenter[]>("/financial/settings/cost-centers", {
        params: {
          includeUsedInactive: true
        }
      }),
      api.get<PaymentMethod[]>("/financial/settings/payment-methods", {
        params: {
          includeUsedInactive: true
        }
      })
    ]);

    setCategories(categoryResponse.data);
    setCostCenters(costCenterResponse.data);
    setPaymentMethods(paymentMethodResponse.data);
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
    setBankSlipFile(null);
    setPaymentReceiptFile(null);
    setModalOpen(true);
  }

  function openEdit(entry: FinancialEntry) {
    setEditingEntryId(entry.id);
    setForm({
      title: entry.title,
      description: entry.description ?? "",
      amount: String(entry.amount ?? ""),
      amountPaid: entry.amountPaid != null ? String(entry.amountPaid) : "",
      dueDate: toInputDate(entry.dueDate),
      paymentDate: toInputDate(entry.paymentDate),
      launchDate: toInputDate(entry.launchDate),
      status: entry.status,
      categoryId: entry.categoryId,
      costCenterId: entry.costCenterId ?? "",
      paymentMethodId: entry.paymentMethodId ?? "",
      paymentKey: entry.paymentKey ?? "",
      isFixed: entry.isFixed,
      recurrenceCycle: entry.recurrenceCycle,
      recurrenceEndDate: toInputDate(entry.recurrenceEndDate)
    });
    setBankSlipFile(null);
    setPaymentReceiptFile(null);
    setModalOpen(true);
  }

  function openPay(entry: FinancialEntry) {
    setPayingEntryId(entry.id);
    setPayForm({
      paymentDate: todayInputDate(),
      amountPaid: entry.amountPaid != null ? String(entry.amountPaid) : String(entry.amount ?? ""),
      paymentMethodId: entry.paymentMethodId ?? "",
      paymentKey: entry.paymentKey ?? ""
    });
    setPayReceiptFile(null);
    setPayModalOpen(true);
  }

  async function saveEntry() {
    if (!form.title.trim() || !form.amount || !form.dueDate || !form.categoryId) {
      notifyError("Financeiro", "Preencha titulo, valor, vencimento e categoria.");
      return;
    }

    if (isPixForm && !form.paymentKey.trim()) {
      notifyError("Financeiro", "Informe a chave para forma de pagamento PIX.");
      return;
    }

    if (
      isBoletoForm &&
      !bankSlipFile &&
      !(editingEntry && editingEntry.bankSlipPath)
    ) {
      notifyError("Financeiro", "Anexe o boleto para a forma de pagamento Boleto.");
      return;
    }

    setSaving(true);

    try {
      const payload = {
        title: form.title,
        description: form.description,
        amount: Number(form.amount),
        amountPaid: form.amountPaid ? Number(form.amountPaid) : undefined,
        dueDate: form.dueDate,
        paymentDate: form.paymentDate || undefined,
        launchDate: form.launchDate || undefined,
        status: form.status,
        categoryId: form.categoryId,
        costCenterId: form.costCenterId || undefined,
        paymentMethodId: form.paymentMethodId || undefined,
        paymentKey: form.paymentKey || undefined,
        isFixed: form.isFixed,
        recurrenceCycle: form.isFixed ? form.recurrenceCycle : "NONE",
        recurrenceEndDate: form.isFixed ? form.recurrenceEndDate || undefined : undefined
      };

      let savedEntry: FinancialEntry;

      if (editingEntryId) {
        const response = await api.patch<FinancialEntry>(`/financial/entries/${editingEntryId}`, payload);
        savedEntry = response.data;
        notifySuccess("Lancamento atualizado");
      } else {
        const response = await api.post<FinancialEntry>("/financial/entries", payload);
        savedEntry = response.data;
        notifySuccess("Lancamento criado");
      }

      if (bankSlipFile) {
        const bankSlipPayload = new FormData();
        bankSlipPayload.append("file", bankSlipFile);
        await api.post(`/financial/entries/${savedEntry.id}/bank-slip`, bankSlipPayload, {
          headers: {
            "Content-Type": "multipart/form-data"
          }
        });
      }

      if (paymentReceiptFile) {
        const receiptPayload = new FormData();
        receiptPayload.append("file", paymentReceiptFile);
        await api.post(`/financial/entries/${savedEntry.id}/payment-receipt`, receiptPayload, {
          headers: {
            "Content-Type": "multipart/form-data"
          }
        });
      }

      setModalOpen(false);
      setBankSlipFile(null);
      setPaymentReceiptFile(null);
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

  async function payEntry() {
    if (!payingEntryId) {
      return;
    }

    if (!payForm.paymentMethodId) {
      notifyError("Financeiro", "Selecione a forma de pagamento.");
      return;
    }

    if (isPixPay && !payForm.paymentKey.trim()) {
      notifyError("Financeiro", "Informe a chave PIX.");
      return;
    }

    try {
      await api.patch(`/financial/entries/${payingEntryId}/pay`, {
        paymentDate: payForm.paymentDate || new Date().toISOString(),
        amountPaid: payForm.amountPaid ? Number(payForm.amountPaid) : undefined,
        paymentMethodId: payForm.paymentMethodId || undefined,
        paymentKey: payForm.paymentKey || undefined
      });

      if (payReceiptFile) {
        const receiptPayload = new FormData();
        receiptPayload.append("file", payReceiptFile);
        await api.post(`/financial/entries/${payingEntryId}/payment-receipt`, receiptPayload, {
          headers: {
            "Content-Type": "multipart/form-data"
          }
        });
      }

      notifySuccess("Lancamento marcado como pago");
      setPayModalOpen(false);
      setPayingEntryId(null);
      setPayReceiptFile(null);
      setPayForm(INITIAL_PAY_FORM);
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
          options={categories.map((item) => ({
            value: item.id,
            label: item.isActive ? item.name : `${item.name} (inativa)`
          }))}
          onChange={(value) => setCategoryFilter((value as string) || "")}
        />

        <DashboardFilterSelect
          value={costCenterFilter || undefined}
          allowClear
          placeholder="Centro de custo"
          options={costCenters.map((item) => ({
            value: item.id,
            label: item.isActive ? item.name : `${item.name} (inativo)`
          }))}
          onChange={(value) => setCostCenterFilter((value as string) || "")}
        />

        <DashboardFilterSelect
          value={paymentMethodFilter || undefined}
          allowClear
          placeholder="Forma de pagamento"
          options={paymentMethods.map((item) => ({
            value: item.id,
            label: item.isActive ? item.name : `${item.name} (inativa)`
          }))}
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
        onCancel={() => {
          setModalOpen(false);
          setBankSlipFile(null);
          setPaymentReceiptFile(null);
        }}
        footer={[
          <AppButton
            key="cancel"
            onClick={() => {
              setModalOpen(false);
              setBankSlipFile(null);
              setPaymentReceiptFile(null);
            }}
          >
            Cancelar
          </AppButton>,
          <AppButton key="save" type="primary" loading={saving} onClick={() => void saveEntry()}>
            Salvar
          </AppButton>
        ]}
      >
        <div className="form-grid">
          <div className="field-block">
            <label className="field-label">Titulo</label>
            <AppInput
              value={form.title}
              onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
            />
          </div>
          <div className="field-block">
            <label className="field-label">Descricao</label>
            <AppInput
              value={form.description}
              onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
            />
          </div>
          <div className="field-block">
            <label className="field-label">Valor do lancamento</label>
            <AppInput
              type="number"
              value={form.amount}
              onChange={(event) => setForm((prev) => ({ ...prev, amount: event.target.value }))}
            />
          </div>
          <div className="field-block">
            <label className="field-label">Valor pago</label>
            <AppInput
              type="number"
              value={form.amountPaid}
              onChange={(event) => setForm((prev) => ({ ...prev, amountPaid: event.target.value }))}
            />
          </div>
          <div className="field-block">
            <label className="field-label">Vencimento</label>
            <AppInput
              type="date"
              value={form.dueDate}
              onChange={(event) => setForm((prev) => ({ ...prev, dueDate: event.target.value }))}
            />
          </div>
          <div className="field-block">
            <label className="field-label">Data de lancamento</label>
            <AppInput
              type="date"
              value={form.launchDate}
              onChange={(event) => setForm((prev) => ({ ...prev, launchDate: event.target.value }))}
            />
          </div>
          <div className="field-block">
            <label className="field-label">Data de pagamento</label>
            <AppInput
              type="date"
              value={form.paymentDate}
              onChange={(event) => setForm((prev) => ({ ...prev, paymentDate: event.target.value }))}
            />
          </div>

          <div className="field-block">
            <label className="field-label">Status</label>
            <DashboardFilterSelect
              value={form.status}
              options={STATUS_OPTIONS}
              onChange={(value) => setForm((prev) => ({ ...prev, status: value as FinancialEntryStatus }))}
            />
          </div>

          <div className="field-block">
            <label className="field-label">Categoria</label>
            <DashboardFilterSelect
              value={form.categoryId || undefined}
              placeholder="Categoria"
              options={categoryFormOptions}
              onChange={(value) => setForm((prev) => ({ ...prev, categoryId: String(value) }))}
            />
          </div>

          <div className="field-block">
            <label className="field-label">Centro de custo</label>
            <DashboardFilterSelect
              value={form.costCenterId || undefined}
              placeholder="Centro de custo"
              allowClear
              options={costCenterFormOptions}
              onChange={(value) => setForm((prev) => ({ ...prev, costCenterId: String(value || "") }))}
            />
          </div>

          <div className="field-block">
            <label className="field-label">Forma de pagamento</label>
            <DashboardFilterSelect
              value={form.paymentMethodId || undefined}
              placeholder="Forma de pagamento"
              allowClear
              options={paymentMethodFormOptions}
              onChange={(value) =>
                setForm((prev) => ({
                  ...prev,
                  paymentMethodId: String(value || ""),
                  paymentKey: String(value || "") ? prev.paymentKey : ""
                }))
              }
            />
          </div>

          {isPixForm && (
            <div className="field-block">
              <label className="field-label">Chave PIX</label>
              <AppInput
                value={form.paymentKey}
                onChange={(event) => setForm((prev) => ({ ...prev, paymentKey: event.target.value }))}
              />
            </div>
          )}

          {isBoletoForm && (
            <div style={{ gridColumn: "1 / -1" }}>
              <AppFileDragger
                value={bankSlipFile}
                onChange={setBankSlipFile}
                title="Anexar boleto"
                description="Formatos aceitos: PDF, DOC ou DOCX"
                acceptedMimeTypes={[
                  "application/pdf",
                  "application/msword",
                  "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                ]}
                acceptedExtensions={[".pdf", ".doc", ".docx"]}
              />
            </div>
          )}

          <div style={{ gridColumn: "1 / -1" }}>
            <AppFileDragger
              value={paymentReceiptFile}
              onChange={setPaymentReceiptFile}
              title="Anexar comprovante de pagamento (opcional)"
              description="Formatos aceitos: PDF, DOC, DOCX, PNG, JPG"
              acceptedMimeTypes={[
                "application/pdf",
                "application/msword",
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                "image/png",
                "image/jpeg"
              ]}
              acceptedExtensions={[".pdf", ".doc", ".docx", ".png", ".jpg", ".jpeg"]}
            />
          </div>

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
              <div className="field-block">
                <label className="field-label">Ciclo de recorrencia</label>
                <DashboardFilterSelect
                  value={form.recurrenceCycle}
                  options={RECURRENCE_OPTIONS}
                  onChange={(value) =>
                    setForm((prev) => ({ ...prev, recurrenceCycle: value as FinancialRecurrenceCycle }))
                  }
                />
              </div>
              <div className="field-block">
                <label className="field-label">Fim da recorrencia</label>
                <AppInput
                  type="date"
                  value={form.recurrenceEndDate}
                  onChange={(event) => setForm((prev) => ({ ...prev, recurrenceEndDate: event.target.value }))}
                />
              </div>
            </>
          )}
        </div>
      </AppModal>

      <AppModal
        open={payModalOpen}
        title="Marcar lancamento como pago"
        onCancel={() => {
          setPayModalOpen(false);
          setPayingEntryId(null);
          setPayReceiptFile(null);
          setPayForm(INITIAL_PAY_FORM);
        }}
        footer={[
          <AppButton
            key="cancel"
            onClick={() => {
              setPayModalOpen(false);
              setPayingEntryId(null);
              setPayReceiptFile(null);
              setPayForm(INITIAL_PAY_FORM);
            }}
          >
            Cancelar
          </AppButton>,
          <AppButton key="save" type="primary" onClick={() => void payEntry()}>
            Confirmar pagamento
          </AppButton>
        ]}
      >
        <div className="form-grid">
          <div className="field-block">
            <label className="field-label">Data de pagamento</label>
            <AppInput
              type="date"
              value={payForm.paymentDate}
              onChange={(event) => setPayForm((prev) => ({ ...prev, paymentDate: event.target.value }))}
            />
          </div>
          <div className="field-block">
            <label className="field-label">Valor pago</label>
            <AppInput
              type="number"
              value={payForm.amountPaid}
              onChange={(event) => setPayForm((prev) => ({ ...prev, amountPaid: event.target.value }))}
            />
          </div>
          <div className="field-block">
            <label className="field-label">Forma de pagamento</label>
            <DashboardFilterSelect
              value={payForm.paymentMethodId || undefined}
              placeholder="Forma de pagamento"
              options={paymentMethodPayOptions}
              onChange={(value) =>
                setPayForm((prev) => ({ ...prev, paymentMethodId: String(value || ""), paymentKey: prev.paymentKey }))
              }
            />
          </div>
          {isPixPay && (
            <div className="field-block">
              <label className="field-label">Chave PIX</label>
              <AppInput
                value={payForm.paymentKey}
                onChange={(event) => setPayForm((prev) => ({ ...prev, paymentKey: event.target.value }))}
              />
            </div>
          )}
          <div style={{ gridColumn: "1 / -1" }}>
            <AppFileDragger
              value={payReceiptFile}
              onChange={setPayReceiptFile}
              title="Anexar comprovante"
              description="Formatos aceitos: PDF, DOC, DOCX, PNG, JPG"
              acceptedMimeTypes={[
                "application/pdf",
                "application/msword",
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                "image/png",
                "image/jpeg"
              ]}
              acceptedExtensions={[".pdf", ".doc", ".docx", ".png", ".jpg", ".jpeg"]}
            />
          </div>
        </div>
      </AppModal>
    </div>
  );
}
