type OpsLevel = "warn" | "error";

type OpsEvent = {
  category:
    | "booking_mutation_failure"
    | "calendar_integration_failure"
    | "conferencing_integration_failure"
    | "sync_render_anomaly"
    | "slot_render_anomaly"
    | "api_contract_mismatch"
    | "external_lifecycle_rendered"
    | "lifecycle_mismatch_rendered"
    | "provider_disconnect_lifecycle_visible";
  message: string;
  details?: Record<string, unknown>;
};

function emit(level: OpsLevel, event: OpsEvent) {
  if (!import.meta.env.DEV) return;
  const payload = {
    category: event.category,
    message: event.message,
    ...(event.details ? { details: event.details } : {}),
  };
  if (level === "error") {
    console.error("[ops]", payload);
    return;
  }
  console.warn("[ops]", payload);
}

export const opsLogger = {
  warn(event: OpsEvent) {
    emit("warn", event);
  },
  error(event: OpsEvent) {
    emit("error", event);
  },
};
