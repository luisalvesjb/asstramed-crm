import { SelectProps } from "antd";
import { AppSelect } from "./AppSelect";

export function DashboardFilterSelect<ValueType = string, OptionType extends object = object>(
  props: SelectProps<ValueType, OptionType>
) {
  return (
    <AppSelect
      {...props}
      placeholder={props.placeholder ?? "Todos"}
      className={`asstramed-dashboard-filter-select ${props.className ?? ""}`.trim()}
    />
  );
}
