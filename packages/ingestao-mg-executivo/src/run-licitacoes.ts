/**
 * CLI: sobrepreço em licitações (fora COVID) — Executivo de MG. Modo ENXUTO:
 * grava só itens cujo valor unitário HOMOLOGADO superou o de REFERÊNCIA.
 * Órgão/objeto/fornecedor vêm do arquivo de Licitações (join por nº processo);
 * fornecedor só é nomeado quando o processo tem um único fornecedor.
 *   npm run ingestao-mg:licitacoes              # anos MG_ANO_INI..FIM (def 2022-2026)
 */
import dotenv from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, "../../../.env") });

import { packageShow, fetchResourceText, type CkanResource } from "./ckan-client.js";
import { parseLinha, mapColunas, parseValorBR, normCNPJ, stripBOM } from "./csv.js";
import { flushUpsert } from "./ingest-util.js";

const DS_LIC = "ce9dbef9-085c-4450-994f-08ba72e2316e";
const ANO_INI = Number(process.env.MG_ANO_INI ?? 2022);
const ANO_FIM = Number(process.env.MG_ANO_FIM ?? 2026);

const url = process.env.SUPABASE_URL ?? "";
const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
if (!url || !key) { console.error("SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY obrigatórios."); process.exit(1); }
const client = createClient(url, key, { auth: { persistSession: false } });

const at = (l: string[], i: number) => (i >= 0 ? (l[i] ?? "").trim() : "");
const v = (s: string) => parseValorBR(s);

/** Itera linhas do CSV sem materializar todo o array. */
function eachRow(texto: string, onHeader: (h: string[]) => void, onRow: (cols: string[]) => void): number {
  const clean = stripBOM(texto).replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  let start = 0, first = true, n = 0;
  for (let i = 0; i <= clean.length; i++) {
    if (i === clean.length || clean[i] === "\n") {
      const line = clean.slice(start, i); start = i + 1;
      if (line.trim().length === 0) continue;
      const cols = parseLinha(line, ";");
      if (first) { onHeader(cols); first = false; } else { onRow(cols); n++; }
    }
  }
  return n;
}

const urlAno = (res: CkanResource[], re: RegExp) => res.find((r) => re.test(r.url ?? ""))?.url ?? null;

const pkg = await packageShow(DS_LIC);
let totalGravados = 0;
const erros: string[] = [];

for (let ano = ANO_INI; ano <= ANO_FIM; ano++) {
  const urlLic = urlAno(pkg.resources, new RegExp(`licitacoes${ano}\\.csv`, "i"));
  const urlItem = urlAno(pkg.resources, new RegExp(`item${ano}\\.csv`, "i"));
  if (!urlItem) { console.log(`  ${ano}: itens ausente`); continue; }

  // 1. mapa processo → { orgao, objeto, fornecedores }
  type Proc = { orgao: string; objeto: string; forns: Map<string, string> };
  const mapa = new Map<string, Proc>();
  if (urlLic) {
    let iProc = -1, iOrg = -1, iObj = -1, iForn = -1, iCnpj = -1;
    eachRow(await fetchResourceText(urlLic, "utf-8"),
      (h) => { const idx = mapColunas(h); iProc = idx("numero_processo_formatado"); iOrg = idx("nome_orgao_entidade_compra"); iObj = idx("objeto_processo"); iForn = idx("nome_empresarial_nome_fornecedor"); iCnpj = idx("cnpj_cpf_fornecedor_formatado"); },
      (l) => {
        const proc = at(l, iProc); if (!proc) return;
        let p = mapa.get(proc);
        if (!p) { p = { orgao: at(l, iOrg), objeto: at(l, iObj), forns: new Map() }; mapa.set(proc, p); }
        const fn = at(l, iForn);
        if (fn && !/^INEXISTENTE$/i.test(fn)) p.forns.set(normCNPJ(at(l, iCnpj)) || fn, fn);
      });
  } else {
    console.log(`  ${ano}: licitações ausente (itens sem órgão/fornecedor)`);
  }

  // 2. stream itens, guardando só sobrepreço (homologado > referência)
  let iAno = -1, iProc = -1, iItem = -1, iSit = -1, iElem = -1, iDesc = -1, iQtd = -1, iUR = -1, iUH = -1, iTR = -1, iTH = -1;
  let sobre = 0;
  let buffer: Record<string, unknown>[] = [];
  const total = eachRow(await fetchResourceText(urlItem, "utf-8"),
    (h) => {
      const idx = mapColunas(h);
      iAno = idx("ano_criacao_processo"); iProc = idx("numero_processo_formatado"); iItem = idx("numero_item_processo");
      iSit = idx("situacao_compra_item_processo"); iElem = idx("nome_elemento_item_despesa"); iDesc = idx("item_material_servico");
      iQtd = idx("quantidade_item_pedido");
      iUR = idx("valor_unitario_referencia_item_processo"); iUH = idx("valor_unitario_homologado_item_processo");
      iTR = idx("valor_total_referencia_item_processo"); iTH = idx("valor_total_homologado");
    },
    (l) => {
      const ur = v(at(l, iUR)) ?? 0, uh = v(at(l, iUH)) ?? 0;
      if (!(ur > 0 && uh > ur)) return; // só sobrepreço
      sobre++;
      const proc = at(l, iProc);
      const p = mapa.get(proc);
      let forn: string | null = null, cnpj: string | null = null;
      if (p && p.forns.size === 1) { const [k, nm] = [...p.forns.entries()][0]; forn = nm; cnpj = /^\d{11,14}$/.test(k) ? k : null; }
      buffer.push({
        ano: Number(at(l, iAno)) || ano,
        numero_processo: proc || null,
        numero_item: at(l, iItem) || null,
        orgao: p?.orgao || null,
        objeto: p?.objeto || null,
        fornecedor: forn,
        cnpj_norm: cnpj,
        item_descricao: at(l, iDesc) || null,
        elemento: at(l, iElem) || null,
        situacao: at(l, iSit) || null,
        quantidade: v(at(l, iQtd)),
        vr_unit_referencia: ur,
        vr_unit_homologado: uh,
        vr_total_referencia: v(at(l, iTR)),
        vr_total_homologado: v(at(l, iTH)),
      });
    });
  // flush em lotes
  let gravados = 0;
  for (let i = 0; i < buffer.length; i += 500) gravados += await flushUpsert(client, "mg_licitacao_sobrepreco", "ano,numero_processo,numero_item", buffer.slice(i, i + 500), erros);
  totalGravados += gravados;
  console.log(`  ${ano}: ${total} itens | sobrepreço ${sobre} | gravados ${gravados}`);
  buffer = [];
}

console.log(`✓ Licitações sobrepreço concluído | total gravados ${totalGravados}`);
for (const e of erros.slice(0, 5)) console.log(`  erro: ${e}`);
if (erros.length && totalGravados === 0) process.exit(1);
