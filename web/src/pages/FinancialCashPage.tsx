import { useEffect, useMemo, useState } from "react";
import { AxiosError } from "axios";
import { TableProps } from "antd";
import { api } from "../services/api";
import {
  CashBoxHistoryItem,
  CashCategorySummary,
  CashMovement,
  CashMovementType,
  CashOverviewResponse,
  CashReceiptCategory
} from "../types/api";
import {
  AppButton,
  AppInput,
  AppModal,
  AppSelect,
  AppTable,
  AppTag,
  AppTextArea,
  KpiStatCard
} from "../ui/components";
import { notifyError, notifySuccess } from "../ui/feedback/notifications";
import { getTodayDateInputValue } from "../utils/date";
import { formatCurrency, formatDate, formatDateTime } from "../utils/format";
import { useAuth } from "../context/AuthContext";
import { PERMISSIONS } from "../constants/permissions";

interface OpenCashFormState {
  openingAmount: string;
  openingNotes: string;
}

interface MovementFormState {
  type: CashMovementType;
  receiptCategory: CashReceiptCategory;
  amount: string;
  description: string;
  reference: string;
}

interface CloseCashFormState {
  password: string;
  countedAmount: string;
  closingNotes: string;
}

const OPEN_FORM_INITIAL: OpenCashFormState = {
  openingAmount: "0",
  openingNotes: ""
};

const MOVEMENT_FORM_INITIAL: MovementFormState = {
  type: "RECEBIMENTO",
  receiptCategory: "DINHEIRO",
  amount: "",
  description: "",
  reference: ""
};

const CLOSE_FORM_INITIAL: CloseCashFormState = {
  password: "",
  countedAmount: "0",
  closingNotes: ""
};

const MOVEMENT_TYPE_OPTIONS: Array<{ value: CashMovementType; label: string }> = [
  { value: "RECEBIMENTO", label: "Recebimento" },
  { value: "SAIDA", label: "Saida" },
  { value: "SANGRIA", label: "Sangria" },
  { value: "SUPRIMENTO", label: "Suprimento" },
  { value: "AJUSTE_POSITIVO", label: "Ajuste positivo" },
  { value: "AJUSTE_NEGATIVO", label: "Ajuste negativo" }
];

const RECEIPT_CATEGORY_OPTIONS: Array<{ value: CashReceiptCategory; label: string }> = [
  { value: "PIX", label: "PIX" },
  { value: "CARTAO_CREDITO", label: "Cartao credito" },
  { value: "CARTAO_DEBITO", label: "Cartao debito" },
  { value: "DINHEIRO", label: "Dinheiro" }
];

function todayInputDate(): string {
  return getTodayDateInputValue();
}

function statusLabel(status: string): string {
  return status === "FECHADO" ? "Fechado" : "Aberto";
}

function statusColor(status: string): "green" | "blue" {
  return status === "FECHADO" ? "green" : "blue";
}

function requiresCashCategory(type: CashMovementType): boolean {
  return ["SANGRIA", "SUPRIMENTO", "AJUSTE_POSITIVO", "AJUSTE_NEGATIVO"].includes(type);
}

function movementTypeLabel(type: CashMovementType): string {
  return MOVEMENT_TYPE_OPTIONS.find((option) => option.value === type)?.label ?? type;
}

