import { NextResponse } from "next/server";

import { isDevBypassEnabled } from "@/lib/dev-flags";
import { createDevSessionToken, devSessionCookieOptions } from "@/lib/dev-session-token";

export async function POST(request: Request) {
  if (!isDevBypassEnabled()) {
    return NextResponse.json({ error: "No disponible" }, { status: 404 });
  }

  const json = (await request.json().catch(() => null)) as { email?: string } | null;
  const email = json?.email?.trim().toLowerCase() ?? "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Email inválido" }, { status: 400 });
  }

  const token = await createDevSessionToken(`dev:${email}`);
  const response = NextResponse.json({ ok: true });
  const cookie = devSessionCookieOptions(token);
  response.cookies.set(cookie.name, cookie.value, cookie);
  return response;
}
