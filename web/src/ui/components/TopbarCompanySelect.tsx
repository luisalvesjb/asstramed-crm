import { SelectProps } from "antd";
import { AppSelect } from "./AppSelect";

export function TopbarCompanySelect<ValueType = string, OptionType extends object = object>(
  props: SelectProps<ValueType, OptionType>
) {
  return (
    <AppSelect
      {...props}
      showSearch={props.showSearch ?? true}
      optionFilterProp={props.optionFilterProp ?? "label"}
      filterOption={
        props.filterOption ??
        ((input, option) =>
          String((option as { label?: string } | undefined)?.label ?? "")
            .toLowerCase()
            .includes(input.toLowerCase()))
      }
      className={`asstramed-top-select ${props.className ?? ""}`.trim()}
    />
  );
}
