import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Optimize imports for large packages to improve dev startup time
    optimizePackageImports: [
      '@phosphor-icons/react',
      'docx',
      'jspdf',
    ],
  },
};

export default nextConfig;
