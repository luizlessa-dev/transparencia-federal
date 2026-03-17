import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase-server";
import { badRequest, notFound, internalError } from "../../_lib/errors";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** GET /api/parlamentar/:id — Detalhe do parlamentar (dados publicados). */
export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    if (!id) {
      return badRequest("Identificador do parlamentar é obrigatório.");
    }
    if (!UUID_REGEX.test(id)) {
      return badRequest("Identificador do parlamentar deve ser um UUID válido.");
    }

    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("parlamentares")
      .select("id, nome, partido, uf, id_externo, created_at, updated_at")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      console.error("[API parlamentar]", error);
      return internalError("Falha ao consultar parlamentar.");
    }

    if (data == null) {
      return notFound("Parlamentar não encontrado.");
    }

    return NextResponse.json({
      id: data.id,
      nome: data.nome,
      partido: data.partido ?? null,
      uf: data.uf ?? null,
      id_externo: data.id_externo ?? null,
      created_at: data.created_at,
      updated_at: data.updated_at,
    });
  } catch (e) {
    if (e instanceof Error && e.message.includes("SUPABASE")) {
      return internalError("Configuração do banco indisponível.");
    }
    console.error("[API parlamentar]", e);
    return internalError();
  }
}
