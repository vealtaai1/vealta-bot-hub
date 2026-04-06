"use client";

import { useEffect, useMemo, useState } from "react";

type ApiUser = { id: string; email: string; displayName: string | null };

type ApiMembership = {
  id: string;
  role: "OWNER" | "ADMIN" | "MEMBER" | "VIEWER";
  createdAt: string;
  user: ApiUser;
};

type ApiProject = { id: string; name: string };

const ROLES: ApiMembership["role"][] = ["OWNER", "ADMIN", "MEMBER", "VIEWER"];

export default function AdminProjectMembersClient({ projectId }: { projectId: string }) {
  const [project, setProject] = useState<ApiProject | null>(null);
  const [memberships, setMemberships] = useState<ApiMembership[]>([]);
  const [users, setUsers] = useState<ApiUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [userId, setUserId] = useState("");
  const [role, setRole] = useState<ApiMembership["role"]>("MEMBER");
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [membersRes, usersRes] = await Promise.all([
        fetch(`/api/admin/projects/${projectId}/members`, { cache: "no-store" }),
        fetch("/api/admin/users", { cache: "no-store" }),
      ]);

      const membersJson = await membersRes.json();
      const usersJson = await usersRes.json();

      if (!membersRes.ok) throw new Error(membersJson?.error ?? "Failed to load members");
      if (!usersRes.ok) throw new Error(usersJson?.error ?? "Failed to load users");

      setProject(membersJson.project);
      setMemberships(membersJson.memberships ?? []);
      setUsers(usersJson.users ?? []);

      if (!userId && (usersJson.users?.[0]?.id ?? null)) {
        setUserId(usersJson.users[0].id);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const sortedMembers = useMemo(() => {
    return [...memberships].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  }, [memberships]);

  async function onAdd(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/projects/${projectId}/members`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ userId, role }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Failed to update membership");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update membership");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold">
              Project members{project ? ` · ${project.name}` : ""}
            </h2>
            <p className="text-xs text-zinc-600 dark:text-zinc-400">Project id: {projectId}</p>
          </div>
          <button className="text-xs underline" onClick={() => void load()}>
            Refresh
          </button>
        </div>

        {error ? <p className="mb-2 text-xs text-red-600">{error}</p> : null}
        {loading ? <div className="text-sm">Loading…</div> : null}

        <form onSubmit={onAdd} className="grid gap-3 sm:grid-cols-3">
          <label className="text-sm">
            <div className="mb-1 text-xs text-zinc-600 dark:text-zinc-400">User</div>
            <select
              className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-black"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
            >
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.email}
                </option>
              ))}
            </select>
          </label>

          <label className="text-sm">
            <div className="mb-1 text-xs text-zinc-600 dark:text-zinc-400">Role</div>
            <select
              className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-black"
              value={role}
              onChange={(e) => setRole(e.target.value as any)}
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </label>

          <div className="flex items-end">
            <button
              disabled={saving || !userId}
              className="w-full rounded-md bg-zinc-900 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60 dark:bg-zinc-100 dark:text-black"
              type="submit"
            >
              {saving ? "Saving…" : "Add / Update"}
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <h3 className="mb-3 text-base font-semibold">Current members</h3>
        {!loading && !sortedMembers.length ? (
          <div className="text-sm text-zinc-600 dark:text-zinc-400">No members yet.</div>
        ) : null}
        <ul className="space-y-2">
          {sortedMembers.map((m) => (
            <li
              key={m.id}
              className="rounded-xl border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-800"
            >
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <div className="font-medium">{m.user.email}</div>
                <div className="text-xs text-zinc-600 dark:text-zinc-400">{m.role}</div>
              </div>
              <div className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-400">
                userId: {m.user.id}
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
