import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import clsx from "@/lib/clsx";
import { BunnyMark } from "@/components/BunnyMark";
import { BrandWordmark } from "@/components/BrandWordmark";

type Section = "meetings" | "availability" | "availability-sources" | "event-types" | "event-editor" | "integrations" | "linked-accounts" | "participation" | "teams" | "settings";

function MeetingsIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="3" width="14" height="12" rx="2" />
      <path d="M1 7h14M5 1v4M11 1v4" />
    </svg>
  );
}
function AvailabilityIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="8" cy="8" r="6" />
      <path d="M8 5v3l2 2" />
    </svg>
  );
}
function EventTypesIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <path d="M2 4h12M2 8h8M2 12h5" />
    </svg>
  );
}
function IntegrationsIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="4" cy="8" r="2.5" />
      <circle cx="12" cy="4" r="2" />
      <circle cx="12" cy="12" r="2" />
      <path d="M6.5 8h3.5M9.5 4l-3.5 3M9.5 12l-3.5-3" />
    </svg>
  );
}
function TeamsIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="5.5" cy="5" r="2.5" />
      <circle cx="11.5" cy="6" r="2" />
      <path d="M1.5 13c0-2.2 1.8-3.5 4-3.5s4 1.3 4 3.5M10 13c0-1.6.9-2.8 2.3-3.2" />
    </svg>
  );
}
function SettingsIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="8" cy="8" r="2" />
      <path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.2 3.2l1.4 1.4M11.4 11.4l1.4 1.4M3.2 12.8l1.4-1.4M11.4 4.6l1.4-1.4" />
    </svg>
  );
}

function SidebarLink({ to, active, icon, children, count, indent }: { to: string; active: boolean; icon?: ReactNode; children: ReactNode; count?: number; indent?: boolean }) {
  return (
    <Link
      to={to}
      aria-current={active ? "page" : undefined}
      className={clsx("side-link", active && "active", indent && "side-link-indent")}
    >
      {icon ? <span className="icon" aria-hidden="true">{icon}</span> : null}
      <span>{children}</span>
      {count != null && <span className="count">{count}</span>}
    </Link>
  );
}

interface Props {
  section: Section;
  path: string;
  brandHref: string;
  firstName: string;
  meetingsCount?: number;
  eventsCount?: number;
  userName: string;
  userEmail: string;
  userAvatarUrl?: string | null;
  avatarFailed: boolean;
  menuOpen: boolean;
  logoutLoading: boolean;
  onMenuToggle: () => void;
  onAvatarError: () => void;
  onMenuClose: () => void;
  onLogout: () => void;
  children: ReactNode;
}

