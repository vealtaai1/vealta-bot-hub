import { prisma } from "@/lib/prisma";

export async function userCanAccessProject(userId: string, projectId: string) {
  if (!userId || !projectId) return false;

  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      archivedAt: null,
      OR: [
        { ownerId: userId },
        { memberships: { some: { userId } } },
      ],
    },
    select: { id: true },
  });

  return !!project;
}

type HttpError = Error & { status?: number };

export async function requireProjectAccess(userId: string, projectId: string) {
  const ok = await userCanAccessProject(userId, projectId);
  if (!ok) {
    const err: HttpError = new Error("FORBIDDEN");
    err.status = 403;
    throw err;
  }
}
