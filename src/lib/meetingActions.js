function safeUrl(value) {
    if (!value)
        return null;
    const trimmed = value.trim();
    if (!trimmed)
        return null;
    if (trimmed.startsWith("http://") || trimmed.startsWith("https://"))
        return trimmed;
    return null;
}
function pushUnique(actions, id, label, value) {
    const url = safeUrl(value);
    if (!url)
        return;
    if (actions.some((action) => action.url === url))
        return;
    actions.push({ id, label, url });
}
export function buildInvitationActions(meta) {
    const actions = [];
    pushUnique(actions, "open-invitation", "Open Invitation", meta.providerEventUrl);
    pushUnique(actions, "open-calendar", "Open Calendar Event", meta.providerEventUrl);
    pushUnique(actions, "join-meeting", "Join Meeting", meta.conferenceJoinUrl);
    return actions;
}
export function getSyncState(meta) {
    const status = (meta.calendarSyncStatus ?? "").toUpperCase();
    if (status === "CALENDAR_NOT_CONNECTED") {
        return {
            tone: "warn",
            label: "Calendar not connected",
            detail: "Your booking is confirmed. Calendar sync is unavailable until a calendar is connected.",
        };
    }
    if (status === "CALENDAR_SYNC_IN_PROGRESS" || status === "CLAIMED") {
        return { tone: "warn", label: "Syncing", detail: "Calendar details are still being updated — this usually takes a moment." };
    }
    if (status === "STALE_CALENDAR_DATA") {
        return { tone: "warn", label: "Syncing", detail: "Calendar details may take a moment to appear." };
    }
    if (status === "FAILED" || status === "RETRYABLE_FAILURE") {
        return { tone: "bad", label: "Sync issue", detail: "Calendar sync ran into a problem. Check your connected calendars and try again." };
    }
    if (status === "CREATED") {
        return { tone: "good", label: "Confirmed", detail: "Your invite was sent and calendars are updated." };
    }
    return { tone: "warn", label: "Sync in progress", detail: "Calendar details are still being finalized." };
}
function normalizeLifecycleState(meta) {
    const fromState = (meta.externalLifecycleState ?? "").trim().toUpperCase();
    if (fromState)
        return fromState;
    if (meta.actionRequired === true)
        return "ACTION_REQUIRED";
    if (meta.reconcileSuppressed === true)
        return "RECONCILE_SUPPRESSED";
    return "";
}
export function getLifecycleState(meta) {
    const state = normalizeLifecycleState(meta);
    if (!state)
        return null;
    if (state === "TERMINAL_EXTERNAL_DELETE" || state === "EXTERNALLY_CANCELLED") {
        return {
            kind: "TERMINAL_EXTERNAL_DELETE",
            tone: "bad",
            label: "Removed from a connected calendar",
            detail: "This booking was removed from a connected calendar. Your booking record is unaffected.",
        };
    }
    if (state === "ACTION_REQUIRED" || state === "EXTERNAL_ACTION_REQUIRED") {
        return {
            kind: "EXTERNAL_ACTION_REQUIRED",
            tone: "warn",
            label: "Calendar attention needed",
            detail: "A connected calendar may need attention. Check your integrations.",
        };
    }
    if (state === "PROVIDER_DISCONNECTED" || state === "PROVIDER_STATE_ORPHANED") {
        return {
            kind: "PROVIDER_STATE_ORPHANED",
            tone: "warn",
            label: "Calendar disconnected",
            detail: "Your booking is still confirmed. Calendar sync is unavailable until the connection is restored.",
        };
    }
    if (state === "SYNC_DRIFT_DETECTED" || state === "ACTIVE_DRIFT") {
        return {
            kind: "ACTIVE_DRIFT",
            tone: "warn",
            label: "Calendars are syncing",
            detail: "Calendar details are catching up — this usually resolves in a moment.",
        };
    }
    if (state === "RECONCILE_SUPPRESSED") {
        return null;
    }
    if (state === "PROVIDER_MISSING_EVENT") {
        return {
            kind: state,
            tone: "warn",
            label: "Calendar event not found",
            detail: "The calendar event wasn't found on a connected calendar. Your booking record is unaffected.",
        };
    }
    if (state === "STABLE") {
        return null;
    }
    return {
        kind: state,
        tone: "neutral",
        label: "Calendar sync notice",
        detail: meta.externalLifecycleReason?.trim() || "A calendar sync event was detected.",
    };
}
