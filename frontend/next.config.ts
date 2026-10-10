import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Tell Turbopack the project root is the frontend directory,
  // not the parent git repo root — suppresses the package-lock.json warning.
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
