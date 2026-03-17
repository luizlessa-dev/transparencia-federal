import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase-server";
import { internalError } from "../_lib/errors";

/** GET /api/cobertura — Cobertura por ano (cobertura_dados). */
export async function GET() {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("cobertura_dados")
      .select("ano, ultima_ingestao_em, status, total_registros, created_at, updated_at")
      .order("ano", { ascending: false });

    if (error) {
      console.error("[API cobertura]", error);
      return internalError("Falha ao consultar cobertura.");
    }

    const items = (data ?? []).map((row: Record<string, unknown>) => ({
      ano: row.ano,
      ultima_ingestao_em: row.ultima_ingestao_em ?? null,
      status: row.status ?? null,
      total_registros: row.total_registros ?? null,
      created_at: row.created_at,
      updated_at: row.updated_at,
    }));

    return NextResponse.json(items);
  } catch (e) {
    if (e instanceof Error && e.message.includes("SUPABASE")) {
      return internalError("Configuração do banco indisponível.");
    }
    console.error("[API cobertura]", e);
    return internalError();
  }
}
