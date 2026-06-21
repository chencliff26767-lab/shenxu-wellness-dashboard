import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { isSupabaseConfigured, supabasePublishableKey, supabaseUrl } from "@/lib/supabase/env";

const protectedRoutes = ["/today", "/settings", "/body", "/meals", "/workouts", "/plans", "/coach"];

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const isProtectedRoute = protectedRoutes.some((route) => request.nextUrl.pathname.startsWith(route));

  if (
    !isSupabaseConfigured() &&
    process.env.NODE_ENV === "development" &&
    isProtectedRoute
  ) {
    return response;
  }

  if (
    !isSupabaseConfigured() &&
    process.env.NODE_ENV !== "development" &&
    isProtectedRoute
  ) {
    return NextResponse.redirect(new URL("/login?setup=missing", request.url));
  }

  const supabase = createServerClient(supabaseUrl, supabasePublishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && isProtectedRoute) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return response;
}
