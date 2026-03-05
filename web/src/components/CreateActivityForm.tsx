import { FormEvent, useMemo, useState } from "react";
import { ActivityStatus, ApiUser, Company } from "../types/api";

interface CreateActivityPayload {
  companyId: string;
  title: string;
  description?: string;
  assignedToId: string;
  dueDate?: string;
  tagKeys: string[];
}

interface CreateActivityFormProps {
  companies: Company[];
  users: ApiUser[];
  defaultCompanyId?: string;
  onSubmit: (payload: CreateActivityPayload) => Promise<void>;
  loading?: boolean;
}

export function CreateActivityForm({
  companies,
  users,
  defaultCompanyId,
  onSubmit,
  loading = false
}: CreateActivityFormProps) {
  const [companyId, setCompanyId] = useState(defaultCompanyId ?? "");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assignedToId, setAssignedToId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [error, setError] = useState<string | null>(null);

  const canSubmit = useMemo(
    () => Boolean(companyId && title.trim() && assignedToId),
    [companyId, title, assignedToId]
  );

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    if (!canSubmit) {
      setError("Preencha empresa, titulo e responsavel.");
      return;
    }

    setError(null);

    await onSubmit({
      companyId,
      title: title.trim(),
      description: description.trim() || undefined,
      assignedToId,
      dueDate: dueDate || undefined,
      tagKeys: tagsInput
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean)
    });

    setTitle("");
    setDescription("");
    setAssignedToId("");
    setDueDate("");
    setTagsInput("");
  }

  return (
    <form className="form-grid" onSubmit={handleSubmit}>
      <h3>Nova Atividade</h3>
      <select value={companyId} onChange={(event) => setCompanyId(event.target.value)}>
        <option value="">Empresa</option>
        {companies.map((company) => (
          <option key={company.id} value={company.id}>
            {company.name}
          </option>
        ))}
      </select>

      <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Titulo" />
      <input
        value={description}
        onChange={(event) => setDescription(event.target.value)}
        placeholder="Descricao"
      />

      <select value={assignedToId} onChange={(event) => setAssignedToId(event.target.value)}>
        <option value="">Responsavel</option>
        {users.map((user) => (
          <option key={user.id} value={user.id}>
            {user.name}
          </option>
        ))}
      </select>

      <input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} />
      <input
        value={tagsInput}
        onChange={(event) => setTagsInput(event.target.value)}
        placeholder="Tags separadas por virgula"
      />

      {error && <span className="error-text">{error}</span>}

      <div className="form-actions">
        <button className="primary-btn" type="submit" disabled={loading || !canSubmit}>
          {loading ? "Salvando..." : "Salvar atividade"}
        </button>
      </div>
    </form>
  );
}

export const ACTIVITY_STATUS_OPTIONS: ActivityStatus[] = [
  "PENDENTE",
  "EM_EXECUCAO",
  "CONCLUIDA",
  "CANCELADA"
];
