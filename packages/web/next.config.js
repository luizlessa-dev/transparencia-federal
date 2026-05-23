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
  // Radar FAB: beforeFiles garante que o rewrite dispara antes do sistema de páginas.
  // Sem isso, "/" e "/:path*" já existem como páginas do TF e o rewrite (afterFiles)
  // nunca é alcançado.
  async rewrites() {
    return {
      beforeFiles: [
        {
          source: "/",
          has: [{ type: "host", value: "radar.transparenciafederal.com" }],
          destination: "/radar",
        },
        {
          source: "/:path*",
          has: [{ type: "host", value: "radar.transparenciafederal.com" }],
          destination: "/radar/:path*",
        },
      ],
      afterFiles: [],
      fallback: [],
    };
  },

  // Canonical: www.transparenciafederal.com
  // .org e apex .com → 301 pra www.com
  // radar.transparenciafederal.org → 301 pra radar.transparenciafederal.com
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
      // radar.org → radar.com (canônico)
      {
        source: "/:path*",
        has: [{ type: "host", value: "radar.transparenciafederal.org" }],
        destination: "https://radar.transparenciafederal.com/:path*",
        permanent: true,
      },
      // /radar/* no domínio principal → subdomínio canônico
      {
        source: "/radar",
        missing: [{ type: "host", value: "radar.transparenciafederal.com" }],
        destination: "https://radar.transparenciafederal.com/",
        permanent: false,
      },
      {
        source: "/radar/:path*",
        missing: [{ type: "host", value: "radar.transparenciafederal.com" }],
        destination: "https://radar.transparenciafederal.com/:path*",
        permanent: false,
      },
    ];
  },
};

module.exports = nextConfig;
