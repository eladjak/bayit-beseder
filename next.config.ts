import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const withBundleAnalyzer = require("@next/bundle-analyzer")({
  enabled: process.env.ANALYZE === "true",
});

const nextConfig: NextConfig = {
  // Enable gzip/brotli compression
  compress: true,

  images: {
    // Serve modern formats for smaller file sizes
    formats: ["image/avif", "image/webp"],
    // Limit image sizes to only what we actually use — reduces cache variants
    deviceSizes: [375, 640, 750, 828, 1080, 1200],
    imageSizes: [16, 32, 64, 128, 256, 320],
    // Aggressive caching: 30 days for optimized images
    minimumCacheTTL: 2592000,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "*.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "cdn.sanity.io",
      },
    ],
  },

  // Remove X-Powered-By header
  poweredByHeader: false,

  // Security + performance headers
  async headers() {
    return [
      {
        source: "/illustrations/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/icons/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      // Service worker must never be cached by the browser itself —
      // otherwise users get stuck on old SW versions after deploys.
      {
        source: "/sw.js",
        headers: [
          {
            key: "Cache-Control",
            value: "no-cache, no-store, must-revalidate",
          },
          {
            key: "Service-Worker-Allowed",
            value: "/",
          },
        ],
      },
      {
        source: "/(.*)",
        headers: [
          {
            // Content-Security-Policy in REPORT-ONLY mode (does NOT block — only
            // reports violations to the browser console). Baseline tuned for what
            // this app loads: Supabase (REST/Realtime/Storage over https + wss),
            // Google Fonts (gstatic), Plausible analytics, Sentry error reporting,
            // Sanity CMS images, Google avatar images, inline ThemeScript +
            // JSON-LD. After a few days of clean Report-Only reports, flip the key
            // below to "Content-Security-Policy" to enforce.
            key: "Content-Security-Policy-Report-Only",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://plausible.io",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "img-src 'self' data: blob: https://*.supabase.co https://*.googleusercontent.com https://lh3.googleusercontent.com https://cdn.sanity.io",
              "font-src 'self' data: https://fonts.gstatic.com",
              "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://plausible.io https://*.ingest.sentry.io https://*.sentry.io https://cdn.sanity.io https://*.sanity.io",
              "frame-src 'self'",
              "worker-src 'self' blob:",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "frame-ancestors 'none'",
            ].join("; "),
          },
          {
            key: "X-DNS-Prefetch-Control",
            value: "on",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(self), microphone=(self), geolocation=()",
          },
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
        ],
      },
    ];
  },
};

const withAnalyzer = withBundleAnalyzer(nextConfig);

// Only wrap with Sentry when auth token is available (skips source map upload in CI without token)
export default process.env.SENTRY_AUTH_TOKEN
  ? withSentryConfig(withAnalyzer, {
      silent: true,
      org: "eladjak",
      project: "bayit-beseder",
    })
  : withAnalyzer;
