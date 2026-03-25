import { useEffect, useMemo, useState } from "react";
import { TableProps } from "antd";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { api } from "../services/api";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import {
  clearDashboardError,
  closeTaskModal,
  createDashboardTask,
  fetchDashboardData,
  fetchDashboardSupportData,
  openTaskModal,
  resetDashboardFilters,
  setDashboardFilters,
  setDashboardPage,
  setDashboardPageSize
} from "../store/slices/dashboardSlice";
import { Activity, ActivityInteraction, ActivityStatus, MessagePriority } from "../types/api";
import {
  AppBadge,
  AppButton,
  AppInput,
  AppPagination,
  AppTable,
  AppTag,
  DashboardFilterSelect,
  KpiStatCard
} from "../ui/components";
import { notifyError, notifySuccess } from "../ui/feedback/notifications";
import { formatDate, formatDateTime, statusLabel } from "../utils/format";
import { NewTaskModal } from "../features/dashboard/components/NewTaskModal";
import { resolveCompanyLogoUrl } from "../store/slices/companyDetailsSlice";

function priorityLabel(priority: MessagePriority): string {
  if (priority === "ALTA") return "Alta";
  if (priority === "MEDIA") return "Media";
  return "Baixa";
}

function priorityColor(priority: MessagePriority): "red" | "orange" | "blue" {
  if (priority === "ALTA") return "red";
  if (priority === "MEDIA") return "orange";
  return "blue";
}

function companyCodeLabel(code?: number): string {
  if (!code) return "0000";
  return String(code).padStart(4, "0");
}

