import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/services";
import { ApiError } from "@/services/types";
import type { TeamMemberResponse, TeamResponse, TeamRole } from "@/services/types";
import { Button, Dialog } from "@/ui/controls";
import clsx from "@/lib/clsx";

const TEAMS_QUERY_KEY = ["teams"] as const;

function membersQueryKey(teamId: string) {
  return ["team-members", teamId] as const;
}
function invitationsQueryKey(teamId: string) {
  return ["team-invitations", teamId] as const;
}

function roleBadgeClass(role: TeamRole) {
  if (role === "OWNER") return "ok";
  if (role === "ADMIN") return "hold";
  return "";
}

export function DashboardTeamsSection() {
  const queryClient = useQueryClient();
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);

  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<TeamRole>("MEMBER");
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [lastInviteLink, setLastInviteLink] = useState<string | null>(null);

  const teamsQuery = useQuery({
    queryKey: TEAMS_QUERY_KEY,
    queryFn: () => api.listTeams(),
    staleTime: 60_000,
    retry: false,
  });

  const teams = teamsQuery.data ?? [];
  const activeTeam: TeamResponse | null =
    teams.find((t) => t.id === selectedTeamId) ?? teams[0] ?? null;
  const activeTeamId = activeTeam?.id ?? null;

  const membersQuery = useQuery({
    queryKey: activeTeamId ? membersQueryKey(activeTeamId) : ["team-members", "none"],
    queryFn: () => api.listTeamMembers(activeTeamId as string),
    enabled: Boolean(activeTeamId),
    staleTime: 30_000,
    retry: false,
  });

  const invitationsQuery = useQuery({
    queryKey: activeTeamId ? invitationsQueryKey(activeTeamId) : ["team-invitations", "none"],
    queryFn: () => api.listTeamInvitations(activeTeamId as string),
    enabled: Boolean(activeTeamId),
    staleTime: 30_000,
    retry: false,
  });

  const createMutation = useMutation({
    mutationFn: (name: string) => api.createTeam({ name }),
    onSuccess: (team) => {
      setCreateOpen(false);
      setCreateName("");
      setCreateError(null);
      setSelectedTeamId(team.id);
      void queryClient.invalidateQueries({ queryKey: TEAMS_QUERY_KEY });
    },
    onError: (e) => setCreateError(e instanceof ApiError ? e.message : "Unable to create team."),
  });

  const inviteMutation = useMutation({
    mutationFn: (vars: { email: string; role: TeamRole }) =>
      api.inviteTeamMember(activeTeamId as string, { email: vars.email, role: vars.role }),
    onSuccess: (invitation) => {
      setInviteEmail("");
      setInviteError(null);
      setLastInviteLink(`${window.location.origin}/invitations/${invitation.token}/accept`);
      if (activeTeamId) {
        void queryClient.invalidateQueries({ queryKey: invitationsQueryKey(activeTeamId) });
      }
    },
    onError: (e) => setInviteError(e instanceof ApiError ? e.message : "Unable to send invitation."),
  });

  const revokeMutation = useMutation({
    mutationFn: (invitationId: string) =>
      api.revokeTeamInvitation(activeTeamId as string, invitationId),
    onSuccess: () => {
      if (activeTeamId) {
        void queryClient.invalidateQueries({ queryKey: invitationsQueryKey(activeTeamId) });
      }
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: (member: TeamMemberResponse) =>
      api.removeTeamMember(activeTeamId as string, member.userId),
    onSuccess: () => {
      if (activeTeamId) {
        void queryClient.invalidateQueries({ queryKey: membersQueryKey(activeTeamId) });
        void queryClient.invalidateQueries({ queryKey: TEAMS_QUERY_KEY });
      }
    },
  });

  const members = membersQuery.data ?? [];
  const invitations = (invitationsQuery.data ?? []).filter((inv) => inv.status === "PENDING");

  return (
    <div className="dash-section">
      <div className="dash-section-head">
        <div>
          <h2>Your <em>teams</em></h2>
          <div className="sub">Group members for round-robin and collective scheduling.</div>
        </div>
        <Button size="sm" onClick={() => { setCreateOpen(true); setCreateError(null); }}>
          New team
        </Button>
      </div>

      {teamsQuery.isError && (
        <div className="dash-alert error">
          <span>Unable to load teams.</span>
          <button className="dash-btn-secondary" style={{ fontSize: 12.5, padding: "5px 12px" }} onClick={() => void teamsQuery.refetch()}>Retry</button>
        </div>
      )}

      {teamsQuery.isPending ? (
        <div className="et-list">
          {Array.from({ length: 2 }).map((_, i) => <div key={i} className="dash-skel" style={{ height: 64 }} />)}
        </div>
      ) : teams.length === 0 ? (
        <div className="mt-empty">
          <div className="seed" />
          <h4>No teams yet</h4>
          <p>Create a team to invite members and unlock round-robin and collective event types.</p>
          <button className="dash-btn-primary" style={{ marginTop: 18 }} onClick={() => setCreateOpen(true)}>Create team</button>
        </div>
      ) : (
        <div className="split-grid" style={{ gridTemplateColumns: "240px 1fr", alignItems: "start" }}>
          {/* Team list */}
          <div className="panel" style={{ padding: 12 }}>
            <div className="side-section-label" style={{ marginTop: 0 }}>Teams</div>
            <div style={{ display: "grid", gap: 4 }}>
              {teams.map((team) => (
                <button
                  key={team.id}
                  className={clsx("side-link", team.id === activeTeamId && "active")}
                  style={{ width: "100%", textAlign: "left" }}
                  onClick={() => setSelectedTeamId(team.id)}
                >
                  <span>{team.name}</span>
                  <span className="count">{team.memberCount}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Active team detail */}
          {activeTeam && (
            <div style={{ display: "grid", gap: 16 }}>
              {/* Members */}
              <div className="panel">
                <div className="h">
                  <div>
                    <h3>{activeTeam.name} · members</h3>
                    <div className="sub">{activeTeam.memberCount} member{activeTeam.memberCount === 1 ? "" : "s"}</div>
                  </div>
                  <Button size="sm" variant="secondary" onClick={() => { setInviteOpen(true); setInviteError(null); setLastInviteLink(null); }}>
                    Invite member
                  </Button>
                </div>

                {membersQuery.isPending ? (
                  <div style={{ display: "grid", gap: 8 }}>
                    {Array.from({ length: 2 }).map((_, i) => <div key={i} className="dash-skel" style={{ height: 52 }} />)}
                  </div>
                ) : (
                  <div style={{ display: "grid", gap: 8 }}>
                    {members.map((member) => (
                      <div key={member.id} className="override-row">
                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                          <div className="av" style={{ width: 34, height: 34, borderRadius: 999, overflow: "hidden", display: "grid", placeItems: "center", background: "var(--lilac, #e9e4ff)", fontWeight: 600 }}>
                            {member.userProfileImageUrl ? (
                              <img src={member.userProfileImageUrl} alt={member.userName ?? ""} referrerPolicy="no-referrer" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                            ) : (
                              (member.userName ?? member.userEmail ?? "U")[0]?.toUpperCase()
                            )}
                          </div>
                          <div>
                            <div className="date">{member.userName ?? member.userEmail}</div>
                            <div className="detail">{member.userEmail}</div>
                          </div>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                          <span className={clsx("dbadge", roleBadgeClass(member.role))}>
                            <span className="dot" />
                            {member.role}
                          </span>
                          {member.role !== "OWNER" && (
                            <button
                              type="button"
                              onClick={() => removeMemberMutation.mutate(member)}
                              disabled={removeMemberMutation.isPending}
                              style={{ fontSize: 13, color: "#991B1B", background: "none", border: "none", cursor: "pointer", fontFamily: "var(--sans)" }}
                            >
                              Remove
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Pending invitations */}
              <div className="panel">
                <div className="h">
                  <div>
                    <h3>Pending invitations</h3>
                    <div className="sub">Invites awaiting acceptance.</div>
                  </div>
                </div>
                {invitationsQuery.isPending ? (
                  <div className="dash-skel" style={{ height: 48 }} />
                ) : invitations.length === 0 ? (
                  <div className="dash-empty" style={{ padding: "12px 0" }}>
                    <h3>No pending invitations</h3>
                    <p>Invite a member to get started.</p>
                  </div>
                ) : (
                  <div style={{ display: "grid", gap: 8 }}>
                    {invitations.map((inv) => (
                      <div key={inv.id} className="override-row">
                        <div>
                          <div className="date">{inv.invitedEmail}</div>
                          <div className="detail">Role: {inv.role} · expires {new Date(inv.expiresAt).toLocaleDateString()}</div>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                          <button
                            type="button"
                            onClick={() => navigator.clipboard.writeText(`${window.location.origin}/invitations/${inv.token}/accept`)}
                            className="dash-btn-secondary"
                            style={{ fontSize: 12.5, padding: "5px 12px" }}
                          >
                            Copy link
                          </button>
                          <button
                            type="button"
                            onClick={() => revokeMutation.mutate(inv.id)}
                            disabled={revokeMutation.isPending}
                            style={{ fontSize: 13, color: "#991B1B", background: "none", border: "none", cursor: "pointer", fontFamily: "var(--sans)" }}
                          >
                            Revoke
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Create team dialog */}
      {createOpen && (
        <Dialog
          open
          onClose={() => setCreateOpen(false)}
          title="Create a team"
          width="sm"
          footer={
            <div className="flex gap-2 w-full justify-end">
              <Button variant="secondary" size="sm" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button
                size="sm"
                loading={createMutation.isPending}
                disabled={!createName.trim()}
                onClick={() => createMutation.mutate(createName.trim())}
              >
                Create
              </Button>
            </div>
          }
        >
          <div className="dash-field">
            <label>Team name</label>
            <input
              className="dash-input"
              value={createName}
              onChange={(e) => setCreateName(e.target.value)}
              placeholder="e.g. Sales Team"
              autoFocus
            />
          </div>
          {createError && <p style={{ marginTop: 10, fontSize: 12.5, color: "#991B1B" }}>{createError}</p>}
        </Dialog>
      )}

      {/* Invite member dialog */}
      {inviteOpen && activeTeam && (
        <Dialog
          open
          onClose={() => setInviteOpen(false)}
          title={`Invite to ${activeTeam.name}`}
          width="sm"
          footer={
            <div className="flex gap-2 w-full justify-end">
              <Button variant="secondary" size="sm" onClick={() => setInviteOpen(false)}>Close</Button>
              <Button
                size="sm"
                loading={inviteMutation.isPending}
                disabled={!inviteEmail.trim()}
                onClick={() => inviteMutation.mutate({ email: inviteEmail.trim(), role: inviteRole })}
              >
                Send invite
              </Button>
            </div>
          }
        >
          <div className="dash-field">
            <label>Email</label>
            <input
              className="dash-input"
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="member@company.com"
              autoFocus
            />
          </div>
          <div className="dash-field" style={{ marginTop: 12 }}>
            <label>Role</label>
            <select className="dash-input" value={inviteRole} onChange={(e) => setInviteRole(e.target.value as TeamRole)}>
              <option value="MEMBER">Member</option>
              <option value="ADMIN">Admin</option>
            </select>
          </div>
          {inviteError && <p style={{ marginTop: 10, fontSize: 12.5, color: "#991B1B" }}>{inviteError}</p>}
          {lastInviteLink && (
            <div style={{ marginTop: 14, padding: 12, background: "var(--ivory, #fafaff)", border: "1px solid var(--border, #eee)", borderRadius: 12 }}>
              <div style={{ fontSize: 12, color: "var(--plum-500, #666)", marginBottom: 6 }}>Invitation sent. Share this link:</div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <code style={{ fontSize: 11.5, wordBreak: "break-all", flex: 1 }}>{lastInviteLink}</code>
                <button className="dash-btn-secondary" style={{ fontSize: 12, padding: "4px 10px" }} onClick={() => navigator.clipboard.writeText(lastInviteLink)}>Copy</button>
              </div>
            </div>
          )}
        </Dialog>
      )}
    </div>
  );
}
