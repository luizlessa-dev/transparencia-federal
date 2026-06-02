/**
 * GET /api/export/emendas?nome=<autor>&ano=<ano>
 *
 * Exporta a lista completa de emendas de um parlamentar em CSV.
 * Requer plano pago (individual ou institucional).
 */
import { NextResponse } from "next/server";
import { getUser, hasPaidAccess } from "~/lib/supabase-auth";
import { getEmendasParlamentarFull } from "~/services/emendas";
import { toCsv, csvResponse, fmtBrlCsv } from "~/lib/csv-utils";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  // ── Auth ──────────────────────────────────────────────────────────────
  const user = await getUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ erro: "Autenticação necessária." }, { status: 401 });
  }
  const pago = await hasPaidAccess(user.id).catch(() => false);
  if (!pago) {
    return NextResponse.json(
      { erro: "Export de CSV disponível nos planos Individual e Institucional." },
      { status: 403 },
    );
  }

  // ── Parâmetros ────────────────────────────────────────────────────────
  const url = new URL(req.url);
  const nome = (url.searchParams.get("nome") ?? "").trim();
  if (!nome) {
    return NextResponse.json({ erro: "Parâmetro 'nome' obrigatório." }, { status: 400 });
  }
  const anoFiltro = url.searchParams.get("ano") ? Number(url.searchParams.get("ano")) : null;

  // ── Dados ─────────────────────────────────────────────────────────────
  let emendas = await getEmendasParlamentarFull(nome, 5000).catch(() => []);
  if (anoFiltro) emendas = emendas.filter((e) => e.ano === anoFiltro);

  // ── CSV ───────────────────────────────────────────────────────────────
  const slug = nome.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "").slice(0, 40);
  const filename = anoFiltro
    ? `emendas-${slug}-${anoFiltro}.csv`
    : `emendas-${slug}.csv`;

  const csv = toCsv(emendas, [
    { key: "ano",               label: "Ano" },
    { key: "tipo_emenda",       label: "Tipo" },
    { key: "codigo_emenda",     label: "Código" },
    { key: "numero_emenda",     label: "Número" },
    { key: "eh_rp9",            label: "É RP9", format: (v) => v ? "Sim" : "Não" },
    { key: "autor_nome",        label: "Autor" },
    { key: "funcao",            label: "Função" },
    { key: "subfuncao",         label: "Subfunção" },
    { key: "uf",                label: "UF" },
    { key: "municipio",         label: "Município" },
    { key: "localidade",        label: "Localidade" },
    { key: "valor_empenhado",   label: "Empenhado (R$)",  format: fmtBrlCsv },
    { key: "valor_liquidado",   label: "Liquidado (R$)",  format: fmtBrlCsv },
    { key: "valor_pago",        label: "Pago (R$)",       format: fmtBrlCsv },
    { key: "valor_resto_pago",  label: "Restos pagos (R$)", format: fmtBrlCsv },
  ]);

  return csvResponse(csv, filename);
}
