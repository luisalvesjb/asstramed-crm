import { useEffect, useMemo, useRef, useState } from "react";
import { AxiosError } from "axios";
import { DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import type { InputRef } from "antd";
import { api } from "../../../services/api";
import { Company, CompanyDetails, DocumentItem } from "../../../types/api";
import {
  AppButton,
  AppCheckbox,
  AppFileDragger,
  AppInput,
  AppModal,
  AppTabs,
  AppTextArea,
  DashboardFilterSelect
} from "../../../ui/components";
import { notifyError, notifySuccess, showConfirmDialog } from "../../../ui/feedback/notifications";
import { resolveCompanyLogoUrl, resolveDocumentUrl } from "../../../store/slices/companyDetailsSlice";
import { LogoCropperModal } from "./LogoCropperModal";
import { digitsOnly, formatCpfCnpj, formatPhone, formatZipCode } from "../../../utils/masks";

const ACCEPTED_DOCUMENT_MIME_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
];

const ACCEPTED_DOCUMENT_EXTENSIONS = [".pdf", ".doc", ".docx"];
const ACCEPTED_IMAGE_MIME_TYPES = ["image/png", "image/jpeg", "image/webp"];
const ACCEPTED_IMAGE_EXTENSIONS = [".png", ".jpg", ".jpeg", ".webp"];

interface EditableContact {
  localId: string;
  name: string;
  role: string;
  phone: string;
  hasWhatsapp: boolean;
  email: string;
}

interface QueuedDocument {
  localId: string;
  title: string;
  description: string;
  file: File;
}

interface CompanyUpsertForm {
  name: string;
  legalName: string;
  city: string;
  state: string;
  status: string;
  nextCycleDate: string;
  personalDocument: string;
  personalEmail: string;
  personalPhone: string;
  personalResponsible: string;
  personalNotes: string;
  addressStreet: string;
  addressNumber: string;
  addressComplement: string;
  addressDistrict: string;
  addressCity: string;
  addressState: string;
  addressZipCode: string;
}

interface CompanyUpsertModalProps {
  open: boolean;
  mode: "create" | "edit";
  companyId?: string | null;
  canReadDocuments: boolean;
  canWriteDocuments: boolean;
  onCancel: () => void;
  onSaved: () => Promise<void> | void;
}

const initialForm: CompanyUpsertForm = {
  name: "",
  legalName: "",
  city: "",
  state: "",
  status: "ATIVA",
  nextCycleDate: "",
  personalDocument: "",
  personalEmail: "",
  personalPhone: "",
  personalResponsible: "",
  personalNotes: "",
  addressStreet: "",
  addressNumber: "",
  addressComplement: "",
  addressDistrict: "",
  addressCity: "",
  addressState: "",
  addressZipCode: ""
};

