/**
 * import-contas-partidarias-tse.mjs
 * Ingere a Prestação de Contas Anual Partidária do TSE (receitas + despesas).
 *
 * Fonte: dadosabertos.tse.jus.br → `prestacao-de-contas-partidarias-{ano}`
 * CDN:   https://cdn.tse.jus.br/estatistica/sead/odsele/prestacao_contas_anual_partidaria/
 *        prestacao_contas_anual_partidaria_{ano}.zip
 *        → contém despesa_anual_{ano}_{UF}.csv e receita_anual_{ano}_{UF}.csv
 *
 * CSV: delimitador ';', sentinela '#NULO', decimal vírgula. ATENÇÃO à codificação:
 *      receita/despesa/notafiscal = UTF-8 (com BOM); extrato bancário = latin-1.
 *      (o TSE mistura codificações no mesmo dataset.)
 *
 * Ingere 4 famílias: receitas, despesas, extrato bancário, notas fiscais.
 *
 * Pré-requisito: migration 20260602200000_tse_contas_partidarias.sql já aplicada.
 * Uso: node scripts/import-contas-partidarias-tse.mjs 2022 2021 2020
 *      (sem args → últimos 2 anos disponíveis: 2023 e 2024)
 *
 * ATENÇÃO node: o node@22 do Homebrew tem libsimdutf quebrado.
 *   Usar /usr/local/bin/node (v24) ou node instalado via nvm/volta.
 */
import dotenv from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, '../.env') });

import { createClient } from '@supabase/supabase-js';
import { execSync } from 'child_process';
import { createHash } from 'crypto';
import { existsSync, readFileSync, unlinkSync } from 'fs';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const CDN = 'https://cdn.tse.jus.br/estatistica/sead/odsele/prestacao_contas_anual_partidaria';
const ANOS_PADRAO = [2023, 2024];
const BATCH_SIZE = 500;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌  SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórios.');
  process.exit(1);
}
const sb = createClient(SUPABASE_URL, SUPABASE_KEY);
const anos = process.argv.slice(2).map(Number).filter(Boolean);
const ANOS = anos.length ? anos : ANOS_PADRAO;

// ---- helpers -------------------------------------------------------------
const isNull = (v) => v == null || v === '' || v === '#NULO' || v === '#NE' || v === '-1';
const txt = (v) => (isNull(v) ? null : String(v).trim());
const int = (v) => (isNull(v) ? null : parseInt(v, 10) || null);
const brl = (v) => (isNull(v) ? null : parseFloat(String(v).replace(/\./g, '').replace(',', '.')) || 0);
const dt  = (v) => {
  if (isNull(v)) return null;
  const m = String(v).match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : null;
};
const hashOf = (parts) => createHash('sha1').update(parts.join('|')).digest('hex');

// Extrai um CSV de dentro do ZIP como NDJSON (um objeto por linha) para evitar
// ERR_STRING_TOO_LONG em CSVs grandes (SP/MG/RJ em anos eleitorais ultrapassam 512 MB de JSON).
// Usa readline para nunca materializar o arquivo inteiro em memória.
// O TSE mistura UTF-8 (2023+) e latin-1 (2017-2022) no mesmo dataset.
import { createReadStream } from 'fs';
import { createInterface } from 'readline';

async function readCsv(zip, member, _enc = 'utf-8-sig') {
  const tmp = `/tmp/tse_ndjson_${process.pid}_${Date.now()}.ndjson`;
  try {
    execSync(
      `unzip -p ${zip} ${member} | python3 -c "
import sys, csv, io, json
data = sys.stdin.buffer.read()
for enc in ['utf-8-sig', 'latin-1']:
    try:
        text = data.decode(enc)
        r = csv.reader(io.StringIO(text), delimiter=';')
        h = [c.strip() for c in next(r)]
        for row in r:
            if len(row) >= len(h):
                sys.stdout.write(json.dumps(dict(zip(h, row))) + '\\n')
        break
    except (UnicodeDecodeError, StopIteration):
        continue
" > ${tmp}`,
      { maxBuffer: 1024 * 1024 }  // stdout quase vazio — saída vai direto pro arquivo
    );
    // readline lê linha a linha — nunca cria string gigante em memória
    const rows = [];
    const rl = createInterface({ input: createReadStream(tmp, { encoding: 'utf-8' }), crlfDelay: Infinity });
    for await (const line of rl) {
      if (line.trim()) rows.push(JSON.parse(line));
    }
    return rows;
  } finally {
    try { unlinkSync(tmp); } catch {}
  }
}

