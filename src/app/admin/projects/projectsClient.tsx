"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type ApiProject = {
  id: string;
  name: string;
  slug: string | null;
  ownerId: string;
  createdAt: string;
};

export default function AdminProjectsClient() {
  const [projects, setProjects] = useState<ApiProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/projects", { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Failed to load projects");
      setProjects(json.projects ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load projects");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-base font-semibold">Projects</h2>
        <button className="text-xs underline" onClick={() => void load()}>
          Refresh
        </button>
      </div>

      {error ? <p className="mb-2 text-xs text-red-600">{error}</p> : null}
      {loading ? <div className="text-sm">Loading…</div> : null}

      {!loading && !projects.length ? (
        <div className="text-sm text-zinc-600 dark:text-zinc-400">No projects yet.</div>
      ) : null}

      <ul className="space-y-2">
        {projects.map((p) => (
          <li
            key={p.id}
            className="rounded-xl border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-800"
          >
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <div className="font-medium">{p.name}</div>
              <Link className="text-xs underline" href={`/admin/projects/${p.id}/members`}>
                Members
              </Link>
            </div>
            <div className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-400">
              id: {p.id}
              {p.slug ? ` · slug: ${p.slug}` : ""}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
