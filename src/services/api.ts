import { API_BASE_URL } from "@/config/api";
import { apiClient, clearAccessToken, setAccessToken } from "@/lib/apiClient";
import type {
  ApiResponse,
  AuthResponse,
  AvailabilityOverrideCreateRequest,
  AvailabilityOverrideResponse,
  BulkAvailabilityRulesUpsertRequest,
  CalendarStatusMap,
  CreateEventTypeRequest,
  EventTypeSummaryResponse,
  HostMeetingResponse,
  HoldResponse,
  PublicConfirmResponse,
  PublicEventInfoResponse,
  PublicBookRequest,
  PublicRescheduleRequest,
  RefreshRequest,
  SlotResponse,
  UserDto,
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

export const api = {
  baseUrl: API_BASE_URL,

  getGoogleOAuthUrl() {
    return `${API_BASE_URL}/oauth2/authorization/google`;
  },

  getCalendarConnectUrl(params?: { source?: string; returnTo?: string }) {
    const url = new URL(`${API_BASE_URL}/integrations/calendar/google/connect`);
    if (params?.source) {
      url.searchParams.set("source", params.source);
    }
    if (params?.returnTo) {
      url.searchParams.set("returnTo", params.returnTo);
    }
    return url.toString();
  },

  async getCalendarConnectRedirectUrl(params?: { source?: string; returnTo?: string }) {
    const response = await fetch(this.getCalendarConnectUrl(params), {
      method: "GET",
      credentials: "include",
    });
    const body = (await response.json()) as ApiResponse<{ redirectUrl: string }>;
    if (!response.ok || !body.success || !body.data?.redirectUrl) {
      throw new ApiError("CALENDAR_CONNECT_ERROR", "Failed to start Google Calendar connect.");
    }
    return body.data.redirectUrl;
  },

  getEventInfo(username: string, slug: string) {
    return apiClient<ApiResponse<PublicEventInfoResponse>>(`/public/${username}/${slug}`).then(unwrap);
  },

  getAvailability(username: string, slug: string, date: string) {
    return apiClient<ApiResponse<SlotResponse>>(`/public/${username}/${slug}/availability${toQuery({ date })}`).then(unwrap);
  },

  async holdSlot(username: string, slug: string, payload: PublicBookRequest, idempotencyKey?: string) {
    const raw = await apiClient<any>(`/public/${username}/${slug}/book`, {
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
    return apiClient<ApiResponse<PublicConfirmResponse>>(`/public/${username}/${slug}/book/${bookingId}/confirm`, {
      method: "POST",
    }).then(unwrap);
  },

  cancelBooking(username: string, slug: string, bookingId: string, idempotencyKey?: string) {
    return apiClient(`/public/${username}/${slug}/book/${bookingId}/cancel`, {
      method: "POST",
      headers: {
        ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
      },
    });
  },

  rescheduleBooking(username: string, slug: string, bookingId: string, payload: PublicRescheduleRequest, idempotencyKey?: string) {
    return apiClient(`/public/${username}/${slug}/book/${bookingId}/reschedule`, {
      method: "POST",
      headers: {
        ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
      },
      body: JSON.stringify(payload),
    });
  },

  getMe() {
    return apiClient<ApiResponse<UserDto>>("/api/me").then(unwrap);
  },

  refresh(payload: RefreshRequest) {
    return apiClient<ApiResponse<AuthResponse>>("/auth/refresh", {
      method: "POST",
      body: JSON.stringify(payload),
    }).then((body) => {
      const data = unwrap(body);
      setAccessToken(data.accessToken);
      return data;
    });
  },

  logout() {
    return apiClient("/auth/logout", {
      method: "POST",
    }).finally(() => {
      clearAccessToken();
    });
  },

  getCalendarStatus() {
    return apiClient<ApiResponse<CalendarStatusMap>>("/integrations/calendar/status").then(unwrap);
  },

  disconnectCalendar(provider: string) {
    return apiClient(`/integrations/calendar/${provider}`, {
      method: "DELETE",
    });
  },

  listEventTypes() {
    return apiClient<ApiResponse<EventTypeSummaryResponse[]>>("/api/event-types").then(unwrap);
  },

  listHostMeetings(hostId: string, params?: { upcomingOnly?: boolean; limit?: number; status?: string; page?: number }) {
    return apiClient<ApiResponse<HostMeetingResponse[]>>(
      `/api/bookings/hosts/${hostId}/meetings${toQuery({
        upcomingOnly: params?.upcomingOnly,
        limit: params?.limit,
        status: params?.status,
        page: params?.page,
      })}`
    ).then(unwrap);
  },

  createEventType(payload: CreateEventTypeRequest) {
    return apiClient<ApiResponse<EventTypeSummaryResponse>>("/api/event-types", {
      method: "POST",
      body: JSON.stringify(payload),
    }).then(unwrap);
  },

  upsertAvailabilityRules(payload: BulkAvailabilityRulesUpsertRequest) {
    return apiClient("/api/availability/rules/bulk", {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },

  getAvailabilityOverrides(from?: string, to?: string) {
    return apiClient<ApiResponse<AvailabilityOverrideResponse[]>>(`/api/availability/overrides${toQuery({ from, to })}`).then(unwrap);
  },

  createAvailabilityOverride(payload: AvailabilityOverrideCreateRequest) {
    return apiClient<ApiResponse<AvailabilityOverrideResponse>>("/api/availability/overrides", {
      method: "POST",
      body: JSON.stringify(payload),
    }).then(unwrap);
  },

  deleteAvailabilityOverride(id: string) {
    return apiClient(`/api/availability/overrides/${id}`, {
      method: "DELETE",
    });
  },
};
