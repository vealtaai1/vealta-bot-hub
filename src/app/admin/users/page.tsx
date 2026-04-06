import { requireAdmin } from "@/lib/admin";
import AdminUsersClient from "./usersClient";

export default async function AdminUsersPage() {
  const admin = await requireAdmin();
  if (!admin) {
    return (
      <div className="rounded-2xl border border-zinc-200 bg-white p-4 text-sm dark:border-zinc-800 dark:bg-zinc-950">
        Forbidden.
      </div>
    );
  }

  return <AdminUsersClient />;
}
