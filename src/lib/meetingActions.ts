export interface InvitationAction {
  id: string;
  label: string;
  url: string;
}

export interface InvitationMeta {
  provider?: string | null;
  providerEventUrl?: string | null;
  conferenceUrl?: string | null;
  calendarSyncStatus?: string | null;
}

export interface LifecycleMeta {
  externalLifecycleState?: string | null;
  externalLifecycleReason?: string | null;
  reconcileSuppressed?: boolean | null;
  actionRequired?: boolean | null;
}

export interface LifecycleViewState {
  kind: string;
  tone: "good" | "warn" | "bad" | "neutral";
  label: string;
  detail: string;
}

function safeUrl(value?: string | null) {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return trimmed;
  return null;
}

function pushUnique(actions: InvitationAction[], id: string, label: string, value?: string | null) {
  const url = safeUrl(value);
  if (!url) return;
  if (actions.some((action) => action.url === url)) return;
  actions.push({ id, label, url });
}

export function buildInvitationActions(meta: InvitationMeta): InvitationAction[] {
  const actions: InvitationAction[] = [];
  pushUnique(actions, "open-invitation", "Open Invitation", meta.providerEventUrl);
  pushUnique(actions, "open-calendar", "Open Calendar Event", meta.providerEventUrl);
  pushUnique(actions, "join-meeting", "Join Meeting", meta.conferenceUrl);

  return actions;
}

export function getSyncState(meta: InvitationMeta): { tone: "good" | "warn" | "bad"; label: string; detail: string } {
  const status = (meta.calendarSyncStatus ?? "").toUpperCase();

  if (status === "CALENDAR_NOT_CONNECTED") {
    return {
      tone: "warn",
      label: "Calendar not connected",
      detail: "Calendar connection is unavailable. Scheduling remains available based on backend state.",
    };
  }

  if (status === "CALENDAR_SYNC_IN_PROGRESS" || status === "CLAIMED") {
    return { tone: "warn", label: "Calendar sync in progress", detail: "Calendar invitation details are still being updated." };
  }

  if (status === "STALE_CALENDAR_DATA") {
    return { tone: "warn", label: "Calendar data stale", detail: "Calendar metadata may be temporarily delayed while backend catches up." };
  }

  if (status === "FAILED" || status === "RETRYABLE_FAILURE") {
    return { tone: "bad", label: "Calendar sync failed", detail: "Calendar sync failed. Check integration status and retry later." };
  }

  if (status === "CREATED") {
    if (meta.provider?.toLowerCase() === "google") {
      return { tone: "good", label: "Google synced", detail: "Calendar invitation is ready." };
    }
    return { tone: "good", label: "Calendar synced", detail: "Calendar invitation is ready." };
  }

  return { tone: "warn", label: "Sync status pending", detail: "Calendar metadata is still being finalized by the backend." };
}

function normalizeLifecycleState(meta: LifecycleMeta): string {
  const fromState = (meta.externalLifecycleState ?? "").trim().toUpperCase();
  if (fromState) return fromState;
  if (meta.actionRequired === true) return "ACTION_REQUIRED";
  if (meta.reconcileSuppressed === true) return "RECONCILE_SUPPRESSED";
  return "";
}

export function getLifecycleState(meta: LifecycleMeta): LifecycleViewState | null {
  const state = normalizeLifecycleState(meta);
  if (!state) return null;

  if (state === "TERMINAL_EXTERNAL_DELETE" || state === "EXTERNALLY_CANCELLED") {
    return {
      kind: "TERMINAL_EXTERNAL_DELETE",
      tone: "bad",
      label: "External event removed",
      detail: "The external calendar event was removed from the connected provider.",
    };
  }
  if (state === "ACTION_REQUIRED" || state === "EXTERNAL_ACTION_REQUIRED") {
    return {
      kind: "EXTERNAL_ACTION_REQUIRED",
      tone: "warn",
      label: "Action required",
      detail: "Calendar action is required in integrations.",
    };
  }
  if (state === "PROVIDER_DISCONNECTED" || state === "PROVIDER_STATE_ORPHANED") {
    return {
      kind: "PROVIDER_STATE_ORPHANED",
      tone: "warn",
      label: "Provider state orphaned",
      detail: "Provider state is orphaned. Manual review may be required.",
    };
  }
  if (state === "SYNC_DRIFT_DETECTED" || state === "ACTIVE_DRIFT") {
    return {
      kind: "ACTIVE_DRIFT",
      tone: "warn",
      label: "Sync drift detected",
      detail: "Calendar state may be temporarily out of sync.",
    };
  }
  if (state === "RECONCILE_SUPPRESSED") {
    return {
      kind: state,
      tone: "warn",
      label: "Reconcile suppressed",
      detail: "Backend reconciliation is currently suppressed.",
    };
  }
  if (state === "PROVIDER_MISSING_EVENT") {
    return {
      kind: state,
      tone: "warn",
      label: "Provider event missing",
      detail: "External provider event was not found.",
    };
  }
  if (state === "STABLE") {
    return null;
  }

  return {
    kind: state,
    tone: "neutral",
    label: "Lifecycle state detected",
    detail: meta.externalLifecycleReason?.trim() || "Backend reported an external lifecycle state.",
  };
}
