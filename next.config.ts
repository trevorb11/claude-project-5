import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["better-sqlite3"],
  allowedDevOrigins: [
    "https://*.replit.dev",
    "https://*.repl.co",
    "https://*.replit.app",
  ],
};

export default nextConfig;
