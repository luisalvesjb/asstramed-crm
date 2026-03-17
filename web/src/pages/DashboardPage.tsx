import { useEffect, useMemo, useState } from "react";
import { Input, TableProps } from "antd";
import dayjs from "dayjs";
import { PERMISSIONS } from "../constants/permissions";
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
  setDashboardPageSize,
  updateDashboardActivityStatus
} from "../store/slices/dashboardSlice";
import { Activity, ActivityStatus, CompanyMessage, CompanyMessageThread, MessagePriority } from "../types/api";
import {
  AppBadge,
  AppButton,
  AppDateTimePicker,
  AppInput,
  AppModal,
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

function messagePriorityLabel(priority: MessagePriority): string {
  if (priority === "ALTA") return "Alta";
  if (priority === "MEDIA") return "Media";
  return "Baixa";
}

function messagePriorityColor(priority: MessagePriority): "red" | "orange" | "blue" {
  if (priority === "ALTA") return "red";
  if (priority === "MEDIA") return "orange";
  return "blue";
}

function companyCodeLabel(code?: number): string {
  if (!code) return "0000";
  return String(code).padStart(4, "0");
}

export function DashboardPage() {
  const dispatch = useAppDispatch();
  const { hasPermission, selectedCompanyId, user, setCompanySelection } = useAuth();

  const {
    filters,
    loading,
    error,
    kpis,
    messages,
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
  const [messageModalOpen, setMessageModalOpen] = useState(false);
  const [allMessagesLoading, setAllMessagesLoading] = useState(false);
  const [allMessages, setAllMessages] = useState<CompanyMessage[]>([]);
  const [threadModalOpen, setThreadModalOpen] = useState(false);
  const [threadLoading, setThreadLoading] = useState(false);
  const [thread, setThread] = useState<CompanyMessageThread | null>(null);
  const [createMessageModalOpen, setCreateMessageModalOpen] = useState(false);
  const [messageContent, setMessageContent] = useState("");
  const [messagePriority, setMessagePriority] = useState<MessagePriority>("MEDIA");
  const [messageDirectedToId, setMessageDirectedToId] = useState("");
  const [messageSaving, setMessageSaving] = useState(false);
  const [replyContent, setReplyContent] = useState("");
  const [replySaving, setReplySaving] = useState(false);
  const [resolvingMessage, setResolvingMessage] = useState(false);

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
  }

  async function loadAllMessages() {
    setAllMessagesLoading(true);

    try {
      const response = await api.get<CompanyMessage[]>("/messages", {
        params: {
          companyId: filters.companyId || undefined,
          includeResolved: true
        }
      });
      setAllMessages(response.data);
    } catch {
      notifyError("Mensagens", "Nao foi possivel carregar mensagens.");
      setAllMessages([]);
    } finally {
      setAllMessagesLoading(false);
    }
  }

  async function openMessageThread(messageId: string) {
    setThreadModalOpen(true);
    setThreadLoading(true);

    try {
      const response = await api.get<CompanyMessageThread>(`/messages/${messageId}/thread`);
      setThread(response.data);
    } catch {
      notifyError("Mensagens", "Nao foi possivel abrir a conversa.");
      setThread(null);
      setThreadModalOpen(false);
    } finally {
      setThreadLoading(false);
    }
  }

  async function submitMessage() {
    const companyId = selectedCompanyId || filters.companyId;

    if (!companyId) {
      notifyError("Mensagens", "Selecione uma empresa para cadastrar a mensagem.");
      return;
    }

    if (!messageContent.trim()) {
      notifyError("Mensagens", "Informe a mensagem.");
      return;
    }

    setMessageSaving(true);

    try {
      await api.post("/messages", {
        companyId,
        content: messageContent.trim(),
        priority: messagePriority,
        directedToId: messageDirectedToId || undefined
      });

      notifySuccess("Mensagem cadastrada");
      setMessageContent("");
      setMessagePriority("MEDIA");
      setMessageDirectedToId("");
      setCreateMessageModalOpen(false);

      await dispatch(fetchDashboardData()).unwrap();

      if (messageModalOpen) {
        await loadAllMessages();
      }
    } catch {
      notifyError("Mensagens", "Nao foi possivel cadastrar mensagem.");
    } finally {
      setMessageSaving(false);
    }
  }

  async function submitReply() {
    if (!thread?.root.id || !replyContent.trim()) {
      return;
    }

    setReplySaving(true);

    try {
      await api.post(`/messages/${thread.root.id}/replies`, {
        content: replyContent.trim()
      });

      setReplyContent("");
      await openMessageThread(thread.root.id);
      await dispatch(fetchDashboardData()).unwrap();
      if (messageModalOpen) {
        await loadAllMessages();
      }
    } catch {
      notifyError("Mensagens", "Nao foi possivel enviar resposta.");
    } finally {
      setReplySaving(false);
    }
  }

  async function resolveCurrentMessage() {
    if (!thread?.root.id) {
      return;
    }

    setResolvingMessage(true);

    try {
      await api.patch(`/messages/${thread.root.id}/resolve`);
      notifySuccess("Mensagem resolvida");
      await openMessageThread(thread.root.id);
      await dispatch(fetchDashboardData()).unwrap();
      if (messageModalOpen) {
        await loadAllMessages();
      }
    } catch {
      notifyError("Mensagens", "Nao foi possivel resolver a mensagem.");
    } finally {
      setResolvingMessage(false);
    }
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
              <strong>
                {selectedCompany.name} <span className="company-code-chip">#{companyCodeLabel(selectedCompany.code)}</span>
              </strong>
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

      {hasPermission(PERMISSIONS.MESSAGES_READ) && (
        <section className="dashboard-messages-card card">
          <div className="messages-header">
            <div>
              <h3>Mensagens</h3>
              <p className="subtitle">
                {filters.companyId ? "Mensagens da empresa selecionada" : "Visao geral de mensagens por empresa"}
              </p>
            </div>
            <div className="filters-actions">
              {hasPermission(PERMISSIONS.MESSAGES_WRITE) && (
                <AppButton type="primary" onClick={() => setCreateMessageModalOpen(true)}>
                  Nova mensagem
                </AppButton>
              )}
              <AppButton
                onClick={async () => {
                  setMessageModalOpen(true);
                  await loadAllMessages();
                }}
              >
                Ver todas
              </AppButton>
            </div>
          </div>

          <div className="messages-priority-kpis">
            <KpiStatCard
              title="Alta (abertas)"
              value={String(messages.openByPriority.alta)}
              tone="negative"
              icon="warning"
            />
            <KpiStatCard
              title="Media (abertas)"
              value={String(messages.openByPriority.media)}
              tone="neutral"
              icon="clock"
            />
            <KpiStatCard
              title="Baixa (abertas)"
              value={String(messages.openByPriority.baixa)}
              tone="positive"
              icon="check"
            />
          </div>

          <div className="messages-highlight-list">
            {messages.highlighted.length === 0 ? (
              <span>Nenhuma mensagem para destacar.</span>
            ) : (
              messages.highlighted.map((message) => (
                <div key={message.id} className="message-highlight-item">
                  <div className="message-highlight-main">
                    <div className="filters-actions">
                      <AppTag color={messagePriorityColor(message.priority)}>
                        {messagePriorityLabel(message.priority)}
                      </AppTag>
                      {!message.resolvedAt && <AppTag color="processing">Em aberto</AppTag>}
                    </div>
                    <strong>{message.company.name}</strong>
                    <p>{message.content}</p>
                    <small>
                      Cadastrado por {message.createdBy.name}
                      {message.directedTo ? ` • Direcionado para ${message.directedTo.name}` : ""}
                      {" • "}
                      {formatDate(message.createdAt)}
                    </small>
                  </div>
                  <AppButton onClick={() => void openMessageThread(message.id)}>Ver</AppButton>
                </div>
              ))
            )}
          </div>
        </section>
      )}

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
          onChange={(value) => {
            const nextCompanyId = (value as string) || "";
            setCompanySelection(nextCompanyId || null);
            dispatch(setDashboardFilters({ companyId: nextCompanyId }));
          }}
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

      <AppModal
        open={messageModalOpen}
        title="Todas as mensagens"
        onCancel={() => setMessageModalOpen(false)}
        footer={[
          <AppButton key="close" onClick={() => setMessageModalOpen(false)}>
            Fechar
          </AppButton>
        ]}
      >
        <AppTable<CompanyMessage>
          rowKey="id"
          loading={allMessagesLoading}
          pagination={false}
          dataSource={allMessages}
          columns={[
            {
              title: "Empresa",
              key: "company",
              render: (_, record) => `${companyCodeLabel(record.company.code)} - ${record.company.name}`
            },
            {
              title: "Prioridade",
              key: "priority",
              render: (_, record) => (
                <AppTag color={messagePriorityColor(record.priority)}>
                  {messagePriorityLabel(record.priority)}
                </AppTag>
              )
            },
            {
              title: "Mensagem",
              key: "content",
              render: (_, record) => record.content
            },
            {
              title: "Cadastrado por",
              key: "createdBy",
              render: (_, record) => record.createdBy.name
            },
            {
              title: "Status",
              key: "status",
              render: (_, record) => (record.resolvedAt ? "Resolvida" : "Em aberto")
            },
            {
              title: "Acoes",
              key: "actions",
              render: (_, record) => (
                <AppButton size="small" onClick={() => void openMessageThread(record.id)}>
                  Ver
                </AppButton>
              )
            }
          ]}
        />
      </AppModal>

      <AppModal
        open={threadModalOpen}
        title="Conversa da mensagem"
        onCancel={() => {
          setThreadModalOpen(false);
          setThread(null);
          setReplyContent("");
        }}
        footer={[
          hasPermission(PERMISSIONS.MESSAGES_RESOLVE) &&
          thread &&
          !thread.root.resolvedAt ? (
            <AppButton
              key="resolve"
              loading={resolvingMessage}
              onClick={() => void resolveCurrentMessage()}
            >
              Resolver
            </AppButton>
          ) : null,
          <AppButton
            key="close"
            onClick={() => {
              setThreadModalOpen(false);
              setThread(null);
              setReplyContent("");
            }}
          >
            Fechar
          </AppButton>,
          <AppButton
            key="reply"
            type="primary"
            loading={replySaving}
            disabled={!thread || Boolean(thread.root.resolvedAt)}
            onClick={() => void submitReply()}
          >
            Enviar resposta
          </AppButton>
        ]}
      >
        {threadLoading || !thread ? (
          <p>Carregando conversa...</p>
        ) : (
          <div className="messages-thread-container">
            <div className="message-thread-item message-thread-item-root">
              <div className="filters-actions">
                <AppTag color={messagePriorityColor(thread.root.priority)}>
                  {messagePriorityLabel(thread.root.priority)}
                </AppTag>
                {thread.root.resolvedAt ? <AppTag color="green">Resolvida</AppTag> : <AppTag color="processing">Em aberto</AppTag>}
              </div>
              <p>{thread.root.content}</p>
              <small>
                {thread.root.createdBy.name}
                {thread.root.directedTo ? ` • para ${thread.root.directedTo.name}` : ""}
                {" • "}
                {formatDate(thread.root.createdAt)}
              </small>
            </div>

            {thread.replies.map((reply) => (
              <div key={reply.id} className="message-thread-item">
                <p>{reply.content}</p>
                <small>
                  {reply.createdBy.name} • {formatDate(reply.createdAt)}
                </small>
              </div>
            ))}

            <Input.TextArea
              rows={4}
              value={replyContent}
              placeholder={
                thread.root.resolvedAt
                  ? "Mensagem resolvida. Nao e possivel responder."
                  : "Escreva uma resposta..."
              }
              disabled={Boolean(thread.root.resolvedAt)}
              onChange={(event) => setReplyContent(event.target.value)}
            />
          </div>
        )}
      </AppModal>

      <AppModal
        open={createMessageModalOpen}
        title="Nova mensagem"
        onCancel={() => {
          setCreateMessageModalOpen(false);
          setMessageContent("");
          setMessagePriority("MEDIA");
          setMessageDirectedToId("");
        }}
        footer={[
          <AppButton
            key="cancel"
            onClick={() => {
              setCreateMessageModalOpen(false);
              setMessageContent("");
              setMessagePriority("MEDIA");
              setMessageDirectedToId("");
            }}
          >
            Cancelar
          </AppButton>,
          <AppButton key="save" type="primary" loading={messageSaving} onClick={() => void submitMessage()}>
            Salvar mensagem
          </AppButton>
        ]}
      >
        <div className="form-grid">
          <DashboardFilterSelect
            value={messagePriority}
            options={[
              { label: "Alta", value: "ALTA" },
              { label: "Media", value: "MEDIA" },
              { label: "Baixa", value: "BAIXA" }
            ]}
            onChange={(value) => setMessagePriority(value as MessagePriority)}
          />
          <DashboardFilterSelect
            value={messageDirectedToId || undefined}
            placeholder="Direcionar para responsavel"
            allowClear
            options={userOptions.map((entry) => ({ value: entry.id, label: entry.name }))}
            onChange={(value) => setMessageDirectedToId((value as string) || "")}
          />
          <Input.TextArea
            rows={5}
            style={{ gridColumn: "1 / -1" }}
            value={messageContent}
            placeholder="Descreva a mensagem..."
            onChange={(event) => setMessageContent(event.target.value)}
          />
        </div>
      </AppModal>

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
