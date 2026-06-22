import { type NextRequest, NextResponse } from "next/server";

const protectedRoutes = ["/today", "/settings", "/body", "/meals", "/workouts", "/plans", "/coach"];

export async function middleware(request: NextRequest) {
  const isProtectedRoute = protectedRoutes.some((route) => request.nextUrl.pathname.startsWith(route));
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return isProtectedRoute
      ? NextResponse.redirect(new URL("/login?setup=missing", request.url))
      : NextResponse.next();
  }

  // ponytail: This only gates navigation by cookie presence. Supabase RLS and
  // server-side getUser() remain the authorization boundary. Restore session
  // refresh here after Vercel Node middleware reliably bundles ESM imports.
  const hasAuthCookie = request.cookies.getAll().some(({ name }) =>
    name.startsWith("sb-") && name.includes("-auth-token"),
  );

  if (isProtectedRoute && !hasAuthCookie) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
