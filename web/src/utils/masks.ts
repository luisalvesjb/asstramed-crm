function onlyDigits(value: string): string {
  return value.replace(/\D/g, "");
}

export function digitsOnly(value: string): string {
  return onlyDigits(value);
}

export function formatCpfCnpj(value: string): string {
  const digits = onlyDigits(value).slice(0, 14);

  if (digits.length <= 11) {
    return digits
      .replace(/^(\d{3})(\d)/, "$1.$2")
      .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
      .replace(/\.(\d{3})(\d)/, ".$1-$2");
  }

  return digits
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
}

export function formatPhone(value: string): string {
  const digits = onlyDigits(value).slice(0, 11);

  if (digits.length <= 10) {
    return digits
      .replace(/^(\d{2})(\d)/, "($1) $2")
      .replace(/(\d{4})(\d)/, "$1-$2");
  }

  return digits
    .replace(/^(\d{2})(\d)/, "($1) $2")
    .replace(/(\d{5})(\d)/, "$1-$2");
}

export function formatZipCode(value: string): string {
  const digits = onlyDigits(value).slice(0, 8);
  return digits.replace(/^(\d{5})(\d)/, "$1-$2");
}

export function formatCurrencyInput(value: string): string {
  const digits = onlyDigits(value);

  if (!digits) {
    return "";
  }

  const amount = Number(digits) / 100;

  return amount.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

export function parseCurrencyInput(value: string): number | null {
  if (!value.trim()) {
    return null;
  }

  const normalized = value.replace(/\./g, "").replace(",", ".");
  const amount = Number(normalized);

  return Number.isNaN(amount) ? null : amount;
}

export function formatCurrencyValueInput(value?: string | number | null): string {
  if (value === null || value === undefined || value === "") {
    return "";
  }

  const amount = typeof value === "string" ? Number(value) : value;

  if (Number.isNaN(amount)) {
    return "";
  }

  return amount.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}
