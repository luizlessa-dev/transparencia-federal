/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: "http", hostname: "www.senado.leg.br" },
      { protocol: "https", hostname: "www.camara.leg.br" },
      { protocol: "https", hostname: "www.camara.gov.br" },
    ],
  },
  // Canonical: www.transparenciafederal.com
  // .org e apex .com → 301 pra www.com (consolidação de SEO entre TLDs e hosts)
  // Obs: enquanto houver Cloudflare Access (Basic Auth) na frente, o 401 do CF
  // dispara antes do redirect chegar ao Vercel. Vira efetivo quando o auth cair.
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "transparenciafederal.org" }],
        destination: "https://www.transparenciafederal.com/:path*",
        permanent: true,
      },
      {
        source: "/:path*",
        has: [{ type: "host", value: "www.transparenciafederal.org" }],
        destination: "https://www.transparenciafederal.com/:path*",
        permanent: true,
      },
      {
        source: "/:path*",
        has: [{ type: "host", value: "transparenciafederal.com" }],
        destination: "https://www.transparenciafederal.com/:path*",
        permanent: true,
      },
    ];
  },
};

module.exports = nextConfig;
