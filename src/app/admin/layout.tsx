import Link from "next/link";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-zinc-50 text-zinc-900 dark:bg-black dark:text-zinc-50">
      <div className="mx-auto w-full max-w-5xl px-4 py-6">
        <header className="mb-6 flex flex-col gap-2">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Admin</h1>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Minimal user + membership management.
              </p>
            </div>
            <Link className="text-sm underline" href="/">
              Back to app
            </Link>
          </div>

          <nav className="flex gap-4 text-sm">
            <Link className="underline" href="/admin/users">
              Users
            </Link>
            <Link className="underline" href="/admin/projects">
              Projects
            </Link>
          </nav>
        </header>

        {children}
      </div>
    </div>
  );
}
