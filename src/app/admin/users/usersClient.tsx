"use client";

import { useEffect, useMemo, useState } from "react";

type ApiUser = {
  id: string;
  email: string;
  displayName: string | null;
  disabledAt: string | null;
  lastLoginAt: string | null;
  createdAt: string;
};

export default function AdminUsersClient() {
  const [users, setUsers] = useState<ApiUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [creating, setCreating] = useState(false);
  const [createdMsg, setCreatedMsg] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/users", { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Failed to load users");
      setUsers(json.users ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load users");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const sorted = useMemo(() => {
    return [...users].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  }, [users]);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setError(null);
    setCreatedMsg(null);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Failed to create user");
      setCreatedMsg(`Created user ${json.user.email}`);
      setEmail("");
      setPassword("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create user");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <h2 className="mb-3 text-base font-semibold">Create user</h2>

        <form onSubmit={onCreate} className="grid gap-3 sm:grid-cols-3">
          <label className="text-sm">
            <div className="mb-1 text-xs text-zinc-600 dark:text-zinc-400">Email</div>
            <input
              className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-black"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@example.com"
              required
            />
          </label>

          <label className="text-sm">
            <div className="mb-1 text-xs text-zinc-600 dark:text-zinc-400">Password</div>
            <input
              className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-black"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="min 8 chars"
              minLength={8}
              required
            />
          </label>

          <div className="flex items-end">
            <button
              disabled={creating}
              className="w-full rounded-md bg-zinc-900 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60 dark:bg-zinc-100 dark:text-black"
              type="submit"
            >
              {creating ? "Creating…" : "Create"}
            </button>
          </div>
        </form>

        {createdMsg ? <p className="mt-3 text-xs text-emerald-600">{createdMsg}</p> : null}
        {error ? <p className="mt-3 text-xs text-red-600">{error}</p> : null}
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold">Users</h2>
          <button className="text-xs underline" onClick={() => void load()}>
            Refresh
          </button>
        </div>

        {loading ? <div className="text-sm">Loading…</div> : null}

        {!loading && !sorted.length ? (
          <div className="text-sm text-zinc-600 dark:text-zinc-400">No users yet.</div>
        ) : null}

        <ul className="space-y-2">
          {sorted.map((u) => (
            <li
              key={u.id}
              className="rounded-xl border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-800"
            >
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <div className="font-medium">{u.email}</div>
                <div className="text-xs text-zinc-600 dark:text-zinc-400">
                  {u.disabledAt ? "disabled" : u.lastLoginAt ? "active" : "never logged in"}
                </div>
              </div>
              <div className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-400">
                id: {u.id}
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
