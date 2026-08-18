import { COOKIE_NAME, verifyToken } from "@/lib/auth";
import { NextResponse, type NextRequest } from "next/server";

const publicPaths = ["/", "/login", "/register"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (publicPaths.includes(pathname) || pathname.startsWith("/api/auth")) {
    return NextResponse.next();
  }

  const token = request.cookies.get(COOKIE_NAME)?.value;
  if (!token) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const session = await verifyToken(token);
  if (!session) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (pathname.startsWith("/dashboard/admin") && session.role !== "ADMIN") {
    return NextResponse.redirect(new URL(`/dashboard/${session.role.toLowerCase()}`, request.url));
  }
  if (pathname.startsWith("/dashboard/security") && session.role !== "SECURITY") {
    return NextResponse.redirect(new URL(`/dashboard/${session.role.toLowerCase()}`, request.url));
  }
  if (pathname.startsWith("/dashboard/user") && session.role !== "USER") {
    return NextResponse.redirect(new URL(`/dashboard/${session.role.toLowerCase()}`, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
