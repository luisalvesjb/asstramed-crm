import fs from "fs";
import path from "path";
import multer from "multer";
import { AppError } from "../errors/app-error";

const ALLOWED_DOCUMENT_MIME_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
]);

const ALLOWED_DOCUMENT_EXTENSIONS = new Set([".pdf", ".doc", ".docx"]);

const storage = multer.diskStorage({
  destination: (req, _file, cb) => {
    const companyId = String(req.body.companyId || "").trim();

    if (!companyId) {
      cb(new AppError("companyId e obrigatorio para upload", 422), "");
      return;
    }

    const destination = path.resolve(__dirname, "../../assets/documents", companyId);
    fs.mkdirSync(destination, { recursive: true });

    cb(null, destination);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const base = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, "_");
    cb(null, `${Date.now()}-${base}${ext}`);
  }
});

export const upload = multer({
  storage,
  fileFilter: (_req, file, cb) => {
    const normalizedMime = (file.mimetype || "").toLowerCase();
    const extension = path.extname(file.originalname).toLowerCase();
    const isAllowedMime =
      !normalizedMime ||
      normalizedMime === "application/octet-stream" ||
      ALLOWED_DOCUMENT_MIME_TYPES.has(normalizedMime);
    const isAllowedExtension = ALLOWED_DOCUMENT_EXTENSIONS.has(extension);

    if (!isAllowedMime || !isAllowedExtension) {
      cb(new AppError("Formato invalido. Envie apenas arquivos .doc, .docx ou .pdf."));
      return;
    }

    cb(null, true);
  },
  limits: {
    fileSize: 20 * 1024 * 1024
  }
});
