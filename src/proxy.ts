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
    const loginUrl = new URL("/guru/masuk", request.url);
    return NextResponse.redirect(loginUrl);
  }

  // Jika membuka /guru/masuk langsung dengan cookie yang usang, hapus cookie tersebut
  if (isGuruLoginRoute && teacherCookie) {
    const response = NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
    response.cookies.delete("ik_guru");
    return response;
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
