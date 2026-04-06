import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireProjectRole } from "@/lib/rbac";

// GET /api/projects/:projectId/columns
export async function GET(_req: Request, ctx: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await ctx.params;
  await requireProjectRole(projectId, "VIEWER");

  const columns = await prisma.projectColumn.findMany({
    where: { projectId, archivedAt: null },
    orderBy: { position: "asc" },
  });

  return NextResponse.json({ columns });
}

// POST /api/projects/:projectId/columns
// body: { name: string }
export async function POST(req: Request, ctx: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await ctx.params;
  await requireProjectRole(projectId, "ADMIN");

  const body = await req.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  if (!name) return NextResponse.json({ error: "Missing name" }, { status: 400 });

  const max = await prisma.projectColumn.aggregate({
    where: { projectId, archivedAt: null },
    _max: { position: true },
  });

  const position = (max._max.position ?? -1) + 1;

  const column = await prisma.projectColumn.create({
    data: { projectId, name, position },
  });

  return NextResponse.json({ column });
}
