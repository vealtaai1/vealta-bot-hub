import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireProjectRole } from "@/lib/rbac";

// POST /api/tasks/move
// body: { taskId: string, toColumnId: string|null, toIndex: number }
// Moves a task between columns (or within) and re-normalizes positions in affected columns.
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const taskId = typeof body?.taskId === "string" ? body.taskId : "";
  const toColumnId = body?.toColumnId === null || typeof body?.toColumnId === "string" ? body.toColumnId : undefined;
  const toIndex = Number.isFinite(body?.toIndex) ? Number(body.toIndex) : NaN;

  if (!taskId) return NextResponse.json({ error: "Missing taskId" }, { status: 400 });
  if (!Number.isFinite(toIndex)) return NextResponse.json({ error: "Missing toIndex" }, { status: 400 });

  const taskForAuth = await prisma.task.findUnique({ where: { id: taskId }, select: { projectId: true } });
  if (!taskForAuth) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await requireProjectRole(taskForAuth.projectId, "MEMBER");

  if (typeof toColumnId === "string" && toColumnId) {
    const col = await prisma.projectColumn.findUnique({ where: { id: toColumnId }, select: { projectId: true } });
    if (!col) return NextResponse.json({ error: "Column not found" }, { status: 404 });
    if (col.projectId !== taskForAuth.projectId) {
      return NextResponse.json({ error: "Column is not in this project" }, { status: 400 });
    }
  }

  const result: { task: any | null } | { error: string } = await prisma.$transaction(async (tx: any) => {
    const task = await tx.task.findUnique({ where: { id: taskId } });
    if (!task) return { error: "Not found" as const };

    const fromColumnId = task.columnId;
    const projectId = task.projectId;

    const targetColumnId = toColumnId === undefined ? fromColumnId : toColumnId;

    // Load tasks for both columns
    const fromTasks = fromColumnId
      ? await tx.task.findMany({
          where: { projectId, columnId: fromColumnId, archivedAt: null },
          orderBy: [{ position: "asc" }, { createdAt: "asc" }],
        })
      : [];

    const toTasks = targetColumnId
      ? await tx.task.findMany({
          where: { projectId, columnId: targetColumnId, archivedAt: null },
          orderBy: [{ position: "asc" }, { createdAt: "asc" }],
        })
      : [];

    // Remove task from arrays
    const removeId = taskId;
    const fromIds = (fromTasks as any[])
      .map((t: any) => String(t.id))
      .filter((id: string) => id !== removeId);

    const toIdsBase = (fromColumnId === targetColumnId
      ? fromIds
      : (toTasks as any[]).map((t: any) => String(t.id))
    ).filter((id: string) => id !== removeId);

    const clamped = Math.max(0, Math.min(toIndex, toIdsBase.length));
    const toIds = [...toIdsBase];
    toIds.splice(clamped, 0, removeId);

    // Persist column move
    await tx.task.update({
      where: { id: taskId },
      data: { columnId: targetColumnId ?? null },
    });

    // Normalize positions for affected columns
    async function writePositions(columnId: string, ids: string[]) {
      await Promise.all(
        ids.map((id, idx) =>
          tx.task.update({
            where: { id },
            data: { position: idx },
          }),
        ),
      );
    }

    if (fromColumnId && fromColumnId !== targetColumnId) {
      await writePositions(fromColumnId, fromIds);
    }
    if (targetColumnId) {
      await writePositions(targetColumnId, toIds);
    }

    const updated = await tx.task.findUnique({ where: { id: taskId } });
    return { task: updated };
  });

  if ("error" in result) return NextResponse.json({ error: result.error }, { status: 404 });
  return NextResponse.json(result);
}
