/** @type {import('next').NextConfig} */

// Tradução de caminhos por locale (uma língua por deploy).
// Mantido em sincronia com EN_OVERRIDES em src/lib/rotas.ts.
const EN = process.env.NEXT_PUBLIC_APP_LOCALE === "en";
const MAPA = [
  ["/transactions", "/transacoes"],
  ["/taxes", "/impostos"],
  ["/reserves", "/caixinhas"],
  ["/recurring", "/recorrentes"],
  ["/import", "/importar"],
  ["/audit", "/auditoria"],
  ["/settings", "/configuracoes"],
];

const nextConfig = {
  reactStrictMode: true,
  // Empacota só o necessário para rodar: a imagem Docker cai de ~1,2 GB para
  // ~200 MB. Não muda nada no `npm run dev` nem no `npm start` local.
  output: "standalone",

  // Com locale=en, os caminhos em inglês servem as pastas em português
  // (rewrites) e os caminhos em português redirecionam para o inglês
  // (redirects). Com locale=pt (padrão), nada disto roda.
  async rewrites() {
    if (!EN) return [];
    return MAPA.flatMap(([en, pt]) => [
      { source: en, destination: pt },
      { source: `${en}/:path*`, destination: `${pt}/:path*` },
    ]);
  },
  async redirects() {
    if (!EN) return [];
    return MAPA.flatMap(([en, pt]) => [
      { source: pt, destination: en, permanent: false },
      { source: `${pt}/:path*`, destination: `${en}/:path*`, permanent: false },
    ]);
  },
};

export default nextConfig;
