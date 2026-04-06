import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sha256Hex } from "@/lib/tokens";
import bcrypt from "bcryptjs";

// POST /api/signup
// Invite-only signup.
// body: { inviteToken: string, password: string, displayName?: string }
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const inviteToken = typeof body?.inviteToken === "string" ? body.inviteToken : "";
  const password = typeof body?.password === "string" ? body.password : "";
  const displayName = typeof body?.displayName === "string" ? body.displayName.trim() : "";

  if (!inviteToken) {
    return NextResponse.json({ error: "Missing inviteToken" }, { status: 400 });
  }
  if (!password || password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
  }

  const tokenHash = sha256Hex(inviteToken);

  const invite = await prisma.projectInvite.findUnique({
    where: { tokenHash },
    include: { project: { select: { id: true } } },
  });

  if (!invite) {
    return NextResponse.json({ error: "Invite not found" }, { status: 404 });
  }
  if (invite.status !== "PENDING") {
    return NextResponse.json({ error: `Invite is ${invite.status.toLowerCase()}` }, { status: 400 });
  }
  if (invite.expiresAt.getTime() < Date.now()) {
    return NextResponse.json({ error: "Invite expired" }, { status: 400 });
  }

  const email = invite.email.toLowerCase();

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json(
      { error: "Account already exists for this email. Please sign in instead." },
      { status: 409 },
    );
  }

  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.$transaction(async (tx: any) => {
    const user = await tx.user.create({
      data: {
        email,
        passwordHash,
        displayName: displayName || null,
      },
      select: { id: true },
    });

    await tx.projectInvite.update({
      where: { id: invite.id },
      data: {
        status: "ACCEPTED",
        acceptedById: user.id,
        acceptedAt: new Date(),
      },
    });

    await tx.projectMembership.upsert({
      where: { projectId_userId: { projectId: invite.projectId, userId: user.id } },
      update: {},
      create: {
        projectId: invite.projectId,
        userId: user.id,
        role: "MEMBER",
      },
    });
  });

  return NextResponse.json({ ok: true, email });
}
