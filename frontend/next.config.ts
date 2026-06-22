import type { NextConfig } from "next";

if (process.env.VERCEL === "1") {
  const required = ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "NEXT_PUBLIC_SITE_URL"];
  const missing = required.filter((name) => !process.env[name]);
  if (missing.length) throw new Error(`Missing required Vercel environment variables: ${missing.join(", ")}`);
  const supabaseUrl = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!);
  const siteUrl = new URL(process.env.NEXT_PUBLIC_SITE_URL!);
  if (supabaseUrl.protocol !== "https:") throw new Error("NEXT_PUBLIC_SUPABASE_URL must use HTTPS on Vercel");
  if (process.env.VERCEL_ENV === "production" && siteUrl.protocol !== "https:") throw new Error("NEXT_PUBLIC_SITE_URL must use HTTPS in production");
}

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: "base-uri 'self'; frame-ancestors 'none'; object-src 'none'" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-DNS-Prefetch-Control", value: "off" },
          { key: "Permissions-Policy", value: "microphone=(), geolocation=(), payment=(), usb=()" },
          { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
        ],
      },
    ];
  },
};

export default nextConfig;
