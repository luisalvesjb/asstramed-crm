import { Suspense, lazy, useMemo, useState } from "react";
import dayjs, { Dayjs } from "dayjs";
import { AppButton, AppDateTimePicker, AppInput, AppModal, DashboardFilterSelect } from "../../../ui/components";
import { Company, ApiUser, ActivityStatus } from "../../../types/api";
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
  }) => Promise<void>;
}

const statusOptions: Array<{ label: string; value: ActivityStatus }> = [
  { label: "Pendente", value: "PENDENTE" },
  { label: "Em execucao", value: "EM_EXECUCAO" },
  { label: "Concluida", value: "CONCLUIDA" },
  { label: "Cancelada", value: "CANCELADA" }
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
      setError("Selecione empresa e responsavel.");
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
      dueDate: dueDate?.toISOString(),
      activityHtml,
      tags
    });

    setActivityHtml("");
    setTags([]);
    setResponsibleId("");
    setStatus("PENDENTE");
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
        <DashboardFilterSelect
          value={companyId || undefined}
          options={companyOptions}
          placeholder="Empresa"
          onChange={(value) => setCompanyId(String(value))}
        />

        <DashboardFilterSelect
          value={responsibleId || undefined}
          options={userOptions}
          placeholder="Responsavel"
          onChange={(value) => setResponsibleId(String(value))}
        />

        <DashboardFilterSelect
          value={status}
          options={statusOptions}
          placeholder="Status"
          onChange={(value) => setStatus(value as ActivityStatus)}
        />

        <AppDateTimePicker
          value={dueDate}
          onChange={(value) => setDueDate(Array.isArray(value) ? (value[0] ?? null) : value)}
          format="DD/MM/YYYY HH:mm"
          placeholder="Data/hora"
        />

        <div style={{ gridColumn: "1 / -1" }}>
          <Suspense fallback={<div className="card">Carregando editor...</div>}>
            <ReactQuill theme="snow" value={activityHtml} onChange={setActivityHtml} />
          </Suspense>
        </div>

        <div style={{ gridColumn: "1 / -1" }}>
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
