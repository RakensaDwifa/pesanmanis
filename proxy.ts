import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { supabaseAnonKey, supabaseUrl } from "@/lib/supabase/config";

const STATELESS_PUBLIC_PREFIXES = [
  "/api/payment/webhook",
  "/api/cron/",
  "/api/pricing",
  "/api/views",
];

function isStatelessPublicPath(pathname: string): boolean {
  if (pathname.endsWith("/opengraph-image")) return true;
  return STATELESS_PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  if (!supabaseUrl() || !supabaseAnonKey()) {
    return response;
  }

  // Skip unnecessary Supabase Auth round-trips on stateless endpoints or requests without auth cookies.
  if (isStatelessPublicPath(request.nextUrl.pathname)) {
    return response;
  }
  const hasSupabaseCookie = request.cookies
    .getAll()
    .some((c) => c.name.startsWith("sb-"));
  if (!hasSupabaseCookie) {
    return response;
  }

  const supabase = createServerClient(supabaseUrl(), supabaseAnonKey(), {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet) => {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  await supabase.auth.getUser();

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|mp3|woff2?)$).*)",
  ],
};
