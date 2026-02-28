import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "avatar.githubusercontent.com"
      }
    ]
  }
};

export default nextConfig;
