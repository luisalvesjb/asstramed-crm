import { SelectProps } from "antd";
import { AppSelect } from "./AppSelect";

export function TopbarCompanySelect<ValueType = string, OptionType extends object = object>(
  props: SelectProps<ValueType, OptionType>
) {
  return <AppSelect {...props} className={`asstramed-top-select ${props.className ?? ""}`.trim()} />;
}
