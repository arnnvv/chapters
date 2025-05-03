// File: next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // reactCompiler: true, // Comment out or remove this line
    reactCompiler: false, // Or explicitly set to false
    useCache: true,
  },
};

export default nextConfig;
