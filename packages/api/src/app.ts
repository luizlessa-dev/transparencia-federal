import { Hono } from "hono";
import { cors } from "hono/cors";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getRanking, getParlamentar, getCobertura } from "./db.js";

const METODOLOGIA = {
  versao: "3.0",
  descricao:
    "O ranking classifica parlamentares pelo valor total de emendas empenhadas no orçamento federal, " +
    "conforme dados do Portal da Transparência do Governo Federal.",
  fontes: [
    {
      nome: "Portal da Transparência — Emendas Orçamentárias",
      url: "https://portaldatransparencia.gov.br/download-de-dados/emendas",
    },
    {
      nome: "Câmara dos Deputados — Dados Abertos",
      url: "https://dadosabertos.camara.leg.br/api/v2/deputados",
    },
  ],
  metrica_principal: "valor_empenhado",
  metricas_secundarias: ["valor_liquidado", "valor_pago", "total_emendas", "taxa_execucao"],
  atualizacao: "Mensal — após publicação do Portal da Transparência",
  nota_taxa_execucao:
    "Taxa de execução = valor_pago / valor_empenhado × 100. " +
    "Valores empenhados recentes podem ainda não ter sido pagos.",
};

export function criarApp(sb: SupabaseClient) {
  const app = new Hono();

  app.use("*", cors({ origin: "*" }));

  // GET /ranking?ano=2024&page=1&per_page=50
  app.get("/ranking", async (c) => {
    const ano = Number(c.req.query("ano") ?? 2024);
    const page = Math.max(1, Number(c.req.query("page") ?? 1));
    const perPage = Math.min(200, Math.max(1, Number(c.req.query("per_page") ?? 50)));

    if (![2023, 2024].includes(ano)) {
      return c.json({ error: "Ano inválido. Use 2023 ou 2024." }, 400);
    }

    try {
      const { data, total } = await getRanking(sb, ano, page, perPage);
      return c.json({
        meta: { ano, page, per_page: perPage, total, total_pages: Math.ceil(total / perPage) },
        data,
      });
    } catch (err) {
      console.error("/ranking error:", err);
      return c.json({ error: "Erro interno." }, 500);
    }
  });

  // GET /parlamentar/:id
  app.get("/parlamentar/:id", async (c) => {
    const id = c.req.param("id");
    try {
      const result = await getParlamentar(sb, id);
      if (!result.parlamentar) return c.json({ error: "Não encontrado." }, 404);
      return c.json(result);
    } catch (err: unknown) {
      const code = (err as { code?: string }).code;
      if (code === "PGRST116") return c.json({ error: "Não encontrado." }, 404);
      console.error("/parlamentar/:id error:", err);
      return c.json({ error: "Erro interno." }, 500);
    }
  });

  // GET /metodologia
  app.get("/metodologia", (c) => c.json(METODOLOGIA));

  // GET /cobertura
  app.get("/cobertura", async (c) => {
    try {
      const stats = await getCobertura(sb);
      return c.json(stats);
    } catch (err) {
      console.error("/cobertura error:", err);
      return c.json({ error: "Erro interno." }, 500);
    }
  });

  // Health check
  app.get("/health", (c) => c.json({ status: "ok" }));

  return app;
}
