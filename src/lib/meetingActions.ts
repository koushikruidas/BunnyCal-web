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

  if (status === "FAILED" || status === "RETRYABLE_FAILURE") {
    return {
      tone: "bad",
      label: "Sync failed",
      detail: "Calendar event sync failed. Retry sync from integrations or check provider connection.",
    };
  }

  if (status === "CREATED") {
    if (meta.provider?.toLowerCase() === "google") {
      return { tone: "good", label: "Google synced", detail: "Calendar invitation is ready." };
    }
    return { tone: "good", label: "Calendar synced", detail: "Calendar invitation is ready." };
  }

  if (status === "CLAIMED") {
    return { tone: "warn", label: "Syncing", detail: "Creating calendar event and invitation details." };
  }

  return { tone: "warn", label: "Invitation syncing", detail: "Calendar invitation is processing." };
}
