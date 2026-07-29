import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,

  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "crests.football-data.org",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
