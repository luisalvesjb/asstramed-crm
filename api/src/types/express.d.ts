declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        profileId: string;
        isAdmin: boolean;
        isSuperAdmin: boolean;
        permissions: string[];
      };
    }
  }
}

export {};
