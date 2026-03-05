import multer from "multer";
import { AppError } from "../errors/app-error";

const ALLOWED_IMAGE_MIME_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);

export const companyLogoUpload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_IMAGE_MIME_TYPES.has(file.mimetype)) {
      cb(new AppError("Formato de logo invalido. Use PNG, JPG ou WEBP."));
      return;
    }

    cb(null, true);
  },
  limits: {
    fileSize: 8 * 1024 * 1024
  }
});
