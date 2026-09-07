"use client";

import { useClerk } from "@clerk/nextjs";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { useModel } from "@/components/model-provider";
import type { HorizonUser } from "@/lib/current-user";
import { ModelUploadFeedback } from "@/components/model-upload-feedback";
import { UploadModelButton } from "@/components/upload-model-button";

const nav = [
  { href: "/modelo", label: "Modelo" },
  { href: "/balance", label: "Balance" },
  { href: "/eerr", label: "EERR" },
];

export function AppShell({ user, children }: { user: HorizonUser; children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { signOut: clerkSignOut } = useClerk();
  const { snapshot } = useModel();

  async function signOut() {
    if (user.via === "dev") {
      await fetch("/api/auth/dev-logout", { method: "POST" });
      router.push("/sign-in");
      router.refresh();
      return;
    }

    await clerkSignOut({ redirectUrl: "/sign-in" });
  }

  return (
    <div className="min-h-screen">
      <header className="app-topbar">
        <Link href="/modelo" className="app-topbar-brand">
          <span className="app-topbar-mark">H</span>
          <span className="app-topbar-brand-text">
            <strong>Horizon</strong>
            <small>Mar del Sur</small>
          </span>
        </Link>

        <nav className="app-topbar-nav" aria-label="Secciones">
          {nav.map((item) => {
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={active ? "app-topbar-link is-active" : "app-topbar-link"}
                aria-current={active ? "page" : undefined}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="app-topbar-actions">
          <UploadModelButton />
          <div className="app-topbar-user">
            <span className="app-topbar-email" title={user.email}>
              {user.email}
            </span>
            <button type="button" onClick={signOut} className="app-topbar-logout">
              Salir
            </button>
          </div>
        </div>
      </header>

      {!snapshot && (
        <div className="app-topbar-banner">
          Vista de ejemplo — usa <strong>Cargar modelo</strong> para leer el Excel de esta sesión.
        </div>
      )}
      {children}
      <ModelUploadFeedback />
    </div>
  );
}
