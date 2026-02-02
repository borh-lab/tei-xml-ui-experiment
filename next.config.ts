import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Dynamic basePath for reverse proxy deployment
  // Set via environment variable: NEXT_PUBLIC_BASE_PATH=/dhlab-experiment-ui npm run build
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || '',
  assetPrefix: process.env.NEXT_PUBLIC_BASE_PATH || '',

  // If using static export under reverse proxy, also uncomment:
  // output: 'export',
  // images: { unoptimized: true },
};

export default nextConfig;
