import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireProjectRole } from "@/lib/rbac";

// POST /api/tasks/reorder
// body: { columnId: string, taskIds: string[] }
// Rewrites position 0..N-1 in the provided order.
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const columnId = typeof body?.columnId === "string" ? body.columnId : "";
  const taskIds = Array.isArray(body?.taskIds) ? body.taskIds.filter((x: unknown) => typeof x === "string") : null;

  if (!columnId) return NextResponse.json({ error: "Missing columnId" }, { status: 400 });
  if (!taskIds) return NextResponse.json({ error: "Missing taskIds" }, { status: 400 });

  const column = await prisma.projectColumn.findUnique({ where: { id: columnId }, select: { projectId: true } });
  if (!column) return NextResponse.json({ error: "Column not found" }, { status: 404 });
  await requireProjectRole(column.projectId, "MEMBER");

  await prisma.$transaction(async (tx: any) => {
    await Promise.all(
      taskIds.map((id: string, idx: number) =>
        tx.task.update({
          where: { id },
          data: { columnId, position: idx },
        }),
      ),
    );
  });

  return NextResponse.json({ ok: true });
}
