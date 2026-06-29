import type { NextConfig } from "next";

// The Railway backend URL. Hardcoded here because Next.js rewrites() are
// evaluated at build time on Vercel, and NEXT_PUBLIC_ env vars may not be
// available during the build phase unless explicitly set in the Vercel dashboard.
const BACKEND = 'https://afya-backend-production.up.railway.app';

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        // Proxy all /api/v1/* calls through Next.js to avoid browser CORS.
        // Vercel forwards these server-side to Railway — no CORS issue.
        source: '/api/v1/:path*',
        destination: `${BACKEND}/api/v1/:path*`,
      },
    ];
  },
};

export default nextConfig;
