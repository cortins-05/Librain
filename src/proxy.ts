// middleware.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

const PUBLIC_FILE = /\.(.*)$/;

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1️⃣ Dejar pasar todo lo estático (public + next internals)
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/auth") ||
    pathname === "/favicon.ico" ||
    pathname === "/robots.txt" ||
    pathname === "/sitemap.xml" ||
    PUBLIC_FILE.test(pathname) // <- cualquier archivo con extensión (.png .webp .svg .css etc)
  ) {
    return NextResponse.next();
  }

  // 2️⃣ Obtener sesión
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  const isAuthRoute =
    pathname === "/login" || pathname === "/register";

  // 3️⃣ Login / Register
  if (isAuthRoute) {
    if (!session?.user) return NextResponse.next();
    return NextResponse.redirect(new URL("/", request.url));
  }

  // 4️⃣ Rutas protegidas
  if (!session?.user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};