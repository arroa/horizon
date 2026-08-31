import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse, type NextRequest } from "next/server";

import { isDevBypassEnabled } from "@/lib/dev-flags";
import { getDevSessionUserIdFromRequest } from "@/lib/dev-session-edge";

const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/auth/dev-login(.*)",
  "/api/auth/dev-logout(.*)",
]);

function hasClerkKeys() {
  return Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && process.env.CLERK_SECRET_KEY);
}

async function guardWithoutClerk(request: NextRequest) {
  if (isPublicRoute(request)) return NextResponse.next();
  if (isDevBypassEnabled() && (await getDevSessionUserIdFromRequest(request))) {
    return NextResponse.next();
  }
  return NextResponse.redirect(new URL("/sign-in", request.url));
}

const clerkGuard = hasClerkKeys()
  ? clerkMiddleware(async (auth, request) => {
      if (isDevBypassEnabled() && (await getDevSessionUserIdFromRequest(request))) {
        return;
      }
      if (!isPublicRoute(request)) {
        await auth.protect();
      }
    })
  : guardWithoutClerk;

export default clerkGuard;

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
