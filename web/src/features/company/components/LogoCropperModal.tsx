import { useEffect, useMemo, useState } from "react";
import Cropper from "react-easy-crop";
import { AppButton, AppModal } from "../../../ui/components";
import { CropPixelsArea, getCroppedImageBlob } from "../utils/cropImage";

interface LogoCropperModalProps {
  open: boolean;
  file: File | null;
  title?: string;
  aspect?: number;
  cropShape?: "rect" | "round";
  onCancel: () => void;
  onConfirm: (payload: { blob: Blob; fileName: string }) => void;
}

export function LogoCropperModal({
  open,
  file,
  title = "Recortar imagem",
  aspect = 1,
  cropShape = "round",
  onCancel,
  onConfirm
}: LogoCropperModalProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedPixels, setCroppedPixels] = useState<CropPixelsArea | null>(null);
  const [loading, setLoading] = useState(false);

  const imageUrl = useMemo(() => {
    if (!file) {
      return "";
    }

    return URL.createObjectURL(file);
  }, [file]);

  useEffect(() => {
    return () => {
      if (imageUrl) {
        URL.revokeObjectURL(imageUrl);
      }
    };
  }, [imageUrl]);

  async function handleConfirm() {
    if (!file || !croppedPixels || !imageUrl) {
      return;
    }

    setLoading(true);

    try {
      const blob = await getCroppedImageBlob(imageUrl, croppedPixels);
      onConfirm({ blob, fileName: file.name.replace(/\.[^/.]+$/, "") + "-cropped.png" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppModal
      open={open}
      title={title}
      onCancel={onCancel}
      width={720}
      footer={[
        <AppButton key="cancel" onClick={onCancel}>
          Cancelar
        </AppButton>,
        <AppButton key="save" type="primary" loading={loading} onClick={() => void handleConfirm()}>
          Aplicar recorte
        </AppButton>
      ]}
    >
      {file ? (
        <div className="logo-cropper-wrapper">
          <div className="logo-cropper-area">
            <Cropper
              image={imageUrl}
              crop={crop}
              zoom={zoom}
              aspect={aspect}
              cropShape={cropShape}
              showGrid={false}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={(_, croppedAreaPixels) => {
                setCroppedPixels(croppedAreaPixels as CropPixelsArea);
              }}
            />
          </div>
          <div className="logo-cropper-controls">
            <span>Zoom</span>
            <input
              type="range"
              min={1}
              max={3}
              step={0.1}
              value={zoom}
              onChange={(event) => setZoom(Number(event.target.value))}
            />
          </div>
        </div>
      ) : (
        <div>Selecione um arquivo para recortar.</div>
      )}
    </AppModal>
  );
}
