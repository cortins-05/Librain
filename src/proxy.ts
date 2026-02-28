// middleware.ts
import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"

const PUBLIC_FILE = /\.(.*)$/ // cualquier archivo con extensión: .png .jpg .css .js ...

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // 1) Dejar pasar archivos estáticos (public/...) y assets internos de Next
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/auth") ||
    pathname === "/favicon.ico" ||
    pathname === "/robots.txt" ||
    pathname === "/sitemap.xml" ||
    PUBLIC_FILE.test(pathname)
  ) {
    return NextResponse.next()
  }

  // 2) Rutas públicas de tu app
  if (pathname === "/login" || pathname === "/register") {
    return NextResponse.next()
  }

  // 3) Rutas protegidas
  const session = await auth.api.getSession({
    headers: request.headers,
  })

  if (!session?.user) {
    return NextResponse.redirect(new URL("/login", request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!api/auth).*)"], // opcional; lo importante es el if de arriba
}