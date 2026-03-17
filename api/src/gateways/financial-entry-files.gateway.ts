import multer from "multer";
import { AppError } from "../errors/app-error";

const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/png",
  "image/jpeg"
]);

function isAllowedByExtension(fileName: string): boolean {
  const normalized = fileName.toLowerCase();
  return (
    normalized.endsWith(".pdf") ||
    normalized.endsWith(".doc") ||
    normalized.endsWith(".docx") ||
    normalized.endsWith(".png") ||
    normalized.endsWith(".jpg") ||
    normalized.endsWith(".jpeg")
  );
}

export const financialEntryFilesUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 15 * 1024 * 1024
  },
  fileFilter: (_req, file, cb) => {
    const validMime = ALLOWED_MIME_TYPES.has(file.mimetype);
    const validExtension = isAllowedByExtension(file.originalname);

    if (!validMime && !validExtension) {
      cb(new AppError("Arquivo invalido. Permitido: pdf, doc, docx, png, jpg, jpeg", 422));
      return;
    }

    cb(null, true);
  }
});
