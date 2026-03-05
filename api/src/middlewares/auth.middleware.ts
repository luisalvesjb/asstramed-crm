import { NextFunction, Request, Response } from "express";
import { verifyAccessToken } from "../services/token.service";
import { AppError } from "../errors/app-error";

export function authMiddleware(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    throw new AppError("Token ausente", 401);
  }

  const [, token] = authHeader.split(" ");

  if (!token) {
    throw new AppError("Token invalido", 401);
  }

  const payload = verifyAccessToken(token);

  req.user = {
    id: payload.sub,
    profileId: payload.profileId,
    isAdmin: payload.isAdmin,
    permissions: payload.permissions
  };

  next();
}
