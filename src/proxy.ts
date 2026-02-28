import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isPublicRoute =
    pathname === "/login" ||
    pathname === "/register" ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico";

  // Public routes should bypass auth checks.
  if (isPublicRoute) {
    return NextResponse.next();
  }

  // Get session for protected routes.
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  // If there is no session, redirect to /login.
  if (!session) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/:path*"],
};
