import { Modal, notification } from "antd";

export function notifySuccess(message: string, description?: string) {
  notification.success({
    message,
    description,
    placement: "topRight"
  });
}

export function notifyError(message: string, description?: string) {
  notification.error({
    message,
    description,
    placement: "topRight"
  });
}

export function notifyInfo(message: string, description?: string) {
  notification.info({
    message,
    description,
    placement: "topRight"
  });
}

export function showConfirmDialog(options: {
  title: string;
  content?: string;
  okText?: string;
  cancelText?: string;
  onConfirm: () => void | Promise<void>;
}) {
  Modal.confirm({
    title: options.title,
    content: options.content,
    okText: options.okText ?? "Confirmar",
    cancelText: options.cancelText ?? "Cancelar",
    onOk: options.onConfirm
  });
}
