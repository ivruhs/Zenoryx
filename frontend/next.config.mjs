/**
 * The browser only ever talks to this Next.js origin. `/api/*` is proxied to the
 * Express backend, which keeps the session cookie first-party (cross-site cookies
 * are blocked by Safari and increasingly by Chrome).
 *
 * BACKEND_URL — where the API lives (default http://localhost:8000).
 * NEXT_PUBLIC_API_URL is accepted for backwards compatibility.
 */
const backend = (process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000")
  .replace(/\/+$/, "")
  .replace(/\/api$/, "");

/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  compress: false, // let SSE answers stream through the proxy unbuffered
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${backend}/api/:path*` }];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
