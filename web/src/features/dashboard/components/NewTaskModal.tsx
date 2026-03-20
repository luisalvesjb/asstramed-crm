import { Suspense, lazy, useMemo, useState } from "react";
import dayjs, { Dayjs } from "dayjs";
import { AppButton, AppDateTimePicker, AppInput, AppModal, DashboardFilterSelect } from "../../../ui/components";
import { Company, ApiUser, ActivityStatus, MessagePriority } from "../../../types/api";
import { TagsInput } from "./TagsInput";
import "react-quill/dist/quill.snow.css";

const ReactQuill = lazy(() => import("react-quill"));

interface NewTaskModalProps {
  open: boolean;
  loading?: boolean;
  companies: Company[];
  users: ApiUser[];
  defaultCompanyId?: string;
  onCancel: () => void;
  onSubmit: (payload: {
    companyId: string;
    responsibleId: string;
    dueDate?: string;
    activityHtml: string;
    tags: string[];
    status: ActivityStatus;
    priority: MessagePriority;
  }) => Promise<void>;
}

const statusOptions: Array<{ label: string; value: ActivityStatus }> = [
  { label: "Pendente", value: "PENDENTE" },
  { label: "Em execucao", value: "EM_EXECUCAO" },
  { label: "Concluida", value: "CONCLUIDA" },
  { label: "Cancelada", value: "CANCELADA" }
];

const priorityOptions: Array<{ label: string; value: MessagePriority }> = [
  { label: "Alta", value: "ALTA" },
  { label: "Media", value: "MEDIA" },
  { label: "Baixa", value: "BAIXA" }
];

function stripHtml(input: string): string {
  return input.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

export function NewTaskModal({
  open,
  loading = false,
  companies,
  users,
  defaultCompanyId,
  onCancel,
  onSubmit
}: NewTaskModalProps) {
  const [companyId, setCompanyId] = useState(defaultCompanyId ?? "");
  const [responsibleId, setResponsibleId] = useState("");
  const [status, setStatus] = useState<ActivityStatus>("PENDENTE");
  const [priority, setPriority] = useState<MessagePriority>("MEDIA");
  const [dueDate, setDueDate] = useState<Dayjs | null>(dayjs());
  const [activityHtml, setActivityHtml] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const companyOptions = useMemo(
    () => companies.map((company) => ({ value: company.id, label: company.name })),
    [companies]
  );

  const userOptions = useMemo(
    () => users.map((user) => ({ value: user.id, label: user.name })),
    [users]
  );

  async function handleSubmit() {
    if (!companyId || !responsibleId) {
      setError("Selecione empresa e direcionado.");
      return;
    }

    const plainText = stripHtml(activityHtml);

    if (plainText.length < 2) {
      setError("Preencha a descricao da atividade.");
      return;
    }

    setError(null);

    await onSubmit({
      companyId,
      responsibleId,
      status,
      priority,
      dueDate: dueDate?.toISOString(),
      activityHtml,
      tags
    });

    setActivityHtml("");
    setTags([]);
    setResponsibleId("");
    setStatus("PENDENTE");
    setPriority("MEDIA");
  }

  return (
    <AppModal
      open={open}
      title="Nova tarefa"
      onCancel={onCancel}
      width={860}
      footer={[
        <AppButton key="cancel" onClick={onCancel}>
          Cancelar
        </AppButton>,
        <AppButton key="submit" type="primary" loading={loading} onClick={() => void handleSubmit()}>
          Salvar tarefa
        </AppButton>
      ]}
    >
      <div className="form-grid">
        <div className="field-block">
          <label className="field-label">Empresa</label>
          <DashboardFilterSelect
            value={companyId || undefined}
            options={companyOptions}
            onChange={(value) => setCompanyId(String(value))}
          />
        </div>

        <div className="field-block">
          <label className="field-label">Direcionado a</label>
          <DashboardFilterSelect
            value={responsibleId || undefined}
            options={userOptions}
            onChange={(value) => setResponsibleId(String(value))}
          />
        </div>

        <div className="field-block">
          <label className="field-label">Status</label>
          <DashboardFilterSelect
            value={status}
            options={statusOptions}
            onChange={(value) => setStatus(value as ActivityStatus)}
          />
        </div>

        <div className="field-block">
          <label className="field-label">Prioridade</label>
          <DashboardFilterSelect
            value={priority}
            options={priorityOptions}
            onChange={(value) => setPriority(value as MessagePriority)}
          />
        </div>

        <div className="field-block">
          <label className="field-label">Data/hora</label>
          <AppDateTimePicker
            value={dueDate}
            onChange={(value) => setDueDate(Array.isArray(value) ? (value[0] ?? null) : value)}
            format="DD/MM/YYYY HH:mm"
          />
        </div>

        <div className="field-block field-block-full">
          <label className="field-label">Atividade</label>
          <Suspense fallback={<div className="card">Carregando editor...</div>}>
            <ReactQuill theme="snow" value={activityHtml} onChange={setActivityHtml} />
          </Suspense>
        </div>

        <div className="field-block field-block-full">
          <label className="field-label">Tags</label>
          <TagsInput value={tags} onChange={setTags} />
        </div>

        {error && (
          <div style={{ gridColumn: "1 / -1" }}>
            <AppInput readOnly value={error} status="error" />
          </div>
        )}
      </div>
    </AppModal>
  );
}
