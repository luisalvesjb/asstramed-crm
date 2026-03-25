export interface CreateUserInput {
  name: string;
  login: string;
  password: string;
  profileId: string;
  permissionKeys: string[];
}

export interface UpdateUserProfileInput {
  name: string;
  login: string;
  profileId: string;
}

export interface UpdateMyProfileInput {
  name: string;
  login: string;
}

export interface ChangeMyPasswordInput {
  currentPassword: string;
  newPassword: string;
}
