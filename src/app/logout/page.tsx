"use client";

import { signOut } from "next-auth/react";
import { useEffect } from "react";

export default function LogoutPage() {
  useEffect(() => {
    signOut({ callbackUrl: "/login" });
  }, []);

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <p className="text-sm text-neutral-600">Signing you out…</p>
    </main>
  );
}
