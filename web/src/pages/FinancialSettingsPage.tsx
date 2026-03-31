import { useEffect, useMemo, useState } from "react";
import { TableProps } from "antd";
import { AxiosError } from "axios";
import { api } from "../services/api";
import { CashPasswordSettings, CostCenter, FinancialCategory, PaymentMethod } from "../types/api";
import {
  AppButton,
  AppCheckbox,
  AppInput,
  AppModal,
  AppTable,
  AppTabs,
  DashboardFilterSelect
} from "../ui/components";
import { notifyError, notifySuccess, showConfirmDialog } from "../ui/feedback/notifications";
import { useAuth } from "../context/AuthContext";
import { PERMISSIONS } from "../constants/permissions";

type SettingKind = "categories" | "cost-centers" | "payment-methods" | "cash-password";

interface BaseSetting {
  id: string;
  name: string;
  description?: string | null;
  costCenterId?: string | null;
  costCenter?: CostCenter | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface SettingForm {
  name: string;
  description: string;
  costCenterId: string;
  isActive: boolean;
}

const KIND_LABEL: Record<SettingKind, string> = {
  categories: "Categoria",
  "cost-centers": "Centro de Custo",
  "payment-methods": "Forma de Pagamento",
  "cash-password": "Caixa e senha"
};

const INITIAL_FORM: SettingForm = {
  name: "",
  description: "",
  costCenterId: "",
  isActive: true
};

export function FinancialSettingsPage() {
  const { hasPermission } = useAuth();
  const canManageCashPassword = hasPermission(PERMISSIONS.FINANCE_CASH_PASSWORD_MANAGE);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<SettingKind>("cost-centers");
  const [statusFilter, setStatusFilter] = useState<"active" | "inactive" | "all">("active");

  const [categories, setCategories] = useState<FinancialCategory[]>([]);
  const [costCenters, setCostCenters] = useState<CostCenter[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [cashPasswordSettings, setCashPasswordSettings] = useState<CashPasswordSettings | null>(null);
  const [cashPasswordForm, setCashPasswordForm] = useState({
    password: "",
    confirmPassword: ""
  });

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<SettingForm>(INITIAL_FORM);

  const activeItems = useMemo(() => {
    if (activeTab === "categories") return categories;
    if (activeTab === "cost-centers") return costCenters;
    if (activeTab === "cash-password") return [];
    return paymentMethods;
  }, [activeTab, categories, costCenters, paymentMethods]);

  const columns: TableProps<BaseSetting>["columns"] = [
    {
      title: "Nome",
      dataIndex: "name",
      key: "name"
    },
    ...(activeTab === "categories"
      ? [
          {
            title: "Centro de custo",
            key: "costCenter",
            render: (_: unknown, record: BaseSetting) => record.costCenter?.name ?? "-"
          }
        ]
      : []),
    {
      title: "Descricao",
      key: "description",
      render: (_, record) => record.description || "-"
    },
    {
      title: "Ativo",
      key: "isActive",
      render: (_, record) => (record.isActive ? "Sim" : "Nao")
    },
    {
      title: "Acoes",
      key: "actions",
      render: (_, record) => (
        <div className="filters-actions">
          <AppButton
            size="small"
            onClick={() => {
              setEditingId(record.id);
              setForm({
                name: record.name,
                description: record.description ?? "",
                costCenterId: record.costCenterId ?? "",
                isActive: record.isActive
              });
              setModalOpen(true);
            }}
          >
            Editar
          </AppButton>
          {record.isActive ? (
            <AppButton
              size="small"
              danger
              onClick={() => {
                showConfirmDialog({
                  title: `Desativar ${KIND_LABEL[activeTab]}`,
                  content: "O item ficara oculto para novos lancamentos. Deseja continuar?",
                  onConfirm: async () => {
                    await deactivateSetting(record.id);
                  }
                });
              }}
            >
              Excluir
            </AppButton>
          ) : (
            <AppButton size="small" onClick={() => void reactivateSetting(record.id)}>
              Ativar
            </AppButton>
          )}
        </div>
      )
    }
  ];

  async function loadSettings(tab: SettingKind = activeTab) {
    setLoading(true);

    try {
      if (tab === "categories") {
        const [categoryResponse, costCenterResponse] = await Promise.all([
          api.get<FinancialCategory[]>("/financial/settings/categories", {
            params: { status: statusFilter }
          }),
          api.get<CostCenter[]>("/financial/settings/cost-centers", {
            params: { status: "all", includeUsedInactive: true }
          })
        ]);

        setCategories(categoryResponse.data);
        setCostCenters(costCenterResponse.data);
      }

      if (tab === "cost-centers") {
        const costCenterResponse = await api.get<CostCenter[]>("/financial/settings/cost-centers", {
          params: { status: statusFilter }
        });

        setCostCenters(costCenterResponse.data);
      }

      if (tab === "payment-methods") {
        const paymentMethodResponse = await api.get<PaymentMethod[]>("/financial/settings/payment-methods", {
          params: { status: statusFilter }
        });

        setPaymentMethods(paymentMethodResponse.data);
      }

      if (tab === "cash-password" && canManageCashPassword) {
        const cashPasswordResponse = await api.get<CashPasswordSettings>("/financial/settings/cash-password");
        setCashPasswordSettings(cashPasswordResponse.data);
      }

      if (tab === "cash-password" && !canManageCashPassword) {
        setCashPasswordSettings(null);
      }
    } catch {
      notifyError("Financeiro", "Nao foi possivel carregar configuracoes financeiras.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadSettings();
  }, [activeTab, statusFilter, canManageCashPassword]);

  function openCreate() {
    setEditingId(null);
    setForm({ ...INITIAL_FORM });
    setModalOpen(true);
  }

  async function saveSetting() {
    if (activeTab === "cash-password") {
      if (!cashPasswordForm.password.trim()) {
        notifyError("Financeiro", "Informe a senha do caixa.");
        return;
      }

      if (cashPasswordForm.password !== cashPasswordForm.confirmPassword) {
        notifyError("Financeiro", "As senhas nao coincidem.");
        return;
      }

      setSaving(true);

      try {
        const response = await api.put<CashPasswordSettings>("/financial/settings/cash-password", {
          password: cashPasswordForm.password,
          confirmPassword: cashPasswordForm.confirmPassword
        });

        setCashPasswordSettings(response.data);
        setCashPasswordForm({ password: "", confirmPassword: "" });
        notifySuccess("Senha do caixa atualizada");
      } catch (error) {
        const message =
          error instanceof AxiosError
            ? (error.response?.data?.message as string | undefined)
            : "Nao foi possivel salvar.";
        notifyError("Financeiro", message ?? "Nao foi possivel salvar.");
      } finally {
        setSaving(false);
      }

      return;
    }

    if (!form.name.trim()) {
      notifyError("Financeiro", "Informe o nome.");
      return;
    }

    if (activeTab === "categories" && !form.costCenterId) {
      notifyError("Financeiro", "Selecione o centro de custo da categoria.");
      return;
    }

    setSaving(true);

    try {
      const payload = {
        name: form.name.trim(),
        description: form.description,
        costCenterId: activeTab === "categories" ? form.costCenterId || undefined : undefined,
        isActive: form.isActive
      };

      if (editingId) {
        await api.patch(`/financial/settings/${activeTab}/${editingId}`, payload);
        notifySuccess(`${KIND_LABEL[activeTab]} atualizado`);
      } else {
        await api.post(`/financial/settings/${activeTab}`, payload);
        notifySuccess(`${KIND_LABEL[activeTab]} criado`);
      }

      setModalOpen(false);

      try {
        await loadSettings(activeTab);
      } catch {
        notifyError("Financeiro", "O item foi salvo, mas nao foi possivel recarregar a listagem.");
      }
    } catch (error) {
      const message =
        error instanceof AxiosError
          ? (error.response?.data?.message as string | undefined)
          : "Nao foi possivel salvar.";
      notifyError("Financeiro", message ?? "Nao foi possivel salvar.");
    } finally {
      setSaving(false);
    }
  }

  async function deactivateSetting(id: string) {
    try {
      await api.delete(`/financial/settings/${activeTab}/${id}`);
      notifySuccess(`${KIND_LABEL[activeTab]} desativado`);
      await loadSettings(activeTab);
    } catch (error) {
      const message =
        error instanceof AxiosError
          ? (error.response?.data?.message as string | undefined)
          : "Nao foi possivel desativar.";
      notifyError("Financeiro", message ?? "Nao foi possivel desativar.");
    }
  }

  async function reactivateSetting(id: string) {
    try {
      await api.patch(`/financial/settings/${activeTab}/${id}`, { isActive: true });
      notifySuccess(`${KIND_LABEL[activeTab]} reativado`);
      await loadSettings(activeTab);
    } catch (error) {
      const message =
        error instanceof AxiosError
          ? (error.response?.data?.message as string | undefined)
          : "Nao foi possivel reativar.";
      notifyError("Financeiro", message ?? "Nao foi possivel reativar.");
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1>Configuracoes Financeiras</h1>
        {activeTab !== "cash-password" && (
          <AppButton type="primary" onClick={openCreate}>
            Novo {KIND_LABEL[activeTab]}
          </AppButton>
        )}
      </div>

      <AppTabs
        activeKey={activeTab}
        onChange={(key) => setActiveTab(key as SettingKind)}
        items={[
          { key: "cost-centers", label: "Centro de Custo" },
          { key: "categories", label: "Categorias" },
          { key: "payment-methods", label: "Formas de Pagamento" },
          ...(canManageCashPassword ? [{ key: "cash-password", label: "Caixa e senha" }] : [])
        ]}
      />

      {activeTab === "cash-password" ? (
        <div className="card card-stack">
          <div className="cash-box-meta-grid">
            <div>
              <strong>Senha configurada</strong>
              <div>{cashPasswordSettings?.configured ? "Sim" : "Nao"}</div>
            </div>
            <div>
              <strong>Ultima atualizacao</strong>
              <div>{cashPasswordSettings?.updatedAt ? new Date(cashPasswordSettings.updatedAt).toLocaleString("pt-BR") : "-"}</div>
            </div>
            <div>
              <strong>Atualizada por</strong>
              <div>{cashPasswordSettings?.updatedBy?.name ?? "-"}</div>
            </div>
          </div>

          <div className="form-grid form-grid-2">
            <div className="field-block">
              <label className="field-label">Nova senha do caixa</label>
              <AppInput
                type="password"
                value={cashPasswordForm.password}
                onChange={(event) => setCashPasswordForm((prev) => ({ ...prev, password: event.target.value }))}
              />
            </div>
            <div className="field-block">
              <label className="field-label">Confirmar senha</label>
              <AppInput
                type="password"
                value={cashPasswordForm.confirmPassword}
                onChange={(event) => setCashPasswordForm((prev) => ({ ...prev, confirmPassword: event.target.value }))}
              />
            </div>
          </div>

          <div className="status-actions">
            <AppButton type="primary" loading={saving} onClick={() => void saveSetting()}>
              Salvar senha
            </AppButton>
          </div>
        </div>
      ) : (
        <>
          <div className="asstramed-dashboard-filters">
            <DashboardFilterSelect
              value={statusFilter}
              options={[
                { label: "Ativos", value: "active" },
                { label: "Inativos", value: "inactive" },
                { label: "Todos", value: "all" }
              ]}
              onChange={(value) => setStatusFilter((value as "active" | "inactive" | "all") || "active")}
            />
          </div>

          <AppTable<BaseSetting>
            rowKey="id"
            loading={loading}
            columns={columns}
            dataSource={activeItems as BaseSetting[]}
            pagination={false}
          />
        </>
      )}

      <AppModal
        open={modalOpen}
        title={editingId ? `Editar ${KIND_LABEL[activeTab]}` : `Novo ${KIND_LABEL[activeTab]}`}
        onCancel={() => setModalOpen(false)}
        footer={[
          <AppButton key="cancel" onClick={() => setModalOpen(false)}>
            Cancelar
          </AppButton>,
          <AppButton key="save" type="primary" loading={saving} onClick={() => void saveSetting()}>
            Salvar
          </AppButton>
        ]}
      >
        <div className="form-grid">
          <div className="field-block">
            <label className="field-label">Nome</label>
            <AppInput
              value={form.name}
              onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
            />
          </div>
          <div className="field-block">
            <label className="field-label">Descricao</label>
            <AppInput
              value={form.description}
              onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
            />
          </div>
          {activeTab === "categories" && (
            <div className="field-block">
              <label className="field-label">Centro de custo</label>
              <DashboardFilterSelect
                value={form.costCenterId || undefined}
                options={costCenters.map((item) => ({
                  value: item.id,
                  label: item.isActive ? item.name : `${item.name} (inativo)`
                }))}
                onChange={(value) => setForm((prev) => ({ ...prev, costCenterId: String(value || "") }))}
              />
            </div>
          )}
          <label className="permission-item" style={{ gridColumn: "1 / -1" }}>
            <AppCheckbox
              checked={form.isActive}
              onChange={(event) => setForm((prev) => ({ ...prev, isActive: event.target.checked }))}
            />
            <span>Ativo</span>
          </label>
        </div>
      </AppModal>
    </div>
  );
}
