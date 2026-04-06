import { requireAdmin } from "@/lib/admin";
import AdminProjectMembersClient from "./projectMembersClient";

export default async function AdminProjectMembersPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const admin = await requireAdmin();
  if (!admin) {
    return (
      <div className="rounded-2xl border border-zinc-200 bg-white p-4 text-sm dark:border-zinc-800 dark:bg-zinc-950">
        Forbidden.
      </div>
    );
  }

  const { id } = await params;
  return <AdminProjectMembersClient projectId={id} />;
}
