import { api } from "@/services";

export function LoginPage() {
  const handleGoogleConnect = () => {
    window.location.href = api.getGoogleOAuthUrl();
  };

  return (
    <div className="min-h-screen grid place-items-center bg-[#f8faff] px-6">
      <div className="w-full max-w-md bg-white border border-[#e5e7eb] rounded-2xl p-6 shadow-lg">
        <h1 className="text-2xl font-semibold text-[#111827]">Welcome back</h1>
        <p className="text-sm text-[#6b7280] mt-1">Sign in to manage your scheduling links.</p>
        <button onClick={handleGoogleConnect} className="mt-6 w-full rounded-xl px-4 py-3 border border-[#d1d5db] bg-white hover:bg-[#f9fafb]">Continue with Google</button>
        <div className="my-4 text-center text-sm text-[#9ca3af]">or</div>
        <input placeholder="Email" className="w-full border border-[#d1d5db] rounded-xl px-3 py-2.5 mb-3" />
        <input placeholder="Password" type="password" className="w-full border border-[#d1d5db] rounded-xl px-3 py-2.5" />
        <button className="mt-4 w-full rounded-xl px-4 py-3 text-white bg-gradient-to-r from-[#6366F1] to-[#A855F7]">Sign in</button>
      </div>
    </div>
  );
}
