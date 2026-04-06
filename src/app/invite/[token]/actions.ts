"use server";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/serverAuth";
import { sha256Hex } from "@/lib/tokens";
import { redirect } from "next/navigation";

export async function acceptInvite(token: string) {
  const user = await requireUser();
  if (!user) {
    redirect(`/login?callbackUrl=${encodeURIComponent(`/invite/${token}`)}`);
  }

  const tokenHash = sha256Hex(token);

  const invite = await prisma.projectInvite.findUnique({
    where: { tokenHash },
    include: { project: true },
  });

  if (!invite) {
    return { ok: false as const, error: "Invite not found." };
  }

  if (invite.status !== "PENDING") {
    return { ok: false as const, error: `Invite is ${invite.status.toLowerCase()}.` };
  }

  if (invite.expiresAt.getTime() < Date.now()) {
    return { ok: false as const, error: "Invite expired." };
  }

  if (invite.email.toLowerCase() !== user.email.toLowerCase()) {
    return {
      ok: false as const,
      error: `This invite is for ${invite.email}. You are signed in as ${user.email}.`,
    };
  }

  await prisma.$transaction(async (tx: any) => {
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

  redirect("/");
}