function listMembers(zip, prefix) {
  return execSync(`unzip -Z1 ${zip} | grep '^${prefix}'`, { maxBuffer: 4 * 1024 * 1024 })
    .toString().trim().split('\n').filter(Boolean);
}

// Desambigua linhas de negócio idênticas (mesmo id_hash) com sufixo de
// ocorrência, garantindo idempotência sem perda.
function desambigua(rows) {
  const seen = new Map();
  for (const r of rows) {
    const n = (seen.get(r.id_hash) ?? 0) + 1;
    seen.set(r.id_hash, n);
    if (n > 1) r.id_hash = `${r.id_hash}#${n}`;
  }
  return rows;
}

const MAX_ATTEMPTS = 7;

async function upsert(table, rows) {
  let ok = 0;
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    let error, attempts = 0;
    while (attempts < MAX_ATTEMPTS) {
      attempts++;
      try {
        ({ error } = await sb.from(table).upsert(batch, { onConflict: 'id_hash', ignoreDuplicates: false }));
      } catch (e) {
        // TypeError: fetch failed — conexão recusada ou reset, trata como erro retryável
        error = { message: e.message };
      }
      if (!error) break;
      const espera = Math.min(2000 * attempts, 30000);  // 2s, 4s, 6s … até 30s
      console.warn(`  ⚠ ${table} batch ${i} tentativa ${attempts}/${MAX_ATTEMPTS} — ${error.message} — aguardando ${espera}ms`);
      await new Promise(r => setTimeout(r, espera));
    }
    if (error) console.error(`  ❌ ${table} batch ${i}: esgotadas ${MAX_ATTEMPTS} tentativas — ${error.message}`);
    else ok += batch.length;
  }
  return ok;
}

// ---- transformadores -----------------------------------------------------
function mapReceita(r, ano) {
  return {
    id_hash: hashOf([ano, r.SG_UF, r.NR_CNPJ_PRESTADOR_CONTA, r.NR_RECIBO_DOACAO,
                     r.NR_DOCUMENTO, r.NR_CPF_CNPJ_DOADOR, r.VR_RECEITA, r.DT_RECEITA, r.DS_RECEITA]),
    aa_exercicio: ano,
    sg_uf: txt(r.SG_UF), cd_municipio: int(r.CD_MUNICIPIO), nm_municipio: txt(r.NM_MUNICIPIO),
    nr_zona: int(r.NR_ZONA), sg_partido: txt(r.SG_PARTIDO), nm_partido: txt(r.NM_PARTIDO),
    ds_esfera: txt(r.DS_ESFERA_PARTIDARIA), cnpj_prestador: txt(r.NR_CNPJ_PRESTADOR_CONTA),
    ds_receita: txt(r.DS_RECEITA), ds_fonte_recurso: txt(r.DS_FONTE_RECURSO),
    ds_natureza: txt(r.DS_NATUREZA_RECURSO), ds_especie: txt(r.DS_ESPECIE_RECURSO),
    ds_origem_doacao: txt(r.DS_ORIGEM_DOACAO),
    cpf_cnpj_doador: txt(r.NR_CPF_CNPJ_DOADOR), nm_doador: txt(r.NM_DOADOR),
    uf_doador: txt(r.SG_UF_DOADOR), municipio_doador: txt(r.NM_MUNICIPIO_DOADOR),
    ds_cargo_doador: txt(r.DS_CARGO_CANDIDATO_DOADOR),
    nr_recibo: txt(r.NR_RECIBO_DOACAO), nr_documento: txt(r.NR_DOCUMENTO),
    vr_receita: brl(r.VR_RECEITA), dt_receita: dt(r.DT_RECEITA),
  };
}

