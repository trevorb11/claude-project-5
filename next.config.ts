import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    "*.replit.dev",
    "*.repl.co",
    "*.replit.app",
    "*.kirk.replit.dev",
    "127.0.0.1",
  ],
};

export default nextConfig;
