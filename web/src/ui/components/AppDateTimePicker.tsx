import { DatePicker, DatePickerProps } from "antd";

export function AppDateTimePicker(props: DatePickerProps) {
  return <DatePicker {...props} className={`asstramed-control ${props.className ?? ""}`.trim()} />;
}
