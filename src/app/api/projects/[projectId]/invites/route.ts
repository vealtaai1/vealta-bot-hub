import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireProjectRole } from "@/lib/rbac";
import { randomToken, sha256Hex } from "@/lib/tokens";

// GET /api/projects/:projectId/invites
// Admin-only: list recent invites.
export async function GET(_req: Request, ctx: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await ctx.params;
  await requireProjectRole(projectId, "ADMIN");

  const invites = await prisma.projectInvite.findMany({
    where: { projectId },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      email: true,
      status: true,
      expiresAt: true,
      createdAt: true,
      acceptedAt: true,
      revokedAt: true,
    },
  });

  return NextResponse.json({ invites });
}

// POST /api/projects/:projectId/invites
// body: { email: string, expiresInDays?: number }
// Admin-only: creates an invite and returns the *raw token* once.
export async function POST(req: Request, ctx: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await ctx.params;
  const { user } = await requireProjectRole(projectId, "ADMIN");

  const body = await req.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.toLowerCase().trim() : "";
  const expiresInDays = Number.isFinite(body?.expiresInDays) ? Number(body.expiresInDays) : 7;

  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "Missing/invalid email" }, { status: 400 });
  }

  const days = Math.max(1, Math.min(30, expiresInDays));
  const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

  const token = randomToken(32);
  const tokenHash = sha256Hex(token);

  const invite = await prisma.projectInvite.create({
    data: {
      projectId,
      email,
      tokenHash,
      createdById: user.id,
      expiresAt,
    },
    select: { id: true, email: true, status: true, expiresAt: true },
  });

  return NextResponse.json({ invite, token });
}
