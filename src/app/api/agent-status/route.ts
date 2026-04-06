import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// POST /api/agent-status
// body: { agentId: string, name?: string, state?: "IDLE"|"WORKING", currentTask?: string, botCount?: number }
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body?.agentId || typeof body.agentId !== "string") {
    return NextResponse.json({ error: "Missing agentId" }, { status: 400 });
  }

  const state = body.state === "WORKING" ? "WORKING" : "IDLE";

  const status = await prisma.agentStatus.upsert({
    where: { agentId: body.agentId },
    update: {
      name: typeof body.name === "string" ? body.name : undefined,
      state,
      currentTask: typeof body.currentTask === "string" ? body.currentTask : null,
      botCount: Number.isFinite(body.botCount) ? body.botCount : null,
    },
    create: {
      agentId: body.agentId,
      name: typeof body.name === "string" ? body.name : null,
      state,
      currentTask: typeof body.currentTask === "string" ? body.currentTask : null,
      botCount: Number.isFinite(body.botCount) ? body.botCount : null,
    },
  });

  return NextResponse.json({ status });
}

// GET /api/agent-status
export async function GET() {
  const activeWindowMs = 60_000;
  const activeSince = new Date(Date.now() - activeWindowMs);

  const agents = await prisma.agentStatus.findMany({
    orderBy: { updatedAt: "desc" },
    take: 200,
  });

  const activeCount = agents.filter((a: any) => a.updatedAt >= activeSince).length;
  const workingCount = agents.filter(
    (a: any) => a.updatedAt >= activeSince && a.state === "WORKING",
  ).length;

  return NextResponse.json({
    activeWindowMs,
    activeCount,
    workingCount,
    agents,
  });
}
