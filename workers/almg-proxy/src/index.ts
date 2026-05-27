/**
 * Cloudflare Worker — proxy reverso para APIs públicas da ALMG.
 *
 * Razão de existir: os IPs de datacenter do GitHub Actions (Azure westcentralus)
 * são bloqueados pelo portal da ALMG. O Worker roda em IP da Cloudflare
 * (não Azure), contornando o bloqueio sem nenhuma alteração na lógica do
 * ingester.
 *
 * Rotas expostas:
 *   GET  /api-deputados
 *        → https://dadosabertos.almg.gov.br/api/v2/deputados/em_exercicio
 *
 *   POST /verba-detalhe?id=<IDdeputado>
 *        → POST https://www.almg.gov.br/.../detalhe.html?id=<IDdeputado>
 *        body: application/x-www-form-urlencoded (passado integralmente)
 */

const ALMG_API   = "https://dadosabertos.almg.gov.br/api/v2/deputados/em_exercicio";
const ALMG_WEB   = "https://www.almg.gov.br/transparencia/prestacao-de-contas/deputados/verba-indenizatoria/detalhe.html";
const UA_PROXY   = "TransparenciaFederal/almg-proxy (luiz@gastronomizae.com)";

export default {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    // ── GET /api-deputados ─────────────────────────────────────────────────
    if (request.method === "GET" && url.pathname === "/api-deputados") {
      const res = await fetch(ALMG_API, {
        headers: { accept: "application/xml", "user-agent": UA_PROXY },
      });
      const body = await res.arrayBuffer();
      return new Response(body, {
        status: res.status,
        headers: { "content-type": res.headers.get("content-type") ?? "application/xml" },
      });
    }

    // ── POST /verba-detalhe?id=<ID> ────────────────────────────────────────
    if (request.method === "POST" && url.pathname === "/verba-detalhe") {
      const id = url.searchParams.get("id");
      if (!id) return new Response("?id= obrigatório", { status: 400 });

      const target = `${ALMG_WEB}?id=${id}`;
      const bodyText = await request.text();

      const res = await fetch(target, {
        method: "POST",
        headers: {
          "content-type": "application/x-www-form-urlencoded",
          "user-agent": UA_PROXY,
        },
        body: bodyText,
      });
      const body = await res.arrayBuffer();
      return new Response(body, {
        status: res.status,
        headers: { "content-type": res.headers.get("content-type") ?? "text/html; charset=utf-8" },
      });
    }

    return new Response("Not found", { status: 404 });
  },
} satisfies ExportedHandler;
