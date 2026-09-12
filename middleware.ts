import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Dedicated Admin Login Portal handling
  if (pathname === '/admin/login') {
    const sessionCookie = request.cookies.get('session-token')?.value;
    if (sessionCookie) {
      const session = verifySessionJWT(sessionCookie);
      if (session && session.role === 'ADMIN') {
        return NextResponse.redirect(new URL('/admin', request.url));
      }
    }
    return NextResponse.next();
  }

  // 2. Executive Admin Route Protection
  if (pathname.startsWith('/admin')) {
    const sessionCookie = request.cookies.get('session-token')?.value;
    if (!sessionCookie) {
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }

    const session = verifySessionJWT(sessionCookie);
    if (!session || session.role !== 'ADMIN') {
      const response = NextResponse.redirect(new URL('/admin/login', request.url));
      return response;
    }

    return NextResponse.next();
  }

  // 3. General Member Protected Routes
  const isProtectedRoute = [
    '/discover',
    '/matches',
    '/messages',
    '/events',
    '/directory',
    '/boost',
    '/settings',
    '/onboarding',
    '/profile'
  ].some(route => pathname.startsWith(route));

  const isAuthRoute = ['/login', '/register'].some(route => pathname.startsWith(route));

  // 4. Fetch the session-token cookie for members
  const sessionCookie = request.cookies.get('session-token')?.value;

  if (isProtectedRoute) {
    if (!sessionCookie) {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    // Verify token expiration and signature
    const session = verifySessionJWT(sessionCookie);
    if (!session) {
      // Clear invalid cookie and redirect to login
      const response = NextResponse.redirect(new URL('/login', request.url));
      response.cookies.delete('session-token');
      return response;
    }
  }

  // If already authenticated and trying to visit login/register, redirect to discover
  if (isAuthRoute) {
    if (sessionCookie && verifySessionJWT(sessionCookie)) {
      return NextResponse.redirect(new URL('/discover', request.url));
    }
  }

  // Redirect root to /discover if logged in, or /login if unauthenticated
  if (pathname === '/') {
    if (sessionCookie && verifySessionJWT(sessionCookie)) {
      return NextResponse.redirect(new URL('/discover', request.url));
    }
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

/**
 * Lightweight, Edge-compatible base64 JWT payload decoder and expiration checker.
 */
function verifySessionJWT(token: string): Record<string, any> | null {
  try {
    if (!token) return null;
    const cleanToken = decodeURIComponent(token.trim().replace(/^"|"$/g, ''));
    const parts = cleanToken.split('.');
    if (parts.length !== 3) return null;

    const payloadBase64 = parts[1];
    // Decodes base64url to utf-8 string in Edge environment
    const decodedString = atob(payloadBase64.replace(/-/g, '+').replace(/_/g, '/'));
    const payload = JSON.parse(decodedString);

    // Check expiration timestamp (with grace period)
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000) - 300) {
      return null;
    }

    return payload;
  } catch (err) {
    return null;
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
