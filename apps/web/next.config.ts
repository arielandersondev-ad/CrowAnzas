import type { NextConfig } from "next";

const config: NextConfig = {
  output: "export",
  transpilePackages: ["@crowanzas/contracts"],
  devIndicators: false,
};

export default config;