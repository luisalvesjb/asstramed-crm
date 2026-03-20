import { useEffect, useMemo, useState } from "react";
import { AxiosError } from "axios";
import { useNavigate, useParams } from "react-router-dom";
import { Input } from "antd";
import { useAuth } from "../context/AuthContext";
import { api } from "../services/api";
import { Activity, ActivityStatus, MessagePriority } from "../types/api";
import { AppButton, AppTag, DashboardFilterSelect } from "../ui/components";
import { notifyError, notifySuccess } from "../ui/feedback/notifications";
import { formatDate, formatDateTime, statusLabel } from "../utils/format";

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

export function ActivityDetailsPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [savingStatus, setSavingStatus] = useState(false);
  const [savingMessage, setSavingMessage] = useState(false);
  const [activity, setActivity] = useState<Activity | null>(null);
  const [status, setStatus] = useState<ActivityStatus>("PENDENTE");
  const [messageText, setMessageText] = useState("");

  const canChangeStatus = useMemo(() => {
    if (!user || !activity) return false;
    return activity.createdById === user.id || activity.assignedToId === user.id;
  }, [activity, user]);

  async function loadActivity() {
    if (!id) {
      notifyError("Atividades", "Atividade invalida.");
      return;
    }

    setLoading(true);
    try {
      const response = await api.get<Activity>(`/activities/${id}`);
      setActivity(response.data);
      setStatus(response.data.status);
    } catch {
      notifyError("Atividades", "Nao foi possivel carregar a atividade.");
      setActivity(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadActivity();
  }, [id]);

  async function saveStatus() {
    if (!id || !activity) return;

    setSavingStatus(true);
    try {
      await api.patch(`/activities/${id}/status`, { status });
      notifySuccess("Status da atividade atualizado");
      await loadActivity();
    } catch (error) {
      const message =
        error instanceof AxiosError
          ? (error.response?.data?.message as string | undefined)
          : "Nao foi possivel alterar status.";
      notifyError("Atividades", message ?? "Nao foi possivel alterar status.");
    } finally {
      setSavingStatus(false);
    }
  }

  async function sendMessage() {
    if (!id || !messageText.trim()) {
      notifyError("Atividades", "Informe a mensagem da atividade.");
      return;
    }

    setSavingMessage(true);
    try {
      await api.post(`/activities/${id}/messages`, {
        content: messageText.trim()
      });
      setMessageText("");
      notifySuccess("Mensagem registrada na atividade");
      await loadActivity();
    } catch {
      notifyError("Atividades", "Nao foi possivel registrar mensagem.");
    } finally {
      setSavingMessage(false);
    }
  }

  if (loading) {
    return <div className="card">Carregando atividade...</div>;
  }

  if (!activity) {
    return (
      <div className="card card-stack">
        <h3>Atividade nao encontrada</h3>
        <AppButton onClick={() => navigate("/atividades")}>Voltar</AppButton>
      </div>
    );
  }

  return (
    <div className="page card-stack">
      <div className="page-header">
        <h1>Detalhes da atividade</h1>
        <div className="filters-actions">
          <AppButton onClick={() => navigate(-1)}>Voltar</AppButton>
        </div>
      </div>

      <section className="card card-stack">
        <div className="filters-actions">
          <AppTag color={priorityColor(activity.priority)}>{priorityLabel(activity.priority)}</AppTag>
          <AppTag color={activity.status === "CONCLUIDA" ? "green" : "processing"}>{statusLabel(activity.status)}</AppTag>
        </div>

        <div className="company-info-grid">
          <div>
            <strong>Atividade:</strong> {activity.title}
          </div>
          <div>
            <strong>Empresa:</strong> {activity.company.name}
          </div>
          <div>
            <strong>Direcionado a:</strong> {activity.assignedTo.name}
          </div>
          <div>
            <strong>Iniciado por:</strong> {activity.createdBy.name}
          </div>
          <div>
            <strong>Criado em:</strong> {formatDateTime(activity.createdAt)}
          </div>
          <div>
            <strong>Prazo:</strong> {formatDate(activity.dueDate)}
          </div>
        </div>

        {activity.description && (
          <div className="message-thread-item message-thread-item-root">
            <strong>Descricao</strong>
            <div dangerouslySetInnerHTML={{ __html: activity.description }} />
          </div>
        )}
      </section>

      <section className="card card-stack">
        <div className="form-grid">
          <div className="field-block">
            <label className="field-label">Status da atividade</label>
            <DashboardFilterSelect
              value={status}
              options={[
                { label: "Pendente", value: "PENDENTE" },
                { label: "Em execucao", value: "EM_EXECUCAO" },
                { label: "Concluida", value: "CONCLUIDA" },
                { label: "Cancelada", value: "CANCELADA" }
              ]}
              disabled={!canChangeStatus}
              onChange={(value) => setStatus(value as ActivityStatus)}
            />
          </div>

          <div className="filters-actions" style={{ alignItems: "flex-end" }}>
            <AppButton loading={savingStatus} disabled={!canChangeStatus} onClick={() => void saveStatus()}>
              Salvar status
            </AppButton>
          </div>
        </div>

        {!canChangeStatus && (
          <small className="subtitle">Somente o criador ou o direcionado podem alterar o status.</small>
        )}

        <h3>Comentarios da atividade</h3>

        <div className="messages-thread-container">
          {(activity.messages ?? []).length === 0 ? (
            <span>Nenhum comentario nesta atividade.</span>
          ) : (
            (activity.messages ?? []).map((message) => (
              <div key={message.id} className="message-thread-item">
                <p>{message.content}</p>
                <small>
                  {message.createdBy.name} • {formatDateTime(message.createdAt)}
                </small>
              </div>
            ))
          )}
        </div>

        <div className="field-block">
          <label className="field-label">Nova mensagem</label>
          <Input.TextArea rows={4} value={messageText} onChange={(event) => setMessageText(event.target.value)} />
        </div>

        <div className="filters-actions">
          <AppButton type="primary" loading={savingMessage} onClick={() => void sendMessage()}>
            Enviar mensagem
          </AppButton>
        </div>
      </section>
    </div>
  );
}
