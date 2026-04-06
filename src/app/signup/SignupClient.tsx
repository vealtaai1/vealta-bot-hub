"use client";

import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";

export default function SignupClient() {
  const searchParams = useSearchParams();
  const invite = searchParams.get("invite") ?? "";

  const callbackUrl = useMemo(() => {
    if (invite) return `/invite/${invite}`;
    return searchParams.get("callbackUrl") ?? "/";
  }, [invite, searchParams]);

  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/signup", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ inviteToken: invite, password, displayName }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error ?? "Unable to create account");
        return;
      }

      const email = data?.email as string | undefined;
      if (!email) {
        setError("Signup succeeded but no email returned.");
        return;
      }

      const signInRes = await signIn("credentials", {
        redirect: false,
        email,
        password,
        callbackUrl,
      });

      if (!signInRes || signInRes.error) {
        window.location.href = `/login?callbackUrl=${encodeURIComponent(callbackUrl)}`;
        return;
      }

      window.location.href = signInRes.url ?? callbackUrl;
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <form onSubmit={onSubmit} className="w-full max-w-sm space-y-4">
        <h1 className="text-2xl font-semibold">Create account</h1>

        {!invite ? (
          <p className="text-sm text-neutral-700">
            Signups are invite-only. Open an invite link to create an account.
          </p>
        ) : null}

        <label className="block space-y-1">
          <span className="text-sm">Display name (optional)</span>
          <input
            className="w-full rounded border px-3 py-2"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            autoComplete="name"
          />
        </label>

        <label className="block space-y-1">
          <span className="text-sm">Password</span>
          <input
            className="w-full rounded border px-3 py-2"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            minLength={8}
            required
            disabled={!invite}
          />
        </label>

        {error ? <p className="text-sm text-red-600">{error}</p> : null}

        <button
          type="submit"
          className="w-full rounded bg-black text-white px-3 py-2 disabled:opacity-50"
          disabled={loading || !invite}
        >
          {loading ? "Creating…" : "Create account"}
        </button>
      </form>
    </main>
  );
}
