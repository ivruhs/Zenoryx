import { NextResponse } from "next/server";

// Fast, flash-free redirect for signed-out visitors. The cookie is only checked
// for presence here; the API still validates it on every request.
export function middleware(request) {
  if (request.cookies.has("session")) return NextResponse.next();
  const url = request.nextUrl.clone();
  url.pathname = "/login";
  url.search = `?next=${encodeURIComponent(request.nextUrl.pathname + request.nextUrl.search)}`;
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/dashboard/:path*", "/projects/:path*"],
};
