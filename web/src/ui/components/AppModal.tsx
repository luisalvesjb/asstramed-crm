import { Modal, ModalProps } from "antd";

export function AppModal(props: ModalProps) {
  return <Modal {...props} className={`asstramed-modal ${props.className ?? ""}`.trim()} />;
}
