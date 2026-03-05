import { Table, TableProps } from "antd";

export function AppTable<RecordType extends object>(props: TableProps<RecordType>) {
  return <Table {...props} className={`asstramed-table ${props.className ?? ""}`.trim()} />;
}
