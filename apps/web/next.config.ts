import type { NextConfig } from "next";

const unusedConnectorOptionalModules = [
  "@x402/core/client",
  "@x402/evm",
  "@x402/evm/exact/client",
  "@x402/evm/upto/client",
  "@x402/svm/exact/client",
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@lunarlease/shared"],
  experimental: {
    optimizePackageImports: ["@react-three/drei"],
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      ...Object.fromEntries(
        unusedConnectorOptionalModules.map((moduleName) => [moduleName, false]),
      ),
    };
    return config;
  },
};

export default nextConfig;
