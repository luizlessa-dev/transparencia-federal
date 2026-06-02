/**
 * GET /api/export/mg-supersalarios
 *
 * Exporta a lista completa de supersalários do Executivo de MG em CSV.
 * Requer plano pago.
 */
import { NextResponse } from "next/server";
import { getUser, hasPaidAccess } from "~/lib/supabase-auth";
import { getMgSupersalarios } from "~/services/mg";
import { toCsv, csvResponse, fmtBrlCsv } from "~/lib/csv-utils";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ erro: "Autenticação necessária." }, { status: 401 });
  }
  const pago = await hasPaidAccess(user.id).catch(() => false);
  if (!pago) {
    return NextResponse.json(
      { erro: "Export disponível nos planos Individual e Institucional." },
      { status: 403 },
    );
  }

  const { data, error } = await getMgSupersalarios();
  if (error || !data) {
    return NextResponse.json({ erro: "Erro ao buscar dados." }, { status: 500 });
  }

  type Row = { servidor_nome: string | null; orgao: string | null; cargo: string | null; situacao: string | null; remuneracao_bruta: number | null; remuneracao_liquida: number | null; abate_teto: number | null; servidor_id_externo: string | null; ano: number | null; mes: number | null };
  const rows = data as Row[];

  const csv = toCsv(rows, [
    { key: "servidor_nome",      label: "Servidor" },
    { key: "orgao",              label: "Órgão" },
    { key: "cargo",              label: "Cargo" },
    { key: "situacao",           label: "Situação" },
    { key: "remuneracao_bruta",  label: "Bruto (R$)",     format: fmtBrlCsv },
    { key: "abate_teto",         label: "Abate-teto (R$)", format: fmtBrlCsv },
    { key: "remuneracao_liquida",label: "Líquido (R$)",    format: fmtBrlCsv },
    { key: "ano",                label: "Ano competência" },
    { key: "mes",                label: "Mês competência" },
    { key: "servidor_id_externo",label: "MASP" },
  ]);

  return csvResponse(csv, "mg-supersalarios.csv");
}
