// SolTax AU - Auth middleware
// Refreshes the Supabase session on every request and gates protected routes.

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

const PROTECTED_PREFIXES = [
  '/dashboard',
  '/wallets',
  '/transactions',
  '/reports',
  '/settings',
];

const AUTH_PAGES = ['/login', '/signup'];

export async function middleware(request: NextRequest) {
  // Supabase's "Site URL" is often just the app root; auth redirects then land
  // at /?code=... with no one to exchange the code. Forward any /?code= or
  // /?token_hash= to /auth/callback where exchangeCodeForSession runs.
  if (request.nextUrl.pathname === '/') {
    const hasCode = request.nextUrl.searchParams.has('code');
    const hasTokenHash = request.nextUrl.searchParams.has('token_hash');
    if (hasCode || hasTokenHash) {
      const url = request.nextUrl.clone();
      url.pathname = '/auth/callback';
      return NextResponse.redirect(url);
    }
  }

  let response = NextResponse.next({ request });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    // Env not configured — let requests through; surface the error at the page.
    return response;
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: Array<{ name: string; value: string; options?: any }>) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  const { data: { user } } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isProtected = PROTECTED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(p + '/')
  );
  const isAuthPage = AUTH_PAGES.includes(pathname);

  if (isProtected && !user) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('redirect', pathname);
    return NextResponse.redirect(url);
  }

  if (isAuthPage && user) {
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    url.search = '';
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
