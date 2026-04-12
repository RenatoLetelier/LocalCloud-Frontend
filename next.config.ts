import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    unoptimized: true, // Required for Cloudflare Pages (no Image Optimization worker)
  },
  eslint: {
    ignoreDuringBuilds: true, // ESLint runs separately in CI, not during build
  },
  typescript: {
    ignoreBuildErrors: true, // Type errors won't block the Cloudflare deploy
  },
  // Proxy /api/* to the backend in development to avoid CORS issues.
  // On Cloudflare Pages rewrites are NOT supported, so production uses
  // NEXT_PUBLIC_API_URL (absolute URLs) instead.
  async rewrites() {
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:8000';
    return [
      {
        source: '/api/:path*',
        destination: `${backendUrl}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
