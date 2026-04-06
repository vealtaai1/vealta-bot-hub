import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/serverAuth";

export type ProjectRole = "OWNER" | "ADMIN" | "MEMBER" | "VIEWER";

const ROLE_RANK: Record<ProjectRole, number> = {
  OWNER: 4,
  ADMIN: 3,
  MEMBER: 2,
  VIEWER: 1,
};

export async function getUserOrThrow() {
  const user = await requireUser();
  if (!user) {
    const err = new Error("UNAUTHENTICATED");
    (err as any).status = 401;
    throw err;
  }
  return user;
}

export async function getProjectRoleForUser(projectId: string, userId: string): Promise<ProjectRole | null> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { ownerId: true },
  });
  if (!project) return null;
  if (project.ownerId === userId) return "OWNER";

  const membership = await prisma.projectMembership.findUnique({
    where: { projectId_userId: { projectId, userId } },
    select: { role: true },
  });

  return (membership?.role as ProjectRole | undefined) ?? null;
}

export async function requireProjectRole(projectId: string, minRole: ProjectRole) {
  const user = await getUserOrThrow();
  const role = await getProjectRoleForUser(projectId, user.id);

  if (!role) {
    const err = new Error("FORBIDDEN");
    (err as any).status = 403;
    throw err;
  }

  if (ROLE_RANK[role] < ROLE_RANK[minRole]) {
    const err = new Error("FORBIDDEN");
    (err as any).status = 403;
    throw err;
  }

  return { user, role };
}
