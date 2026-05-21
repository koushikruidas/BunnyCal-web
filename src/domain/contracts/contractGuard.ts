import { opsLogger } from "@/lib/opsLogger";

export function asRecord(value: unknown, context: string): Record<string, unknown> | null {
  if (value && typeof value === "object") return value as Record<string, unknown>;
  opsLogger.warn({
    category: "api_contract_mismatch",
    message: "Expected object payload",
    details: { context, receivedType: typeof value },
  });
  return null;
}

export function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function asBoolean(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
}

export function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

