import type { NextConfig } from "next";

const unusedOptionalModules = [
  "@x402/core/client",
  "@x402/evm",
  "@x402/evm/exact/client",
  "@x402/evm/upto/client",
  "@x402/svm/exact/client",
  "pino-pretty",
  "@react-native-async-storage/async-storage",
];

const emptyModule = "./lib/empty.ts";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@lunarlease/shared"],
  turbopack: {
    resolveAlias: Object.fromEntries(
      unusedOptionalModules.map((moduleName) => [moduleName, emptyModule]),
    ),
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      ...Object.fromEntries(
        unusedOptionalModules.map((moduleName) => [moduleName, false]),
      ),
    };
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
    };
    return config;
  },
};

export default nextConfig;
