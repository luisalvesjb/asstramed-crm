export interface ProfileOutput {
  id: string;
  key: string;
  name: string;
  description: string | null;
  isAdmin: boolean;
  isSystem: boolean;
  isActive: boolean;
  userCount: number;
  permissionKeys: string[];
}

export interface ProfilesListOutput {
  profiles: ProfileOutput[];
  permissionsCatalog: Array<{
    id: string;
    key: string;
    description: string | null;
  }>;
}

export interface CreateProfileInput {
  name: string;
  key?: string;
  description?: string | null;
  isAdmin?: boolean;
  isActive?: boolean;
  permissionKeys: string[];
}

export interface UpdateProfileInput {
  name?: string;
  key?: string;
  description?: string | null;
  isAdmin?: boolean;
  isActive?: boolean;
}
