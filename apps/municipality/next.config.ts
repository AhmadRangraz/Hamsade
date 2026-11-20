import type { NextConfig } from 'next';

const config: NextConfig = {
  poweredByHeader: false,
  devIndicators: false,
  agentRules: false,
  transpilePackages: ['@forge/ui', '@forge/shared', '@forge/config'],
};

export default config;
