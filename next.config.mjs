/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Empacota só o necessário para rodar: a imagem Docker cai de ~1,2 GB para
  // ~200 MB. Não muda nada no `npm run dev` nem no `npm start` local.
  output: "standalone",
};

export default nextConfig;
