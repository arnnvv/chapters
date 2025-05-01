import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    reactCompiler: true,
    ppr: "incremental",
    dynamicIO: true,
  },
};

export default nextConfig;
