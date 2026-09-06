import { redirect } from "next/navigation";

import { AppProviders } from "@/components/app-providers";
import { AppShell } from "@/components/app-shell";
import { getHorizonUser } from "@/lib/current-user";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getHorizonUser();
  if (!user) redirect("/sign-in");

  return (
    <AppProviders>
      <AppShell user={user}>{children}</AppShell>
    </AppProviders>
  );
}
