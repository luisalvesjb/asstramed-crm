import { NextFunction, Request, Response } from "express";
import { AppError } from "../errors/app-error";

export function permissionMiddleware(requiredPermissions: string[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new AppError("Nao autenticado", 401);
    }

    if (req.user.isAdmin) {
      next();
      return;
    }

    const hasAllPermissions = requiredPermissions.every((permission) =>
      req.user?.permissions.includes(permission)
    );

    if (!hasAllPermissions) {
      throw new AppError("Sem permissao para esta acao", 403);
    }

    next();
  };
}
