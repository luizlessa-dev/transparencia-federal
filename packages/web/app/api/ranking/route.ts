import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase-server";
import { badRequest, internalError } from "../_lib/errors";

/** GET /api/ranking?ano=YYYY — Ranking publicado (ranking_parlamentar + parlamentares). */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const anoParam = searchParams.get("ano");
    let ano: number | undefined;
    if (anoParam != null && anoParam !== "") {
      const n = parseInt(anoParam, 10);
      if (Number.isNaN(n) || n < 2000 || n > 2100) {
        return badRequest("Parâmetro 'ano' deve ser um número entre 2000 e 2100.");
      }
      ano = n;
    }

    const supabase = getSupabase();

    let query = supabase
      .from("ranking_parlamentar")
      .select(
        "parlamentar_id, ano, posicao, valor_total, metricas, atualizado_em, parlamentares(id, nome, partido, uf, id_externo, created_at, updated_at)"
      )
      .order("ano", { ascending: false })
      .order("posicao", { ascending: true });

    if (ano != null) {
      query = query.eq("ano", ano);
    }

    const { data, error } = await query;

    if (error) {
      console.error("[API ranking]", error);
      return internalError("Falha ao consultar ranking.");
    }

    const items = (data ?? []).map((row: Record<string, unknown>) => {
      const p = row.parlamentares as Record<string, unknown> | null;
      return {
        parlamentar_id: row.parlamentar_id,
        ano: row.ano,
        posicao: row.posicao,
        valor_total: Number(row.valor_total),
        metricas: row.metricas ?? null,
        atualizado_em: row.atualizado_em ?? undefined,
        parlamentar: p
          ? {
              id: p.id,
              nome: p.nome,
              partido: p.partido ?? null,
              uf: p.uf ?? null,
              id_externo: p.id_externo ?? null,
              created_at: p.created_at,
              updated_at: p.updated_at,
            }
          : undefined,
      };
    });

    return NextResponse.json(items);
  } catch (e) {
    if (e instanceof Error && e.message.includes("SUPABASE")) {
      return internalError("Configuração do banco indisponível.");
    }
    console.error("[API ranking]", e);
    return internalError();
  }
}
