import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  swcMinify: true,
  reactStrictMode: true,
  poweredByHeader: false,
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: false,
  }
};

export default nextConfig;
