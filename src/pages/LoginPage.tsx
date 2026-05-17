import { Navigate, useLocation } from "react-router-dom";
import { api } from "@/services";
import { getIntentFromSearch, peekAuthIntent, resolvePostLoginPath, saveAuthIntent } from "@/lib/authRedirect";
import { useAuth } from "@/state/AuthContext";
import { BunnyMark } from "@/components/BunnyMark";

export function LoginPage() {
  const location = useLocation();
  const { user, loading } = useAuth();
  const authIntent = getIntentFromSearch(location.search) ?? peekAuthIntent() ?? { mode: "APP_LOGIN" as const };

  const handleGoogleConnect = () => {
    saveAuthIntent(authIntent);
    const oauthUrl = new URL(api.getGoogleOAuthUrl());
    if (authIntent.mode === "INTEGRATION" || authIntent.mode === "PROTECTED_ROUTE") {
      oauthUrl.searchParams.set("redirect", authIntent.returnTo);
    }
    window.location.href = oauthUrl.toString();
  };

  if (!loading && user) {
    return <Navigate to={resolvePostLoginPath(authIntent)} replace />;
  }

  return (
    <div style={{
      minHeight: "100vh",
      display: "grid",
      placeItems: "center",
      padding: "40px 20px",
      background: [
        "radial-gradient(60% 40% at 20% 10%, #E2D5F2 0%, transparent 60%)",
        "radial-gradient(50% 40% at 80% 90%, #FBE3CF 0%, transparent 60%)",
        "#FBF7F2",
      ].join(", "),
      fontFamily: '"Geist", "Inter", system-ui, sans-serif',
      position: "relative" as const,
    }}>
      {/* grain overlay */}
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        backgroundImage: "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='220' height='220'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.12  0 0 0 0 0.10  0 0 0 0 0.18  0 0 0 0.04 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")",
        opacity: 0.35,
        mixBlendMode: "multiply" as const,
      }} />

      <div style={{
        position: "relative",
        zIndex: 1,
        width: "100%",
        maxWidth: 440,
        background: [
          "radial-gradient(60% 60% at 0% 0%, #E2D5F2 0%, transparent 60%)",
          "#FFFDFA",
        ].join(", "),
        border: "1px solid rgba(31, 21, 48, 0.09)",
        borderRadius: 28,
        padding: "48px 44px",
        boxShadow: "0 4px 24px rgba(31, 21, 48, 0.09)",
      }}>
        {/* Brand mark */}
        <div style={{ display: "flex", alignItems: "center", gap: 11, marginBottom: 40 }}>
          <div style={{
            width: 34, height: 34, borderRadius: 10, flexShrink: 0,
            background: "linear-gradient(150deg, #E2D5F2, #FBE3CF)",
            border: "1px solid rgba(31, 21, 48, 0.09)",
            display: "grid", placeItems: "center",
          }}>
            <BunnyMark size={20} />
          </div>
          <span style={{ display: "inline-flex", alignItems: "baseline", lineHeight: 1 }}>
            <span style={{
              fontFamily: '"Newsreader", "Georgia", serif',
              fontSize: 22,
              letterSpacing: "-0.02em",
              color: "#7A6BB0",
            }}>Bunny</span>
            <span style={{
              fontFamily: '"Geist", sans-serif',
              fontWeight: 500,
              fontSize: 22,
              color: "#1F1530",
            }}>Cal</span>
          </span>
        </div>

        <h1 style={{
          fontFamily: '"Newsreader", "Georgia", serif',
          fontSize: "clamp(28px, 4vw, 36px)",
          fontWeight: 400,
          letterSpacing: "-0.025em",
          lineHeight: 1.06,
          color: "#1F1530",
          margin: "0 0 8px",
        }}>
          Welcome <em style={{ fontStyle: "italic", color: "#5E4E99" }}>back.</em>
        </h1>
        <p style={{ color: "#5E4E99", fontSize: 15, lineHeight: 1.5, margin: "0 0 32px" }}>
          Sign in to manage your booking links and meetings.
        </p>

        <button
          onClick={handleGoogleConnect}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
            width: "100%",
            padding: "13px 20px",
            background: "#1F1530",
            color: "#FFFDFA",
            border: "1px solid #1F1530",
            borderRadius: 12,
            fontSize: 14,
            fontWeight: 500,
            cursor: "pointer",
            transition: "background .15s ease",
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "#3D2F7A"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "#1F1530"; }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Continue with Google
        </button>

        <div style={{
          display: "flex", alignItems: "center", gap: 12,
          margin: "20px 0",
          color: "#9E8FC7", fontSize: 13,
        }}>
          <div style={{ flex: 1, height: 1, background: "rgba(31, 21, 48, 0.09)" }} />
          or
          <div style={{ flex: 1, height: 1, background: "rgba(31, 21, 48, 0.09)" }} />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <input
            placeholder="Email"
            type="email"
            style={{
              padding: "13px 16px",
              background: "#FFFDFA",
              border: "1px solid rgba(31, 21, 48, 0.09)",
              borderRadius: 12,
              fontSize: 15,
              color: "#1F1530",
              outline: "none",
              width: "100%",
              boxSizing: "border-box" as const,
              fontFamily: "inherit",
            }}
          />
          <input
            placeholder="Password"
            type="password"
            style={{
              padding: "13px 16px",
              background: "#FFFDFA",
              border: "1px solid rgba(31, 21, 48, 0.09)",
              borderRadius: 12,
              fontSize: 15,
              color: "#1F1530",
              outline: "none",
              width: "100%",
              boxSizing: "border-box" as const,
              fontFamily: "inherit",
            }}
          />
          <button style={{
            padding: "13px 20px",
            background: "#FFFDFA",
            color: "#1F1530",
            border: "1px solid rgba(31, 21, 48, 0.18)",
            borderRadius: 12,
            fontSize: 14,
            fontWeight: 500,
            cursor: "pointer",
            width: "100%",
            fontFamily: "inherit",
          }}>
            Sign in
          </button>
        </div>

        <div style={{
          marginTop: 28,
          paddingTop: 20,
          borderTop: "1px solid rgba(31, 21, 48, 0.09)",
          display: "flex", alignItems: "center", gap: 7,
          color: "#7A6BB0", fontSize: 12.5,
          fontFamily: '"Geist Mono", "Menlo", monospace',
        }}>
          <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#BFCDB9", flexShrink: 0 }} />
          Your meetings, always calm.
        </div>
      </div>
    </div>
  );
}
