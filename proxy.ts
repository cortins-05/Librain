import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 🔹 Permitir rutas públicas
  if (
    pathname === "/login" ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  // 🔹 Obtener sesión
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  // 🔹 Si no hay sesión → redirigir a /login
  if (!session) {
    const loginUrl = new URL("/login");
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/:path*"],
};