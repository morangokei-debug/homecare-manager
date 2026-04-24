import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,

  // 本番ビルドで console.log を自動削除（error/warn は残す）
  compiler: {
    removeConsole:
      process.env.NODE_ENV === "production"
        ? { exclude: ["error", "warn"] }
        : false,
  },

  // 大きなパッケージから使っているアイコン/関数だけを個別に取り込む
  // （lucide-react は 1500+ アイコンを持つので特に効果大）
  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "date-fns",
      "react-day-picker",
      "@radix-ui/react-avatar",
      "@radix-ui/react-checkbox",
      "@radix-ui/react-collapsible",
      "@radix-ui/react-dialog",
      "@radix-ui/react-dropdown-menu",
      "@radix-ui/react-label",
      "@radix-ui/react-radio-group",
      "@radix-ui/react-select",
      "@radix-ui/react-slot",
      "@radix-ui/react-tabs",
    ],
  },
};

export default nextConfig;
