/** @type {import('next').NextConfig} */
const { version } = require("./package.json");
const { i18n } = require("./next-i18next.config");

const nextConfig = {
  i18n,
  reactStrictMode: true,
  devIndicators: false,
  // Allow the Base44 preview origin to load dev assets/HMR (no-op elsewhere)
  ...(process.env.BASE44_PREVIEW_MODE === "1" &&
    process.env.BASE44_PUBLIC_HOST_SUFFIX && {
      allowedDevOrigins: ["3000-" + process.env.BASE44_PUBLIC_HOST_SUFFIX],
    }),
  staticPageGenerationTimeout: 1000,
  images: {
    remotePatterns: [
      // For profile pictures (Google OAuth)
      { hostname: "*.googleusercontent.com" },
    ],

    minimumCacheTTL: 10,
  },
  transpilePackages: ["@linkwarden/prisma"],
  env: {
    version,
  },
  webpack(config) {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
    };

    return config;
  },
};

module.exports = nextConfig;
