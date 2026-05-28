import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo, useState } from "react";
import { api } from "@/services";
import { useIntegrationState } from "@/state/IntegrationContext";
import { toCanonicalProviderId } from "@/lib/providerIds";
import { toCanonicalConferenceProviderValue } from "@/domain/adapters/eventTypeAdapter";
import { hasConferencingProviderCapability, isConferencingCapabilityMapPopulated, isTeamsHiddenForAccountCapability, toCapabilityAwareUnsupportedMessage, unsupportedCapabilityMessage, } from "@/lib/conferencingCapabilities";
function slugify(value) {
    return value
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 60);
}
function readConnectionId(calendar, entry) {
    const candidate = [
        calendar?.connectionId,
        calendar?.calendarConnectionId,
        calendar?.integrationConnectionId,
        entry?.connectionId,
        entry?.calendarConnectionId,
        entry?.integrationConnectionId,
        entry?.providerConnectionId,
    ].find((value) => typeof value === "string" && value.trim());
    return typeof candidate === "string" ? candidate.trim() : null;
}
export function DashboardEventEditorSection({ events, eventsLoading, eventsError, onReload }) {
    const { calendarStatus, conferencingStatus, conferencingCapabilities, getCalendarProviderStatus, getConferencingProviderStatus, } = useIntegrationState();
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [location, setLocation] = useState("Google Meet");
    const [conferencingProvider, setConferencingProvider] = useState("google_meet");
    const [customConferenceUrl, setCustomConferenceUrl] = useState("");
    const [availabilityBindings, setAvailabilityBindings] = useState([]);
    const [organizerBindingKey, setOrganizerBindingKey] = useState("");
    const [duration, setDuration] = useState(30);
    const [submitting, setSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState(null);
    const slug = useMemo(() => slugify(name), [name]);
    const connectedCalendarProviders = Object.keys(calendarStatus).filter((provider) => getCalendarProviderStatus(provider) === "connected");
    const hasGoogleCalendarConnected = (() => {
        const status = getCalendarProviderStatus("google");
        return status === "connected" || status === "syncing";
    })();
    const hasMicrosoftCalendarConnected = (() => {
        const status = getCalendarProviderStatus("microsoft");
        return status === "connected" || status === "syncing";
    })();
    const bindingSet = new Set(availabilityBindings.map((binding) => `${binding.provider}:${binding.calendarId}`));
    const conferenceOptions = [
        { value: "google_meet", label: "Google Meet" },
        { value: "microsoft_teams", label: "Microsoft Teams" },
        { value: "zoom", label: "Zoom" },
        { value: "custom_url", label: "Custom URL" },
        { value: "none", label: "None" },
    ];
    const supportsConferencingCapabilities = isConferencingCapabilityMapPopulated(conferencingCapabilities);
    const teamsHiddenByCapability = isTeamsHiddenForAccountCapability(conferencingCapabilities);
    const effectiveConferenceOptions = conferenceOptions.filter((opt) => {
        if (supportsConferencingCapabilities && !hasConferencingProviderCapability(conferencingCapabilities, opt.value))
            return false;
        if (opt.value === "microsoft_teams" && teamsHiddenByCapability)
            return false;
        if (opt.value === "google_meet") {
            return hasGoogleCalendarConnected;
        }
        if (opt.value === "microsoft_teams") {
            return hasMicrosoftCalendarConnected;
        }
        if (opt.value === "zoom") {
            const zoomStatus = getConferencingProviderStatus("zoom");
            if (zoomStatus === "connected" || zoomStatus === "syncing")
                return true;
            const zoomEntry = conferencingStatus[toCanonicalProviderId("zoom")];
            return zoomEntry?.connected === true;
        }
        return true;
    });
    const selectedConferenceProviderAvailable = effectiveConferenceOptions.some((option) => option.value === conferencingProvider);
    const selectedAvailabilityCalendars = availabilityBindings
        .map((binding) => {
        const entry = calendarStatus[binding.provider];
        const calendars = entry?.calendars ?? [];
        const match = calendars.find((calendar) => String(calendar.id ?? "") === binding.calendarId);
        const connectionId = readConnectionId(match, entry);
        if (!connectionId)
            return null;
        return {
            key: `${binding.provider}:${binding.calendarId}`,
            provider: binding.provider,
            calendarId: binding.calendarId,
            connectionId,
            calendarName: String(match?.name ?? binding.calendarId),
        };
    })
        .filter((item) => Boolean(item));
    const selectedOrganizer = selectedAvailabilityCalendars.find((item) => item.key === organizerBindingKey) ?? null;
    const effectiveOrganizer = selectedOrganizer ?? selectedAvailabilityCalendars[0] ?? null;
    const toggleAvailabilityBinding = (provider, calendarId) => {
        const key = `${provider}:${calendarId}`;
        setAvailabilityBindings((prev) => {
            const nextBindings = prev.some((b) => `${b.provider}:${b.calendarId}` === key)
                ? prev.filter((b) => `${b.provider}:${b.calendarId}` !== key)
                : [...prev, { provider, calendarId }];
            const organizerStillSelected = nextBindings.some((b) => `${b.provider}:${b.calendarId}` === organizerBindingKey);
            if (!organizerStillSelected) {
                setOrganizerBindingKey(nextBindings[0] ? `${nextBindings[0].provider}:${nextBindings[0].calendarId}` : "");
            }
            return nextBindings;
        });
    };
    const create = async () => {
        if (!name.trim() || !slug || availabilityBindings.length === 0 || !selectedConferenceProviderAvailable || !effectiveOrganizer)
            return;
        setSubmitting(true);
        setSubmitError(null);
        try {
            const availabilityCalendars = selectedAvailabilityCalendars.map((binding) => ({
                connectionId: binding.connectionId,
                provider: binding.provider,
                externalCalendarId: binding.calendarId,
            }));
            await api.createEventType({
                name: name.trim(),
                description: description.trim(),
                location: location.trim() || "Google Meet",
                durationMinutes: duration,
                bufferBeforeMinutes: 5,
                bufferAfterMinutes: 5,
                slotIntervalMinutes: 15,
                minNoticeMinutes: 120,
                maxAdvanceDays: 60,
                holdDurationMinutes: 10,
                slug,
                availabilityCalendars,
                conference: {
                    enabled: conferencingProvider !== "none",
                    provider: toCanonicalConferenceProviderValue(conferencingProvider),
                    ...(conferencingProvider === "custom_url" && customConferenceUrl.trim() ? { customUrl: customConferenceUrl.trim() } : {}),
                },
                projectionDestination: {
                    provider: effectiveOrganizer.provider,
                    connectionId: effectiveOrganizer.connectionId,
                    calendarId: effectiveOrganizer.calendarId,
                },
            });
            setName("");
            setDescription("");
            setDuration(30);
            setConferencingProvider(hasGoogleCalendarConnected ? "google_meet" : "zoom");
            setCustomConferenceUrl("");
            setAvailabilityBindings([]);
            setOrganizerBindingKey("");
            await onReload();
        }
        catch (e) {
            console.error(e);
            setSubmitError(toCapabilityAwareUnsupportedMessage(e, "Unable to create event type."));
        }
        finally {
            setSubmitting(false);
        }
    };
    return (_jsxs("div", { className: "dash-section", children: [_jsx("div", { className: "dash-section-head", children: _jsxs("div", { children: [_jsxs("h2", { children: ["Event ", _jsx("em", { children: "editor" })] }), _jsx("div", { className: "sub", children: "Create and tune booking experiences with production scheduling defaults." })] }) }), (eventsError || submitError) && _jsx("div", { className: "dash-alert error", children: eventsError ?? submitError }), _jsxs("div", { className: "panel", style: { marginBottom: 16 }, children: [_jsx("div", { className: "h", children: _jsxs("div", { children: [_jsx("h3", { children: "Create event type" }), _jsx("div", { className: "sub", children: "Configure a new booking link." })] }) }), _jsxs("div", { style: { display: "grid", gridTemplateColumns: "1.2fr .8fr .8fr", gap: 12 }, children: [_jsxs("div", { className: "dash-field", children: [_jsx("label", { children: "Name" }), _jsx("input", { className: "dash-input", value: name, onChange: (e) => setName(e.target.value), placeholder: "Intro call" })] }), _jsxs("div", { className: "dash-field", children: [_jsx("label", { children: "Duration (min)" }), _jsx("select", { className: "dash-input", value: duration, onChange: (e) => setDuration(Number(e.target.value)), children: [15, 30, 45, 60, 90].map((d) => _jsx("option", { value: d, children: d }, d)) })] }), _jsxs("div", { className: "dash-field", children: [_jsx("label", { children: "Location" }), _jsx("input", { className: "dash-input", value: location, onChange: (e) => setLocation(e.target.value) })] })] }), _jsx("div", { style: { display: "grid", gridTemplateColumns: "1fr", gap: 12, marginTop: 12 }, children: _jsxs("div", { className: "dash-field", children: [_jsx("label", { children: "Conferencing" }), _jsxs("select", { className: "dash-input", value: selectedConferenceProviderAvailable ? conferencingProvider : "", onChange: (e) => setConferencingProvider(e.target.value), children: [!selectedConferenceProviderAvailable && _jsx("option", { value: "", children: "Select provider" }), effectiveConferenceOptions.map((opt) => _jsx("option", { value: opt.value, children: opt.label }, opt.value))] }), !hasGoogleCalendarConnected && (_jsx("div", { className: "sub", style: { marginTop: 6 }, children: "Google Meet requires Google Calendar." })), !hasMicrosoftCalendarConnected && !teamsHiddenByCapability && (_jsx("div", { className: "sub", style: { marginTop: 6 }, children: "Microsoft Teams requires Microsoft Calendar." })), teamsHiddenByCapability && (_jsx("div", { className: "sub", style: { marginTop: 6 }, children: unsupportedCapabilityMessage() })), conferencingProvider === "google_meet" && !hasGoogleCalendarConnected && (_jsx("div", { className: "dash-alert error", style: { marginTop: 8 }, children: "Google Meet became unavailable because Google Calendar was disconnected." })), conferencingProvider === "microsoft_teams" && !hasMicrosoftCalendarConnected && (_jsx("div", { className: "dash-alert error", style: { marginTop: 8 }, children: "Microsoft Teams became unavailable because Microsoft Calendar was disconnected." })), conferencingProvider === "microsoft_teams" && teamsHiddenByCapability && (_jsx("div", { className: "dash-alert error", style: { marginTop: 8 }, children: "Microsoft Teams is not supported for this connected Microsoft account. Switch to Zoom or Google Meet, or reconnect using a Microsoft 365 work or school account." }))] }) }), effectiveConferenceOptions.length === 0 && (_jsx("div", { className: "dash-alert error", style: { marginTop: 8 }, children: "Connect at least one conferencing provider to enable conferencing options." })), conferencingProvider === "custom_url" && (_jsxs("div", { className: "dash-field", style: { marginTop: 12 }, children: [_jsx("label", { children: "Custom conference URL" }), _jsx("input", { className: "dash-input", type: "url", value: customConferenceUrl, onChange: (e) => setCustomConferenceUrl(e.target.value) })] })), _jsxs("div", { className: "dash-field", style: { marginTop: 12 }, children: [_jsx("label", { children: "Availability calendars" }), _jsxs("div", { style: { display: "grid", gap: 8 }, children: [connectedCalendarProviders.length === 0 && _jsx("div", { className: "dash-alert error", children: "Connect at least one calendar provider before creating an event type." }), connectedCalendarProviders.map((provider) => {
                                        const calendars = (calendarStatus[provider]?.calendars ?? []).filter((cal) => cal.id);
                                        return (_jsxs("div", { style: { border: "1px solid var(--border)", borderRadius: 10, padding: 10 }, children: [_jsx("div", { style: { fontSize: 12, color: "var(--plum-500)", marginBottom: 6 }, children: provider }), _jsx("div", { style: { display: "grid", gap: 6 }, children: calendars.map((calendar) => {
                                                        const id = `${provider}:${calendar.id}`;
                                                        return (_jsxs("label", { style: { display: "flex", gap: 8, alignItems: "center", fontSize: 13 }, children: [_jsx("input", { type: "checkbox", checked: bindingSet.has(id), onChange: () => toggleAvailabilityBinding(provider, calendar.id) }), _jsx("span", { children: calendar.name ?? calendar.id })] }, id));
                                                    }) })] }, provider));
                                    })] })] }), _jsxs("div", { className: "dash-field", style: { marginTop: 12 }, children: [_jsx("label", { children: "Writeback calendar" }), _jsxs("select", { className: "dash-input", value: effectiveOrganizer?.key ?? "", onChange: (e) => setOrganizerBindingKey(e.target.value), children: [!effectiveOrganizer && _jsx("option", { value: "", children: "Select a calendar" }), selectedAvailabilityCalendars.map((binding) => (_jsxs("option", { value: binding.key, children: [binding.provider, " \u00B7 ", binding.calendarName] }, binding.key)))] }), _jsx("div", { className: "sub", style: { marginTop: 6 }, children: "Confirmed bookings are mirrored here. All selected calendars are checked for availability." })] }), _jsxs("div", { className: "dash-field", style: { marginTop: 12 }, children: [_jsx("label", { children: "Description" }), _jsx("textarea", { className: "dash-input", value: description, onChange: (e) => setDescription(e.target.value), rows: 3, placeholder: "What guests should expect in this meeting." })] }), _jsxs("div", { style: { marginTop: 10, fontSize: 12.5, color: "var(--plum-500)" }, children: ["Booking link slug: ", _jsx("strong", { children: slug || "(enter a name)" })] }), _jsx("div", { style: { marginTop: 14, display: "flex", justifyContent: "flex-end" }, children: _jsx("button", { className: "dash-btn-primary", disabled: !name.trim() || !slug || availabilityBindings.length === 0 || !selectedConferenceProviderAvailable || !effectiveOrganizer || submitting, onClick: create, children: submitting ? "Creating..." : "Create event type" }) })] }), _jsxs("div", { className: "panel", children: [_jsxs("div", { className: "h", children: [_jsxs("div", { children: [_jsx("h3", { children: "Existing event types" }), _jsx("div", { className: "sub", children: "Production event links currently available." })] }), _jsx("button", { className: "dash-btn-secondary", style: { fontSize: 12.5, padding: "6px 14px" }, onClick: () => onReload(), children: "Refresh" })] }), eventsLoading ? (_jsx("div", { style: { display: "grid", gap: 8 }, children: Array.from({ length: 3 }).map((_, i) => _jsx("div", { className: "dash-skel", style: { height: 56 } }, i)) })) : events.length === 0 ? (_jsxs("div", { className: "dash-empty", style: { padding: "12px 0" }, children: [_jsx("h3", { children: "No event types yet" }), _jsx("p", { children: "Create your first event type using the editor above." })] })) : (_jsx("div", { style: { display: "grid", gap: 8 }, children: events.map((event) => (_jsxs("article", { className: "et-row", children: [_jsx("div", { className: "stripe lilac" }), _jsxs("div", { children: [_jsx("div", { className: "name", children: event.name }), _jsxs("div", { className: "slug", children: ["/", event.slug] }), teamsHiddenByCapability && String(event.conference?.provider ?? "").toLowerCase() === "microsoft_teams" && (_jsx("div", { className: "dash-alert error", style: { marginTop: 8 }, children: "This event type uses Microsoft Teams, which is unsupported for this account capability. Switch conferencing to Zoom/Google Meet or reconnect with a Microsoft 365 organization account before further changes." }))] }), _jsx("div", { style: { display: "flex", alignItems: "center", gap: 8 }, children: _jsx("a", { className: "dash-btn-secondary", style: { fontSize: 12, padding: "4px 12px" }, href: event.link, target: "_blank", rel: "noreferrer", children: "Open" }) })] }, event.id))) }))] })] }));
}
