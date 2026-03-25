import { useEffect, useMemo, useState } from "react";
import { AxiosError } from "axios";
import { LogoCropperModal } from "../features/company/components/LogoCropperModal";
import { useAuth } from "../context/AuthContext";
import { api } from "../services/api";
import { AppButton, AppFileDragger, AppInput } from "../ui/components";
import { notifyError, notifySuccess } from "../ui/feedback/notifications";
import { resolveAssetUrl } from "../utils/asset-url";

interface MyProfile {
  id: string;
  name: string;
  login: string;
  email?: string | null;
  profileId: string;
  profileKey: string;
  profileName: string;
  isAdmin: boolean;
  avatarPath?: string | null;
  avatarMimeType?: string | null;
  isActive?: boolean;
  createdAt?: string;
  lastAccessAt?: string | null;
}

const ACCEPTED_IMAGE_MIME_TYPES = ["image/png", "image/jpeg", "image/webp"];
const ACCEPTED_IMAGE_EXTENSIONS = [".png", ".jpg", ".jpeg", ".webp"];

export function MyProfilePage() {
  const { user, refreshProfile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [savingAvatar, setSavingAvatar] = useState(false);

  const [profile, setProfile] = useState<MyProfile | null>(null);
  const [name, setName] = useState("");
  const [loginValue, setLoginValue] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");

  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [croppedAvatarBlob, setCroppedAvatarBlob] = useState<Blob | undefined>(undefined);
  const [croppedAvatarFileName, setCroppedAvatarFileName] = useState<string | undefined>(undefined);

  const avatarUrl = useMemo(() => resolveAssetUrl(profile?.avatarPath), [profile?.avatarPath]);

  async function loadMyProfile() {
    setLoading(true);

    try {
      const response = await api.get<MyProfile>("/users/me/profile");
      setProfile(response.data);
      setName(response.data.name);
      setLoginValue(response.data.login);
    } catch {
      notifyError("Meu perfil", "Nao foi possivel carregar seu perfil.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadMyProfile();
  }, []);

  async function handleSaveProfile() {
    if (!name.trim() || !loginValue.trim()) {
      notifyError("Meu perfil", "Preencha nome e login.");
      return;
    }

    setSavingProfile(true);

    try {
      await api.patch("/users/me/profile", {
        name: name.trim(),
        login: loginValue.trim().toLowerCase()
      });
      await Promise.all([refreshProfile(), loadMyProfile()]);
      notifySuccess("Perfil atualizado");
    } catch (error) {
      const message =
        error instanceof AxiosError
          ? (error.response?.data?.message as string | undefined)
          : "Nao foi possivel atualizar o perfil.";
      notifyError("Meu perfil", message ?? "Nao foi possivel atualizar o perfil.");
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleChangePassword() {
    if (!currentPassword || !newPassword || !confirmNewPassword) {
      notifyError("Alteracao de senha", "Preencha todos os campos.");
      return;
    }

    if (newPassword !== confirmNewPassword) {
      notifyError("Alteracao de senha", "A confirmacao da nova senha nao confere.");
      return;
    }

    setSavingPassword(true);

    try {
      await api.patch("/users/me/password", {
        currentPassword,
        newPassword
      });

      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
      notifySuccess("Senha alterada com sucesso");
    } catch (error) {
      const message =
        error instanceof AxiosError
          ? (error.response?.data?.message as string | undefined)
          : "Nao foi possivel alterar a senha.";
      notifyError("Alteracao de senha", message ?? "Nao foi possivel alterar a senha.");
    } finally {
      setSavingPassword(false);
    }
  }

  async function handleSaveAvatar() {
    const fileToUpload = croppedAvatarBlob
      ? new File([croppedAvatarBlob], croppedAvatarFileName ?? "avatar-cropped.png", {
          type: croppedAvatarBlob.type || "image/png"
        })
      : avatarFile;

    if (!fileToUpload) {
      notifyError("Avatar", "Selecione uma imagem para enviar.");
      return;
    }

    setSavingAvatar(true);

    try {
      const formData = new FormData();
      formData.append("avatar", fileToUpload);

      await api.put("/users/me/avatar", formData, {
        headers: {
          "Content-Type": "multipart/form-data"
        }
      });

      await Promise.all([refreshProfile(), loadMyProfile()]);
      setAvatarFile(null);
      setCroppedAvatarBlob(undefined);
      setCroppedAvatarFileName(undefined);
      notifySuccess("Avatar atualizado");
    } catch (error) {
      const message =
        error instanceof AxiosError
          ? (error.response?.data?.message as string | undefined)
          : "Nao foi possivel atualizar o avatar.";
      notifyError("Avatar", message ?? "Nao foi possivel atualizar o avatar.");
    } finally {
      setSavingAvatar(false);
    }
  }

  if (loading) {
    return <div className="card">Carregando perfil...</div>;
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1>Meu perfil</h1>
      </div>

      <section className="card my-profile-card">
        <div className="my-profile-avatar-block">
          {avatarUrl ? (
            <img src={avatarUrl} alt={profile?.name ?? user?.name ?? "Usuario"} className="my-profile-avatar" />
          ) : (
            <div className="my-profile-avatar my-profile-avatar-placeholder">
              {(profile?.name ?? user?.name ?? "U").slice(0, 1).toUpperCase()}
            </div>
          )}
          <div>
            <strong>{profile?.name ?? user?.name ?? "Usuario"}</strong>
            <div>{profile?.profileName ?? user?.profileName ?? "-"}</div>
          </div>
        </div>
      </section>

      <section className="card card-stack">
        <h3>Dados de acesso</h3>
        <div className="form-grid">
          <div className="field-block">
            <label className="field-label">Nome</label>
            <AppInput value={name} onChange={(event) => setName(event.target.value)} />
          </div>
          <div className="field-block">
            <label className="field-label">Login</label>
            <AppInput value={loginValue} onChange={(event) => setLoginValue(event.target.value)} />
          </div>
        </div>
        <div className="filters-actions">
          <AppButton type="primary" loading={savingProfile} onClick={() => void handleSaveProfile()}>
            Salvar dados
          </AppButton>
        </div>
      </section>

      <section className="card card-stack">
        <h3>Avatar</h3>
        <AppFileDragger
          value={avatarFile}
          onChange={(file) => {
            setAvatarFile(file);
            setCroppedAvatarBlob(undefined);
            setCroppedAvatarFileName(undefined);
          }}
          acceptedMimeTypes={ACCEPTED_IMAGE_MIME_TYPES}
          acceptedExtensions={ACCEPTED_IMAGE_EXTENSIONS}
          title="Arraste seu avatar (PNG, JPG ou WEBP)"
          description="Ou clique para selecionar"
        />
        <div className="filters-actions">
          <AppButton disabled={!avatarFile} onClick={() => setCropModalOpen(true)}>
            Recortar avatar
          </AppButton>
          <AppButton type="primary" loading={savingAvatar} onClick={() => void handleSaveAvatar()}>
            Salvar avatar
          </AppButton>
        </div>
      </section>

      <section className="card card-stack">
        <h3>Alterar senha</h3>
        <div className="form-grid">
          <div className="field-block">
            <label className="field-label">Senha atual</label>
            <AppInput
              type="password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
            />
          </div>
          <div className="field-block">
            <label className="field-label">Nova senha</label>
            <AppInput
              type="password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
            />
          </div>
          <div className="field-block">
            <label className="field-label">Confirmar nova senha</label>
            <AppInput
              type="password"
              value={confirmNewPassword}
              onChange={(event) => setConfirmNewPassword(event.target.value)}
            />
          </div>
        </div>
        <div className="filters-actions">
          <AppButton type="primary" loading={savingPassword} onClick={() => void handleChangePassword()}>
            Atualizar senha
          </AppButton>
        </div>
      </section>

      <LogoCropperModal
        open={cropModalOpen}
        title="Recortar avatar"
        file={avatarFile}
        cropShape="round"
        onCancel={() => setCropModalOpen(false)}
        onConfirm={(payload) => {
          setCroppedAvatarBlob(payload.blob);
          setCroppedAvatarFileName(payload.fileName);
          setCropModalOpen(false);
          notifySuccess("Recorte aplicado", "Clique em 'Salvar avatar' para concluir.");
        }}
      />
    </div>
  );
}
