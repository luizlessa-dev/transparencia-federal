import { NextResponse } from "next/server";

/**
 * GET /api/metodologia — Texto/estrutura da metodologia do ranking.
 * Sem tabela no schema; retorno estático até existir conteúdo editável.
 */
export async function GET() {
  const body = {
    titulo: "Metodologia do ranking",
    texto:
      "O ranking de parlamentares é calculado a partir dos dados de execução de emendas ao orçamento, " +
      "agregados por parlamentar e ano. A ordenação considera o valor total executado (empenhado/liquidado/pago). " +
      "A metodologia detalhada será publicada aqui em breve.",
    secoes: [
      {
        titulo: "Fontes",
        corpo:
          "Dados provenientes do Portal da Transparência (emendas) e da camada publicada após ingestão e enriquecimento.",
      },
      {
        titulo: "Publicação",
        corpo:
          "O ranking é publicado pela tabela ranking_parlamentar, atualizada exclusivamente pelo job de publicação após validação.",
      },
    ],
  };
  return NextResponse.json(body);
}
