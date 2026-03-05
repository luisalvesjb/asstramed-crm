const PATTERN = /^(\d+)([mhd])$/;

export function durationToMs(input: string): number {
  const match = PATTERN.exec(input.trim());

  if (!match) {
    throw new Error(`Duracao invalida: ${input}`);
  }

  const value = Number(match[1]);
  const unit = match[2];

  if (unit === "m") return value * 60 * 1000;
  if (unit === "h") return value * 60 * 60 * 1000;
  return value * 24 * 60 * 60 * 1000;
}
