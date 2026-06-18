import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    "@modelcontextprotocol/sdk",
    "@mantleio/mantle-mcp",
  ],
  outputFileTracingIncludes: {
    "/api/research": [
      "./skills/skills/**/SKILL.md",
      "./skills/skills/**/references/**/*",
      "./skills/MANTLE_SKILLS_REVISION",
    ],
  },
};

export default nextConfig;
