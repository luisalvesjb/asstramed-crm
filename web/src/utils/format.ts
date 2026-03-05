export function formatDate(value?: string | Date | null): string {
  if (!value) {
    return "-";
  }

  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleDateString("pt-BR");
}

export function formatDateTime(value?: string | Date | null): string {
  if (!value) {
    return "-";
  }

  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return `${date.toLocaleDateString("pt-BR")} ${date.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit"
  })}`;
}

export function formatCurrency(value?: string | number | null): string {
  if (value === null || value === undefined || value === "") {
    return "-";
  }

  const amount = typeof value === "string" ? Number(value) : value;

  if (Number.isNaN(amount)) {
    return "-";
  }

  return amount.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });
}

export function statusLabel(status: string): string {
  switch (status) {
    case "PENDENTE":
      return "Pendente";
    case "EM_EXECUCAO":
      return "Em execucao";
    case "CONCLUIDA":
      return "Concluida";
    case "CANCELADA":
      return "Cancelada";
    default:
      return status;
  }
}
