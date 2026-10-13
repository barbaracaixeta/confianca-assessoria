import type { NextConfig } from "next";

const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
  : undefined;

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // Módulos nativos / pesados usados na geração de preview dos produtos.
  // Não devem ser empacotados pelo bundler (o @napi-rs/canvas tem um addon .node
  // e o pdf.js lê arquivos de fonte/cmap do disco em runtime).
  serverExternalPackages: ["@napi-rs/canvas", "sharp", "pdfjs-dist", "exceljs", "fflate"],
  // Garante que os dados de fonte padrão e os cmaps do pdf.js existam no runtime
  // serverless da Vercel (não são importados via JS, então o tracing não os vê).
  outputFileTracingIncludes: {
    "/**": ["node_modules/pdfjs-dist/standard_fonts/**", "node_modules/pdfjs-dist/cmaps/**"],
  },
  async redirects() {
    return [
      { source: "/servicos", destination: "/loja", permanent: true },
      { source: "/servicos/:slug", destination: "/produto/:slug", permanent: true },
    ];
  },
  turbopack: {
    rules: {
      "*.css": { loaders: ["@tailwindcss/turbopack"], as: "*.css" },
    },
  },
  images: {
    remotePatterns: supabaseHost
      ? [{ protocol: "https", hostname: supabaseHost, pathname: "/storage/v1/object/**" }]
      : [],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