export function DashboardWorkspaceChrome({
  section,
  path,
  brandHref,
  firstName,
  meetingsCount,
  eventsCount,
  userName,
  userEmail,
  userAvatarUrl,
  avatarFailed,
  menuOpen,
  logoutLoading,
  onMenuToggle,
  onAvatarError,
  onMenuClose,
  onLogout,
  children,
}: Props) {
  return (
    <div className="dash">
      <aside className="dash-side" aria-label="Workspace navigation">
        <Link to={brandHref} className="dash-side-brand">
          <div className="dash-side-brand-mark">
            <BunnyMark size={26} />
          </div>
          <div className="dash-side-brand-text">
            <span className="dash-side-brand-name">
              <BrandWordmark style={{ fontFamily: "var(--sans)", fontWeight: 600 }} />
            </span>
            <span className="dash-side-brand-sub">Host workspace</span>
          </div>
        </Link>

        <div className="side-section-label">Workspace</div>
        <SidebarLink to="/dashboard" active={path === "/dashboard"} icon={<MeetingsIcon />} count={meetingsCount}>
          Meetings
        </SidebarLink>
        <SidebarLink to="/dashboard/availability" active={path === "/dashboard/availability" || path === "/dashboard/availability/sources"} icon={<AvailabilityIcon />}>
          Availability
        </SidebarLink>
        {(path === "/dashboard/availability" || path === "/dashboard/availability/sources") && (
          <div className="side-sub-links">
            <Link to="/dashboard/availability" className={clsx("side-sub-link", path === "/dashboard/availability" && "active")}>
              Schedule
            </Link>
            <Link to="/dashboard/availability/sources" className={clsx("side-sub-link", path === "/dashboard/availability/sources" && "active")}>
              Sources
            </Link>
          </div>
        )}

        <div className="side-section-label">Configuration</div>
        <SidebarLink to="/dashboard/event-types" active={path === "/dashboard/event-types"} icon={<EventTypesIcon />} count={eventsCount}>
          Event Types
        </SidebarLink>
        <SidebarLink to="/dashboard/integrations" active={path === "/dashboard/integrations"} icon={<IntegrationsIcon />}>
          Integrations
        </SidebarLink>
        <SidebarLink to="/dashboard/teams" active={path === "/dashboard/teams"} icon={<TeamsIcon />}>
          Teams
        </SidebarLink>
        <SidebarLink to="/dashboard/settings" active={path === "/dashboard/settings"} icon={<SettingsIcon />}>
          Settings
        </SidebarLink>

        <div className="dash-side-foot">
          <div style={{ position: "relative" }}>
            <div
              className="dash-user"
              role="button"
              tabIndex={0}
              onClick={onMenuToggle}
              onKeyDown={(e) => e.key === "Enter" && onMenuToggle()}
              aria-expanded={menuOpen}
              aria-haspopup="menu"
            >
              <div className="av">
                {userAvatarUrl && !avatarFailed ? (
                  <img
                    src={userAvatarUrl}
                    alt={userName || userEmail || "Profile"}
                    referrerPolicy="no-referrer"
                    onError={onAvatarError}
                    style={{ width: "100%", height: "100%", borderRadius: "inherit", objectFit: "cover" }}
                  />
                ) : (
                  (userName || userEmail || "U")[0]?.toUpperCase()
                )}
              </div>
              <div className="dash-user-meta">
                <span className="name">{userName}</span>
                <span className="handle">{userEmail}</span>
              </div>
            </div>
            {menuOpen && (
              <div role="menu" className="dash-user-menu">
                <button type="button" role="menuitem" className="dash-menu-item" onClick={onMenuClose}>Profile</button>
                <button type="button" role="menuitem" className="dash-menu-item" onClick={onMenuClose}>Settings</button>
                <button type="button" role="menuitem" className="dash-menu-item danger" onClick={onLogout} disabled={logoutLoading}>
                  {logoutLoading ? "Signing out…" : "Logout"}
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>

      <main className="dash-main">
        <div className="dash-main-content">
        <header className="dash-top">
          <div>
            <h1>
              {section === "meetings" && (<>Good to see you, <em>{firstName}.</em></>)}
              {section === "availability" && (<>Your <em>availability.</em></>)}
              {section === "availability-sources" && (<>Availability <em>sources.</em></>)}
              {section === "event-types" && (<>Event <em>templates.</em></>)}
              {section === "event-editor" && (<>Event <em>editor.</em></>)}
              {section === "integrations" && (<>Connected <em>integrations.</em></>)}
              {section === "linked-accounts" && (<>Linked <em>accounts.</em></>)}
              {section === "participation" && (<>Service <em>participation.</em></>)}
              {section === "teams" && (<>Your <em>teams.</em></>)}
              {section === "settings" && (<><em>Workspace</em> settings.</>)}
            </h1>
          </div>
          <div className="dash-top-actions">
            <Link to="/onboarding/event" className="dash-btn-primary" data-onboarding-target="new-event">
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><path d="M8 3v10M3 8h10"/></svg>
              New event
            </Link>
          </div>
        </header>
        {children}
        </div>
      </main>
    </div>
  );
}
