import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,

  // 大きなパッケージから使っているアイコン/関数だけを個別に取り込む
  // （lucide-react は 1500+ アイコンを持つので特に効果大）
  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "date-fns",
      "react-day-picker",
    ],
  },
};

export default nextConfig;