function mapDespesa(r, ano) {
  return {
    id_hash: hashOf([ano, r.SG_UF, r.NR_CNPJ_PRESTADOR_CONTA, r.SQ_DESPESA,
                     r.NR_DOCUMENTO, r.NR_CPF_CNPJ_FORNECEDOR, r.VR_DESPESA]),
    aa_exercicio: ano,
    sg_uf: txt(r.SG_UF), cd_municipio: int(r.CD_MUNICIPIO), nm_municipio: txt(r.NM_MUNICIPIO),
    nr_zona: int(r.NR_ZONA), sg_partido: txt(r.SG_PARTIDO), nm_partido: txt(r.NM_PARTIDO),
    ds_esfera: txt(r.DS_ESFERA_PARTIDARIA), cnpj_prestador: txt(r.NR_CNPJ_PRESTADOR_CONTA),
    sq_despesa: int(r.SQ_DESPESA), ds_tipo_despesa: txt(r.DS_TIPO_DESPESA),
    ds_fonte_recurso: txt(r.DS_FONTE_RECURSO), vr_despesa: brl(r.VR_DESPESA),
    cpf_cnpj_fornecedor: txt(r.NR_CPF_CNPJ_FORNECEDOR), nm_fornecedor: txt(r.NM_FORNECEDOR),
    ds_tipo_fornecedor: txt(r.DS_TIPO_FORNECEDOR), ds_tipo_documento: txt(r.DS_TIPO_DOCUMENTO),
    nr_documento: txt(r.NR_DOCUMENTO), vr_documento: brl(r.VR_DOCUMENTO),
    dt_pagamento: dt(r.DT_PAGAMENTO), vr_pagamento: brl(r.VR_PAGAMENTO),
  };
}

function mapExtrato(r, ano) {
  return {
    id_hash: hashOf([ano, r.NR_CNPJ, r.NR_CONTA, r.DT_LANCAMENTO, r.NR_DOCUMENTO,
                     r.VR_LANCAMENTO, r.NR_CPF_CNPJ_CONTRAPARTE, r.DS_LANCAMENTO]),
    aa_referencia: ano,
    sg_partido: txt(r.SG_PARTIDO), nm_esfera: txt(r.NM_ESFERA), cnpj_partido: txt(r.NR_CNPJ),
    nm_banco: txt(r.NM_BANCO), nr_agencia: txt(r.NR_AGENCIA), nr_conta: txt(r.NR_CONTA),
    tp_conta: txt(r.TP_CONTA), dt_lancamento: dt(r.DT_LANCAMENTO), tp_lancamento: txt(r.TP_LANCAMENTO),
    ds_lancamento: txt(r.DS_LANCAMENTO), vr_lancamento: brl(r.VR_LANCAMENTO),
    ds_tipo_operacao: txt(r.DS_TIPO_OPERACAO), ds_fonte_recurso: txt(r.DS_FONTE_RECURSO),
    cpf_cnpj_contraparte: txt(r.NR_CPF_CNPJ_CONTRAPARTE), tp_pessoa_contraparte: txt(r.TP_PESSOA_CONTRAPARTE),
    nm_contraparte: txt(r.NM_CONTRAPARTE), nm_banco_contraparte: txt(r.NM_BANCO_CONTRAPARTE),
  };
}

