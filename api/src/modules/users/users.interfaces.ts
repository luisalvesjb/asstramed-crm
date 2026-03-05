export interface CreateUserInput {
  name: string;
  email: string;
  password: string;
  profileId: string;
  permissionKeys: string[];
}

export interface UpdateUserProfileInput {
  name: string;
  email: string;
  profileId: string;
}

export interface UpdateMyProfileInput {
  name: string;
  email: string;
}

export interface ChangeMyPasswordInput {
  currentPassword: string;
  newPassword: string;
}
