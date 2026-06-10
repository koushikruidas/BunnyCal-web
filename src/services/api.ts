import { API_BASE_URL } from "@/config/api";
import { authenticatedApiClient, clearAccessToken, setAccessToken } from "@/lib/authenticatedApiClient";
import { draftApiClient } from "@/lib/draftApiClient";
import { publicApiClient } from "@/lib/publicApiClient";
import { toRouteProviderToken } from "@/lib/providerIds";
import { normalizeEventTypeSummary, serializeCreateEventTypeRequest } from "@/domain/adapters/eventTypeAdapter";
import { trackedFetch } from "@/lib/networkActivity";
import type {
  ApiResponse,
  AuthResponse,
  AuthOnboardingResponse,
  LinkProviderResponse,
  AvailabilityOverrideCreateRequest,
  AvailabilityOverrideResponse,
  BulkAvailabilityRulesUpsertRequest,
  CalendarStatusMap,
  CreateDraftRequest,
  CreateEventTypeRequest,
  DraftHostResponse,
  EventTypeSummaryResponse,
  MeetingSummaryResponse,
  HoldResponse,
  ProviderAwareStatusMap,
  PublicBookRequest,
  PublicConfirmResponse,
  PublicEventInfoResponse,
  PublicManageBookingResponse,
  PublicRescheduleRequest,
  RecurringWindowRequest,
  RecurringWindowResponse,
  RefreshRequest,
  SessionContextResponse,
  SessionRegistrationPageResponse,
  SessionSummaryResponse,
  SlotResponse,
  UpdateDraftRequest,
  UserDto,
  TeamResponse,
  TeamMemberResponse,
  TeamInvitationResponse,
  CreateTeamRequest,
  InviteMemberRequest,
  EventTypeParticipantResponse,
  AvailabilityRuleResponse,
  GroupReservationBlockerResponse,
  SetupStatusResponse,
  TeamReadinessSummaryResponse,
  RoundRobinStatsResponse,
  PublishReadinessResponse,
} from "./types";
import { ApiError } from "./types";

function toQuery(params?: Record<string, string | number | boolean | undefined>) {
  if (!params) return "";
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) search.set(key, String(value));
  });
  const q = search.toString();
  return q ? `?${q}` : "";
}

function unwrap<T>(body: ApiResponse<T> | T): T {
  if (typeof body === "object" && body !== null && "success" in body) {
    const wrapped = body as ApiResponse<T>;
    if (!wrapped.success) {
      throw new ApiError(wrapped.error?.code ?? "API_ERROR", wrapped.error?.message ?? "Request failed");
    }
    return wrapped.data as T;
  }
  return body as T;
}

function normalizeDraftHostResponse(raw: unknown): DraftHostResponse {
  const asRecord = (value: unknown) => (value && typeof value === "object" ? (value as Record<string, unknown>) : null);
  const root = asRecord(raw);
  const data = root && "data" in root ? asRecord(root.data) : null;
  const candidate = data ?? root;
  if (!candidate) {
    throw new ApiError("INVALID_DRAFT_RESPONSE", "Draft response payload is empty.");
  }

  const slug = typeof candidate.slug === "string" ? candidate.slug.trim() : "";
  const managementToken = typeof candidate.managementToken === "string" ? candidate.managementToken.trim() : "";

  return {
    slug,
    publicUrl: typeof candidate.publicUrl === "string" ? candidate.publicUrl : "",
    displayName: typeof candidate.displayName === "string" ? candidate.displayName : "",
    timezone: typeof candidate.timezone === "string" ? candidate.timezone : "",
    eventName: typeof candidate.eventName === "string" ? candidate.eventName : "",
    description: typeof candidate.description === "string" ? candidate.description : "",
    location: typeof candidate.location === "string" ? candidate.location : "",
    durationMinutes: typeof candidate.durationMinutes === "number" ? candidate.durationMinutes : 0,
    slotIntervalMinutes: typeof candidate.slotIntervalMinutes === "number" ? candidate.slotIntervalMinutes : 0,
    holdDurationMinutes: typeof candidate.holdDurationMinutes === "number" ? candidate.holdDurationMinutes : 0,
    rules: Array.isArray(candidate.rules) ? candidate.rules : [],
    overrides: Array.isArray(candidate.overrides) ? candidate.overrides : [],
    managementToken,
  };
}

