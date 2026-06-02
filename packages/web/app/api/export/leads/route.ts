/**
 * GET /api/export/leads?id_camara=<id>
 *
 * Exporta os leads de investigação do gabinete de um deputado:
 *   - Funcionários que doaram à campanha do próprio chefe
 *   - Sinais de nepotismo cruzado (sobrenome compartilhado)
 *
 * ATENÇÃO LGPD: dados de pessoas físicas (servidores públicos).
 * O download registra user_id no servidor para auditoria.
 * Requer plano pago.
 */
import { NextResponse } from "next/server";
import { getUser, hasPaidAccess } from "~/lib/supabase-auth";
import { getFolhaLeads } from "~/services/folha";
import { toCsv, csvResponse, fmtBrlCsv } from "~/lib/csv-utils";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const user = await getUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ erro: "Autenticação necessária." }, { status: 401 });
  }
  const pago = await hasPaidAccess(user.id).catch(() => false);
  if (!pago) {
    return NextResponse.json(
      { erro: "Export de leads disponível nos planos Individual e Institucional." },
      { status: 403 },
    );
  }

  const url = new URL(req.url);
  const idCamaraStr = url.searchParams.get("id_camara");
  const idCamara = idCamaraStr ? Number(idCamaraStr) : null;
  if (!idCamara || !isFinite(idCamara)) {
    return NextResponse.json({ erro: "Parâmetro 'id_camara' obrigatório." }, { status: 400 });
  }

  const leads = await getFolhaLeads(idCamara).catch(() => null);
  if (!leads) {
    return NextResponse.json({ erro: "Deputado não encontrado ou sem dados." }, { status: 404 });
  }

  // ── CSV 1: funcionários-doadores ─────────────────────────────────────
  const csvDoadores = toCsv(leads.doadores, [
    { key: "secretario_nome", label: "Funcionário" },
    { key: "doador_nome",     label: "Nome como doador (TSE)" },
    { key: "valor_doado",     label: "Valor doado (R$)", format: fmtBrlCsv },
    { key: "ano_eleicao",     label: "Ano eleição" },
  ]);

  // ── CSV 2: sinais de nepotismo ────────────────────────────────────────
  const csvNepotismo = toCsv(leads.nepotismo, [
    { key: "secretario_nome",            label: "Funcionário" },
    { key: "sobrenome",                  label: "Sobrenome compartilhado" },
    { key: "parlamentar_homonimo_nome",  label: "Parlamentar com mesmo sobrenome" },
  ]);

  // Devolve ambos concatenados com separador claro
  const combined =
    `# LEADS DE INVESTIGAÇÃO — ID CAMARA ${idCamara}\n` +
    `# Fonte: The BR Insider (thebrinsider.com) — dados públicos Câmara × TSE\n` +
    `# LGPD: servidores são agentes públicos; finalidade jornalística/fiscalização\n` +
    `# Match por nome = sinal a apurar, não acusação\n\n` +
    `## FUNCIONÁRIOS-DOADORES (${leads.doadores.length} registros)\n` +
    csvDoadores +
    `\n\n## SINAIS DE NEPOTISMO CRUZADO (${leads.nepotismo.length} registros)\n` +
    csvNepotismo;

  return csvResponse(combined, `leads-gabinete-${idCamara}.csv`);
}
