import { requireUser } from "@/lib/serverAuth";

function parseAdminEmails(): string[] {
  const raw = (process.env.ADMIN_EMAILS || process.env.ADMIN_EMAIL || "").trim();
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const admins = parseAdminEmails();
  // Dev-friendly default: if not configured, allow any logged-in user.
  if (admins.length === 0) return true;
  return admins.includes(email.toLowerCase());
}

export async function requireAdmin() {
  const user = await requireUser();
  if (!user) return null;
  if (!isAdminEmail(user.email)) return null;
  return user;
}