function createBlankContact(): EditableContact {
  return {
    localId: `contact-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: "",
    role: "",
    phone: "",
    hasWhatsapp: false,
    email: ""
  };
}

function mapCompanyToForm(company: CompanyDetails): CompanyUpsertForm {
  return {
    name: company.name ?? "",
    legalName: company.legalName ?? "",
    city: company.city ?? "",
    state: company.state ?? "",
    status: company.status ?? "ATIVA",
    nextCycleDate: company.nextCycleDate ? String(company.nextCycleDate).slice(0, 10) : "",
    personalDocument: company.personalDocument ?? "",
    personalEmail: company.personalEmail ?? "",
    personalPhone: company.personalPhone ?? "",
    personalResponsible: company.personalResponsible ?? "",
    personalNotes: company.personalNotes ?? "",
    addressStreet: company.address?.street ?? "",
    addressNumber: company.address?.number ?? "",
    addressComplement: company.address?.complement ?? "",
    addressDistrict: company.address?.district ?? "",
    addressCity: company.address?.city ?? "",
    addressState: company.address?.state ?? "",
    addressZipCode: company.address?.zipCode ?? ""
  };
}

function normalizeText(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

export function CompanyUpsertModal({
  open,
  mode,
  companyId,
  canReadDocuments,
  canWriteDocuments,
  onCancel,
  onSaved
}: CompanyUpsertModalProps) {
  const [activeTab, setActiveTab] = useState("general");
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<CompanyUpsertForm>(initialForm);
  const [contacts, setContacts] = useState<EditableContact[]>([createBlankContact()]);
  const [existingDocuments, setExistingDocuments] = useState<DocumentItem[]>([]);
  const [queuedDocuments, setQueuedDocuments] = useState<QueuedDocument[]>([]);
  const [documentTitle, setDocumentTitle] = useState("");
  const [documentDescription, setDocumentDescription] = useState("");
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [existingLogoPath, setExistingLogoPath] = useState<string | null>(null);
  const [cropOpen, setCropOpen] = useState(false);
  const [cropSourceFile, setCropSourceFile] = useState<File | null>(null);
  const addressNumberRef = useRef<InputRef>(null);
  const lastFetchedZipCodeRef = useRef("");

  const logoPreviewUrl = useMemo(() => {
    if (logoFile) {
      return URL.createObjectURL(logoFile);
    }

    return resolveCompanyLogoUrl(existingLogoPath);
  }, [existingLogoPath, logoFile]);

  useEffect(() => {
    return () => {
      if (logoFile && logoPreviewUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(logoPreviewUrl);
      }
    };
  }, [logoFile, logoPreviewUrl]);

  useEffect(() => {
    if (!open) {
      return;
    }

    setActiveTab("general");
    setDocumentTitle("");
    setDocumentDescription("");
    setDocumentFile(null);
    setQueuedDocuments([]);
    setLogoFile(null);
    setCropSourceFile(null);
    setCropOpen(false);
    lastFetchedZipCodeRef.current = "";

    if (mode === "edit" && companyId) {
      void loadCompanyDetails(companyId);
      return;
    }

    setLoadingDetails(false);
    setForm(initialForm);
    setContacts([createBlankContact()]);
    setExistingDocuments([]);
    setExistingLogoPath(null);
  }, [open, mode, companyId]);

  async function loadCompanyDetails(nextCompanyId: string) {
    setLoadingDetails(true);

    try {
      const response = await api.get<CompanyDetails>(`/companies/${nextCompanyId}`);
      const company = response.data;

      setForm(mapCompanyToForm(company));
      setContacts(
        company.contacts.length
          ? company.contacts.map((contact) => ({
              localId: contact.id,
              name: contact.name ?? "",
              role: contact.role ?? "",
              phone: contact.phone ?? "",
              hasWhatsapp: Boolean(contact.hasWhatsapp),
              email: contact.email ?? ""
            }))
          : [createBlankContact()]
      );
      setExistingDocuments(company.documents ?? []);
      setExistingLogoPath(company.logoPath ?? null);
    } catch {
      notifyError("Empresas", "Nao foi possivel carregar os dados da empresa para edicao.");
      onCancel();
    } finally {
      setLoadingDetails(false);
    }
  }

  function updateForm(patch: Partial<CompanyUpsertForm>) {
    setForm((current) => ({ ...current, ...patch }));
  }

  function updateContact(localId: string, patch: Partial<EditableContact>) {
    setContacts((current) =>
      current.map((contact) => (contact.localId === localId ? { ...contact, ...patch } : contact))
    );
  }

  function removeContact(localId: string) {
    setContacts((current) => {
      const next = current.filter((contact) => contact.localId !== localId);
      return next.length ? next : [createBlankContact()];
    });
  }

  function addDocumentToQueue() {
    if (!documentFile) {
      notifyError("Documentos", "Selecione um arquivo para adicionar.");
      return;
    }

    if (!documentTitle.trim()) {
      notifyError("Documentos", "Informe o titulo do documento.");
      return;
    }

    setQueuedDocuments((current) => [
      ...current,
      {
        localId: `doc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        title: documentTitle.trim(),
        description: documentDescription.trim(),
        file: documentFile
      }
    ]);
    setDocumentTitle("");
    setDocumentDescription("");
    setDocumentFile(null);
  }

  async function archiveExistingDocument(documentId: string) {
    showConfirmDialog({
      title: "Arquivar documento",
      content: "Deseja arquivar este documento?",
      onConfirm: async () => {
        await api.patch(`/documents/${documentId}/archive`);
        setExistingDocuments((current) => current.filter((item) => item.id !== documentId));
        notifySuccess("Documento arquivado");
      }
    });
  }

  async function handleSave() {
    if (!form.name.trim()) {
      notifyError("Empresas", "Nome da empresa e obrigatorio.");
      setActiveTab("general");
      return;
    }

    setSaving(true);

    try {
      let targetCompanyId = companyId ?? null;

      const companyPayload = {
        name: form.name.trim(),
        legalName: normalizeText(form.legalName),
        city: normalizeText(form.city),
        state: normalizeText(form.state)?.toUpperCase(),
        status: form.status || "ATIVA",
        nextCycleDate: form.nextCycleDate || undefined
      };

      if (mode === "edit" && targetCompanyId) {
        await api.put(`/companies/${targetCompanyId}`, companyPayload);
      } else {
        const response = await api.post<Company>("/companies", companyPayload);
        targetCompanyId = response.data.id;
      }

      if (!targetCompanyId) {
        throw new Error("Empresa invalida para persistencia.");
      }

      const personalInfoFormData = new FormData();
      personalInfoFormData.append("personalDocument", form.personalDocument);
      personalInfoFormData.append("personalEmail", form.personalEmail);
      personalInfoFormData.append("personalPhone", form.personalPhone);
      personalInfoFormData.append("personalResponsible", form.personalResponsible);
      personalInfoFormData.append("personalNotes", form.personalNotes);

      if (logoFile) {
        personalInfoFormData.append("logo", logoFile, logoFile.name);
      }

      await api.put(`/companies/${targetCompanyId}/personal-info`, personalInfoFormData, {
        headers: {
          "Content-Type": "multipart/form-data"
        }
      });

      await api.put(`/companies/${targetCompanyId}/address`, {
        street: normalizeText(form.addressStreet),
        number: normalizeText(form.addressNumber),
        complement: normalizeText(form.addressComplement),
        district: normalizeText(form.addressDistrict),
        city: normalizeText(form.addressCity),
        state: normalizeText(form.addressState)?.toUpperCase(),
        zipCode: normalizeText(form.addressZipCode)
      });

      await api.put(`/companies/${targetCompanyId}/contacts`, {
        contacts: contacts
          .map((contact) => ({
            name: contact.name.trim(),
            role: contact.role.trim() || undefined,
            phone: contact.phone.trim() || undefined,
            hasWhatsapp: contact.hasWhatsapp,
            email: contact.email.trim() || undefined
          }))
          .filter((contact) => contact.name.length >= 2)
      });

      if (canWriteDocuments && queuedDocuments.length > 0) {
        for (const document of queuedDocuments) {
          const formData = new FormData();
          formData.append("companyId", targetCompanyId);
          formData.append("title", document.title);
          formData.append("description", document.description);
          formData.append("file", document.file, document.file.name);

          await api.post("/documents/upload", formData, {
            headers: {
              "Content-Type": "multipart/form-data"
            }
          });
        }
      }

      await onSaved();
    } catch (error) {
      const message =
        error instanceof AxiosError
          ? ((error.response?.data as { message?: string } | undefined)?.message ?? "Falha ao salvar empresa.")
          : "Falha ao salvar empresa.";
      notifyError("Empresas", message);
    } finally {
      setSaving(false);
    }
  }

  const tabs = [
    {
      key: "general",
      label: "Empresa",
      children: (
        <div className="form-grid">
          <div className="field-block">
            <label className="field-label">Nome</label>
            <AppInput value={form.name} onChange={(event) => updateForm({ name: event.target.value })} />
          </div>
          <div className="field-block">
            <label className="field-label">Razao social</label>
            <AppInput value={form.legalName} onChange={(event) => updateForm({ legalName: event.target.value })} />
          </div>
          <div className="field-block">
            <label className="field-label">Cidade</label>
            <AppInput value={form.city} onChange={(event) => updateForm({ city: event.target.value })} />
          </div>
          <div className="field-block">
            <label className="field-label">UF</label>
            <AppInput
              maxLength={2}
              value={form.state}
              onChange={(event) => updateForm({ state: event.target.value.toUpperCase() })}
            />
          </div>
          <div className="field-block">
            <label className="field-label">Status</label>
            <DashboardFilterSelect
              value={form.status}
              options={[
                { label: "Ativa", value: "ATIVA" },
                { label: "Inativa", value: "INATIVA" }
              ]}
              onChange={(value) => updateForm({ status: String(value) })}
            />
          </div>
          <div className="field-block">
            <label className="field-label">Proximo ciclo</label>
            <AppInput
              type="date"
              value={form.nextCycleDate}
              onChange={(event) => updateForm({ nextCycleDate: event.target.value })}
            />
          </div>
        </div>
      )
    },
    {
      key: "personal",
      label: "Informacoes Pessoais",
      children: (
        <div className="form-grid">
          <div className="field-block">
            <label className="field-label">CNPJ/CPF</label>
            <AppInput
              value={form.personalDocument}
              onChange={(event) => updateForm({ personalDocument: formatCpfCnpj(event.target.value) })}
            />
          </div>
          <div className="field-block">
            <label className="field-label">E-mail</label>
            <AppInput
              value={form.personalEmail}
              onChange={(event) => updateForm({ personalEmail: event.target.value })}
            />
          </div>
          <div className="field-block">
            <label className="field-label">Telefone</label>
            <AppInput
              value={form.personalPhone}
              onChange={(event) => updateForm({ personalPhone: formatPhone(event.target.value) })}
            />
          </div>
          <div className="field-block">
            <label className="field-label">Responsavel</label>
            <AppInput
              value={form.personalResponsible}
              onChange={(event) => updateForm({ personalResponsible: event.target.value })}
            />
          </div>
          <div className="field-block field-block-full">
            <label className="field-label">Observacoes</label>
            <AppTextArea
              rows={4}
              value={form.personalNotes}
              onChange={(event) => updateForm({ personalNotes: event.target.value })}
            />
          </div>
          <div className="field-block field-block-full">
            <label className="field-label">Logo</label>
            {logoPreviewUrl && (
              <div className="company-upsert-logo-preview">
                <img src={logoPreviewUrl} alt="Logo da empresa" className="company-logo-avatar company-logo-avatar-lg" />
              </div>
            )}
            <AppFileDragger
              value={logoFile}
              onChange={(file) => {
                if (!file) {
                  setLogoFile(null);
                  setCropSourceFile(null);
                  return;
                }

                setCropSourceFile(file);
                setCropOpen(true);
              }}
              acceptedMimeTypes={ACCEPTED_IMAGE_MIME_TYPES}
              acceptedExtensions={ACCEPTED_IMAGE_EXTENSIONS}
              title="Arraste a logo"
              description="Ou clique para selecionar a imagem"
            />
          </div>
        </div>
      )
    },
    {
      key: "address",
      label: "Endereco",
      children: (
        <div className="form-grid">
          <div className="field-block">
            <label className="field-label">CEP</label>
            <AppInput
              value={form.addressZipCode}
              onChange={async (event) => {
                const nextZipCode = formatZipCode(event.target.value);
                updateForm({ addressZipCode: nextZipCode });

                const zipDigits = digitsOnly(nextZipCode);
                if (zipDigits.length !== 8 || lastFetchedZipCodeRef.current === zipDigits) {
                  return;
                }

                lastFetchedZipCodeRef.current = zipDigits;

                try {
                  const response = await fetch(`https://viacep.com.br/ws/${zipDigits}/json/`);
                  const data = (await response.json()) as {
                    erro?: boolean;
                    logradouro?: string;
                    bairro?: string;
                    localidade?: string;
                    uf?: string;
                  };

                  if (data.erro) {
                    return;
                  }

                  setForm((current) => ({
                    ...current,
                    addressZipCode: nextZipCode,
                    addressStreet: data.logradouro ?? current.addressStreet,
                    addressDistrict: data.bairro ?? current.addressDistrict,
                    addressCity: data.localidade ?? current.addressCity,
                    addressState: data.uf ?? current.addressState
                  }));

                  window.setTimeout(() => {
                    addressNumberRef.current?.focus();
                  }, 0);
                } catch {
                  // Mantem o fluxo manual se o servico de CEP falhar.
                }
              }}
            />
          </div>
          <div className="field-block">
            <label className="field-label">Rua</label>
            <AppInput value={form.addressStreet} onChange={(event) => updateForm({ addressStreet: event.target.value })} />
          </div>
          <div className="field-block">
            <label className="field-label">Numero</label>
            <AppInput
              ref={addressNumberRef}
              value={form.addressNumber}
              onChange={(event) => updateForm({ addressNumber: event.target.value })}
            />
          </div>
          <div className="field-block">
            <label className="field-label">Complemento</label>
            <AppInput
              value={form.addressComplement}
              onChange={(event) => updateForm({ addressComplement: event.target.value })}
            />
          </div>
          <div className="field-block">
            <label className="field-label">Bairro</label>
            <AppInput
              value={form.addressDistrict}
              onChange={(event) => updateForm({ addressDistrict: event.target.value })}
            />
          </div>
          <div className="field-block">
            <label className="field-label">Cidade</label>
            <AppInput value={form.addressCity} onChange={(event) => updateForm({ addressCity: event.target.value })} />
          </div>
          <div className="field-block">
            <label className="field-label">UF</label>
            <AppInput
              maxLength={2}
              value={form.addressState}
              onChange={(event) => updateForm({ addressState: event.target.value.toUpperCase() })}
            />
          </div>
        </div>
      )
    },
    {
      key: "contacts",
      label: "Contatos",
      children: (
        <div className="card-stack">
          {contacts.map((contact, index) => (
            <div key={contact.localId} className="card card-stack">
              <div className="page-header">
                <h3>Contato {index + 1}</h3>
                <AppButton onClick={() => removeContact(contact.localId)} disabled={contacts.length === 1}>
                  Remover
                </AppButton>
              </div>
              <div className="form-grid">
                <div className="field-block">
                  <label className="field-label">Nome</label>
                  <AppInput value={contact.name} onChange={(event) => updateContact(contact.localId, { name: event.target.value })} />
                </div>
                <div className="field-block">
                  <label className="field-label">Cargo</label>
                  <AppInput value={contact.role} onChange={(event) => updateContact(contact.localId, { role: event.target.value })} />
                </div>
                <div className="field-block">
                  <label className="field-label">Celular</label>
                  <AppInput
                    value={contact.phone}
                    onChange={(event) => updateContact(contact.localId, { phone: formatPhone(event.target.value) })}
                  />
                </div>
                <div className="field-block">
                  <label className="field-label">WhatsApp</label>
                  <AppCheckbox
                    checked={contact.hasWhatsapp}
                    onChange={(event) => updateContact(contact.localId, { hasWhatsapp: Boolean(event.target.checked) })}
                  >
                    Este celular tem WhatsApp
                  </AppCheckbox>
                </div>
                <div className="field-block">
                  <label className="field-label">E-mail</label>
                  <AppInput value={contact.email} onChange={(event) => updateContact(contact.localId, { email: event.target.value })} />
                </div>
              </div>
            </div>
          ))}
          <div className="filters-actions">
            <AppButton onClick={() => setContacts((current) => [...current, createBlankContact()])}>
              <PlusOutlined /> Adicionar contato
            </AppButton>
          </div>
        </div>
      )
    },
    {
      key: "documents",
      label: "Documentos",
      children: !canReadDocuments && !canWriteDocuments ? (
        <div className="card">Sem permissao para visualizar documentos.</div>
      ) : (
        <div className="card-stack">
          {canWriteDocuments && (
            <div className="card card-stack">
              <div className="form-grid">
                <div className="field-block">
                  <label className="field-label">Titulo</label>
                  <AppInput value={documentTitle} onChange={(event) => setDocumentTitle(event.target.value)} />
                </div>
                <div className="field-block">
                  <label className="field-label">Descricao</label>
                  <AppInput value={documentDescription} onChange={(event) => setDocumentDescription(event.target.value)} />
                </div>
                <div className="field-block field-block-full">
                  <label className="field-label">Arquivo</label>
                  <AppFileDragger
                    value={documentFile}
                    onChange={setDocumentFile}
                    acceptedMimeTypes={ACCEPTED_DOCUMENT_MIME_TYPES}
                    acceptedExtensions={ACCEPTED_DOCUMENT_EXTENSIONS}
                    title="Arraste .doc, .docx ou .pdf"
                    description="Ou clique para selecionar um arquivo"
                  />
                </div>
              </div>
              <div className="filters-actions">
                <AppButton type="primary" onClick={addDocumentToQueue}>
                  Adicionar documento
                </AppButton>
              </div>
            </div>
          )}

          {queuedDocuments.length > 0 && (
            <div className="card card-stack">
              <h3>Documentos para enviar</h3>
              {queuedDocuments.map((document) => (
                <div key={document.localId} className="message-highlight-item">
                  <div className="message-highlight-main">
                    <strong>{document.title}</strong>
                    <small>{document.file.name}</small>
                    <small>{document.description || "Sem descricao"}</small>
                  </div>
                  <AppButton
                    onClick={() =>
                      setQueuedDocuments((current) => current.filter((item) => item.localId !== document.localId))
                    }
                  >
                    <DeleteOutlined />
                  </AppButton>
                </div>
              ))}
            </div>
          )}

          {canReadDocuments && existingDocuments.length > 0 && (
            <div className="card card-stack">
              <h3>Documentos existentes</h3>
              {existingDocuments.map((document) => (
                <div key={document.id} className="message-highlight-item">
                  <div className="message-highlight-main">
                    <strong>{document.title}</strong>
                    <small>{document.description || "Sem descricao"}</small>
                    <small>{document.name}</small>
                  </div>
                  <div className="filters-actions">
                    <AppButton onClick={() => window.open(resolveDocumentUrl(document.filePath), "_blank")}>
                      Abrir
                    </AppButton>
                    {canWriteDocuments && (
                      <AppButton onClick={() => void archiveExistingDocument(document.id)}>Arquivar</AppButton>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )
    }
  ];

  return (
    <>
      <AppModal
        open={open}
        title={mode === "edit" ? "Editar Empresa" : "Nova Empresa"}
        width={1120}
        onCancel={onCancel}
        footer={[
          <AppButton key="cancel" onClick={onCancel}>
            Cancelar
          </AppButton>,
          <AppButton key="save" type="primary" loading={saving} onClick={() => void handleSave()}>
            Salvar
          </AppButton>
        ]}
      >
        {loadingDetails ? (
          <div className="card">Carregando dados da empresa...</div>
        ) : (
          <AppTabs activeKey={activeTab} onChange={setActiveTab} items={tabs} />
        )}
      </AppModal>

      <LogoCropperModal
        open={cropOpen}
        file={cropSourceFile}
        cropShape="rect"
        onCancel={() => {
          setCropOpen(false);
          setCropSourceFile(null);
        }}
        onConfirm={({ blob, fileName }) => {
          const croppedFile = new File([blob], fileName, { type: "image/png" });
          setLogoFile(croppedFile);
          setCropOpen(false);
          setCropSourceFile(null);
          notifySuccess("Logo pronta", "Recorte aplicado com sucesso.");
        }}
      />
    </>
  );
}
