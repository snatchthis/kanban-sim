import LZString from "lz-string";
import type { BoardConfig } from "@/engine/types";

export function encodeConfig(config: BoardConfig): string {
  const json = JSON.stringify(config);
  return LZString.compressToEncodedURIComponent(json);
}

export function decodeConfig(encoded: string): BoardConfig | null {
  try {
    const json = LZString.decompressFromEncodedURIComponent(encoded);
    if (!json) return null;
    return JSON.parse(json) as BoardConfig;
  } catch {
    return null;
  }
}

export function configToUrl(config: BoardConfig, seed?: number): string {
  const encoded = encodeConfig(config);
  const url = new URL(window.location.href);
  url.searchParams.set("config", encoded);
  if (seed != null) {
    url.searchParams.set("seed", String(seed));
  }
  return url.toString();
}

export function configFromUrl(): BoardConfig | null {
  const params = new URLSearchParams(window.location.search);
  const encoded = params.get("config");
  if (!encoded) return null;
  return decodeConfig(encoded);
}

export function seedFromUrl(): number | null {
  const params = new URLSearchParams(window.location.search);
  const raw = params.get("seed");
  if (!raw) return null;
  const parsed = Number.parseInt(raw, 10);
  return Number.isNaN(parsed) ? null : parsed;
}
