import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { TableProps } from "antd";
import dayjs from "dayjs";
import { NewTaskModal } from "../features/dashboard/components/NewTaskModal";
import { LogoCropperModal } from "../features/company/components/LogoCropperModal";
import { PERMISSIONS } from "../constants/permissions";
import { useAuth } from "../context/AuthContext";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import {
  archiveCompanyDocument,
  clearCompanyDetailsError,
  closeAddressModal,
  closeCompanyTaskModal,
  closeContactModal,
  closeContractModal,
  closeDocumentModal,
  closePersonalInfoModal,
  CompanyDetailsTab,
  createCompanyContact,
  createCompanyContract,
  createCompanyTask,
  fetchCompanyDetails,
  openAddressModal,
  openCompanyTaskModal,
  openContactModal,
  openContractModal,
  openDocumentModal,
  openPersonalInfoModal,
  resolveCompanyLogoUrl,
  resolveDocumentUrl,
  saveCompanyAddress,
  saveCompanyPersonalInfo,
  setActivitiesPage,
  setActivitiesPageSize,
  setAddressForm,
  setCompanyDetailsDate,
  setCompanyDetailsTab,
  setCompanyId,
  setContactForm,
  setContactsPage,
  setContactsPageSize,
  setContractForm,
  setContractsPage,
  setContractsPageSize,
  setDocumentDescription,
  setDocumentFile,
  setDocumentTitle,
  setDocumentsPage,
  setDocumentsPageSize,
  setPersonalInfoForm,
  uploadCompanyDocument
} from "../store/slices/companyDetailsSlice";
import { Activity, CompanyContact, Contract, DocumentItem } from "../types/api";
import {
  AppButton,
  AppFileDragger,
  AppInput,
  InlineDateNavigator,
  AppModal,
  AppPagination,
  KpiStatCard,
  AppTable,
  AppTabs,
  AppTag,
  DashboardFilterSelect
} from "../ui/components";
import { notifyError, notifySuccess, showConfirmDialog } from "../ui/feedback/notifications";
import { formatCurrency, formatDate, formatDateTime, statusLabel } from "../utils/format";

const ACCEPTED_DOCUMENT_MIME_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
];

const ACCEPTED_DOCUMENT_EXTENSIONS = [".pdf", ".doc", ".docx"];

const ACCEPTED_IMAGE_MIME_TYPES = ["image/png", "image/jpeg", "image/webp"];
const ACCEPTED_IMAGE_EXTENSIONS = [".png", ".jpg", ".jpeg", ".webp"];

function isSameCalendarDay(value: string | Date | null | undefined, selectedDate: string): boolean {
  if (!value) {
    return false;
  }

  return dayjs(value).format("YYYY-MM-DD") === selectedDate;
}