export function FinancialCashPage() {
  const { hasPermission } = useAuth();
  const canWrite = hasPermission(PERMISSIONS.FINANCE_CASH_WRITE);
  const canClose = hasPermission(PERMISSIONS.FINANCE_CASH_CLOSE);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [referenceDate, setReferenceDate] = useState(todayInputDate());
  const [overview, setOverview] = useState<CashOverviewResponse | null>(null);
  const [openModalOpen, setOpenModalOpen] = useState(false);
  const [movementModalOpen, setMovementModalOpen] = useState(false);
  const [closeModalOpen, setCloseModalOpen] = useState(false);
  const [openForm, setOpenForm] = useState<OpenCashFormState>(OPEN_FORM_INITIAL);
  const [movementForm, setMovementForm] = useState<MovementFormState>(MOVEMENT_FORM_INITIAL);
  const [closeForm, setCloseForm] = useState<CloseCashFormState>(CLOSE_FORM_INITIAL);

  const dailyRows = overview?.summary.dailyByCategory ?? [];
  const monthlyRows = overview?.summary.monthlyByCategory ?? [];
  const currentBox = overview?.currentBox ?? null;

  const movementColumns: TableProps<CashMovement>["columns"] = [
    {
      title: "Data/Hora",
      key: "createdAt",
      render: (_, record) => formatDateTime(record.createdAt)
    },
    {
      title: "Tipo",
      key: "type",
      render: (_, record) => movementTypeLabel(record.type)
    },
    {
      title: "Categoria",
      key: "receiptCategory",
      render: (_, record) =>
        RECEIPT_CATEGORY_OPTIONS.find((option) => option.value === record.receiptCategory)?.label ?? record.receiptCategory
    },
    {
      title: "Valor",
      key: "amount",
      render: (_, record) => formatCurrency(record.amount)
    },
    {
      title: "Descricao",
      key: "description",
      render: (_, record) => record.description ?? "-"
    },
    {
      title: "Referencia",
      key: "reference",
      render: (_, record) => record.reference ?? "-"
    },
    {
      title: "Usuario",
      key: "createdBy",
      render: (_, record) => record.createdBy.name
    }
  ];

  const summaryColumns: TableProps<CashCategorySummary>["columns"] = [
    { title: "Categoria", dataIndex: "label", key: "label" },
    { title: "Entradas", key: "inflow", render: (_, record) => formatCurrency(record.inflow) },
    { title: "Saidas", key: "outflow", render: (_, record) => formatCurrency(record.outflow) },
    { title: "Saldo", key: "balance", render: (_, record) => formatCurrency(record.balance) }
  ];

  const historyColumns: TableProps<CashBoxHistoryItem>["columns"] = [
    {
      title: "Data",
      key: "referenceDate",
      render: (_, record) => formatDate(record.referenceDate)
    },
    {
      title: "Status",
      key: "status",
      render: (_, record) => <AppTag color={statusColor(record.status)}>{statusLabel(record.status)}</AppTag>
    },
    {
      title: "Abertura",
      key: "openingAmount",
      render: (_, record) => formatCurrency(record.openingAmount)
    },
    {
      title: "Saldo fisico",
      key: "physicalBalance",
      render: (_, record) => formatCurrency(record.physicalBalance)
    },
    {
      title: "Movimentos",
      dataIndex: "movementCount",
      key: "movementCount"
    },
    {
      title: "Diferenca",
      key: "differenceAmount",
      render: (_, record) => (record.differenceAmount != null ? formatCurrency(record.differenceAmount) : "-")
    }
  ];

  const filteredMovementCategories = useMemo(() => {
    if (!requiresCashCategory(movementForm.type)) {
      return RECEIPT_CATEGORY_OPTIONS;
    }

    return RECEIPT_CATEGORY_OPTIONS.filter((option) => option.value === "DINHEIRO");
  }, [movementForm.type]);

  async function loadOverview(targetDate = referenceDate) {
    setLoading(true);

    try {
      const response = await api.get<CashOverviewResponse>("/financial/cash/overview", {
        params: {
          date: targetDate
        }
      });

      setOverview(response.data);
    } catch (error) {
      const message =
        error instanceof AxiosError
          ? (error.response?.data?.message as string | undefined)
          : "Nao foi possivel carregar o caixa diario.";
      notifyError("Caixa diario", message ?? "Nao foi possivel carregar o caixa diario.");
      setOverview(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadOverview();
  }, []);

  function openOpenModal() {
    setOpenForm(OPEN_FORM_INITIAL);
    setOpenModalOpen(true);
  }

  function openMovementModal() {
    setMovementForm(MOVEMENT_FORM_INITIAL);
    setMovementModalOpen(true);
  }

  function openCloseModal() {
    setCloseForm({
      password: "",
      countedAmount: String(currentBox?.physicalBalance ?? 0),
      closingNotes: ""
    });
    setCloseModalOpen(true);
  }

  async function handleOpenCashBox() {
    setSaving(true);

    try {
      await api.post("/financial/cash/open", {
        date: referenceDate,
        openingAmount: Number(openForm.openingAmount || 0),
        openingNotes: openForm.openingNotes || undefined
      });

      notifySuccess("Caixa aberto");
      setOpenModalOpen(false);
      await loadOverview();
    } catch (error) {
      const message =
        error instanceof AxiosError
          ? (error.response?.data?.message as string | undefined)
          : "Nao foi possivel abrir o caixa.";
      notifyError("Caixa diario", message ?? "Nao foi possivel abrir o caixa.");
    } finally {
      setSaving(false);
    }
  }

  async function handleCreateMovement() {
    if (!currentBox) {
      notifyError("Caixa diario", "Abra o caixa antes de lancar movimentacoes.");
      return;
    }

    if (!movementForm.amount) {
      notifyError("Caixa diario", "Informe o valor da movimentacao.");
      return;
    }

    setSaving(true);

    try {
      await api.post(`/financial/cash/${currentBox.id}/movements`, {
        type: movementForm.type,
        receiptCategory: movementForm.receiptCategory,
        amount: Number(movementForm.amount),
        description: movementForm.description || undefined,
        reference: movementForm.reference || undefined
      });

      notifySuccess("Movimentacao registrada");
      setMovementModalOpen(false);
      await loadOverview();
    } catch (error) {
      const message =
        error instanceof AxiosError
          ? (error.response?.data?.message as string | undefined)
          : "Nao foi possivel registrar a movimentacao.";
      notifyError("Caixa diario", message ?? "Nao foi possivel registrar a movimentacao.");
    } finally {
      setSaving(false);
    }
  }

  async function handleCloseCashBox() {
    if (!currentBox) {
      return;
    }

    if (!closeForm.password.trim()) {
      notifyError("Caixa diario", "Informe a senha de fechamento.");
      return;
    }

    setSaving(true);

    try {
      await api.post(`/financial/cash/${currentBox.id}/close`, {
        password: closeForm.password,
        countedAmount: Number(closeForm.countedAmount || 0),
        closingNotes: closeForm.closingNotes || undefined
      });

      notifySuccess("Caixa fechado");
      setCloseModalOpen(false);
      await loadOverview();
    } catch (error) {
      const message =
        error instanceof AxiosError
          ? (error.response?.data?.message as string | undefined)
          : "Nao foi possivel fechar o caixa.";
      notifyError("Caixa diario", message ?? "Nao foi possivel fechar o caixa.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1>Caixa Diario</h1>
        <div className="status-actions">
          <AppInput type="date" value={referenceDate} onChange={(event) => setReferenceDate(event.target.value)} />
          <AppButton onClick={() => void loadOverview(referenceDate)} loading={loading}>
            Atualizar
          </AppButton>
          {canWrite && !currentBox && (
            <AppButton type="primary" onClick={openOpenModal}>
              Abrir caixa
            </AppButton>
          )}
          {canWrite && currentBox?.status === "ABERTO" && (
            <AppButton type="primary" onClick={openMovementModal}>
              Nova movimentacao
            </AppButton>
          )}
          {canClose && currentBox?.status === "ABERTO" && (
            <AppButton onClick={openCloseModal}>Fechar caixa</AppButton>
          )}
        </div>
      </div>

      <div className="asstramed-kpi-grid">
        <KpiStatCard
          title="Saldo fisico do dia"
          value={formatCurrency(overview?.summary.dailyPhysicalBalance ?? 0)}
          tone="positive"
          icon="money"
        />
        <KpiStatCard
          title="Saldo mensal em dinheiro"
          value={formatCurrency(overview?.summary.monthlyPhysicalBalance ?? 0)}
          tone="neutral"
          icon="list"
        />
        <KpiStatCard
          title="Status do caixa"
          value={currentBox ? statusLabel(currentBox.status) : "Nao aberto"}
          tone={currentBox?.status === "FECHADO" ? "positive" : "neutral"}
          icon="clock"
        />
      </div>

      {currentBox ? (
        <div className="card card-stack">
          <div className="cash-box-meta-grid">
            <div>
              <strong>Data de referencia</strong>
              <div>{formatDate(currentBox.referenceDate)}</div>
            </div>
            <div>
              <strong>Abertura</strong>
              <div>{formatCurrency(currentBox.openingAmount)} em {formatDateTime(currentBox.openedAt)}</div>
              <div>Por {currentBox.openedBy.name}</div>
            </div>
            <div>
              <strong>Saldo esperado</strong>
              <div>{formatCurrency(currentBox.closingAmountExpected)}</div>
            </div>
            <div>
              <strong>Status</strong>
              <div><AppTag color={statusColor(currentBox.status)}>{statusLabel(currentBox.status)}</AppTag></div>
            </div>
          </div>
          {currentBox.closingAmountCounted != null && (
            <div className="cash-box-meta-grid">
              <div>
                <strong>Valor contado</strong>
                <div>{formatCurrency(currentBox.closingAmountCounted)}</div>
              </div>
              <div>
                <strong>Diferenca</strong>
                <div>{formatCurrency(currentBox.differenceAmount ?? 0)}</div>
              </div>
              <div>
                <strong>Fechado em</strong>
                <div>{formatDateTime(currentBox.closedAt)}</div>
                <div>{currentBox.closedBy?.name ?? "-"}</div>
              </div>
              <div>
                <strong>Observacao</strong>
                <div>{currentBox.closingNotes || "-"}</div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="card card-stack">
          <h3>Nenhum caixa aberto para a data selecionada</h3>
          <p>Abra o caixa diario para comecar a registrar recebimentos, saidas, sangrias e suprimentos.</p>
        </div>
      )}

      <div className="cash-box-summary-grid">
        <div className="card card-stack">
          <h3>Saldo diario por categoria</h3>
          <AppTable<CashCategorySummary>
            rowKey="category"
            loading={loading}
            pagination={false}
            columns={summaryColumns}
            dataSource={dailyRows}
          />
        </div>

        <div className="card card-stack">
          <h3>Saldo mensal por categoria</h3>
          <AppTable<CashCategorySummary>
            rowKey="category"
            loading={loading}
            pagination={false}
            columns={summaryColumns}
            dataSource={monthlyRows}
          />
        </div>
      </div>

      <div className="card card-stack">
        <h3>Movimentacoes do caixa</h3>
        <AppTable<CashMovement>
          rowKey="id"
          loading={loading}
          pagination={false}
          columns={movementColumns}
          dataSource={currentBox?.movements ?? []}
          scroll={{ x: "max-content" }}
        />
      </div>

      <div className="card card-stack">
        <h3>Historico recente de caixas</h3>
        <AppTable<CashBoxHistoryItem>
          rowKey="id"
          loading={loading}
          pagination={false}
          columns={historyColumns}
          dataSource={overview?.recentBoxes ?? []}
        />
      </div>

      <AppModal
        title="Abrir caixa"
        open={openModalOpen}
        onCancel={() => setOpenModalOpen(false)}
        onOk={() => void handleOpenCashBox()}
        okText="Abrir caixa"
        confirmLoading={saving}
      >
        <div className="form-grid form-grid-2">
          <label>
            <span>Data</span>
            <AppInput type="date" value={referenceDate} onChange={(event) => setReferenceDate(event.target.value)} />
          </label>
          <label>
            <span>Saldo inicial</span>
            <AppInput
              inputMode="decimal"
              value={openForm.openingAmount}
              onChange={(event) => setOpenForm((prev) => ({ ...prev, openingAmount: event.target.value }))}
            />
          </label>
          <label style={{ gridColumn: "1 / -1" }}>
            <span>Observacoes de abertura</span>
            <AppTextArea
              rows={3}
              value={openForm.openingNotes}
              onChange={(event) => setOpenForm((prev) => ({ ...prev, openingNotes: event.target.value }))}
            />
          </label>
        </div>
      </AppModal>

      <AppModal
        title="Nova movimentacao"
        open={movementModalOpen}
        onCancel={() => setMovementModalOpen(false)}
        onOk={() => void handleCreateMovement()}
        okText="Salvar movimentacao"
        confirmLoading={saving}
      >
        <div className="form-grid form-grid-2">
          <label>
            <span>Tipo de movimentacao</span>
            <AppSelect
              value={movementForm.type}
              options={MOVEMENT_TYPE_OPTIONS}
              onChange={(value) => {
                const nextType = value as CashMovementType;
                setMovementForm((prev) => ({
                  ...prev,
                  type: nextType,
                  receiptCategory: requiresCashCategory(nextType) ? "DINHEIRO" : prev.receiptCategory
                }));
              }}
            />
          </label>
          <label>
            <span>Categoria de recebimento</span>
            <AppSelect
              value={movementForm.receiptCategory}
              options={filteredMovementCategories}
              onChange={(value) => setMovementForm((prev) => ({ ...prev, receiptCategory: value as CashReceiptCategory }))}
            />
          </label>
          <label>
            <span>Valor</span>
            <AppInput
              inputMode="decimal"
              value={movementForm.amount}
              onChange={(event) => setMovementForm((prev) => ({ ...prev, amount: event.target.value }))}
            />
          </label>
          <label>
            <span>Referencia</span>
            <AppInput
              value={movementForm.reference}
              onChange={(event) => setMovementForm((prev) => ({ ...prev, reference: event.target.value }))}
            />
          </label>
          <label style={{ gridColumn: "1 / -1" }}>
            <span>Descricao</span>
            <AppTextArea
              rows={3}
              value={movementForm.description}
              onChange={(event) => setMovementForm((prev) => ({ ...prev, description: event.target.value }))}
            />
          </label>
        </div>
      </AppModal>

      <AppModal
        title="Fechar caixa"
        open={closeModalOpen}
        onCancel={() => setCloseModalOpen(false)}
        onOk={() => void handleCloseCashBox()}
        okText="Fechar caixa"
        confirmLoading={saving}
      >
        <div className="form-grid form-grid-2">
          <label>
            <span>Senha de fechamento</span>
            <AppInput
              type="password"
              value={closeForm.password}
              onChange={(event) => setCloseForm((prev) => ({ ...prev, password: event.target.value }))}
            />
          </label>
          <label>
            <span>Saldo esperado</span>
            <AppInput value={formatCurrency(currentBox?.physicalBalance ?? 0)} disabled />
          </label>
          <label>
            <span>Valor contado</span>
            <AppInput
              inputMode="decimal"
              value={closeForm.countedAmount}
              onChange={(event) => setCloseForm((prev) => ({ ...prev, countedAmount: event.target.value }))}
            />
          </label>
          <label style={{ gridColumn: "1 / -1" }}>
            <span>Observacoes de fechamento</span>
            <AppTextArea
              rows={3}
              value={closeForm.closingNotes}
              onChange={(event) => setCloseForm((prev) => ({ ...prev, closingNotes: event.target.value }))}
            />
          </label>
        </div>
      </AppModal>
    </div>
  );
}
