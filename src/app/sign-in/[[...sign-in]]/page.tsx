import { redirect } from "next/navigation";

import { SignInForm } from "@/components/sign-in-form";
import { getHorizonUser } from "@/lib/current-user";
import { isDevBypassEnabled } from "@/lib/dev-flags";

export default async function SignInPage() {
  const user = await getHorizonUser();
  if (user) redirect("/modelo");

  return (
    <main className="grid min-h-screen place-items-center px-6">
      <SignInForm
        devBypass={isDevBypassEnabled()}
        clerkEnabled={Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY)}
      />
    </main>
  );
}
