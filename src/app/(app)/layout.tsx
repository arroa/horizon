import { redirect } from "next/navigation";

import { AppShell } from "@/components/app-shell";
import { getHorizonUser } from "@/lib/current-user";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getHorizonUser();
  if (!user) redirect("/sign-in");

  return <AppShell user={user}>{children}</AppShell>;
}
