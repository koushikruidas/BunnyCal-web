import { Navigate, useLocation } from "react-router-dom";
import { api } from "@/services";
import { getIntentFromSearch, peekAuthIntent, resolvePostLoginPath, saveAuthIntent } from "@/lib/authRedirect";
import { useAuth } from "@/state/AuthContext";

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
    <div className="min-h-screen grid place-items-center bg-[linear-gradient(160deg,#f3f8ff_0%,#fff7ed_100%)] px-6">
      <div className="w-full max-w-md rounded-3xl border border-[#dbe4f8] bg-white p-7 shadow-[0_14px_40px_rgba(15,23,42,0.08)]">
        <p className="text-xs uppercase tracking-[0.16em] text-[#64748b]">EasySchedule</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[#0f172a]">Sign in</h1>
        <p className="text-sm text-[#64748b] mt-1">Start hosting meetings with your own booking link.</p>

        <button
          onClick={handleGoogleConnect}
          className="mt-6 w-full rounded-xl px-4 py-3 border border-[#d1d5db] bg-white hover:bg-[#f9fafb] text-[#0f172a] font-medium"
        >
          Continue with Google
        </button>

        <div className="my-4 text-center text-sm text-[#9ca3af]">or</div>
        <input placeholder="Email" className="w-full border border-[#d1d5db] rounded-xl px-3 py-2.5 mb-3" />
        <input placeholder="Password" type="password" className="w-full border border-[#d1d5db] rounded-xl px-3 py-2.5" />
        <button className="mt-4 w-full rounded-xl px-4 py-3 text-white bg-[#0f172a] hover:bg-[#1e293b]">Sign in</button>
      </div>
    </div>
  );
}
