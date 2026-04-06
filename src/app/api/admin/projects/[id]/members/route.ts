import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id: projectId } = await params;

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true, name: true },
  });
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const memberships = await prisma.projectMembership.findMany({
    where: { projectId },
    orderBy: { createdAt: "desc" },
    include: { user: { select: { id: true, email: true, displayName: true } } },
  });

  return NextResponse.json({ project, memberships });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id: projectId } = await params;

  const body = await req.json().catch(() => null);
  const userId = String(body?.userId ?? "").trim();
  const roleRaw = String(body?.role ?? "MEMBER").trim();

  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

  const ALLOWED_ROLES = ["OWNER", "ADMIN", "MEMBER", "VIEWER"] as const;
  const role = (ALLOWED_ROLES as readonly string[]).includes(roleRaw) ? (roleRaw as (typeof ALLOWED_ROLES)[number]) : null;
  if (!role) {
    return NextResponse.json(
      { error: `Invalid role. Must be one of: ${ALLOWED_ROLES.join(", ")}` },
      { status: 400 },
    );
  }

  const [project, user] = await Promise.all([
    prisma.project.findUnique({ where: { id: projectId }, select: { id: true } }),
    prisma.user.findUnique({ where: { id: userId }, select: { id: true } }),
  ]);

  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const membership = await prisma.projectMembership.upsert({
    where: { projectId_userId: { projectId, userId } },
    create: { projectId, userId, role: role as any },
    update: { role: role as any },
    include: { user: { select: { id: true, email: true } } },
  });

  return NextResponse.json({ membership }, { status: 201 });
}
