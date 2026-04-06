import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserOrThrow } from "@/lib/rbac";

// GET /api/projects
export async function GET() {
  const user = await getUserOrThrow();

  const projects = await prisma.project.findMany({
    where: {
      archivedAt: null,
      OR: [
        { ownerId: user.id },
        { memberships: { some: { userId: user.id } } },
      ],
    },
    orderBy: { updatedAt: "desc" },
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
      taskCounter: true,
    },
    take: 50,
  });

  return NextResponse.json({ projects });
}

// POST /api/projects
// body: { name: string, description?: string }
export async function POST(req: Request) {
  const user = await getUserOrThrow();

  const body = await req.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  if (!name) return NextResponse.json({ error: "Missing name" }, { status: 400 });

  const description = typeof body?.description === "string" ? body.description : undefined;

  const STATUSES = [
    "To do",
    "In progress",
    "Blocked / needs clarification",
    "Submitted for approval",
    "Approved",
  ] as const;

  const project = await prisma.$transaction(async (tx: any) => {
    const p = await tx.project.create({
      data: {
        name,
        description,
        ownerId: user.id,
        memberships: {
          create: {
            userId: user.id,
            role: "OWNER",
          },
        },
        columns: {
          create: STATUSES.map((title, idx) => ({ name: title, position: idx })),
        },
        taskCounter: { create: { next: 1 } },
      },
      include: { columns: { orderBy: { position: "asc" } }, taskCounter: true },
    });
    return p;
  });

  return NextResponse.json({ project });
}
