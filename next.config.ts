import path from "path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.join(__dirname),
  env: {
    HORIZON_DEV_BYPASS: process.env.HORIZON_DEV_BYPASS,
    DEV_SESSION_SECRET: process.env.DEV_SESSION_SECRET,
  },
};

export default nextConfig;
