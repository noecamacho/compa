import { NextResponse, type NextRequest } from "next/server";
import { PATHNAME_HEADER } from "@/lib/pathname-header";

// Layouts cannot read the URL, so the proxy passes it on; a signed-out visitor then signs in and comes back to it (T-011).
export function proxy(request: NextRequest) {
  const headers = new Headers(request.headers);
  headers.set(PATHNAME_HEADER, request.nextUrl.pathname + request.nextUrl.search);
  return NextResponse.next({ request: { headers } });
}

export const config = {
  matcher: ["/((?!api|auth|_next/static|_next/image|.*\\.[a-z0-9]+$).*)"],
};
