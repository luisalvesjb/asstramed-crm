import { useEffect, useMemo, useState } from "react";
import { AxiosError } from "axios";
import { TableProps } from "antd";
import { PERMISSIONS } from "../constants/permissions";
import { useAuth } from "../context/AuthContext";
import { api } from "../services/api";
import { Permission, Profile, ProfilesResponse } from "../types/api";
import { AppButton, AppCheckbox, AppInput, AppModal, AppTable, AppTag } from "../ui/components";
import { notifyError, notifySuccess, showConfirmDialog } from "../ui/feedback/notifications";

const PERMISSION_LABEL_ALIAS: Record<string, string> = {
  "dashboard.read": "Visualizar dashboard",
  "activities.read": "Visualizar atividades",
  "activities.create": "Criar atividades",
  "activities.finish": "Concluir atividades",
  "companies.read": "Visualizar empresas",
  "companies.write": "Cadastrar/editar empresas",
  "documents.read": "Visualizar documentos",
  "documents.write": "Enviar/arquivar documentos",
  "contracts.read": "Visualizar contratos",
  "contracts.write": "Criar contratos",
  "contracts.values.read": "Visualizar valores de contrato",
  "users.read": "Visualizar usuarios",
  "users.write": "Criar/editar usuarios",
  "users.profile.edit": "Editar dados e perfil de usuarios",
  "users.activate": "Ativar/inativar usuarios",
  "users.delete": "Excluir usuarios",
  "permissions.manage": "Gerenciar permissoes",
  "reports.read": "Visualizar relatorios",
  "finance.read": "Visualizar financeiro",
  "finance.write": "Criar/editar lancamentos financeiros",
  "finance.settings": "Gerenciar configuracoes financeiras",
  "finance.reports": "Visualizar relatorios financeiros"
};

interface ProfileFormState {
  id?: string;
  name: string;
  key: string;
  description: string;
  isActive: boolean;
  isAdmin: boolean;
}

const EMPTY_PROFILE_FORM: ProfileFormState = {
  name: "",
  key: "",
  description: "",
  isActive: true,
  isAdmin: false
};

