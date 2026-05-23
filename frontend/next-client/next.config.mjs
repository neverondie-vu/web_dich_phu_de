import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  turbopack: {
    root: __dirname
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin-allow-popups"
          }
        ]
      }
    ];
  },
  async redirects() {
    return [
      { source: "/index.html", destination: "/", permanent: false },
      { source: "/app.html", destination: "/app", permanent: false },
      { source: "/about.html", destination: "/about", permanent: false },
      { source: "/features.html", destination: "/features", permanent: false },
      { source: "/pricing.html", destination: "/pricing", permanent: false },
      { source: "/payment.html", destination: "/payment", permanent: false },
      { source: "/forgot-password.html", destination: "/forgot-password", permanent: false },
      { source: "/auth/login.html", destination: "/auth/login", permanent: false },
      { source: "/auth/register.html", destination: "/auth/register", permanent: false },
      { source: "/admin/admin.html", destination: "/admin", permanent: false }
    ];
  }
};

export default nextConfig;
