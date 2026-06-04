import { NextResponse, type NextRequest } from 'next/server';

const PUBLIC_PATHS = ['/login'];

/**
 * Next.js 16 Proxy (formerly middleware.ts → renamed proxy.ts per v16 convention).
 * Checks for the afya_access_token cookie mirrored from localStorage by authService.
 * If missing on a protected route, redirects to /login.
 * Primary auth guard is still the client-side AuthGuard component.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Always allow public auth paths
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Allow Next.js internals and static assets
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // Check for the token cookie (written by authService after login)
  const token = request.cookies.get('afya_access_token')?.value;

  if (!token) {
    console.log(`[Proxy] No token for ${pathname} — redirecting to /login`);
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
