import { z } from "zod";

function parseDateInput(value: unknown): unknown {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  if (value instanceof Date) {
    return value;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();

    if (!trimmed) {
      return undefined;
    }

    const dateOnlyMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);

    if (dateOnlyMatch) {
      return new Date(
        Date.UTC(
          Number(dateOnlyMatch[1]),
          Number(dateOnlyMatch[2]) - 1,
          Number(dateOnlyMatch[3]),
          12,
          0,
          0,
          0
        )
      );
    }

    const parsed = new Date(trimmed);

    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }

  return value;
}

export const optionalDateInputSchema = z.preprocess(parseDateInput, z.date().optional());

export const nullableOptionalDateInputSchema = z.preprocess(
  (value) => (value === null ? null : parseDateInput(value)),
  z.date().nullable().optional()
);

export const optionalDateArrayInputSchema = z.preprocess((value) => {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  return value;
}, z.array(z.preprocess(parseDateInput, z.date())).optional());

export function formatDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}
