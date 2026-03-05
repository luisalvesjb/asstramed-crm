import { Input, InputProps } from "antd";

export function AppInput(props: InputProps) {
  return <Input {...props} className={`asstramed-control ${props.className ?? ""}`.trim()} />;
}

export function AppTextArea(props: React.ComponentProps<typeof Input.TextArea>) {
  return <Input.TextArea {...props} className={`asstramed-control ${props.className ?? ""}`.trim()} />;
}
