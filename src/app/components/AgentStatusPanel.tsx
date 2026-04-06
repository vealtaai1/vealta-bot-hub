"use client";

import { useEffect, useState } from "react";

type AgentStatus = {
  agentId: string;
  name: string | null;
  state: "IDLE" | "WORKING";
  currentTask: string | null;
  botCount: number | null;
  updatedAt: string;
};

type StatusResponse = {
  activeWindowMs: number;
  activeCount: number;
  workingCount: number;
  agents: AgentStatus[];
};

export function AgentStatusPanel() {
  const [data, setData] = useState<StatusResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;

    async function load() {
      try {
        const res = await fetch("/api/agent-status", { cache: "no-store" });
        const json = (await res.json()) as StatusResponse & { error?: string };
        if (!res.ok) throw new Error(json?.error ?? "Failed to load");
        if (alive) {
          setData(json);
          setError(null);
        }
      } catch (e) {
        if (alive) setError(e instanceof Error ? e.message : "Failed to load");
      }
    }

    load();
    const id = setInterval(load, 5000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  return (
    <div className="space-y-3 rounded-lg border border-neutral-300 p-4">
      <div className="flex items-baseline justify-between">
        <div className="text-sm font-semibold">Agents</div>
        {data ? (
          <div className="text-xs text-neutral-600">
            Active: {data.activeCount} • Working: {data.workingCount}
          </div>
        ) : null}
      </div>

      {error ? <div className="text-xs text-red-600">{error}</div> : null}

      {data?.agents?.length ? (
        <div className="space-y-2">
          {data.agents.slice(0, 20).map((a) => (
            <div key={a.agentId} className="rounded border border-neutral-200 p-2">
              <div className="flex items-center justify-between gap-2">
                <div className="text-xs font-semibold">
                  {a.name ?? a.agentId}
                  <span className="ml-2 rounded bg-neutral-100 px-2 py-0.5 text-[10px] text-neutral-700">
                    {a.state}
                  </span>
                </div>
                <div className="text-[10px] text-neutral-500">
                  {new Date(a.updatedAt).toLocaleTimeString()}
                </div>
              </div>
              {a.currentTask ? (
                <div className="mt-1 text-xs text-neutral-700">{a.currentTask}</div>
              ) : (
                <div className="mt-1 text-xs text-neutral-400">(no task)</div>
              )}
              {typeof a.botCount === "number" ? (
                <div className="mt-1 text-[10px] text-neutral-500">Bots: {a.botCount}</div>
              ) : null}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-xs text-neutral-500">No agent status yet.</div>
      )}
    </div>
  );
}
