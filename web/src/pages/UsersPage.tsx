import { useEffect, useMemo, useState } from "react";
import { AxiosError } from "axios";
import { TableProps } from "antd";
import { PERMISSIONS } from "../constants/permissions";
import { useAuth } from "../context/AuthContext";
import { api } from "../services/api";
import { ApiUser, Profile, ProfilesResponse } from "../types/api";
import { AppButton, AppInput, AppModal, AppSelect, AppTable, AppTag } from "../ui/components";
import { notifyError, notifySuccess, showConfirmDialog } from "../ui/feedback/notifications";
import { formatDateTime } from "../utils/format";

export function UsersPage() {
  const { hasPermission, user } = useAuth();
  const [users, setUsers] = useState<ApiUser[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string>("");

  const [createForm, setCreateForm] = useState({
    name: "",
    email: "",
    password: "",
    profileId: ""
  });

  const [editForm, setEditForm] = useState({
    name: "",
    email: "",
    profileId: ""
  });

  const canCreate = hasPermission(PERMISSIONS.USERS_WRITE);
  const canEditProfile = hasPermission(PERMISSIONS.USERS_PROFILE_EDIT);
  const canActivate = hasPermission(PERMISSIONS.USERS_ACTIVATE);
  const canDelete = hasPermission(PERMISSIONS.USERS_DELETE);

  const selectedUser = useMemo(
    () => users.find((item) => item.id === selectedUserId) ?? null,
    [users, selectedUserId]
  );

  const profileOptions = useMemo(
    () =>
      profiles
        .filter((profile) => profile.isActive || profile.id === createForm.profileId || profile.id === editForm.profileId)
        .map((profile) => ({
          value: profile.id,
          label: profile.name
        })),
    [profiles, createForm.profileId, editForm.profileId]
  );

  const columns: TableProps<ApiUser>["columns"] = [
    {
      title: "Nome",
      key: "name",
      render: (_, record) => record.name
    },
    {
      title: "E-mail",
      key: "email",
      render: (_, record) => record.email
    },
    {
      title: "Perfil",
      key: "profile",
      render: (_, record) => record.profileName
    },
    {
      title: "Status",
      key: "isActive",
      render: (_, record) =>
        record.isActive ? <AppTag color="green">Ativo</AppTag> : <AppTag color="red">Inativo</AppTag>
    },
    {
      title: "Ultimo Acesso",
      key: "lastAccessAt",
      render: (_, record) => formatDateTime(record.lastAccessAt ?? null)
    },
    {
      title: "Acoes",
      key: "actions",
      render: (_, record) => (
        <div className="status-actions">
          {canEditProfile && (
            <AppButton size="small" onClick={() => openEditModal(record)}>
              Editar
            </AppButton>
          )}
          {canActivate && (
            <AppButton
              size="small"
              onClick={() => {
                showConfirmDialog({
                  title: record.isActive ? "Inativar usuario" : "Ativar usuario",
                  content: record.isActive
                    ? "Deseja remover o acesso deste usuario?"
                    : "Deseja restaurar o acesso deste usuario?",
                  onConfirm: async () => {
                    await updateUserActive(record.id, !record.isActive);
                  }
                });
              }}
            >
              {record.isActive ? "Inativar" : "Ativar"}
            </AppButton>
          )}
          {canDelete && (
            <AppButton
              size="small"
              danger
              onClick={() => {
                showConfirmDialog({
                  title: "Excluir usuario",
                  content: "Deseja excluir este usuario?",
                  onConfirm: async () => {
                    await deleteUser(record.id);
                  }
                });
              }}
            >
              Excluir
            </AppButton>
          )}
          {!canEditProfile && !canActivate && !canDelete && "-"}
        </div>
      )
    }
  ];

  function ensureDefaultProfileId(nextProfiles: Profile[]) {
    const firstActive = nextProfiles.find((profile) => profile.isActive) ?? nextProfiles[0];
    const defaultId = firstActive?.id ?? "";

    setCreateForm((prev) => ({
      ...prev,
      profileId: prev.profileId || defaultId
    }));
  }

  async function loadUsersAndProfiles() {
    setLoading(true);
    setError(null);

    try {
      const [usersResponse, profilesResponse] = await Promise.all([
        api.get<ApiUser[]>("/users"),
        api.get<ProfilesResponse>("/profiles")
      ]);

      setUsers(usersResponse.data);
      setProfiles(profilesResponse.data.profiles);
      ensureDefaultProfileId(profilesResponse.data.profiles);
    } catch {
      setError("Falha ao carregar usuarios.");
      setUsers([]);
      setProfiles([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadUsersAndProfiles();
  }, []);

  function openEditModal(entry: ApiUser) {
    setSelectedUserId(entry.id);
    setEditForm({
      name: entry.name,
      email: entry.email,
      profileId: entry.profileId
    });
    setEditModalOpen(true);
  }

  async function createUser() {
    if (!createForm.name.trim() || !createForm.email.trim() || !createForm.password.trim()) {
      setError("Preencha nome, e-mail e senha.");
      return;
    }

    if (!createForm.profileId) {
      setError("Selecione um perfil.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await api.post("/users", {
        name: createForm.name.trim(),
        email: createForm.email.trim().toLowerCase(),
        password: createForm.password,
        profileId: createForm.profileId,
        permissionKeys: []
      });

      notifySuccess("Usuario criado");
      setCreateForm((prev) => ({ ...prev, name: "", email: "", password: "" }));
      setCreateModalOpen(false);
      await loadUsersAndProfiles();
    } catch (error) {
      const message =
        error instanceof AxiosError
          ? (error.response?.data?.message as string | undefined)
          : "Falha ao criar usuario";
      setError(message ?? "Falha ao criar usuario");
    } finally {
      setSaving(false);
    }
  }

  async function updateUserProfile() {
    if (!selectedUser) {
      return;
    }

    if (!editForm.name.trim() || !editForm.email.trim()) {
      setError("Preencha nome e e-mail.");
      return;
    }

    if (!editForm.profileId) {
      setError("Selecione um perfil.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await api.patch(`/users/${selectedUser.id}/profile`, {
        name: editForm.name.trim(),
        email: editForm.email.trim().toLowerCase(),
        profileId: editForm.profileId
      });

      notifySuccess("Usuario atualizado");
      setEditModalOpen(false);
      await loadUsersAndProfiles();
    } catch (error) {
      const message =
        error instanceof AxiosError
          ? (error.response?.data?.message as string | undefined)
          : "Falha ao atualizar usuario";
      setError(message ?? "Falha ao atualizar usuario");
    } finally {
      setSaving(false);
    }
  }

  async function updateUserActive(userId: string, isActive: boolean) {
    try {
      await api.patch(`/users/${userId}/active`, { isActive });
      notifySuccess(isActive ? "Usuario ativado" : "Usuario inativado");
      await loadUsersAndProfiles();
    } catch (error) {
      const message =
        error instanceof AxiosError
          ? (error.response?.data?.message as string | undefined)
          : "Falha ao atualizar status";
      notifyError("Usuarios", message ?? "Falha ao atualizar status.");
    }
  }

  async function deleteUser(userId: string) {
    try {
      await api.delete(`/users/${userId}`);
      notifySuccess("Usuario excluido");
      await loadUsersAndProfiles();
    } catch (error) {
      const message =
        error instanceof AxiosError
          ? (error.response?.data?.message as string | undefined)
          : "Falha ao excluir usuario";
      notifyError("Usuarios", message ?? "Falha ao excluir usuario.");
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1>Usuarios</h1>
        {canCreate && (
          <AppButton type="primary" onClick={() => setCreateModalOpen(true)}>
            Novo Usuario
          </AppButton>
        )}
      </div>

      {error && <div className="card error-box">{error}</div>}

      <AppTable<ApiUser>
        rowKey="id"
        loading={loading}
        columns={columns}
        dataSource={users}
        pagination={false}
      />

      <AppModal
        open={createModalOpen}
        title="Novo Usuario"
        onCancel={() => setCreateModalOpen(false)}
        footer={[
          <AppButton key="cancel" onClick={() => setCreateModalOpen(false)}>
            Cancelar
          </AppButton>,
          <AppButton key="save" type="primary" loading={saving} onClick={() => void createUser()}>
            Salvar
          </AppButton>
        ]}
      >
        <div className="form-grid">
          <AppInput
            placeholder="Nome"
            value={createForm.name}
            onChange={(event) => setCreateForm((prev) => ({ ...prev, name: event.target.value }))}
          />
          <AppInput
            placeholder="E-mail"
            value={createForm.email}
            onChange={(event) => setCreateForm((prev) => ({ ...prev, email: event.target.value }))}
          />
          <AppInput
            placeholder="Senha"
            type="password"
            value={createForm.password}
            onChange={(event) => setCreateForm((prev) => ({ ...prev, password: event.target.value }))}
          />
          <AppSelect
            value={createForm.profileId || undefined}
            placeholder="Selecione o perfil"
            options={profileOptions}
            onChange={(value) => setCreateForm((prev) => ({ ...prev, profileId: String(value) }))}
          />
        </div>
      </AppModal>

      <AppModal
        open={editModalOpen && Boolean(selectedUser)}
        title={selectedUser ? `Editar usuario: ${selectedUser.name}` : "Editar usuario"}
        onCancel={() => setEditModalOpen(false)}
        footer={[
          <AppButton key="cancel" onClick={() => setEditModalOpen(false)}>
            Cancelar
          </AppButton>,
          <AppButton
            key="save"
            type="primary"
            loading={saving}
            onClick={() => void updateUserProfile()}
            disabled={!canEditProfile}
          >
            Salvar alteracoes
          </AppButton>
        ]}
      >
        <div className="form-grid">
          <AppInput
            placeholder="Nome"
            value={editForm.name}
            onChange={(event) => setEditForm((prev) => ({ ...prev, name: event.target.value }))}
            disabled={!canEditProfile}
          />
          <AppInput
            placeholder="E-mail"
            value={editForm.email}
            onChange={(event) => setEditForm((prev) => ({ ...prev, email: event.target.value }))}
            disabled={!canEditProfile}
          />
          <AppSelect
            value={editForm.profileId || undefined}
            placeholder="Selecione o perfil"
            options={profileOptions}
            onChange={(value) => setEditForm((prev) => ({ ...prev, profileId: String(value) }))}
            disabled={!canEditProfile}
          />
          <div>
            <strong>Status atual:</strong>{" "}
            {selectedUser?.isActive ? (
              <AppTag color="green">Ativo</AppTag>
            ) : (
              <AppTag color="red">Inativo</AppTag>
            )}
          </div>
          {selectedUser && selectedUser.id === user?.id && (
            <div className="card">Este e o seu usuario atual.</div>
          )}
        </div>
      </AppModal>
    </div>
  );
}
