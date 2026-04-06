import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireProjectRole } from "@/lib/rbac";

// POST /api/tasks
// body: { projectId: string, title: string, description?: string, columnId?: string|null, assigneeId?: string|null }
// Creates a task with per-project sequential numbering.
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const projectId = typeof body?.projectId === "string" ? body.projectId : "";
  const title = typeof body?.title === "string" ? body.title.trim() : "";

  if (!projectId) return NextResponse.json({ error: "Missing projectId" }, { status: 400 });
  if (!title) return NextResponse.json({ error: "Missing title" }, { status: 400 });

  const { user } = await requireProjectRole(projectId, "MEMBER");

  const description = typeof body?.description === "string" ? body.description : undefined;
  const columnId = body?.columnId === null || typeof body?.columnId === "string" ? body.columnId : undefined;
  const assigneeId = body?.assigneeId === null || typeof body?.assigneeId === "string" ? body.assigneeId : undefined;

  const task = await prisma.$transaction(async (tx: any) => {
    // Allocate number atomically per project.
    const existing = await tx.projectTaskCounter.findUnique({ where: { projectId } });
    let number: number;
    if (!existing) {
      await tx.projectTaskCounter.create({ data: { projectId, next: 2 } });
      number = 1;
    } else {
      const updated = await tx.projectTaskCounter.update({
        where: { projectId },
        data: { next: { increment: 1 } },
      });
      number = updated.next - 1;
    }

    // Place at top of the chosen column (or null column) without rewriting all positions.
    let position: number | null = null;
    if (typeof columnId === "string" && columnId) {
      const min = await tx.task.aggregate({
        where: { projectId, columnId, archivedAt: null },
        _min: { position: true },
      });
      position = (min._min.position ?? 0) - 1;
    }

    const created = await tx.task.create({
      data: {
        projectId,
        number,
        title,
        description,
        columnId: typeof columnId === "string" ? columnId : null,
        position,
        createdById: user.id,
        assigneeId: typeof assigneeId === "string" ? assigneeId : null,
      },
    });

    return created;
  });

  return NextResponse.json({ task });
}
