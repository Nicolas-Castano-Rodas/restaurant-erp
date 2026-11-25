import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // npm scripts run in this single-package project root, including Docker and Vercel.
  turbopack: { root: process.cwd() },
  serverExternalPackages: ["exceljs", "pdf-lib"],
  async headers() {
    const security = [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "X-Frame-Options", value: "DENY" },
      { key: "Referrer-Policy", value: "same-origin" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
      { key: "Content-Security-Policy", value: "frame-ancestors 'none'; object-src 'none'; base-uri 'self'; form-action 'self'" },
      ...(process.env.NODE_ENV === "production" && process.env.ENABLE_HSTS === "true" ? [{ key: "Strict-Transport-Security", value: "max-age=31536000" }] : []),
    ];
    const privateCache = [{ key: "Cache-Control", value: "private, no-store" }];
    return [
      { source: "/:path*", headers: security },
      { source: "/dashboard/:path*", headers: privateCache },
      { source: "/login", headers: privateCache },
      { source: "/api/reports", headers: privateCache },
      { source: "/api/catalog", headers: privateCache },
    ];
  },
};

export default nextConfig;
