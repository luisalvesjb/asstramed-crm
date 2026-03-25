import { forwardRef } from "react";
import { Input, InputProps } from "antd";
import type { InputRef } from "antd";

export const AppInput = forwardRef<InputRef, InputProps>(function AppInput(props, ref) {
  return <Input ref={ref} {...props} className={`asstramed-control ${props.className ?? ""}`.trim()} />;
});

export function AppTextArea(props: React.ComponentProps<typeof Input.TextArea>) {
  return <Input.TextArea {...props} className={`asstramed-control ${props.className ?? ""}`.trim()} />;
}
