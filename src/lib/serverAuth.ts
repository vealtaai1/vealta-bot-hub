import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function getSession() {
  return getServerSession(authOptions);
}

export async function requireUser() {
  const session = await getSession();
  if (!session?.user?.id) return null;
  return session.user;
}
