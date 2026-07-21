import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";

// Content-Security-Policy — tightened for prod, loosened in dev for HMR.
// Keep this file the single source of truth; middleware also sets it per-request
// if a nonce is needed, but for now static CSP is enough.
const csp = [
  "default-src 'self'",
  "base-uri 'self'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  // Fonts we self-host + system fonts.
  "font-src 'self' data:",
  // Images: own domain + data URIs (icons) + optional CDN.
  "img-src 'self' data: blob: https:",
  // Styles: Next injects inline styles for streaming; allow unsafe-inline.
  "style-src 'self' 'unsafe-inline'",
  // Scripts: Next hydration + minor inline snippets. In prod we could tighten
  // with a nonce; for now allow inline. Google + Facebook OAuth start pages
  // don't load scripts here — they redirect away.
  isProd
    ? "script-src 'self' 'unsafe-inline'"
    : "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  // Fetch: same-origin API + Brevo (email API) + AADE webservice.
  "connect-src 'self' https://api.brevo.com https://publicrevenue.mvsc.gr https://accounts.google.com https://oauth2.googleapis.com https://graph.facebook.com https://www.googleapis.com",
  "object-src 'none'",
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  { key: "X-DNS-Prefetch-Control", value: "on" },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  typedRoutes: false,
  serverExternalPackages: ["@node-rs/argon2", "@prisma/client"],
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