export function CompanyDetailsPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const dispatch = useAppDispatch();
  const { hasPermission, user } = useAuth();

  const {
    tab,
    selectedDate,
    loading,
    saving,
    error,
    company,
    activities,
    kpis,
    users,
    contactForm,
    addressForm,
    documentTitle,
    documentDescription,
    documentFile,
    contractForm,
    personalInfoForm,
    taskModalOpen,
    contactModalOpen,
    addressModalOpen,
    documentModalOpen,
    contractModalOpen,
    personalInfoModalOpen,
    activitiesPage,
    activitiesPageSize,
    contactsPage,
    contactsPageSize,
    documentsPage,
    documentsPageSize,
    contractsPage,
    contractsPageSize
  } = useAppSelector((state) => state.companyDetails);

  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [croppedLogoBlob, setCroppedLogoBlob] = useState<Blob | undefined>(undefined);
  const [croppedLogoFileName, setCroppedLogoFileName] = useState<string | undefined>(undefined);

  const canReadUsers = hasPermission(PERMISSIONS.USERS_READ);
  const canReadDocuments = hasPermission(PERMISSIONS.DOCUMENTS_READ);
  const canWriteDocuments = hasPermission(PERMISSIONS.DOCUMENTS_WRITE);
  const canReadContracts = hasPermission(PERMISSIONS.CONTRACTS_READ);
  const canWriteContracts = hasPermission(PERMISSIONS.CONTRACTS_WRITE);
  const canReadContractValues = hasPermission(PERMISSIONS.CONTRACT_VALUES_READ);

  const usersForActivities = useMemo(() => {
    if (users.length) return users;
    if (user) return [{ ...user }];
    return [];
  }, [users, user]);

  useEffect(() => {
    if (!id) {
      return;
    }

    dispatch(setCompanyId(id));
    void dispatch(fetchCompanyDetails({ companyId: id, canReadUsers, date: selectedDate }));
  }, [dispatch, id, canReadUsers, selectedDate]);

  useEffect(() => {
    if (error) {
      notifyError("Empresa", error);
      dispatch(clearCompanyDetailsError());
    }
  }, [dispatch, error]);

  const pagedActivities = useMemo(() => {
    const start = (activitiesPage - 1) * activitiesPageSize;
    return activities.slice(start, start + activitiesPageSize);
  }, [activities, activitiesPage, activitiesPageSize]);

  const contacts = company?.contacts ?? [];
  const documents = company?.documents ?? [];
  const contracts = company?.contracts ?? [];
  const filteredContacts = useMemo(
    () => contacts.filter((item) => isSameCalendarDay(item.createdAt, selectedDate)),
    [contacts, selectedDate]
  );
  const filteredDocuments = useMemo(
    () => documents.filter((item) => isSameCalendarDay(item.createdAt, selectedDate)),
    [documents, selectedDate]
  );
  const filteredContracts = useMemo(
    () => contracts.filter((item) => isSameCalendarDay(item.createdAt, selectedDate)),
    [contracts, selectedDate]
  );

  const pagedContacts = useMemo(() => {
    const start = (contactsPage - 1) * contactsPageSize;
    return filteredContacts.slice(start, start + contactsPageSize);
  }, [filteredContacts, contactsPage, contactsPageSize]);

  const pagedDocuments = useMemo(() => {
    const start = (documentsPage - 1) * documentsPageSize;
    return filteredDocuments.slice(start, start + documentsPageSize);
  }, [filteredDocuments, documentsPage, documentsPageSize]);

  const pagedContracts = useMemo(() => {
    const start = (contractsPage - 1) * contractsPageSize;
    return filteredContracts.slice(start, start + contractsPageSize);
  }, [filteredContracts, contractsPage, contractsPageSize]);

  const activitiesColumns: TableProps<Activity>["columns"] = [
    { title: "Ordem", dataIndex: "orderExec", key: "orderExec", width: 80 },
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
    { title: "Atividade", key: "title", render: (_, record) => record.title },
    { title: "Direcionado a", key: "responsavel", render: (_, record) => record.assignedTo.name },
    {
      title: "Atualizada em",
      key: "updatedAt",
      render: (_, record) => formatDateTime(record.updatedAt)
    },
    {
      title: "Acoes",
      key: "acoes",
      render: (_, record) => (
        <AppButton size="small" onClick={() => navigate(`/atividades/${record.id}`)}>
          Detalhes
        </AppButton>
      )
    }
  ];

  const contactsColumns: TableProps<CompanyContact>["columns"] = [
    { title: "Nome", key: "name", render: (_, record) => record.name },
    { title: "Cargo", key: "role", render: (_, record) => record.role ?? "-" },
    { title: "Telefone", key: "phone", render: (_, record) => record.phone ?? "-" },
    { title: "Email", key: "email", render: (_, record) => record.email ?? "-" }
  ];

  const documentsColumns: TableProps<DocumentItem>["columns"] = [
    { title: "Titulo", key: "title", render: (_, record) => record.title },
    { title: "Descricao", key: "description", render: (_, record) => record.description ?? "-" },
    { title: "Criado em", key: "createdAt", render: (_, record) => formatDateTime(record.createdAt) },
    {
      title: "Acoes",
      key: "actions",
      render: (_, record) => (
        <div className="status-actions">
          <AppButton size="small" onClick={() => window.open(resolveDocumentUrl(record.filePath), "_blank")}>
            Abrir
          </AppButton>
          {canWriteDocuments && (
            <AppButton
              size="small"
              onClick={() => {
                showConfirmDialog({
                  title: "Arquivar documento",
                  content: "Deseja arquivar este documento?",
                  onConfirm: async () => {
                    await dispatch(archiveCompanyDocument({ documentId: record.id })).unwrap();
                    notifySuccess("Documento arquivado");
                  }
                });
              }}
            >
              Arquivar
            </AppButton>
          )}
        </div>
      )
    }
  ];

  const contractsColumns: TableProps<Contract>["columns"] = [
    { title: "Criado em", key: "createdAt", render: (_, record) => formatDate(record.createdAt) },
    {
      title: "Valor",
      key: "value",
      render: (_, record) => (canReadContractValues ? formatCurrency(record.value) : "Sem permissao")
    },
    { title: "Ciclo", key: "billingCycle", render: (_, record) => record.billingCycle ?? "-" },
    { title: "Vencimento", key: "dueDay", render: (_, record) => record.dueDay ?? "-" },
    { title: "Documentos", key: "docs", render: (_, record) => record.documents.length }
  ];

  if (!id) {
    return <div className="card">Empresa invalida.</div>;
  }

  if (loading) {
    return <div className="card">Carregando dados da empresa...</div>;
  }

  if (!company) {
    return <div className="card">Empresa nao encontrada.</div>;
  }

  const companyLogoUrl = resolveCompanyLogoUrl(company.logoPath);

  return (
    <div className="page">
      <div className="page-header">
        <div className="company-header-block">
          {companyLogoUrl ? (
            <img src={companyLogoUrl} alt={company.name} className="company-logo-avatar" />
          ) : (
            <div className="company-logo-placeholder">{company.name.slice(0, 2).toUpperCase()}</div>
          )}
          <div>
            <h1>{company.name}</h1>
            <p className="subtitle">{company.personalResponsible ?? "Sem responsavel cadastrado"}</p>
          </div>
        </div>
        <AppButton type="primary" onClick={() => dispatch(openCompanyTaskModal())}>
          Nova tarefa
        </AppButton>
      </div>

      <div className="company-date-filter-row">
        <InlineDateNavigator
          value={selectedDate}
          onChange={(nextValue) => dispatch(setCompanyDetailsDate(nextValue))}
        />
      </div>

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

      <AppTabs
        activeKey={tab}
        onChange={(nextKey) => dispatch(setCompanyDetailsTab(nextKey as CompanyDetailsTab))}
        items={[
          { key: "activities", label: "Atividades" },
          { key: "contacts", label: "Contatos" },
          { key: "address", label: "Endereco" },
          { key: "documents", label: "Documentos" },
          { key: "contracts", label: "Contrato & Pagamento" },
          { key: "personal-info", label: "Informacoes Pessoais" }
        ]}
      />

      {tab === "activities" && (
        <div className="card card-stack">
          <AppTable<Activity>
            rowKey="id"
            columns={activitiesColumns}
            dataSource={pagedActivities}
            pagination={false}
          />
          <div className="filters-actions" style={{ justifyContent: "flex-end" }}>
            <AppPagination
              current={activitiesPage}
              pageSize={activitiesPageSize}
              total={activities.length}
              showSizeChanger
              onChange={(nextPage, nextSize) => {
                dispatch(setActivitiesPage(nextPage));
                if (nextSize !== activitiesPageSize) {
                  dispatch(setActivitiesPageSize(nextSize));
                }
              }}
            />
          </div>
        </div>
      )}

      {tab === "contacts" && (
        <div className="card card-stack">
          {hasPermission(PERMISSIONS.COMPANIES_WRITE) && (
            <div className="filters-actions">
              <AppButton type="primary" onClick={() => dispatch(openContactModal())}>
                Novo contato
              </AppButton>
            </div>
          )}

          <AppTable<CompanyContact>
            rowKey="id"
            columns={contactsColumns}
            dataSource={pagedContacts}
            pagination={false}
          />

          <div className="filters-actions" style={{ justifyContent: "flex-end" }}>
            <AppPagination
              current={contactsPage}
              pageSize={contactsPageSize}
              total={filteredContacts.length}
              showSizeChanger
              onChange={(nextPage, nextSize) => {
                dispatch(setContactsPage(nextPage));
                if (nextSize !== contactsPageSize) {
                  dispatch(setContactsPageSize(nextSize));
                }
              }}
            />
          </div>
        </div>
      )}

      {tab === "address" && (
        <div className="card card-stack">
          <div className="filters-actions">
            {hasPermission(PERMISSIONS.COMPANIES_WRITE) ? (
              <AppButton type="primary" onClick={() => dispatch(openAddressModal())}>
                Editar endereco
              </AppButton>
            ) : (
              <span>Sem permissao para editar endereco.</span>
            )}
          </div>

          <div className="company-info-grid">
            <div><strong>Rua:</strong> {company.address?.street ?? "-"}</div>
            <div><strong>Numero:</strong> {company.address?.number ?? "-"}</div>
            <div><strong>Complemento:</strong> {company.address?.complement ?? "-"}</div>
            <div><strong>Bairro:</strong> {company.address?.district ?? "-"}</div>
            <div><strong>Cidade:</strong> {company.address?.city ?? "-"}</div>
            <div><strong>UF:</strong> {company.address?.state ?? "-"}</div>
            <div><strong>CEP:</strong> {company.address?.zipCode ?? "-"}</div>
          </div>
        </div>
      )}

      {tab === "documents" && (
        <div className="card card-stack">
          {!canReadDocuments ? (
            <div className="card">Sem permissao para visualizar documentos.</div>
          ) : (
            <>
              {canWriteDocuments && (
                <div className="filters-actions">
                  <AppButton type="primary" onClick={() => dispatch(openDocumentModal())}>
                    Novo documento
                  </AppButton>
                </div>
              )}

              <AppTable<DocumentItem>
                rowKey="id"
                columns={documentsColumns}
                dataSource={pagedDocuments}
                pagination={false}
              />

              <div className="filters-actions" style={{ justifyContent: "flex-end" }}>
                <AppPagination
                  current={documentsPage}
                  pageSize={documentsPageSize}
                  total={filteredDocuments.length}
                  showSizeChanger
                  onChange={(nextPage, nextSize) => {
                    dispatch(setDocumentsPage(nextPage));
                    if (nextSize !== documentsPageSize) {
                      dispatch(setDocumentsPageSize(nextSize));
                    }
                  }}
                />
              </div>
            </>
          )}
        </div>
      )}

      {tab === "contracts" && (
        <div className="card card-stack">
          {!canReadContracts ? (
            <div className="card">Sem permissao para visualizar contratos.</div>
          ) : (
            <>
              {canWriteContracts && (
                <div className="filters-actions">
                  <AppButton type="primary" onClick={() => dispatch(openContractModal())}>
                    Novo contrato
                  </AppButton>
                </div>
              )}

              <AppTable<Contract>
                rowKey="id"
                columns={contractsColumns}
                dataSource={pagedContracts}
                pagination={false}
              />

              <div className="filters-actions" style={{ justifyContent: "flex-end" }}>
                <AppPagination
                  current={contractsPage}
                  pageSize={contractsPageSize}
                  total={filteredContracts.length}
                  showSizeChanger
                  onChange={(nextPage, nextSize) => {
                    dispatch(setContractsPage(nextPage));
                    if (nextSize !== contractsPageSize) {
                      dispatch(setContractsPageSize(nextSize));
                    }
                  }}
                />
              </div>
            </>
          )}
        </div>
      )}

      {tab === "personal-info" && (
        <div className="card card-stack">
          <div className="filters-actions">
            {hasPermission(PERMISSIONS.COMPANIES_WRITE) ? (
              <AppButton type="primary" onClick={() => dispatch(openPersonalInfoModal())}>
                Editar informacoes pessoais
              </AppButton>
            ) : (
              <span>Sem permissao para editar informacoes pessoais.</span>
            )}
          </div>

          <div className="company-info-grid">
            <div><strong>Documento:</strong> {company.personalDocument ?? "-"}</div>
            <div><strong>E-mail:</strong> {company.personalEmail ?? "-"}</div>
            <div><strong>Telefone:</strong> {company.personalPhone ?? "-"}</div>
            <div><strong>Responsavel:</strong> {company.personalResponsible ?? "-"}</div>
            <div><strong>Observacoes:</strong> {company.personalNotes ?? "-"}</div>
          </div>
        </div>
      )}

      <NewTaskModal
        open={taskModalOpen}
        loading={saving}
        companies={[company]}
        users={usersForActivities}
        defaultCompanyId={company.id}
        onCancel={() => dispatch(closeCompanyTaskModal())}
        onSubmit={async (payload) => {
          const result = await dispatch(createCompanyTask(payload));
          if (createCompanyTask.fulfilled.match(result)) {
            notifySuccess("Nova tarefa criada");
          }
        }}
      />

      <AppModal
        open={contactModalOpen}
        title="Novo contato"
        onCancel={() => dispatch(closeContactModal())}
        footer={[
          <AppButton key="cancel" onClick={() => dispatch(closeContactModal())}>
            Cancelar
          </AppButton>,
          <AppButton
            key="save"
            type="primary"
            loading={saving}
            onClick={async () => {
              const result = await dispatch(createCompanyContact());
              if (createCompanyContact.fulfilled.match(result)) {
                notifySuccess("Contato salvo");
              }
            }}
          >
            Salvar
          </AppButton>
        ]}
      >
        <div className="form-grid">
          <AppInput
            placeholder="Nome"
            value={contactForm.name}
            onChange={(event) => dispatch(setContactForm({ name: event.target.value }))}
          />
          <AppInput
            placeholder="Cargo"
            value={contactForm.role}
            onChange={(event) => dispatch(setContactForm({ role: event.target.value }))}
          />
          <AppInput
            placeholder="Telefone"
            value={contactForm.phone}
            onChange={(event) => dispatch(setContactForm({ phone: event.target.value }))}
          />
          <AppInput
            placeholder="E-mail"
            value={contactForm.email}
            onChange={(event) => dispatch(setContactForm({ email: event.target.value }))}
          />
        </div>
      </AppModal>

      <AppModal
        open={addressModalOpen}
        title="Editar endereco"
        onCancel={() => dispatch(closeAddressModal())}
        footer={[
          <AppButton key="cancel" onClick={() => dispatch(closeAddressModal())}>
            Cancelar
          </AppButton>,
          <AppButton
            key="save"
            type="primary"
            loading={saving}
            onClick={async () => {
              const result = await dispatch(saveCompanyAddress());
              if (saveCompanyAddress.fulfilled.match(result)) {
                notifySuccess("Endereco salvo");
              }
            }}
          >
            Salvar
          </AppButton>
        ]}
      >
        <div className="form-grid">
          <AppInput
            placeholder="Rua"
            value={addressForm.street}
            onChange={(event) => dispatch(setAddressForm({ street: event.target.value }))}
          />
          <AppInput
            placeholder="Numero"
            value={addressForm.number}
            onChange={(event) => dispatch(setAddressForm({ number: event.target.value }))}
          />
          <AppInput
            placeholder="Complemento"
            value={addressForm.complement}
            onChange={(event) => dispatch(setAddressForm({ complement: event.target.value }))}
          />
          <AppInput
            placeholder="Bairro"
            value={addressForm.district}
            onChange={(event) => dispatch(setAddressForm({ district: event.target.value }))}
          />
          <AppInput
            placeholder="Cidade"
            value={addressForm.city}
            onChange={(event) => dispatch(setAddressForm({ city: event.target.value }))}
          />
          <AppInput
            placeholder="UF"
            maxLength={2}
            value={addressForm.state}
            onChange={(event) => dispatch(setAddressForm({ state: event.target.value.toUpperCase() }))}
          />
          <AppInput
            placeholder="CEP"
            value={addressForm.zipCode}
            onChange={(event) => dispatch(setAddressForm({ zipCode: event.target.value }))}
          />
        </div>
      </AppModal>

      <AppModal
        open={documentModalOpen}
        title="Novo documento"
        onCancel={() => dispatch(closeDocumentModal())}
        footer={[
          <AppButton key="cancel" onClick={() => dispatch(closeDocumentModal())}>
            Cancelar
          </AppButton>,
          <AppButton
            key="save"
            type="primary"
            loading={saving}
            onClick={async () => {
              const result = await dispatch(uploadCompanyDocument());
              if (uploadCompanyDocument.fulfilled.match(result)) {
                notifySuccess("Documento enviado");
              }
            }}
          >
            Salvar
          </AppButton>
        ]}
      >
        <div className="form-grid">
          <AppInput
            placeholder="Titulo"
            value={documentTitle}
            onChange={(event) => dispatch(setDocumentTitle(event.target.value))}
          />
          <AppInput
            placeholder="Descricao"
            value={documentDescription}
            onChange={(event) => dispatch(setDocumentDescription(event.target.value))}
          />
          <div style={{ gridColumn: "1 / -1" }}>
            <AppFileDragger
              value={documentFile}
              onChange={(file) => dispatch(setDocumentFile(file))}
              acceptedMimeTypes={ACCEPTED_DOCUMENT_MIME_TYPES}
              acceptedExtensions={ACCEPTED_DOCUMENT_EXTENSIONS}
              title="Arraste .doc, .docx ou .pdf"
              description="Ou clique para selecionar um arquivo"
            />
          </div>
        </div>
      </AppModal>

      <AppModal
        open={contractModalOpen}
        title="Novo contrato"
        onCancel={() => dispatch(closeContractModal())}
        footer={[
          <AppButton key="cancel" onClick={() => dispatch(closeContractModal())}>
            Cancelar
          </AppButton>,
          <AppButton
            key="save"
            type="primary"
            loading={saving}
            onClick={async () => {
              const result = await dispatch(createCompanyContract());
              if (createCompanyContract.fulfilled.match(result)) {
                notifySuccess("Contrato salvo");
              }
            }}
          >
            Salvar
          </AppButton>
        ]}
      >
        <div className="form-grid">
          {canReadContractValues && (
            <AppInput
              placeholder="Valor"
              value={contractForm.value}
              onChange={(event) => dispatch(setContractForm({ value: event.target.value }))}
            />
          )}
          <AppInput
            placeholder="Ciclo de pagamento"
            value={contractForm.billingCycle}
            onChange={(event) => dispatch(setContractForm({ billingCycle: event.target.value }))}
          />
          <AppInput
            type="number"
            min={1}
            max={31}
            placeholder="Dia de vencimento"
            value={contractForm.dueDay}
            onChange={(event) => dispatch(setContractForm({ dueDay: event.target.value }))}
          />
          <AppInput
            placeholder="Observacoes"
            value={contractForm.notes}
            onChange={(event) => dispatch(setContractForm({ notes: event.target.value }))}
          />
          <DashboardFilterSelect
            mode="multiple"
            value={contractForm.documentIds}
            placeholder="Documentos vinculados"
            options={documents.map((document) => ({ value: document.id, label: document.title }))}
            onChange={(value) => dispatch(setContractForm({ documentIds: value as string[] }))}
          />
        </div>
      </AppModal>

      <AppModal
        open={personalInfoModalOpen}
        title="Informacoes pessoais"
        onCancel={() => dispatch(closePersonalInfoModal())}
        footer={[
          <AppButton key="cancel" onClick={() => dispatch(closePersonalInfoModal())}>
            Cancelar
          </AppButton>,
          <AppButton
            key="save"
            type="primary"
            loading={saving}
            onClick={async () => {
              const result = await dispatch(
                saveCompanyPersonalInfo({
                  croppedLogoBlob,
                  logoFileName: croppedLogoFileName
                })
              );
              if (saveCompanyPersonalInfo.fulfilled.match(result)) {
                notifySuccess("Informacoes pessoais salvas");
                setCroppedLogoBlob(undefined);
                setCroppedLogoFileName(undefined);
              }
            }}
          >
            Salvar
          </AppButton>
        ]}
      >
        <div className="form-grid">
          <AppInput
            placeholder="Documento"
            value={personalInfoForm.personalDocument}
            onChange={(event) => dispatch(setPersonalInfoForm({ personalDocument: event.target.value }))}
          />
          <AppInput
            placeholder="E-mail"
            value={personalInfoForm.personalEmail}
            onChange={(event) => dispatch(setPersonalInfoForm({ personalEmail: event.target.value }))}
          />
          <AppInput
            placeholder="Telefone"
            value={personalInfoForm.personalPhone}
            onChange={(event) => dispatch(setPersonalInfoForm({ personalPhone: event.target.value }))}
          />
          <AppInput
            placeholder="Responsavel"
            value={personalInfoForm.personalResponsible}
            onChange={(event) => dispatch(setPersonalInfoForm({ personalResponsible: event.target.value }))}
          />
          <div style={{ gridColumn: "1 / -1" }}>
            <AppInput
              placeholder="Observacoes"
              value={personalInfoForm.personalNotes}
              onChange={(event) => dispatch(setPersonalInfoForm({ personalNotes: event.target.value }))}
            />
          </div>

          <div style={{ gridColumn: "1 / -1" }}>
            <AppFileDragger
              value={personalInfoForm.logoFile}
              onChange={(file) => {
                dispatch(setPersonalInfoForm({ logoFile: file }));
                setCroppedLogoBlob(undefined);
                setCroppedLogoFileName(undefined);
              }}
              acceptedMimeTypes={ACCEPTED_IMAGE_MIME_TYPES}
              acceptedExtensions={ACCEPTED_IMAGE_EXTENSIONS}
              title="Arraste a logo (PNG, JPG ou WEBP)"
              description="Selecione e recorte para melhor resultado"
            />
          </div>

          {personalInfoForm.logoFile && (
            <div className="form-actions" style={{ gridColumn: "1 / -1" }}>
              <AppButton onClick={() => setCropModalOpen(true)}>Recortar logo</AppButton>
              {croppedLogoBlob && <AppTag color="green">Logo recortada pronta</AppTag>}
            </div>
          )}
        </div>
      </AppModal>

      <LogoCropperModal
        open={cropModalOpen}
        file={personalInfoForm.logoFile}
        onCancel={() => setCropModalOpen(false)}
        onConfirm={(payload) => {
          setCroppedLogoBlob(payload.blob);
          setCroppedLogoFileName(payload.fileName);
          setCropModalOpen(false);
          notifySuccess("Recorte aplicado", "A logo recortada sera enviada ao salvar.");
        }}
      />
    </div>
  );
}
