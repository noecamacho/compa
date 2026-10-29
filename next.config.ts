import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // AGENTS.md is the project's own instruction file; keep `next dev` from injecting its managed block.
  agentRules: false,
};

export default nextConfig;
