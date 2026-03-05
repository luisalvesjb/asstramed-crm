import { useEffect, useMemo, useState } from "react";
import { TableProps } from "antd";
import { AxiosError } from "axios";
import { api } from "../services/api";
import { CostCenter, FinancialCategory, PaymentMethod } from "../types/api";
import { AppButton, AppCheckbox, AppInput, AppModal, AppTable, AppTabs } from "../ui/components";
import { notifyError, notifySuccess } from "../ui/feedback/notifications";

type SettingKind = "categories" | "cost-centers" | "payment-methods";

interface BaseSetting {
  id: string;
  name: string;
  description?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface SettingForm {
  name: string;
  description: string;
  isActive: boolean;
}

const KIND_LABEL: Record<SettingKind, string> = {
  categories: "Categoria",
  "cost-centers": "Centro de Custo",
  "payment-methods": "Forma de Pagamento"
};

const INITIAL_FORM: SettingForm = {
  name: "",
  description: "",
  isActive: true
};

export function FinancialSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<SettingKind>("categories");

  const [categories, setCategories] = useState<FinancialCategory[]>([]);
  const [costCenters, setCostCenters] = useState<CostCenter[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<SettingForm>(INITIAL_FORM);

  const activeItems = useMemo(() => {
    if (activeTab === "categories") return categories;
    if (activeTab === "cost-centers") return costCenters;
    return paymentMethods;
  }, [activeTab, categories, costCenters, paymentMethods]);

  const columns: TableProps<BaseSetting>["columns"] = [
    {
      title: "Nome",
      dataIndex: "name",
      key: "name"
    },
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
        <AppButton
          size="small"
          onClick={() => {
            setEditingId(record.id);
            setForm({
              name: record.name,
              description: record.description ?? "",
              isActive: record.isActive
            });
            setModalOpen(true);
          }}
        >
          Editar
        </AppButton>
      )
    }
  ];

  async function loadSettings() {
    setLoading(true);

    try {
      const [categoryResponse, costCenterResponse, paymentMethodResponse] = await Promise.all([
        api.get<FinancialCategory[]>("/financial/settings/categories"),
        api.get<CostCenter[]>("/financial/settings/cost-centers"),
        api.get<PaymentMethod[]>("/financial/settings/payment-methods")
      ]);

      setCategories(categoryResponse.data);
      setCostCenters(costCenterResponse.data);
      setPaymentMethods(paymentMethodResponse.data);
    } catch {
      notifyError("Financeiro", "Nao foi possivel carregar configuracoes financeiras.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadSettings();
  }, []);

  function openCreate() {
    setEditingId(null);
    setForm({ ...INITIAL_FORM });
    setModalOpen(true);
  }

  async function saveSetting() {
    if (!form.name.trim()) {
      notifyError("Financeiro", "Informe o nome.");
      return;
    }

    setSaving(true);

    try {
      const payload = {
        name: form.name.trim(),
        description: form.description,
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
      await loadSettings();
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

  return (
    <div className="page">
      <div className="page-header">
        <h1>Configuracoes Financeiras</h1>
        <AppButton type="primary" onClick={openCreate}>
          Novo {KIND_LABEL[activeTab]}
        </AppButton>
      </div>

      <AppTabs
        activeKey={activeTab}
        onChange={(key) => setActiveTab(key as SettingKind)}
        items={[
          { key: "categories", label: "Categorias" },
          { key: "cost-centers", label: "Centro de Custo" },
          { key: "payment-methods", label: "Formas de Pagamento" }
        ]}
      />

      <AppTable<BaseSetting>
        rowKey="id"
        loading={loading}
        columns={columns}
        dataSource={activeItems as BaseSetting[]}
        pagination={false}
      />

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
          <AppInput
            placeholder="Nome"
            value={form.name}
            onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
          />
          <AppInput
            placeholder="Descricao"
            value={form.description}
            onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
          />
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
