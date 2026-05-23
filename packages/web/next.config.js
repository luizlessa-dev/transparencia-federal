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
  // radar.transparenciafederal.org → /radar/* (rewrite transparente, sem redirect)
  async rewrites() {
    return [
      {
        source: "/",
        has: [{ type: "host", value: "radar.transparenciafederal.org" }],
        destination: "/radar",
      },
      {
        source: "/:path*",
        has: [{ type: "host", value: "radar.transparenciafederal.org" }],
        destination: "/radar/:path*",
      },
    ];
  },

  // Canonical: www.transparenciafederal.com
  // .org e apex .com → 301 pra www.com (consolidação de SEO entre TLDs e hosts)
  // radar.transparenciafederal.org NÃO é redirecionado (tratado acima nos rewrites)
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
