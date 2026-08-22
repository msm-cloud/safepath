import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Allow importing the TypeScript source of the shared-types workspace
  // package directly, without a separate build step.
  transpilePackages: ['@safepath/shared-types'],
};

export default nextConfig;
