import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { AppError } from "../errors/app-error";

export function errorMiddleware(error: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (error instanceof AppError) {
    res.status(error.statusCode).json({ message: error.message, details: error.details });
    return;
  }

  if (error instanceof ZodError) {
    res.status(422).json({
      message: "Dados invalidos",
      details: error.flatten()
    });
    return;
  }

  res.status(500).json({
    message: "Erro interno do servidor"
  });
}
