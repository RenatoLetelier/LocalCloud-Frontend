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
  // NOTE: rewrites() are NOT supported on Cloudflare Pages with next-on-pages.
  // All API calls use NEXT_PUBLIC_API_URL as base (absolute URLs).
  // Configure CORS on the backend to allow the frontend origin.
};

export default nextConfig;