function stripHtml(input?: string | null): string {
  if (!input) return "";
  return input.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

export function DashboardPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { selectedCompanyId, setCompanySelection, user } = useAuth();

  const {
    filters,
    loading,
    error,
    kpis,
    activityInsights,
    activities,
    companies,
    users,
    modalOpen,
    createLoading,
    page,
    pageSize
  } = useAppSelector((state) => state.dashboard);
  const topbarCompanies = useAppSelector((state) => state.auth.topbarCompanies);

  const [interactionsExpanded, setInteractionsExpanded] = useState(false);
  const [interactionsLoading, setInteractionsLoading] = useState(false);
  const [allInteractions, setAllInteractions] = useState<ActivityInteraction[]>([]);

  const userOptions = useMemo(() => {
    if (users.length) return users;
    if (user) return [{ ...user }];
    return [];
  }, [users, user]);

  useEffect(() => {
    void dispatch(fetchDashboardSupportData());
    void dispatch(fetchDashboardData());
  }, [dispatch]);

  useEffect(() => {
    const nextCompanyId = selectedCompanyId ?? "";

    if (nextCompanyId !== filters.companyId) {
      dispatch(setDashboardFilters({ companyId: nextCompanyId }));
      void dispatch(fetchDashboardData());
    }
  }, [dispatch, filters.companyId, selectedCompanyId]);

  useEffect(() => {
    if (error) {
      notifyError("Erro no dashboard", error);
      dispatch(clearDashboardError());
    }
  }, [dispatch, error]);

  useEffect(() => {
    setAllInteractions(activityInsights.recentMessages);
    setInteractionsExpanded(false);
  }, [activityInsights.recentMessages, filters.companyId]);

  const paginatedRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return activities.slice(start, start + pageSize);
  }, [activities, page, pageSize]);

  const selectedCompany = useMemo(() => {
    const currentCompanyId = selectedCompanyId || filters.companyId;

    if (!currentCompanyId) {
      return null;
    }

    const sourceCompanies = companies.length ? companies : topbarCompanies;
    return sourceCompanies.find((company) => company.id === currentCompanyId) ?? null;
  }, [companies, filters.companyId, selectedCompanyId, topbarCompanies]);

  const companyOptions = useMemo(() => {
    const sourceCompanies = companies.length ? companies : topbarCompanies;
    return sourceCompanies.map((company) => ({ value: company.id, label: company.name }));
  }, [companies, topbarCompanies]);

  const selectedCompanyLogoUrl = resolveCompanyLogoUrl(selectedCompany?.logoPath);
  const activeCompanyId = selectedCompanyId || filters.companyId || "";
  const interactionsTitle = activeCompanyId ? "Ultimas mensagens da empresa" : "Ultimas mensagens gerais";
  const interactionsSubtitle = activeCompanyId
    ? "Comentarios mais recentes da empresa selecionada"
    : "Comentarios mais recentes de todas as empresas";

  const interactionRows = useMemo(
    () => (interactionsExpanded ? allInteractions : allInteractions.slice(0, 5)),
    [allInteractions, interactionsExpanded]
  );

  const columns: TableProps<Activity>["columns"] = [
    {
      title: "Ordem",
      dataIndex: "orderExec",
      key: "orderExec",
      width: 84
    },
    {
      title: "Status",
      key: "status",
      render: (_, record) => {
        const color =
          record.status === "CONCLUIDA"
            ? "green"
            : record.status === "EM_EXECUCAO"
              ? "orange"
              : record.status === "CANCELADA"
                ? "default"
                : "red";

        return <AppTag color={color}>{statusLabel(record.status)}</AppTag>;
      }
    },
    {
      title: "Prioridade",
      key: "priority",
      render: (_, record) => <AppTag color={priorityColor(record.priority)}>{priorityLabel(record.priority)}</AppTag>
    },
    {
      title: "Empresa",
      key: "company",
      render: (_, record) => record.company.name
    },
    {
      title: "Atividade",
      key: "title",
      render: (_, record) => (
        <div>
          <div>{record.title}</div>
          <small>Prazo: {formatDate(record.dueDate)}</small>
        </div>
      )
    },
    {
      title: "Direcionado a",
      key: "responsible",
      render: (_, record) => record.assignedTo.name
    },
    {
      title: "Tags",
      key: "tags",
      render: (_, record) => (
        <div>
          {record.tags.length === 0
            ? "-"
            : record.tags.map((item) => (
                <AppTag key={item.tag.id} color="blue">
                  {item.tag.key}
                </AppTag>
              ))}
        </div>
      )
    },
    {
      title: "Cadastrado por",
      key: "createdBy",
      render: (_, record) => record.createdBy.name
    },
    {
      title: "Acoes",
      key: "actions",
      render: (_, record) => (
        <AppButton size="small" onClick={() => navigate(`/atividades/${record.id}`)}>
          Detalhes
        </AppButton>
      )
    }
  ];

  async function handleCreateTask(payload: {
    companyId: string;
    responsibleId: string;
    dueDate?: string;
    activityHtml: string;
    tags: string[];
    status: ActivityStatus;
    priority: MessagePriority;
  }) {
    await dispatch(createDashboardTask(payload)).unwrap();
    notifySuccess("Nova tarefa criada com sucesso");
  }

  function handleLeaveCompany() {
    setCompanySelection(null);
    dispatch(setDashboardFilters({ companyId: "" }));
    void dispatch(fetchDashboardData());
  }

  async function toggleInteractions() {
    if (interactionsExpanded) {
      setInteractionsExpanded(false);
      return;
    }

    setInteractionsLoading(true);
    try {
      const response = await api.get<ActivityInteraction[]>("/activities/interactions", {
        params: {
          companyId: activeCompanyId || undefined,
          take: 100
        }
      });
      setAllInteractions(response.data);
      setInteractionsExpanded(true);
    } catch {
      notifyError("Atividades", "Nao foi possivel carregar todas as interacoes.");
    } finally {
      setInteractionsLoading(false);
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1>Atividades</h1>
        <div className="filters-actions">
          <AppButton type="primary" onClick={() => dispatch(openTaskModal())}>
            Nova tarefa
          </AppButton>
        </div>
      </div>
      <p className="subtitle">Hoje - Pendentes</p>

      {selectedCompany && (
        <section className="selected-company-card">
          <div className="selected-company-actions">
            <AppButton onClick={handleLeaveCompany}>Sair da empresa</AppButton>
          </div>
          <div className="selected-company-main">
            {selectedCompanyLogoUrl ? (
              <img
                src={selectedCompanyLogoUrl}
                alt={selectedCompany.name}
                className="company-logo-avatar company-logo-avatar-lg"
              />
            ) : (
              <div className="company-logo-placeholder company-logo-placeholder-lg">
                {selectedCompany.name.slice(0, 2).toUpperCase()}
              </div>
            )}
            <div>
              <strong>
                {selectedCompany.name}{" "}
                <span className="company-code-chip">#{companyCodeLabel(selectedCompany.code)}</span>
              </strong>
              <small>{selectedCompany.personalResponsible || "Sem responsavel cadastrado"}</small>
            </div>
          </div>
          <div className="selected-company-meta">
            <span>CNPJ/CPF: {selectedCompany.personalDocument || "-"}</span>
            <span>E-mail: {selectedCompany.personalEmail || "-"}</span>
            <span>Telefone: {selectedCompany.personalPhone || "-"}</span>
          </div>
        </section>
      )}

      <div className="asstramed-kpi-grid">
        <KpiStatCard title="Resolvidos" value={String(kpis.resolved)} tone="positive" icon="check" />
        <KpiStatCard title="Nao Resolvidos" value={String(kpis.unresolved)} tone="negative" icon="warning" />
        <KpiStatCard title="Total Abertos" value={String(kpis.totalOpen)} tone="neutral" icon="list" />
      </div>

      <section className="dashboard-messages-card card">
        <div className="messages-header">
          <div>
            <h3>{interactionsTitle}</h3>
            <p className="subtitle">{interactionsSubtitle}</p>
          </div>
          <div className="filters-actions">
            <AppButton loading={interactionsLoading} onClick={() => void toggleInteractions()}>
              {interactionsExpanded ? "Ver apenas 5" : "Ver tudo"}
            </AppButton>
          </div>
        </div>

        <div className="messages-priority-summary">
          {activityInsights.hasOpenHighPriority ? (
            <AppTag color="red">Existe atividade em aberto com prioridade alta</AppTag>
          ) : (
            <span className="subtitle">Sem mensagens prioritarias</span>
          )}
        </div>

        <div className="messages-highlight-list">
          {interactionRows.length === 0 ? (
            <span>Sem mensagens do dia.</span>
          ) : (
            interactionRows.map((interaction) => (
              <div key={interaction.id} className="message-highlight-item">
                <div className="message-highlight-main">
                  <div className="filters-actions">
                    <AppTag color={priorityColor(interaction.priority)}>
                      {priorityLabel(interaction.priority)}
                    </AppTag>
                    <AppTag color={interaction.status === "CONCLUIDA" ? "green" : "processing"}>
                      {statusLabel(interaction.status)}
                    </AppTag>
                  </div>
                  <strong>
                    {interaction.company.name} • {interaction.title}
                  </strong>
                  <p>{stripHtml(interaction.description) || interaction.title}</p>
                  <small>
                    Direcionado a {interaction.assignedTo.name}
                    {` • Por ${interaction.createdBy.name}`}
                    {` • ${formatDateTime(interaction.createdAt)}`}
                  </small>
                </div>
                <AppButton onClick={() => navigate(`/atividades/${interaction.id}`)}>Detalhes</AppButton>
              </div>
            ))
          )}
        </div>
      </section>

      <div className="asstramed-dashboard-filters">
        <div className="field-block">
          <label className="field-label">Status</label>
          <DashboardFilterSelect
            value={filters.status}
            options={[
              { label: "Pendente", value: "PENDENTE" },
              { label: "Em execucao", value: "EM_EXECUCAO" },
              { label: "Concluida", value: "CONCLUIDA" },
              { label: "Cancelada", value: "CANCELADA" }
            ]}
            onChange={(value) => dispatch(setDashboardFilters({ status: value as ActivityStatus }))}
          />
        </div>

        <div className="field-block">
          <label className="field-label">Empresa</label>
          <DashboardFilterSelect
            value={filters.companyId || undefined}
            allowClear
            options={companyOptions}
            onChange={(value) => {
              const nextCompanyId = (value as string) || "";
              setCompanySelection(nextCompanyId || null);
              dispatch(setDashboardFilters({ companyId: nextCompanyId }));
            }}
          />
        </div>

        <div className="field-block">
          <label className="field-label">Direcionado a</label>
          <DashboardFilterSelect
            value={filters.responsibleId || undefined}
            allowClear
            options={userOptions.map((entry) => ({ value: entry.id, label: entry.name }))}
            onChange={(value) => dispatch(setDashboardFilters({ responsibleId: (value as string) || "" }))}
          />
        </div>

        <div className="field-block">
          <label className="field-label">Tag</label>
          <AppInput value={filters.tagKey} onChange={(event) => dispatch(setDashboardFilters({ tagKey: event.target.value }))} />
        </div>

        <div className="filters-actions">
          <AppButton type="primary" loading={loading} onClick={() => void dispatch(fetchDashboardData())}>
            Aplicar
          </AppButton>
          <AppButton
            onClick={() => {
              dispatch(resetDashboardFilters());
              void dispatch(fetchDashboardData());
            }}
          >
            Limpar
          </AppButton>
        </div>
      </div>

      <div className="filters-actions">
        <AppBadge count={activities.length} showZero>
          <span>Resultados</span>
        </AppBadge>
      </div>

      <AppTable<Activity>
        rowKey="id"
        loading={loading}
        columns={columns}
        dataSource={paginatedRows}
        pagination={false}
      />

      <div className="filters-actions" style={{ justifyContent: "flex-end" }}>
        <AppPagination
          current={page}
          pageSize={pageSize}
          total={activities.length}
          showSizeChanger
          onChange={(nextPage, nextSize) => {
            dispatch(setDashboardPage(nextPage));
            if (nextSize !== pageSize) {
              dispatch(setDashboardPageSize(nextSize));
            }
          }}
        />
      </div>

      <NewTaskModal
        open={modalOpen}
        loading={createLoading}
        companies={companies}
        users={userOptions}
        defaultCompanyId={filters.companyId || selectedCompanyId || undefined}
        onCancel={() => dispatch(closeTaskModal())}
        onSubmit={handleCreateTask}
      />
    </div>
  );
}