export function ProfilesPage() {
  const { hasPermission, user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [permissionsCatalog, setPermissionsCatalog] = useState<Permission[]>([]);

  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [permissionsModalOpen, setPermissionsModalOpen] = useState(false);
  const [profileForm, setProfileForm] = useState<ProfileFormState>(EMPTY_PROFILE_FORM);
  const [selectedProfileId, setSelectedProfileId] = useState<string>("");
  const [draftPermissionKeys, setDraftPermissionKeys] = useState<string[]>([]);

  const canManage = hasPermission(PERMISSIONS.PERMISSIONS_MANAGE);
  const selectedProfile = useMemo(
    () => profiles.find((item) => item.id === selectedProfileId) ?? null,
    [profiles, selectedProfileId]
  );

  const selectedProfileIsAdmin = Boolean(selectedProfile?.isAdmin);
  const canToggleAdmin = Boolean(user?.isAdmin);

  const columns: TableProps<Profile>["columns"] = [
    {
      title: "Perfil",
      key: "name",
      render: (_, record) => (
        <div>
          <strong>{record.name}</strong>
          <div>{record.key}</div>
        </div>
      )
    },
    {
      title: "Tipo",
      key: "type",
      render: (_, record) => (record.isSystem ? "Sistema" : "Customizado")
    },
    {
      title: "Administrador",
      key: "isAdmin",
      render: (_, record) => (record.isAdmin ? <AppTag color="green">Sim</AppTag> : <AppTag color="blue">Nao</AppTag>)
    },
    {
      title: "Status",
      key: "isActive",
      render: (_, record) => (record.isActive ? <AppTag color="green">Ativo</AppTag> : <AppTag color="red">Inativo</AppTag>)
    },
    {
      title: "Usuarios",
      key: "users",
      render: (_, record) => record.userCount
    },
    {
      title: "Permissoes",
      key: "permissions",
      render: (_, record) => record.permissionKeys.length
    },
    {
      title: "Acoes",
      key: "actions",
      render: (_, record) => (
        <div className="status-actions">
          <AppButton size="small" onClick={() => openEditProfileModal(record)}>
            Editar
          </AppButton>
          <AppButton size="small" onClick={() => openPermissionsModal(record)}>
            Permissoes
          </AppButton>
          {!record.isSystem && (
            <AppButton
              size="small"
              danger
              onClick={() => {
                showConfirmDialog({
                  title: "Excluir perfil",
                  content: "Deseja excluir este perfil?",
                  onConfirm: async () => {
                    await handleDeleteProfile(record.id);
                  }
                });
              }}
            >
              Excluir
            </AppButton>
          )}
        </div>
      )
    }
  ];

  async function loadProfiles() {
    setLoading(true);

    try {
      const response = await api.get<ProfilesResponse>("/profiles");
      setProfiles(response.data.profiles);
      setPermissionsCatalog(response.data.permissionsCatalog);
    } catch {
      notifyError("Perfis", "Falha ao carregar perfis.");
      setProfiles([]);
      setPermissionsCatalog([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!canManage) {
      return;
    }

    void loadProfiles();
  }, [canManage]);

  function openCreateProfileModal() {
    setProfileForm(EMPTY_PROFILE_FORM);
    setProfileModalOpen(true);
  }

  function openEditProfileModal(profile: Profile) {
    setProfileForm({
      id: profile.id,
      name: profile.name,
      key: profile.key,
      description: profile.description ?? "",
      isActive: profile.isActive,
      isAdmin: profile.isAdmin
    });
    setProfileModalOpen(true);
  }

  function openPermissionsModal(profile: Profile) {
    setSelectedProfileId(profile.id);
    setDraftPermissionKeys(profile.permissionKeys);
    setPermissionsModalOpen(true);
  }

  async function handleSaveProfile() {
    if (!profileForm.name.trim()) {
      notifyError("Perfis", "Informe o nome do perfil.");
      return;
    }

    setSaving(true);

    try {
      if (profileForm.id) {
        await api.patch(`/profiles/${profileForm.id}`, {
          name: profileForm.name.trim(),
          key: profileForm.key.trim() || undefined,
          description: profileForm.description.trim() || null,
          isActive: profileForm.isActive,
          isAdmin: canToggleAdmin ? profileForm.isAdmin : undefined
        });
      } else {
        await api.post("/profiles", {
          name: profileForm.name.trim(),
          key: profileForm.key.trim() || undefined,
          description: profileForm.description.trim() || null,
          isActive: profileForm.isActive,
          isAdmin: canToggleAdmin ? profileForm.isAdmin : false,
          permissionKeys: []
        });
      }

      notifySuccess(profileForm.id ? "Perfil atualizado" : "Perfil criado");
      setProfileModalOpen(false);
      await loadProfiles();
    } catch (error) {
      const message =
        error instanceof AxiosError
          ? (error.response?.data?.message as string | undefined)
          : "Falha ao salvar perfil.";
      notifyError("Perfis", message ?? "Falha ao salvar perfil.");
    } finally {
      setSaving(false);
    }
  }

  function togglePermission(permissionKey: string) {
    setDraftPermissionKeys((prev) =>
      prev.includes(permissionKey) ? prev.filter((item) => item !== permissionKey) : [...prev, permissionKey]
    );
  }

  async function handleSavePermissions() {
    if (!selectedProfile || selectedProfileIsAdmin) {
      return;
    }

    setSaving(true);

    try {
      await api.put(`/profiles/${selectedProfile.id}/permissions`, {
        permissionKeys: draftPermissionKeys
      });
      notifySuccess("Permissoes atualizadas");
      setPermissionsModalOpen(false);
      await loadProfiles();
    } catch (error) {
      const message =
        error instanceof AxiosError
          ? (error.response?.data?.message as string | undefined)
          : "Falha ao salvar permissoes.";
      notifyError("Perfis", message ?? "Falha ao salvar permissoes.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteProfile(profileId: string) {
    try {
      await api.delete(`/profiles/${profileId}`);
      notifySuccess("Perfil excluido");
      await loadProfiles();
    } catch (error) {
      const message =
        error instanceof AxiosError
          ? (error.response?.data?.message as string | undefined)
          : "Falha ao excluir perfil.";
      notifyError("Perfis", message ?? "Falha ao excluir perfil.");
    }
  }

  if (!canManage) {
    return (
      <div className="card">
        <h3>Acesso negado</h3>
        <p>Sem permissao para gerenciar perfis.</p>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1>Perfis</h1>
        <AppButton type="primary" onClick={openCreateProfileModal}>
          Novo Perfil
        </AppButton>
      </div>

      <AppTable<Profile>
        rowKey="id"
        loading={loading}
        columns={columns}
        dataSource={profiles}
        pagination={false}
      />

      <AppModal
        open={profileModalOpen}
        title={profileForm.id ? "Editar perfil" : "Novo perfil"}
        onCancel={() => setProfileModalOpen(false)}
        footer={[
          <AppButton key="cancel" onClick={() => setProfileModalOpen(false)}>
            Cancelar
          </AppButton>,
          <AppButton key="save" type="primary" loading={saving} onClick={() => void handleSaveProfile()}>
            Salvar
          </AppButton>
        ]}
      >
        <div className="form-grid">
          <AppInput
            placeholder="Nome do perfil"
            value={profileForm.name}
            onChange={(event) => setProfileForm((prev) => ({ ...prev, name: event.target.value }))}
          />
          <AppInput
            placeholder="Chave (opcional)"
            value={profileForm.key}
            onChange={(event) => setProfileForm((prev) => ({ ...prev, key: event.target.value }))}
            disabled={Boolean(profileForm.id && profiles.find((item) => item.id === profileForm.id)?.isSystem)}
          />
          <AppInput
            placeholder="Descricao"
            value={profileForm.description}
            onChange={(event) => setProfileForm((prev) => ({ ...prev, description: event.target.value }))}
          />
          <label className="permission-item" style={{ gridColumn: "1 / -1" }}>
            <AppCheckbox
              checked={profileForm.isActive}
              onChange={(event) =>
                setProfileForm((prev) => ({ ...prev, isActive: Boolean(event.target.checked) }))
              }
            />
            <div>
              <strong>Perfil ativo</strong>
            </div>
          </label>
          <label className="permission-item" style={{ gridColumn: "1 / -1" }}>
            <AppCheckbox
              checked={profileForm.isAdmin}
              disabled={!canToggleAdmin}
              onChange={(event) =>
                setProfileForm((prev) => ({ ...prev, isAdmin: Boolean(event.target.checked) }))
              }
            />
            <div>
              <strong>Perfil administrador</strong>
              {!canToggleAdmin && <div>Apenas admin pode alterar esta flag.</div>}
            </div>
          </label>
        </div>
      </AppModal>

      <AppModal
        open={permissionsModalOpen && Boolean(selectedProfile)}
        title={selectedProfile ? `Permissoes: ${selectedProfile.name}` : "Permissoes"}
        width={860}
        onCancel={() => setPermissionsModalOpen(false)}
        footer={[
          <AppButton key="cancel" onClick={() => setPermissionsModalOpen(false)}>
            Fechar
          </AppButton>,
          <AppButton
            key="save"
            type="primary"
            onClick={() => void handleSavePermissions()}
            loading={saving}
            disabled={selectedProfileIsAdmin}
          >
            Salvar permissoes
          </AppButton>
        ]}
      >
        {selectedProfileIsAdmin && (
          <div className="card" style={{ marginBottom: 12 }}>
            Perfis administradores possuem acesso total e nao aceitam edicao manual de permissoes.
          </div>
        )}

        <div className="permissions-grid">
          {permissionsCatalog.map((permission) => (
            <label key={permission.id} className="permission-item">
              <AppCheckbox
                checked={draftPermissionKeys.includes(permission.key)}
                disabled={selectedProfileIsAdmin}
                onChange={() => togglePermission(permission.key)}
              />
              <div>
                <strong>{permission.description || PERMISSION_LABEL_ALIAS[permission.key] || permission.key}</strong>
                <div>{permission.key}</div>
              </div>
            </label>
          ))}
        </div>
      </AppModal>
    </div>
  );
}
