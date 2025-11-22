import type { NextConfig } from "next";

// Turbopack (used by `next dev --turbopack`) does not support `experimental.esmExternals`.
// We only enable it for production builds where Webpack is used.
const isProd = process.env.NODE_ENV === "production";

const nextConfig: NextConfig = {
  experimental: isProd
    ? {
        // Allow ESM packages that don't perfectly declare dual packages to be imported on the client
        esmExternals: "loose",
      }
    : {},
};

export default nextConfig;