function extractString(map: Record<string, unknown> | null, keys: string[]) {
  if (!map) return "";
  for (const key of keys) {
    const value = map[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function slugFromPublicUrl(publicUrl: string) {
  if (!publicUrl) return "";
  try {
    const u = publicUrl.startsWith("http") ? new URL(publicUrl) : new URL(publicUrl, "http://local");
    const parts = u.pathname.split("/").filter(Boolean);
    return parts[parts.length - 1] ?? "";
  } catch {
    const parts = publicUrl.split("/").filter(Boolean);
    return parts[parts.length - 1] ?? "";
  }
}

function deepFindString(value: unknown, keys: string[]): string {
  if (!value || typeof value !== "object") return "";
  const obj = value as Record<string, unknown>;

  for (const key of keys) {
    const hit = obj[key];
    if (typeof hit === "string" && hit.trim()) return hit.trim();
  }

  for (const child of Object.values(obj)) {
    const nested = deepFindString(child, keys);
    if (nested) return nested;
  }
  return "";
}

export const api = {
  baseUrl: API_BASE_URL,

  getGoogleOAuthUrl() {
    return `${API_BASE_URL}/oauth2/authorization/google`;
  },

  getCalendarConnectUrl(params?: { source?: string; returnTo?: string; bookingSessionId?: string }) {
    return this.getIntegrationConnectUrl("calendar", "google", params);
  },

  async getCalendarConnectRedirectUrl(params?: { source?: string; returnTo?: string; bookingSessionId?: string }) {
    return this.getIntegrationConnectRedirectUrl("calendar", "google", params);
  },

  getIntegrationConnectUrl(
    kind: "calendar" | "conferencing",
    provider: string,
    params?: { source?: string; returnTo?: string; bookingSessionId?: string; draftSlug?: string; draftToken?: string },
  ) {
    const token = toRouteProviderToken(provider);
    const url = new URL(`${API_BASE_URL}/integrations/${kind}/${token}/connect`);
    if (params?.source) {
      url.searchParams.set("source", params.source);
    }
    if (params?.returnTo) {
      url.searchParams.set("returnTo", params.returnTo);
    }
    if (params?.bookingSessionId) {
      url.searchParams.set("bookingSessionId", params.bookingSessionId);
    }
    if (params?.draftSlug) {
      url.searchParams.set("draftSlug", params.draftSlug);
    }
    if (params?.draftToken) {
      url.searchParams.set("draftToken", params.draftToken);
    }
    return url.toString();
  },

  async getIntegrationConnectRedirectUrl(
    kind: "calendar" | "conferencing",
    provider: string,
    params?: { source?: string; returnTo?: string; bookingSessionId?: string; draftSlug?: string; draftToken?: string },
  ) {
    const response = await trackedFetch(this.getIntegrationConnectUrl(kind, provider, params), {
      method: "GET",
      credentials: "include",
      loaderMode: "immediate",
    });
    const body = (await response.json()) as ApiResponse<{ redirectUrl: string }>;
    if (!response.ok || !body.success || !body.data?.redirectUrl) {
      throw new ApiError("INTEGRATION_CONNECT_ERROR", `Failed to start ${provider} ${kind} connect.`);
    }
    return body.data.redirectUrl;
  },

  getEventInfo(username: string, slug: string) {
    return publicApiClient<ApiResponse<PublicEventInfoResponse>>(`/public/${username}/${slug}`).then(unwrap);
  },

  getAvailability(username: string, slug: string, date: string) {
    return publicApiClient<ApiResponse<SlotResponse>>(`/public/${username}/${slug}/availability${toQuery({ date })}`).then(unwrap);
  },

  async holdSlot(username: string, slug: string, payload: PublicBookRequest, idempotencyKey?: string) {
    const raw = await publicApiClient<any>(`/public/${username}/${slug}/book`, {
      method: "POST",
      headers: {
        ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
      },
      body: JSON.stringify(payload),
    });
    return {
      bookingId: raw.bookingId,
      expiresAt: raw.expiresAt,
      status: raw.status,
    } as HoldResponse;
  },

  confirmBooking(username: string, slug: string, bookingId: string) {
    return publicApiClient<ApiResponse<PublicConfirmResponse>>(`/public/${username}/${slug}/book/${bookingId}/confirm`, {
      method: "POST",
    }).then(unwrap);
  },

  getPublicBooking(username: string, slug: string, bookingId: string, token: string) {
    return publicApiClient<ApiResponse<PublicManageBookingResponse>>(
      `/public/${username}/${slug}/book/${bookingId}${toQuery({ token })}`,
    ).then(unwrap);
  },

  cancelBooking(username: string, slug: string, bookingId: string, idempotencyKey?: string, token?: string) {
    return publicApiClient(`/public/${username}/${slug}/book/${bookingId}/cancel${toQuery({ token })}`, {
      method: "POST",
      headers: {
        ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
      },
    });
  },

  rescheduleBooking(username: string, slug: string, bookingId: string, payload: PublicRescheduleRequest, idempotencyKey?: string, token?: string) {
    return publicApiClient(`/public/${username}/${slug}/book/${bookingId}/reschedule${toQuery({ token })}`, {
      method: "POST",
      headers: {
        ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
      },
      body: JSON.stringify(payload),
    });
  },

  createDraftHost(payload: CreateDraftRequest) {
    return trackedFetch(`${API_BASE_URL}/public/drafts`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    }).then(async (response) => {
      const rawText = await response.text();
      let parsed: unknown = {};
      if (rawText) {
        try {
          parsed = JSON.parse(rawText);
        } catch {
          parsed = {};
        }
      }
      if (!response.ok) {
        throw new ApiError("HTTP_ERROR", `API error: ${response.status}`);
      }

      const base = normalizeDraftHostResponse(parsed);
      if (base.slug && base.managementToken) return base;

      const root = parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : null;
      const data = root && root.data && typeof root.data === "object" ? (root.data as Record<string, unknown>) : root;

      const publicUrl =
        base.publicUrl ||
        extractString(data, ["publicUrl", "public_url", "bookingUrl", "url"]) ||
        deepFindString(parsed, ["publicUrl", "public_url", "bookingUrl", "url"]);
      const slug =
        base.slug ||
        extractString(data, ["slug", "draftSlug", "draft_slug"]) ||
        deepFindString(parsed, ["slug", "draftSlug", "draft_slug"]) ||
        slugFromPublicUrl(publicUrl);
      const token =
        base.managementToken ||
        extractString(data, ["managementToken", "management_token", "draftToken", "draft_token", "token"]) ||
        deepFindString(parsed, ["managementToken", "management_token", "draftToken", "draft_token", "token"]) ||
        response.headers.get("X-Draft-Token")?.trim() ||
        response.headers.get("x-draft-token")?.trim() ||
        "";

      if (import.meta.env.DEV) {
        console.debug("[draft-create] response-normalize", {
          parsed,
          extracted: { slug, hasToken: Boolean(token), publicUrl },
          headerTokenPresent: Boolean(response.headers.get("X-Draft-Token") || response.headers.get("x-draft-token")),
        });
      }

      if (!slug) {
        throw new ApiError("INVALID_DRAFT_RESPONSE", "Draft slug missing from response.");
      }
      if (!token) {
        throw new ApiError("INVALID_DRAFT_RESPONSE", "Draft management token missing from response.");
      }

      return {
        ...base,
        slug,
        publicUrl,
        managementToken: token,
      };
    });
  },

  getDraftHost(slug: string, draftToken: string) {
    return draftApiClient<ApiResponse<DraftHostResponse>>(`/public/drafts/${slug}`, draftToken).then(unwrap);
  },

  updateDraftHost(slug: string, draftToken: string, payload: UpdateDraftRequest) {
    return draftApiClient<ApiResponse<DraftHostResponse>>(`/public/drafts/${slug}`, draftToken, {
      method: "PUT",
      body: JSON.stringify(payload),
    }).then(unwrap);
  },

  getMe() {
    return authenticatedApiClient<ApiResponse<UserDto>>("/api/me", { skipGlobalLoader: true }).then(unwrap);
  },

  getAuthSession() {
    return authenticatedApiClient<ApiResponse<SessionContextResponse>>("/auth/session").then(unwrap);
  },

  getAuthProviders() {
    return authenticatedApiClient<ApiResponse<AuthOnboardingResponse>>("/auth/providers").then(unwrap);
  },

  linkProvider(provider: string) {
    return authenticatedApiClient<ApiResponse<LinkProviderResponse>>(`/auth/link/${provider}`, {
      method: "POST",
    }).then(unwrap);
  },

  updateMyTimezone(timezone: string) {
    return authenticatedApiClient<ApiResponse<UserDto>>("/api/me/timezone", {
      method: "PUT",
      body: JSON.stringify({ timezone }),
      skipGlobalLoader: true,
    }).then(unwrap);
  },

  refresh(payload: RefreshRequest) {
    return authenticatedApiClient<ApiResponse<AuthResponse>>("/auth/refresh", {
      method: "POST",
      body: JSON.stringify(payload),
    }).then((body) => {
      const data = unwrap(body);
      setAccessToken(data.accessToken);
      return data;
    });
  },

  logout() {
    return authenticatedApiClient("/auth/logout", {
      method: "POST",
    }).finally(() => {
      clearAccessToken();
    });
  },

  getCalendarStatus() {
    return authenticatedApiClient<ApiResponse<CalendarStatusMap>>("/integrations/calendar/status", { skipGlobalLoader: true }).then(unwrap);
  },

  getCalendarProviderStatus() {
    return authenticatedApiClient<ApiResponse<ProviderAwareStatusMap>>("/integrations/calendar/status/providers").then(unwrap);
  },

  getConferencingStatus() {
    return authenticatedApiClient<ApiResponse<ProviderAwareStatusMap>>("/integrations/conferencing/status", { skipGlobalLoader: true }).then(unwrap);
  },

  disconnectCalendar(provider: string) {
    return authenticatedApiClient(`/integrations/calendar/${toRouteProviderToken(provider)}`, {
      method: "DELETE",
    });
  },

  disconnectConferencing(provider: string) {
    return authenticatedApiClient(`/integrations/conferencing/${toRouteProviderToken(provider)}`, {
      method: "DELETE",
    });
  },

  listEventTypes() {
    return authenticatedApiClient<ApiResponse<EventTypeSummaryResponse[]>>("/api/event-types")
      .then(unwrap)
      .then((items) => items.map(normalizeEventTypeSummary));
  },

  getEventType(eventTypeId: string) {
    return authenticatedApiClient<ApiResponse<EventTypeSummaryResponse>>(`/api/event-types/${eventTypeId}`)
      .then(unwrap)
      .then(normalizeEventTypeSummary);
  },

  publishEventType(eventTypeId: string) {
    return authenticatedApiClient<ApiResponse<PublishReadinessResponse>>(
      `/api/event-types/${eventTypeId}/publish`,
      { method: "PUT" },
    ).then(unwrap);
  },

  unpublishEventType(eventTypeId: string) {
    return authenticatedApiClient<ApiResponse<PublishReadinessResponse>>(
      `/api/event-types/${eventTypeId}/unpublish`,
      { method: "PUT" },
    ).then(unwrap);
  },

  listMyMeetings(params?: { upcomingOnly?: boolean; limit?: number }) {
    return authenticatedApiClient<ApiResponse<MeetingSummaryResponse[]>>(
      `/api/bookings/me/meetings${toQuery({
        upcomingOnly: params?.upcomingOnly,
        limit: params?.limit,
      })}`,
      { skipGlobalLoader: true }
    ).then(unwrap);
  },

  listMySessions(params?: { status?: string; eventTypeId?: string; syncStatus?: string; from?: string; to?: string; cursor?: string; limit?: number }) {
    return authenticatedApiClient<ApiResponse<{ items: SessionSummaryResponse[]; nextCursor?: string | null; hasMore?: boolean }>>(
      `/api/sessions/me${toQuery({
        status: params?.status,
        eventTypeId: params?.eventTypeId,
        syncStatus: params?.syncStatus,
        from: params?.from,
        to: params?.to,
        cursor: params?.cursor,
        limit: params?.limit,
      })}`
    ).then(unwrap);
  },

  listSessionRegistrations(sessionId: string, params?: { status?: string; cursor?: string; limit?: number }) {
    return authenticatedApiClient<ApiResponse<SessionRegistrationPageResponse>>(
      `/api/sessions/${sessionId}/registrations${toQuery({
        status: params?.status,
        cursor: params?.cursor,
        limit: params?.limit,
      })}`
    ).then(unwrap);
  },

  cancelSession(sessionId: string, idempotencyKey?: string) {
    return authenticatedApiClient(`/api/sessions/${sessionId}/cancel`, {
      method: "POST",
      headers: {
        ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
      },
    });
  },

  listHostMeetings(hostId: string, params?: { upcomingOnly?: boolean; limit?: number }) {
    return authenticatedApiClient<ApiResponse<MeetingSummaryResponse[]>>(
      `/api/bookings/hosts/${hostId}/meetings${toQuery({
        upcomingOnly: params?.upcomingOnly,
        limit: params?.limit,
      })}`
    ).then(unwrap);
  },

  cancelHostBooking(bookingId: string, idempotencyKey?: string) {
    return authenticatedApiClient(`/api/bookings/${bookingId}/cancel`, {
      method: "POST",
      headers: {
        ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
      },
    });
  },

  createEventType(payload: CreateEventTypeRequest) {
    const body = serializeCreateEventTypeRequest(payload);
    return authenticatedApiClient<ApiResponse<EventTypeSummaryResponse>>("/api/event-types", {
      method: "POST",
      body: JSON.stringify(body),
    })
      .then(unwrap)
      .then(normalizeEventTypeSummary);
  },

  getAvailabilityRules() {
    return authenticatedApiClient<ApiResponse<AvailabilityRuleResponse[]>>("/api/availability/rules").then(unwrap);
  },

  getReservationBlockers() {
    return authenticatedApiClient<ApiResponse<GroupReservationBlockerResponse[]>>(
      "/api/availability/reservation-blockers",
    ).then(unwrap);
  },

  // Host-global working hours. The ONLY writer of availability_rules. Must be
  // called exclusively from the dedicated Availability Settings experience -- never
  // from an event-type creation/edit flow.
  upsertAvailabilityRules(payload: BulkAvailabilityRulesUpsertRequest) {
    return authenticatedApiClient("/api/availability/rules/bulk", {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },

  // ── Event type participants (Phase 2) ──────────────────────────────────────
  listEventTypeParticipants(eventTypeId: string) {
    return authenticatedApiClient<ApiResponse<EventTypeParticipantResponse[]>>(
      `/api/event-types/${eventTypeId}/participants`,
    ).then(unwrap);
  },

  replaceEventTypeParticipants(eventTypeId: string, userIds: string[]) {
    return authenticatedApiClient<ApiResponse<EventTypeParticipantResponse[]>>(
      `/api/event-types/${eventTypeId}/participants`,
      {
        method: "PUT",
        body: JSON.stringify({ userIds }),
      },
    ).then(unwrap);
  },

  checkParticipantReadiness(userIds: string[]) {
    const params = userIds.map((id) => `userIds=${encodeURIComponent(id)}`).join("&");
    return authenticatedApiClient<ApiResponse<EventTypeParticipantResponse[]>>(
      `/api/event-types/participants/readiness?${params}`,
    ).then(unwrap);
  },

  // ── Teams (Phase 1: team foundation) ───────────────────────────────────────
  listTeams() {
    return authenticatedApiClient<ApiResponse<TeamResponse[]>>("/api/teams").then(unwrap);
  },

  createTeam(payload: CreateTeamRequest) {
    return authenticatedApiClient<ApiResponse<TeamResponse>>("/api/teams", {
      method: "POST",
      body: JSON.stringify(payload),
    }).then(unwrap);
  },

  getTeam(teamId: string) {
    return authenticatedApiClient<ApiResponse<TeamResponse>>(`/api/teams/${teamId}`).then(unwrap);
  },

  listTeamMembers(teamId: string) {
    return authenticatedApiClient<ApiResponse<TeamMemberResponse[]>>(
      `/api/teams/${teamId}/members`,
    ).then(unwrap);
  },

  removeTeamMember(teamId: string, memberUserId: string) {
    return authenticatedApiClient(`/api/teams/${teamId}/members/${memberUserId}`, {
      method: "DELETE",
    });
  },

  listTeamInvitations(teamId: string) {
    return authenticatedApiClient<ApiResponse<TeamInvitationResponse[]>>(
      `/api/teams/${teamId}/invitations`,
    ).then(unwrap);
  },

  inviteTeamMember(teamId: string, payload: InviteMemberRequest) {
    return authenticatedApiClient<ApiResponse<TeamInvitationResponse>>(
      `/api/teams/${teamId}/invitations`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
    ).then(unwrap);
  },

  revokeTeamInvitation(teamId: string, invitationId: string) {
    return authenticatedApiClient(`/api/teams/${teamId}/invitations/${invitationId}`, {
      method: "DELETE",
    });
  },

  acceptTeamInvitation(token: string) {
    return authenticatedApiClient<ApiResponse<TeamMemberResponse>>(
      `/api/invitations/${token}/accept`,
      { method: "POST" },
    ).then(unwrap);
  },

  // ── Team readiness & setup requests ──────────────────────────────────────

  getTeamReadinessSummary(teamId: string) {
    return authenticatedApiClient<ApiResponse<TeamReadinessSummaryResponse>>(
      `/api/teams/${teamId}/readiness-summary`,
    ).then(unwrap);
  },

  sendSetupRequest(teamMemberId: string) {
    return authenticatedApiClient<ApiResponse<SetupStatusResponse>>(
      `/api/teams/members/${teamMemberId}/setup-request`,
      { method: "POST" },
    ).then(unwrap);
  },

  getSetupStatus(teamMemberId: string) {
    return authenticatedApiClient<ApiResponse<SetupStatusResponse>>(
      `/api/teams/members/${teamMemberId}/setup-status`,
    ).then(unwrap);
  },

  // ── Round Robin stats ─────────────────────────────────────────────────────

  getRrStats(eventTypeId: string) {
    return authenticatedApiClient<ApiResponse<RoundRobinStatsResponse>>(
      `/api/event-types/${eventTypeId}/rr-stats`,
    ).then(unwrap);
  },

  getPublishReadiness(eventTypeId: string) {
    return authenticatedApiClient<ApiResponse<PublishReadinessResponse>>(
      `/api/event-types/${eventTypeId}/publish-readiness`,
    ).then(unwrap);
  },

  // GROUP event type reservation windows (ownership: blocks other event types).
  getReservationWindows(eventTypeId: string) {
    return authenticatedApiClient<ApiResponse<RecurringWindowResponse[]>>(
      `/api/event-types/${eventTypeId}/reservation-windows`,
    ).then(unwrap);
  },

  replaceReservationWindows(eventTypeId: string, windows: RecurringWindowRequest[]) {
    return authenticatedApiClient<ApiResponse<RecurringWindowResponse[]>>(
      `/api/event-types/${eventTypeId}/reservation-windows`,
      {
        method: "PUT",
        body: JSON.stringify(windows),
      },
    ).then(unwrap);
  },

  // Demand-driven event type availability FILTER windows (no ownership, no
  // reservation; only narrows this event's availability).
  getEventAvailabilityWindows(eventTypeId: string) {
    return authenticatedApiClient<ApiResponse<RecurringWindowResponse[]>>(
      `/api/event-types/${eventTypeId}/availability-windows`,
    ).then(unwrap);
  },

  replaceEventAvailabilityWindows(eventTypeId: string, windows: RecurringWindowRequest[]) {
    return authenticatedApiClient<ApiResponse<RecurringWindowResponse[]>>(
      `/api/event-types/${eventTypeId}/availability-windows`,
      {
        method: "PUT",
        body: JSON.stringify(windows),
      },
    ).then(unwrap);
  },

  getAvailabilityOverrides(from?: string, to?: string) {
    return authenticatedApiClient<ApiResponse<AvailabilityOverrideResponse[]>>(`/api/availability/overrides${toQuery({ from, to })}`).then(unwrap);
  },

  createAvailabilityOverride(payload: AvailabilityOverrideCreateRequest) {
    return authenticatedApiClient<ApiResponse<AvailabilityOverrideResponse>>("/api/availability/overrides", {
      method: "POST",
      body: JSON.stringify(payload),
    }).then(unwrap);
  },

  deleteAvailabilityOverride(id: string) {
    return authenticatedApiClient(`/api/availability/overrides/${id}`, {
      method: "DELETE",
    });
  },
};