function mapNota(r, ano) {
  return {
    id_hash: hashOf([ano, r.SG_UF, r.NR_CNPJ_PRESTADOR_CONTA, r.SQ_DESPESA,
                     r.NR_DOCUMENTO, r.NR_CPF_CNPJ_FORNECEDOR, r.VR_DOCUMENTO]),
    aa_exercicio: ano, sg_uf: txt(r.SG_UF), sg_partido: txt(r.SG_PARTIDO),
    cnpj_prestador: txt(r.NR_CNPJ_PRESTADOR_CONTA), sq_despesa: int(r.SQ_DESPESA),
    ds_tipo_despesa: txt(r.DS_TIPO_DESPESA), cpf_cnpj_fornecedor: txt(r.NR_CPF_CNPJ_FORNECEDOR),
    nr_documento: txt(r.NR_DOCUMENTO), vr_documento: brl(r.VR_DOCUMENTO),
    dt_pagamento: dt(r.DT_PAGAMENTO), url_documento: txt(r.NM_URL),
  };
}

// ---- main ----------------------------------------------------------------
function baixa(arquivo, destino) {
  if (existsSync(destino)) return;
  console.log(`⬇️   Baixando ${arquivo}...`);
  execSync(`curl -sL -m 900 -A "Mozilla/5.0" "${CDN}/${arquivo}" -o ${destino}`);
}

function zipValido(zip) {
  try { execSync(`unzip -t ${zip} > /dev/null 2>&1`); return true; }
  catch { return false; }
}

async function ingere(zip, prefixo, tabela, mapFn, ano, enc) {
  if (!existsSync(zip) || !zipValido(zip)) {
    console.log(`   ⚠️  ${zip} indisponível ou corrompido — pulando.`);
    return 0;
  }
  let tot = 0;
  for (const csv of listMembers(zip, prefixo)) {
    const rows = desambigua((await readCsv(zip, csv, enc)).map((r) => mapFn(r, ano)));
    tot += await upsert(tabela, rows);
    process.stdout.write(`   ${tabela.replace('tse_conta_', '').padEnd(11)} ${csv.slice(0, 40)}: +${rows.length}      \r`);
  }
  return tot;
}

async function processaAno(ano) {
  const zMain = `/tmp/pcp_${ano}.zip`;
  const zExtr = `/tmp/pcp_extrato_${ano}.zip`;
  const zNota = `/tmp/pcp_nota_${ano}.zip`;
  baixa(`prestacao_contas_anual_partidaria_${ano}.zip`, zMain);
  baixa(`extrato_bancario_partido_${ano}.zip`, zExtr);
  baixa(`prestacao_contas_anual_partidaria_notafiscal_${ano}.zip`, zNota);

  for (const z of [zMain, zExtr, zNota]) {
    if (existsSync(z) && !zipValido(z)) {
      execSync(`rm -f ${z}`);
      console.log(`   🗑️  ${z} removido (inválido).`);
    }
  }

  const r = await ingere(zMain, `receita_anual_${ano}_`,  'tse_conta_receita',    mapReceita, ano, 'utf-8-sig');
  const d = await ingere(zMain, `despesa_anual_${ano}_`,  'tse_conta_despesa',    mapDespesa, ano, 'utf-8-sig');
  const e = await ingere(zExtr, `extrato_bancario_`,       'tse_conta_extrato',    mapExtrato, ano, 'latin-1');
  const n = await ingere(zNota, `despesa_anual_partidaria_nf_${ano}_`, 'tse_conta_notafiscal', mapNota, ano, 'utf-8-sig');

  console.log(`\n✅  ${ano}: ${r.toLocaleString('pt-BR')} receitas · ${d.toLocaleString('pt-BR')} despesas · ${e.toLocaleString('pt-BR')} lançamentos · ${n.toLocaleString('pt-BR')} notas`);
}

async function main() {
  console.log(`╔═══════════════════════════════════════════════╗`);
  console.log(`║  TSE — Contas Anuais Partidárias  ${ANOS.join(', ').padEnd(13)}║`);
  console.log(`╚═══════════════════════════════════════════════╝\n`);
  for (const ano of ANOS) await processaAno(ano);
  console.log('\n🏁  Concluído.');
}

main().catch(console.error);
