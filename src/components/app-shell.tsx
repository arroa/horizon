"use client";

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
  { href: "/eerr-linea", label: "EERR × línea" },
];

export function AppShell({ user, children }: { user: HorizonUser; children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { snapshot } = useModel();

  async function signOut() {
    if (user.via === "dev") {
      await fetch("/api/auth/dev-logout", { method: "POST" });
    }
    router.push("/sign-in");
    router.refresh();
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 grid h-[74px] grid-cols-[1fr_auto] items-center border-b border-[rgba(24,61,49,0.12)] bg-[rgba(251,250,246,0.92)] px-6 backdrop-blur-md lg:px-16">
        <Link href="/modelo" className="flex w-max items-center gap-3">
          <span className="grid h-9 w-9 place-items-center rounded-[10px] bg-[var(--green)] font-serif text-lg font-bold text-[var(--lime)]">
            H
          </span>
          <span className="flex flex-col text-[13px] leading-tight">
            <strong>Horizon</strong>
            <small className="mt-0.5 text-[10px] uppercase tracking-[0.12em] text-[var(--muted)]">
              Mar del Sur
            </small>
          </span>
        </Link>
        <div className="flex items-center gap-6">
          <UploadModelButton />
          <nav className="hidden gap-6 text-[13px] text-[#42534c] md:flex">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={pathname.startsWith(item.href) ? "font-semibold text-[var(--ink)]" : "hover:text-[var(--ink)]"}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <button onClick={signOut} className="text-xs text-[var(--muted)] hover:text-[var(--ink)]">
            {user.email} · salir
          </button>
        </div>
      </header>
      {!snapshot && (
        <div className="border-b border-[#eadfce] bg-[#f8f4ed] px-6 py-2 text-center text-xs text-[#5f4d3d] lg:px-16">
          Vista de ejemplo — usa <strong>Cargar modelo</strong> para leer el Excel de esta sesión.
        </div>
      )}
      {children}
      <ModelUploadFeedback />
    </div>
  );
}
