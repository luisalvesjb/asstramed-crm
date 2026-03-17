import path from "path";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import { routes } from "./routes";
import { errorMiddleware } from "./middlewares/error.middleware";

export const app = express();

app.use(
  helmet({
    crossOriginResourcePolicy: {
      policy: "cross-origin"
    }
  })
);
app.use(express.json());
app.use(morgan("dev"));
app.use(
  "/assets",
  express.static(path.resolve(__dirname, "../assets"), {
    setHeaders: (res) => {
      res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    }
  })
);
app.use("/api", routes);
app.use(errorMiddleware);
