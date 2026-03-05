import { Upload } from "antd";
import type { RcFile, UploadFile } from "antd/es/upload/interface";
import { ReactNode } from "react";
import { notifyError } from "../feedback/notifications";

interface AppFileDraggerProps {
  value: File | null;
  onChange: (file: File | null) => void;
  title?: string;
  description?: string;
  maxCount?: number;
  acceptedMimeTypes: string[];
  acceptedExtensions: string[];
  children?: ReactNode;
}

function hasValidExtension(fileName: string, acceptedExtensions: string[]): boolean {
  const extension = fileName.split(".").pop()?.toLowerCase();

  if (!extension) {
    return false;
  }

  return acceptedExtensions.map((item) => item.replace(".", "").toLowerCase()).includes(extension);
}

export function AppFileDragger({
  value,
  onChange,
  title,
  description,
  maxCount = 1,
  acceptedMimeTypes,
  acceptedExtensions,
  children
}: AppFileDraggerProps) {
  const fileList: UploadFile[] = value
    ? [
        {
          uid: "file-1",
          name: value.name,
          status: "done"
        }
      ]
    : [];

  function beforeUpload(file: RcFile) {
    const normalizedType = file.type.toLowerCase();
    const validMime =
      !normalizedType ||
      normalizedType === "application/octet-stream" ||
      acceptedMimeTypes.includes(normalizedType);
    const validExt = hasValidExtension(file.name, acceptedExtensions);

    if (!validMime || !validExt) {
      notifyError(
        "Arquivo invalido",
        `Tipos aceitos: ${acceptedExtensions.join(", ")} (${acceptedMimeTypes.join(", ")})`
      );
      return Upload.LIST_IGNORE;
    }

    onChange(file as File);
    return false;
  }

  return (
    <Upload.Dragger
      multiple={false}
      maxCount={maxCount}
      beforeUpload={beforeUpload}
      fileList={fileList}
      onRemove={() => {
        onChange(null);
      }}
    >
      {children ?? (
        <div>
          <p>{title ?? "Arraste o arquivo aqui"}</p>
          <p>{description ?? "Ou clique para selecionar"}</p>
        </div>
      )}
    </Upload.Dragger>
  );
}
