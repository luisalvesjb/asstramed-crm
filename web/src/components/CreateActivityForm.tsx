import { FormEvent, useMemo, useState } from "react";
import { ActivityStatus, ApiUser, Company, MessagePriority } from "../types/api";

interface CreateActivityPayload {
  companyId: string;
  title: string;
  description?: string;
  priority: MessagePriority;
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
  const [priority, setPriority] = useState<MessagePriority>("MEDIA");
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
      setError("Preencha empresa, titulo e direcionado.");
      return;
    }

    setError(null);

    await onSubmit({
      companyId,
      title: title.trim(),
      description: description.trim() || undefined,
      priority,
      assignedToId,
      dueDate: dueDate || undefined,
      tagKeys: tagsInput
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean)
    });

    setTitle("");
    setDescription("");
    setPriority("MEDIA");
    setAssignedToId("");
    setDueDate("");
    setTagsInput("");
  }

  return (
    <form className="form-grid" onSubmit={handleSubmit}>
      <h3 style={{ gridColumn: "1 / -1" }}>Nova Atividade</h3>
      <div className="field-block">
        <label className="field-label">Empresa</label>
        <select value={companyId} onChange={(event) => setCompanyId(event.target.value)}>
          <option value="">Selecione</option>
          {companies.map((company) => (
            <option key={company.id} value={company.id}>
              {company.name}
            </option>
          ))}
        </select>
      </div>

      <div className="field-block">
        <label className="field-label">Titulo</label>
        <input value={title} onChange={(event) => setTitle(event.target.value)} />
      </div>

      <div className="field-block">
        <label className="field-label">Descricao</label>
        <input value={description} onChange={(event) => setDescription(event.target.value)} />
      </div>

      <div className="field-block">
        <label className="field-label">Prioridade</label>
        <select value={priority} onChange={(event) => setPriority(event.target.value as MessagePriority)}>
          <option value="ALTA">Alta</option>
          <option value="MEDIA">Media</option>
          <option value="BAIXA">Baixa</option>
        </select>
      </div>

      <div className="field-block">
        <label className="field-label">Direcionado a</label>
        <select value={assignedToId} onChange={(event) => setAssignedToId(event.target.value)}>
          <option value="">Selecione</option>
          {users.map((user) => (
            <option key={user.id} value={user.id}>
              {user.name}
            </option>
          ))}
        </select>
      </div>

      <div className="field-block">
        <label className="field-label">Prazo</label>
        <input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} />
      </div>

      <div className="field-block field-block-full">
        <label className="field-label">Tags</label>
        <input value={tagsInput} onChange={(event) => setTagsInput(event.target.value)} />
      </div>

      {error && <span className="error-text" style={{ gridColumn: "1 / -1" }}>{error}</span>}

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
