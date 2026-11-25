import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  const pathname = request.nextUrl.pathname;
  requestHeaders.set("x-pathname", pathname);

  const teacherCookie = request.cookies.get("ik_guru")?.value;
  const isGuruRoute = pathname.startsWith("/guru");
  const isGuruLoginRoute = pathname === "/guru/masuk";

  // Jika mengakses /guru/* (selain /guru/masuk) tanpa cookie sesi, redirect ke /guru/masuk
  if (isGuruRoute && !isGuruLoginRoute && !teacherCookie) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/guru/masuk";
    loginUrl.search = "";
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|signs|media|api).*)",
  ],
};
