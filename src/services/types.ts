export type BookingStatus = "INITIATED" | "HELD" | "CONFIRMED" | "CANCELLED" | "EXPIRED" | "RESCHEDULED";

export interface UserDto {
  id: string;
  email: string;
  username: string;
  name: string;
  timezone: string;
  profileImage: string | null;
}

export interface PublicEventInfoResponse {
  name: string;
  duration: number;
  timezone: string;
  hostName: string;
  hostUsername: string;
  description: string;
  location: string;
  hostAvatarUrl?: string;
}

export interface SlotDto {
  slotId: string;
  start: string;
  end: string;
  available: boolean;
}

export type PublicAvailabilityStatus =
  | "AVAILABLE"
  | "NO_SLOTS_AVAILABLE"
  | "CALENDAR_NOT_CONNECTED"
  | "CALENDAR_SYNC_IN_PROGRESS"
  | "STALE_CALENDAR_DATA";

export interface SlotResponse {
  userId: string;
  eventTypeId: string;
  date: string;
  timezone: string;
  version: number;
  generatedAt: string;
  degraded: boolean;
  status?: PublicAvailabilityStatus | string;
  slots: SlotDto[];
}

export interface PublicBookRequest {
  startTime: string;
  guestEmail: string;
  guestName: string;
}

export interface HoldResponse {
  bookingId: string;
  expiresAt: string;
  status: BookingStatus;
}

export interface PublicConfirmResponse {
  bookingId: string;
  status: BookingStatus;
  manageToken?: string;
  provider?: string | null;
  externalEventId?: string | null;
  calendarSyncStatus?: string | null;
  providerEventUrl?: string | null;
  conferenceUrl?: string | null;
  externalLifecycleState?: string | null;
  externalLifecycleReason?: string | null;
  reconcileSuppressed?: boolean | null;
  actionRequired?: boolean | null;
}

export interface EventTypeSummaryResponse {
  id: string;
  name: string;
  slug: string;
  link: string;
}

export interface HostMeetingResponse {
  bookingId: string;
  bookingStatus: string;
  startTime: string;
  endTime: string;
  guestName: string;
  guestEmail: string;
  eventTypeName: string;
  provider?: string | null;
  externalEventId?: string | null;
  calendarSyncStatus?: string | null;
  providerEventUrl?: string | null;
  conferenceUrl?: string | null;
  externalLifecycleState?: string | null;
  externalLifecycleReason?: string | null;
  reconcileSuppressed?: boolean | null;
  actionRequired?: boolean | null;
}

export interface CreateEventTypeRequest {
  name: string;
  description: string;
  location: string;
  durationMinutes: number;
  bufferBeforeMinutes: number;
  bufferAfterMinutes: number;
  slotIntervalMinutes: number;
  minNoticeMinutes: number;
  maxAdvanceDays: number;
  holdDurationMinutes: number;
  slug: string;
  conferencingProvider?: string;
  customConferenceUrl?: string;
}

export type DayOfWeek =
  | "MONDAY"
  | "TUESDAY"
  | "WEDNESDAY"
  | "THURSDAY"
  | "FRIDAY"
  | "SATURDAY"
  | "SUNDAY";

export interface AvailabilityRuleRequest {
  dayOfWeek: DayOfWeek;
  startTime: string;
  endTime: string;
}

export interface BulkAvailabilityRulesUpsertRequest {
  rules: AvailabilityRuleRequest[];
}

export interface AvailabilityOverrideCreateRequest {
  date: string;
  startTime?: string;
  endTime?: string;
  available: boolean;
  isAvailable?: boolean;
}

export interface AvailabilityOverrideResponse {
  id: string;
  date: string;
  startTime?: string | null;
  endTime?: string | null;
  isAvailable?: boolean;
  available?: boolean;
}

export interface DraftAvailabilityRule {
  dayOfWeek: DayOfWeek;
  startTime: string;
  endTime: string;
}

export interface DraftOverride {
  date: string;
  startTime?: string;
  endTime?: string;
  isAvailable?: boolean;
}

export interface CreateDraftRequest {
  email: string;
  displayName: string;
  timezone: string;
  eventName: string;
  description: string;
  location: string;
  durationMinutes: number;
  slotIntervalMinutes: number;
  holdDurationMinutes: number;
  rules: DraftAvailabilityRule[];
  overrides: DraftOverride[];
}

export interface UpdateDraftRequest {
  displayName: string;
  timezone: string;
  eventName: string;
  description: string;
  location: string;
  durationMinutes: number;
  slotIntervalMinutes: number;
  holdDurationMinutes: number;
  rules: DraftAvailabilityRule[];
  overrides: DraftOverride[];
}

export interface DraftHostResponse {
  slug: string;
  publicUrl: string;
  displayName?: string;
  timezone?: string;
  eventName?: string;
  description?: string;
  location?: string;
  durationMinutes?: number;
  slotIntervalMinutes?: number;
  holdDurationMinutes?: number;
  rules?: DraftAvailabilityRule[];
  overrides?: DraftOverride[];
  managementToken?: string;
}

export interface RefreshRequest {
  refreshToken: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: UserDto;
}

export interface LogoutRequest {
  userId: string;
}

export interface CalendarStatusMap {
  [provider: string]: string;
}

export type IntegrationKind = "calendar" | "conferencing";

export interface ProviderStatusEntry {
  status: string;
  // Optional provider-aware metadata (calendar list, last sync, etc).
  calendars?: ProviderCalendarSummary[];
  [key: string]: unknown;
}

export interface ProviderCalendarSummary {
  id: string;
  name?: string;
  primary?: boolean;
  selected?: boolean;
  // Backends may return additional metadata.
  [key: string]: unknown;
}

export interface ProviderAwareStatusMap {
  [provider: string]: ProviderStatusEntry;
}

// Capability metadata exposed by /integrations/{domain}/status* endpoints.
// Keys mirror the backend enum casing (GOOGLE, MICROSOFT, GOOGLE_MEET, ZOOM, CUSTOM_URL, NONE).
export interface ProviderCapabilityFlags {
  supportsWebhooks?: boolean;
  supportsConferencing?: boolean;
  supportsAvailabilitySync?: boolean;
  supportsPushRenewal?: boolean;
  supportsMultipleCalendars?: boolean;
  [key: string]: unknown;
}

export interface ProviderCapabilityMap {
  [providerEnum: string]: ProviderCapabilityFlags;
}

export interface PublicRescheduleRequest {
  startTime: string;
}

export interface PublicManageBookingResponse {
  bookingId: string;
  eventTitle: string;
  durationMinutes: number;
  startTime: string;
  endTime: string;
  hostName: string;
  hostUsername: string;
  hostAvatarUrl?: string | null;
  attendeeName: string;
  attendeeEmail: string;
  conferenceUrl?: string | null;
  status: BookingStatus | string;
  externalLifecycleState?: string | null;
  externalLifecycleReason?: string | null;
  timezone?: string | null;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: { code: string; message: string };
}

export class ApiError extends Error {
  constructor(public code: string, message: string) {
    super(message);
    this.name = "ApiError";
  }
}
