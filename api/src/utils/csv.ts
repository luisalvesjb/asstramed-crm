export function toCsv<T extends Record<string, unknown>>(rows: T[]): string {
  if (!rows.length) return "";

  const headers = Object.keys(rows[0]);
  const escape = (value: unknown): string => {
    if (value === null || value === undefined) return "";
    const str = String(value);
    if (str.includes(",") || str.includes("\n") || str.includes('"')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const headerLine = headers.join(",");
  const dataLines = rows.map((row) => headers.map((header) => escape(row[header])).join(","));

  return [headerLine, ...dataLines].join("\n");
}
