import { apiBaseUrl } from "../services/api";

function resolveAssetHost(): string {
  const trimmed = apiBaseUrl.replace(/\/+$/, "");

  try {
    const url = new URL(trimmed);
    const pathname = url.pathname.replace(/\/+$/, "");
    url.pathname = pathname.endsWith("/api") ? pathname.slice(0, -4) : pathname;
    return url.toString().replace(/\/+$/, "");
  } catch {
    return trimmed.replace(/\/api$/, "");
  }
}

export function isAbsoluteUrl(value: string): boolean {
  return /^https?:\/\//i.test(value);
}

export function resolveAssetUrl(assetPath?: string | null): string | null {
  if (!assetPath) {
    return null;
  }

  if (isAbsoluteUrl(assetPath)) {
    return assetPath;
  }

  const host = resolveAssetHost();
  const normalizedPath = assetPath.replace(/\\/g, "/").replace(/^\/+/, "");
  return `${host}/${normalizedPath}`;
}
