import path from "path";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import { routes } from "./routes";
import { errorMiddleware } from "./middlewares/error.middleware";
import { env } from "./config/env";

export const app = express();

const allowedOrigins = (env.CORS_ORIGINS ?? "")
  .split(",")
  .map((origin) => origin.trim().replace(/^['"]|['"]$/g, "").replace(/\/+$/, ""))
  .filter(Boolean);

const allowAllOrigins = allowedOrigins.length === 0 || allowedOrigins.includes("*");

function normalizeOrigin(origin: string): string {
  try {
    return new URL(origin).origin;
  } catch {
    return origin.trim().replace(/\/+$/, "");
  }
}

function resolveCorsOrigin(originHeader?: string): string {
  if (!originHeader || allowAllOrigins) {
    return "*";
  }

  const normalizedOrigin = normalizeOrigin(originHeader);

  const isAllowed = allowedOrigins.some((allowedOrigin) => {
    if (allowedOrigin === normalizedOrigin) {
      return true;
    }

    if (!allowedOrigin.startsWith("*.")) {
      return false;
    }

    const suffix = allowedOrigin.slice(1); // ".asstramed.com.br"

    try {
      const { hostname } = new URL(normalizedOrigin);
      return hostname.endsWith(suffix);
    } catch {
      return false;
    }
  });

  return isAllowed ? normalizedOrigin : "";
}

app.use(
  helmet({
    crossOriginResourcePolicy: {
      policy: "cross-origin"
    }
  })
);
app.use((req, res, next) => {
  const originHeader = req.headers.origin;
  const origin = typeof originHeader === "string" ? originHeader : undefined;
  const resolvedOrigin = resolveCorsOrigin(origin);

  if (resolvedOrigin) {
    res.setHeader("Access-Control-Allow-Origin", resolvedOrigin);
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Authorization,Content-Type,Accept,Origin,X-Requested-With");
    res.setHeader("Access-Control-Allow-Credentials", allowAllOrigins ? "false" : "true");
  }

  if (req.method === "OPTIONS") {
    res.status(204).send();
    return;
  }

  next();
});
app.use(express.json());
app.use(morgan("dev"));
app.use(
  "/assets",
  express.static(path.resolve(__dirname, "../assets"), {
    setHeaders: (res) => {
      res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
      res.setHeader("Access-Control-Allow-Origin", "*");
    }
  })
);
app.use("/api", routes);
app.use(errorMiddleware);
