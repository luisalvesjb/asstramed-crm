import path from "path";
import express from "express";
import cors from "cors";
import type { CorsOptions } from "cors";
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

function matchOrigin(origin: string): boolean {
  if (allowAllOrigins) {
    return true;
  }

  const normalizedOrigin = normalizeOrigin(origin);

  return allowedOrigins.some((allowedOrigin) => {
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
}

const corsOptions: CorsOptions = {
  origin: (origin, callback) => {
    if (!origin) {
      callback(null, true);
      return;
    }

    if (matchOrigin(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error("Origin nao permitida pelo CORS"));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Authorization", "Content-Type"]
};

app.use(
  helmet({
    crossOriginResourcePolicy: {
      policy: "cross-origin"
    }
  })
);
app.use(cors(corsOptions));
app.options("*", cors(corsOptions));
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
