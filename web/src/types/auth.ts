export interface AuthUser {
  id: string;
  name: string;
  email: string;
  profileId: string;
  profileKey: string;
  profileName: string;
  isAdmin: boolean;
  avatarPath?: string | null;
  avatarMimeType?: string | null;
}

export interface LoginResponse {
  user: AuthUser;
  permissions: string[];
  accessToken: string;
  refreshToken: string;
}

export interface MeResponse {
  user: AuthUser;
  permissions: string[];
}
