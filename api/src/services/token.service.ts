import crypto from "crypto";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { AppError } from "../errors/app-error";

interface AccessTokenPayload {
  sub: string;
  profileId: string;
  isAdmin: boolean;
  permissions: string[];
}

interface RefreshTokenPayload {
  sub: string;
  type: "refresh";
}

export function signAccessToken(payload: AccessTokenPayload): string {
  const expiresIn = env.JWT_ACCESS_EXPIRES_IN as jwt.SignOptions["expiresIn"];

  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn
  });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  try {
    return jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessTokenPayload;
  } catch {
    throw new AppError("Token de acesso invalido ou expirado", 401);
  }
}

export function signRefreshToken(userId: string): string {
  const payload: RefreshTokenPayload = {
    sub: userId,
    type: "refresh"
  };
  const expiresIn = env.JWT_REFRESH_EXPIRES_IN as jwt.SignOptions["expiresIn"];

  return jwt.sign(payload, env.JWT_REFRESH_SECRET, {
    expiresIn
  });
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  try {
    const payload = jwt.verify(token, env.JWT_REFRESH_SECRET) as RefreshTokenPayload;

    if (payload.type !== "refresh") {
      throw new Error("Tipo de token invalido");
    }

    return payload;
  } catch {
    throw new AppError("Refresh token invalido ou expirado", 401);
  }
}

export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}
