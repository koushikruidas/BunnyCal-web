import { opsLogger } from "@/lib/opsLogger";
export function asRecord(value, context) {
    if (value && typeof value === "object")
        return value;
    opsLogger.warn({
        category: "api_contract_mismatch",
        message: "Expected object payload",
        details: { context, receivedType: typeof value },
    });
    return null;
}
export function asString(value) {
    return typeof value === "string" && value.trim() ? value.trim() : null;
}
export function asBoolean(value) {
    return typeof value === "boolean" ? value : null;
}
export function asArray(value) {
    return Array.isArray(value) ? value : [];
}
