import { useEffect, useMemo, useState } from "react";
import { AxiosError } from "axios";
import { useNavigate } from "react-router-dom";
import { CreateActivityForm } from "../components/CreateActivityForm";
import { useAuth } from "../context/AuthContext";
import { api } from "../services/api";
import { Activity, ActivityStatus, ApiUser, Company, MessagePriority } from "../types/api";
import { AppButton } from "../ui/components";
import { formatDate, formatDateTime, statusLabel } from "../utils/format";

function todayAsInputDate() {
  return new Date().toISOString().slice(0, 10);
}

export function ActivitiesPage() {
  const navigate = useNavigate();
  const { selectedCompanyId, user } = useAuth();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [users, setUsers] = useState<ApiUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);

  const [status, setStatus] = useState<ActivityStatus | "">("");
  const [date, setDate] = useState(todayAsInputDate());
  const [companyId, setCompanyId] = useState(selectedCompanyId ?? "");
  const [responsibleId, setResponsibleId] = useState("");
  const [tagKey, setTagKey] = useState("");

  const userOptions = useMemo(() => {
    const base = users.length ? users : user ? [{ ...user }] : [];
    return base;
  }, [users, user]);

  useEffect(() => {
    if (selectedCompanyId) {
      setCompanyId(selectedCompanyId);
    }
  }, [selectedCompanyId]);

  async function loadBaseData() {
    const [companiesResponse, usersResponse] = await Promise.all([
      api.get<Company[]>("/companies").catch(() => ({ data: [] as Company[] })),
      api.get<ApiUser[]>("/users").catch(() => ({ data: [] as ApiUser[] }))
    ]);

    setCompanies(companiesResponse.data);
    setUsers(usersResponse.data);
  }

  async function loadActivities() {
    setLoading(true);
    setError(null);

    try {
      const response = await api.get<Activity[]>("/activities", {
        params: {
          date: date || undefined,
          status: status || undefined,
          companyId: companyId || undefined,
          responsibleId: responsibleId || undefined,
          tagKey: tagKey || undefined
        }
      });

      setActivities(response.data);
    } catch {
      setError("Nao foi possivel carregar atividades.");
      setActivities([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadBaseData();
    void loadActivities();
  }, []);

  async function createActivity(payload: {
    companyId: string;
    title: string;
    description?: string;
    priority: MessagePriority;
    assignedToId: string;
    dueDate?: string;
    tagKeys: string[];
  }) {
    setSaving(true);

    try {
      await api.post("/activities", payload);
      setShowCreateForm(false);
      await loadActivities();
    } catch (error) {
      const message =
        error instanceof AxiosError
          ? (error.response?.data?.message as string | undefined)
          : "Falha ao criar atividade";
      setError(message ?? "Falha ao criar atividade");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1>Todas as Atividades</h1>
        <AppButton type="primary" onClick={() => setShowCreateForm((prev) => !prev)}>
          {showCreateForm ? "Fechar" : "Nova tarefa"}
        </AppButton>
      </div>

      {error && <div className="card error-box">{error}</div>}

      {showCreateForm && (
        <div className="card">
          <CreateActivityForm
            companies={companies}
            users={userOptions}
            defaultCompanyId={companyId || selectedCompanyId || undefined}
            onSubmit={createActivity}
            loading={saving}
          />
        </div>
      )}

      <div className="filters-row">
        <div className="field-block">
          <label className="field-label">Data</label>
          <input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
        </div>
        <div className="field-block">
          <label className="field-label">Status</label>
          <select value={status} onChange={(event) => setStatus(event.target.value as ActivityStatus | "")}> 
            <option value="">Todos</option>
            <option value="PENDENTE">Pendente</option>
            <option value="EM_EXECUCAO">Em execucao</option>
            <option value="CONCLUIDA">Concluida</option>
            <option value="CANCELADA">Cancelada</option>
          </select>
        </div>
        <div className="field-block">
          <label className="field-label">Empresa</label>
          <select value={companyId} onChange={(event) => setCompanyId(event.target.value)}>
            <option value="">Todas</option>
            {companies.map((company) => (
              <option key={company.id} value={company.id}>
                {company.name}
              </option>
            ))}
          </select>
        </div>
        <div className="field-block">
          <label className="field-label">Direcionado a</label>
          <select value={responsibleId} onChange={(event) => setResponsibleId(event.target.value)}>
            <option value="">Todos</option>
            {userOptions.map((entry) => (
              <option key={entry.id} value={entry.id}>
                {entry.name}
              </option>
            ))}
          </select>
        </div>
        <div className="field-block">
          <label className="field-label">Tag</label>
          <input value={tagKey} onChange={(event) => setTagKey(event.target.value)} />
        </div>
        <div className="filters-actions">
          <button className="primary-btn" onClick={() => void loadActivities()}>
            Aplicar
          </button>
          <button
            className="secondary-btn"
            onClick={() => {
              setStatus("");
              setDate(todayAsInputDate());
              setResponsibleId("");
              setTagKey("");
              void loadActivities();
            }}
          >
            Reset
          </button>
        </div>
      </div>

      <table className="table">
        <thead>
          <tr>
            <th>Ordem</th>
            <th>Status</th>
            <th>Prioridade</th>
            <th>Empresa</th>
            <th>Atividade</th>
            <th>Direcionado a</th>
            <th>Tags</th>
            <th>Criada em</th>
            <th>Acoes</th>
          </tr>
        </thead>
        <tbody>
          {!loading && activities.length === 0 && (
            <tr>
              <td colSpan={9}>Nenhuma atividade encontrada.</td>
            </tr>
          )}
          {activities.map((activity) => (
            <tr key={activity.id}>
              <td>{activity.orderExec}</td>
              <td>
                <span className={`status-chip ${activity.status.toLowerCase()}`}>{statusLabel(activity.status)}</span>
              </td>
              <td>{activity.priority}</td>
              <td>{activity.company.name}</td>
              <td>
                {activity.title}
                <br />
                <small>Prazo: {formatDate(activity.dueDate)}</small>
              </td>
              <td>{activity.assignedTo.name}</td>
              <td>{activity.tags.map((item) => item.tag.key).join(", ") || "-"}</td>
              <td>{formatDateTime(activity.createdAt)}</td>
              <td>
                <AppButton size="small" onClick={() => navigate(`/atividades/${activity.id}`)}>
                  Detalhes
                </AppButton>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
