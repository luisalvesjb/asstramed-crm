import { useEffect, useMemo } from "react";
import { TableProps } from "antd";
import dayjs from "dayjs";
import { PERMISSIONS } from "../constants/permissions";
import { useAuth } from "../context/AuthContext";
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
  setDashboardPageSize,
  updateDashboardActivityStatus
} from "../store/slices/dashboardSlice";
import { Activity, ActivityStatus } from "../types/api";
import {
  AppBadge,
  AppButton,
  AppDateTimePicker,
  AppInput,
  KpiStatCard,
  AppPagination,
  AppTable,
  AppTag,
  DashboardFilterSelect
} from "../ui/components";
import { notifyError, notifySuccess, showConfirmDialog } from "../ui/feedback/notifications";
import { formatDate, statusLabel } from "../utils/format";
import { NewTaskModal } from "../features/dashboard/components/NewTaskModal";
import { resolveCompanyLogoUrl } from "../store/slices/companyDetailsSlice";

export function DashboardPage() {
  const dispatch = useAppDispatch();
  const { hasPermission, selectedCompanyId, user, setCompanySelection } = useAuth();

  const {
    filters,
    loading,
    error,
    kpis,
    activities,
    companies,
    users,
    modalOpen,
    createLoading,
    actionLoadingById,
    page,
    pageSize
  } = useAppSelector((state) => state.dashboard);
  const topbarCompanies = useAppSelector((state) => state.auth.topbarCompanies);

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
    if (selectedCompanyId !== null && selectedCompanyId !== filters.companyId) {
      dispatch(setDashboardFilters({ companyId: selectedCompanyId ?? "" }));
      void dispatch(fetchDashboardData());
    }
  }, [dispatch, filters.companyId, selectedCompanyId]);

  useEffect(() => {
    if (error) {
      notifyError("Erro no dashboard", error);
      dispatch(clearDashboardError());
    }
  }, [dispatch, error]);

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
      title: "Responsavel",
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
      render: (_, record) => {
        const loadingAction = Boolean(actionLoadingById[record.id]);

        if (!hasPermission(PERMISSIONS.ACTIVITIES_FINISH)) {
          return "-";
        }

        if (record.status === "CONCLUIDA") {
          return <AppTag color="green">Concluida</AppTag>;
        }

        return (
          <AppButton
            loading={loadingAction}
            onClick={() => {
              showConfirmDialog({
                title: "Concluir atividade",
                content: "Deseja marcar esta atividade como concluida?",
                onConfirm: async () => {
                  await dispatch(
                    updateDashboardActivityStatus({ id: record.id, status: "CONCLUIDA" })
                  ).unwrap();
                  notifySuccess("Atividade concluida");
                }
              });
            }}
          >
            Concluir
          </AppButton>
        );
      }
    }
  ];

  async function handleCreateTask(payload: {
    companyId: string;
    responsibleId: string;
    dueDate?: string;
    activityHtml: string;
    tags: string[];
    status: ActivityStatus;
  }) {
    await dispatch(createDashboardTask(payload)).unwrap();
    notifySuccess("Nova tarefa criada com sucesso");
  }

  function handleLeaveCompany() {
    setCompanySelection(null);
    dispatch(setDashboardFilters({ companyId: "" }));
    void dispatch(fetchDashboardData());
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1>Atividades</h1>
        <div className="filters-actions">
          {hasPermission(PERMISSIONS.ACTIVITIES_CREATE) && (
            <AppButton type="primary" onClick={() => dispatch(openTaskModal())}>
              Nova tarefa
            </AppButton>
          )}
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
              <strong>{selectedCompany.name}</strong>
              <small>{selectedCompany.personalResponsible || "Sem responsavel cadastrado"}</small>
            </div>
          </div>
          <div className="selected-company-meta">
            <span>Documento: {selectedCompany.personalDocument || "-"}</span>
            <span>E-mail: {selectedCompany.personalEmail || "-"}</span>
            <span>Telefone: {selectedCompany.personalPhone || "-"}</span>
          </div>
        </section>
      )}

      <div className="asstramed-kpi-grid">
        <KpiStatCard
          title="Resolvidos"
          value={String(kpis.resolved)}
          tone="positive"
          icon="check"
        />
        <KpiStatCard
          title="Nao Resolvidos"
          value={String(kpis.unresolved)}
          tone="negative"
          icon="warning"
        />
        <KpiStatCard
          title="Total Abertos"
          value={String(kpis.totalOpen)}
          tone="neutral"
          icon="list"
        />
      </div>

      <div className="asstramed-dashboard-filters">
        <AppDateTimePicker
          showTime={false}
          format="DD/MM/YYYY"
          value={filters.date ? dayjs(filters.date) : null}
          onChange={(value) => {
            const parsed = Array.isArray(value) ? (value[0] ?? null) : value;
            dispatch(setDashboardFilters({ date: parsed ? parsed.format("YYYY-MM-DD") : "" }));
          }}
        />

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

        <DashboardFilterSelect
          value={filters.companyId || undefined}
          placeholder="Empresa: Todas"
          allowClear
          options={companyOptions}
          onChange={(value) => dispatch(setDashboardFilters({ companyId: (value as string) || "" }))}
        />

        <DashboardFilterSelect
          value={filters.responsibleId || undefined}
          placeholder="Responsavel: Todos"
          allowClear
          options={userOptions.map((entry) => ({ value: entry.id, label: entry.name }))}
          onChange={(value) =>
            dispatch(setDashboardFilters({ responsibleId: (value as string) || "" }))
          }
        />

        <AppInput
          placeholder="Tag"
          value={filters.tagKey}
          onChange={(event) => dispatch(setDashboardFilters({ tagKey: event.target.value }))}
        />

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
