import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "@/services";
import { ApiError } from "@/services/types";
import { useAuth } from "@/state/AuthContext";

type PageState =
  | { kind: "accepting" }
  | { kind: "success"; teamName: string }
  | { kind: "error"; message: string };

export function AcceptInvitationPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { user, isHydratingAuth, authInitialized } = useAuth();

  const [pageState, setPageState] = useState<PageState>({ kind: "accepting" });
  const acceptedRef = useRef(false);

  useEffect(() => {
    if (!authInitialized || isHydratingAuth || !user) return;
    if (acceptedRef.current) return;
    acceptedRef.current = true;

    if (!token) {
      setPageState({ kind: "error", message: "Invitation link is missing a token." });
      return;
    }

    void (async () => {
      try {
        const member = await api.acceptTeamInvitation(token);
        let teamName = "the team";
        try {
          const team = await api.getTeam(member.teamId);
          if (team.name) teamName = team.name;
        } catch {
          // Non-fatal — acceptance already succeeded.
        }
        setPageState({ kind: "success", teamName });
      } catch (e) {
        const message =
          e instanceof ApiError ? e.message : "This invitation could not be accepted.";
        setPageState({ kind: "error", message });
      }
    })();
  }, [authInitialized, isHydratingAuth, token, user]);

  return (
    <div className="min-h-screen grid place-items-center bg-[#f8faff] px-4">
      <div className="panel" style={{ maxWidth: 440, width: "100%", textAlign: "center", padding: 32 }}>

        {pageState.kind === "accepting" && (
          <>
            <h2 style={{ marginBottom: 8 }}>Accepting invitation…</h2>
            <p style={{ color: "var(--plum-500, #666)" }}>One moment while we add you to the team.</p>
          </>
        )}

        {pageState.kind === "success" && (
          <>
            <h2 style={{ marginBottom: 8 }}>You're in!</h2>
            <p style={{ color: "var(--plum-500, #666)", marginBottom: 20 }}>
              You've joined <strong>{pageState.teamName}</strong> successfully.
            </p>

            {/* Non-blocking setup nudge */}
            <div style={{ marginBottom: 20, padding: "14px 16px", borderRadius: 10, border: "1px solid var(--lilac)", background: "var(--lilac-soft)", textAlign: "left" }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--plum-700)", marginBottom: 6 }}>
                Complete your setup to receive bookings
              </div>
              <p style={{ fontSize: 13, color: "var(--plum-500)", margin: "0 0 12px" }}>
                To be included in Round Robin scheduling, you'll need to connect your calendar and configure your availability.
              </p>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <a href="/dashboard/availability" className="dash-btn-primary" style={{ fontSize: 13, padding: "6px 14px", display: "inline-block", textDecoration: "none" }}>
                  Configure availability
                </a>
                <a href="/dashboard/integrations" className="dash-btn-secondary" style={{ fontSize: 13, padding: "6px 14px", display: "inline-block", textDecoration: "none" }}>
                  Connect calendar
                </a>
              </div>
            </div>

            <button className="dash-btn-secondary" style={{ fontSize: 13 }} onClick={() => navigate("/dashboard/teams")}>
              Go to teams
            </button>
          </>
        )}

        {pageState.kind === "error" && (
          <>
            <h2 style={{ marginBottom: 8 }}>Invitation unavailable</h2>
            <p style={{ color: "#991B1B", marginBottom: 20 }}>{pageState.message}</p>
            <button className="dash-btn-secondary" onClick={() => navigate("/dashboard")}>
              Go to dashboard
            </button>
          </>
        )}

      </div>
    </div>
  );
}
