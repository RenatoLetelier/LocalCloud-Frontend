import { NextRequest, NextResponse } from 'next/server';

const PUBLIC_PATHS = ['/login'];

/** Decode JWT payload and check expiration – no secret needed, just clock check. */
function isTokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp ? payload.exp * 1000 < Date.now() : false;
  } catch {
    return true;
  }
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get('lc_token')?.value;

  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));

  if (isPublic) {
    // Already authenticated → redirect away from login
    if (token && !isTokenExpired(token)) {
      return NextResponse.redirect(new URL('/', request.url));
    }
    return NextResponse.next();
  }

  // Protected route: require valid, non-expired token
  if (!token || isTokenExpired(token)) {
    const response = NextResponse.redirect(new URL('/login', request.url));
    response.cookies.delete('lc_token');
    return response;
  }

  return NextResponse.next();
}

export const config = {
  // Exclude static assets and /api/* — API calls are always absolute URLs to the
  // backend; if someone accidentally uses a relative URL we don't want the
  // middleware to intercept and redirect them to /login, producing an HTML response.
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icons/|api/).*)'],
};
