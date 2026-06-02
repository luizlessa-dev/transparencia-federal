/**
 * GET /api/export/mg-contratos
 *
 * Exporta contratos × empresas sancionadas do Executivo de MG em CSV.
 * Inclui todos os registros (condenadas e arquivadas), com campo "condenada".
 * Requer plano pago.
 */
import { NextResponse } from "next/server";
import { getUser, hasPaidAccess } from "~/lib/supabase-auth";
import { getMgContratosSancionados } from "~/services/mg";
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

  const { data, error } = await getMgContratosSancionados();
  if (error || !data) {
    return NextResponse.json({ erro: "Erro ao buscar dados." }, { status: 500 });
  }

  type Row = { fornecedor: string | null; cnpj_fmt: string | null; cnpj_norm: string | null; orgao: string | null; objeto: string | null; valor_total: number | null; situacao: string | null; conduta: string | null; decisao: string | null; fase: string | null; condenada: boolean | null };
  const rows = data as Row[];

  const csv = toCsv(rows, [
    { key: "fornecedor",  label: "Fornecedor" },
    { key: "cnpj_fmt",   label: "CNPJ" },
    { key: "orgao",      label: "Órgão contratante" },
    { key: "objeto",     label: "Objeto" },
    { key: "valor_total",label: "Valor total (R$)", format: fmtBrlCsv },
    { key: "situacao",   label: "Situação contrato" },
    { key: "condenada",  label: "Condenada",  format: (v) => v ? "Sim" : "Não" },
    { key: "conduta",    label: "Conduta apurada" },
    { key: "decisao",    label: "Decisão" },
    { key: "fase",       label: "Fase processual" },
    { key: "cnpj_norm",  label: "CNPJ (só dígitos)" },
  ]);

  return csvResponse(csv, "mg-contratos-sancionados.csv");
}
