import type { NextConfig } from "next";

const BACKEND =
  process.env.NEXT_PUBLIC_API_URL ?? 'https://afya-backend-production.up.railway.app';

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        // Proxy all /api/v1/* calls through Next.js to avoid browser CORS
        source: '/api/v1/:path*',
        destination: `${BACKEND}/api/v1/:path*`,
      },
    ];
  },
};

export default nextConfig;
