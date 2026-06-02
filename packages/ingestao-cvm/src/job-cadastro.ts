/**
 * Ingestão do cadastro de fundos (fi-cad → cad_fi.csv) → cvm_fundo (nós).
 *
 * Fonte: dados.cvm.gov.br/dados/FI/CAD/DADOS/cad_fi.csv (latin-1, `;`).
 * Header real (recon 01/jun/2026):
 *   TP_FUNDO;CNPJ_FUNDO;DENOM_SOCIAL;DT_REG;DT_CONST;CD_CVM;DT_CANCEL;SIT;...;
 *   CLASSE;...;FUNDO_COTAS;...;VL_PATRIM_LIQ;DT_PATRIM_LIQ;DIRETOR;CNPJ_ADMIN;
 *   ADMIN;PF_PJ_GESTOR;CPF_CNPJ_GESTOR;GESTOR;...;CNPJ_CONTROLADOR;CONTROLADOR;
 *   INVEST_CEMPR_EXTER;CLASSE_ANBIMA
 *
 * Um registro por CNPJ de fundo (onConflict cnpj_norm). ~46k fundos no cad_fi
 * (universo 555 não-RCVM175). FIPs (ex. Galo Forte) NÃO estão aqui — entram
 * pelo job de informe FIP.
 */
import { carregarCSV, colFinder, flushUpsert, finalizar, sb, parseSN, type IngestResult } from "./ingest-util.js";
import { parseDataBR, parseValorBR, normCNPJ } from "./csv.js";

const URL_CAD_FI = "https://dados.cvm.gov.br/dados/FI/CAD/DADOS/cad_fi.csv";

export async function ingestCadastro(resourceUrl = URL_CAD_FI): Promise<IngestResult> {
  const erros: string[] = [];
  let header: string[] = [];
  let linhas: string[][] = [];
  try {
    ({ header, linhas } = await carregarCSV(resourceUrl, "latin1"));
  } catch (e) {
    return { status: "erro", total: 0, inseridos: 0, header, erros: [`carga: ${e instanceof Error ? e.message : e}`] };
  }
  const c = colFinder(header);
  const C = {
    tipo: c("tp_fundo"),
    cnpj: c("cnpj_fundo"),
    denom: c("denom_social"),
    dtReg: c("dt_reg"),
    dtCancel: c("dt_cancel"),
    sit: c("sit"),
    classe: c("classe"),
    classeAnbima: c("classe_anbima"),
    fundoCotas: c("fundo_cotas"),
    vlPl: c("vl_patrim_liq"),
    dtPl: c("dt_patrim_liq"),
    cnpjAdmin: c("cnpj_admin"),
    admin: c("admin"),
    cpfCnpjGestor: c("cpf_cnpj_gestor"),
    gestor: c("gestor"),
    cnpjControlador: c("cnpj_controlador"),
    controlador: c("controlador"),
  };
  const at = (l: string[], i: number) => (i >= 0 ? (l[i] ?? "").trim() : "");
  const client = sb();
  let inseridos = 0;
  let buffer: Record<string, unknown>[] = [];
  for (const l of linhas) {
    const cnpj = normCNPJ(at(l, C.cnpj));
    if (!cnpj) continue;
    buffer.push({
      cnpj_norm: cnpj,
      denom: at(l, C.denom) || null,
      tipo: at(l, C.tipo) || null,
      situacao: at(l, C.sit) || null,
      classe: at(l, C.classe) || null,
      classe_anbima: at(l, C.classeAnbima) || null,
      fundo_cotas: parseSN(at(l, C.fundoCotas)),
      data_registro: parseDataBR(at(l, C.dtReg)),
      data_cancel: parseDataBR(at(l, C.dtCancel)),
      vl_patrim_liq: parseValorBR(at(l, C.vlPl)),
      dt_patrim_liq: parseDataBR(at(l, C.dtPl)),
      cnpj_admin: normCNPJ(at(l, C.cnpjAdmin)) || null,
      admin: at(l, C.admin) || null,
      cnpj_gestor: normCNPJ(at(l, C.cpfCnpjGestor)) || null,
      gestor: at(l, C.gestor) || null,
      cnpj_controlador: normCNPJ(at(l, C.cnpjControlador)) || null,
      controlador: at(l, C.controlador) || null,
      fonte: "cad_fi",
    });
    if (buffer.length >= 500) { inseridos += await flushUpsert(client, "cvm_fundo", "cnpj_norm", buffer, erros); buffer = []; }
  }
  inseridos += await flushUpsert(client, "cvm_fundo", "cnpj_norm", buffer, erros);
  return finalizar(linhas.length, inseridos, erros, header);
}
