import { prisma } from "@/lib/prisma";
import { sha256Hex } from "@/lib/tokens";
import { acceptInvite } from "./actions";
import { getSession } from "@/lib/serverAuth";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function InvitePage({
  params,
}: {
  params: { token: string };
}) {
  const { token } = params;
  const tokenHash = sha256Hex(token);

  const session = await getSession();

  const invite = await prisma.projectInvite.findUnique({
    where: { tokenHash },
    include: { project: true },
  });

  if (!invite) {
    return (
      <main className="p-6 max-w-xl mx-auto space-y-3">
        <h1 className="text-xl font-semibold">Invite not found</h1>
        <p className="text-sm text-neutral-600">This invite link is invalid.</p>
        <Link className="underline" href="/login">
          Sign in
        </Link>
      </main>
    );
  }

  const expired = invite.expiresAt.getTime() < Date.now();

  return (
    <main className="p-6 max-w-xl mx-auto space-y-4">
      <h1 className="text-xl font-semibold">Project invite</h1>

      <div className="rounded border p-4 space-y-1">
        <p className="text-sm">
          <span className="text-neutral-500">Project:</span> {invite.project.name}
        </p>
        <p className="text-sm">
          <span className="text-neutral-500">Invited email:</span> {invite.email}
        </p>
        <p className="text-sm">
          <span className="text-neutral-500">Status:</span> {invite.status}
          {expired ? " (EXPIRED)" : null}
        </p>
      </div>

      {!session?.user ? (
        <div className="space-y-3">
          <p className="text-sm text-neutral-700">
            You need an account for <b>{invite.email}</b> to accept this invite.
          </p>

          <div className="flex flex-wrap gap-2">
            <Link
              className="inline-block rounded bg-black text-white px-3 py-2"
              href={`/login?callbackUrl=${encodeURIComponent(`/invite/${token}`)}`}
            >
              Sign in
            </Link>
            <Link
              className="inline-block rounded border px-3 py-2"
              href={`/signup?invite=${encodeURIComponent(token)}`}
            >
              Create account
            </Link>
          </div>

          <p className="text-xs text-neutral-500">
            Create account is invite-only and will use the invited email address.
          </p>
        </div>
      ) : (
        <form
          action={async () => {
            "use server";
            await acceptInvite(token);
          }}
          className="space-y-2"
        >
          <p className="text-sm text-neutral-700">
            Signed in as <b>{session.user.email}</b>
          </p>
          <button
            type="submit"
            className="rounded bg-black text-white px-3 py-2 disabled:opacity-50"
            disabled={invite.status !== "PENDING" || expired}
          >
            Accept invite
          </button>
          <p className="text-xs text-neutral-500">
            You must be signed in with the invited email address.
          </p>
        </form>
      )}

      <Link className="underline text-sm" href="/">
        Back to app
      </Link>
    </main>
  );
}
