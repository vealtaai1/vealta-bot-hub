import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireProjectRole } from "@/lib/rbac";

// GET /api/projects/:projectId/board
// Convenience endpoint for fetching the Kanban board (columns + tasks) for a single project.
export async function GET(_req: Request, ctx: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await ctx.params;
  await requireProjectRole(projectId, "VIEWER");

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      columns: {
        where: { archivedAt: null },
        orderBy: { position: "asc" },
        include: {
          tasks: {
            where: { archivedAt: null },
            orderBy: [{ position: "asc" }, { createdAt: "desc" }],
          },
        },
      },
    },
  });

  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ project });
}
