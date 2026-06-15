/**
 * Extração de entidades do texto das publicações do DOU.
 * CPF, CNPJ e nome do signatário via regex — sem dependência de NER externo.
 */

import type { PublicacaoDOU } from "./dou-client.js";

const RE_CPF = /\d{3}\.\d{3}\.\d{3}-\d{2}/g;
const RE_CNPJ = /\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}/g;

export interface EntidadesExtraidas {
  cpfs: string[];
  cnpjs: string[];
}

export function extrairEntidades(texto: string): EntidadesExtraidas {
  return {
    cpfs: [...new Set(texto.match(RE_CPF) ?? [])],
    cnpjs: [...new Set(texto.match(RE_CNPJ) ?? [])],
  };
}

/** Normaliza data "DD/MM/YYYY" → "YYYY-MM-DD" para o Postgres. */
export function normalizarData(data: string): string {
  const [dd, mm, yyyy] = data.split("/");
  if (!dd || !mm || !yyyy) return data;
  return `${yyyy}-${mm}-${dd}`;
}

export interface PublicacaoNormalizada {
  id_externo: string;
  secao: string;
  data_publicacao: string;
  tipo_ato: string;
  titulo: string;
  orgao: string;
  conteudo_html: string;
  cpfs_extraidos: string[];
  cnpjs_extraidos: string[];
  url_titulo: string;
  assinante?: string;
}

export function normalizarPublicacao(p: PublicacaoDOU): PublicacaoNormalizada {
  const { cpfs, cnpjs } = extrairEntidades(p.content ?? "");

  // Extrai nome do assinante do conteúdo HTML (padrão: último parágrafo em maiúsculas antes de cargo)
  const assinanteMatch = (p.content ?? "").match(/\b([A-ZÁÉÍÓÚÂÊÔÃÕÇ][A-ZÁÉÍÓÚÂÊÔÃÕÇ ]{5,})\s*(?:\n|<)/);
  const assinante = assinanteMatch ? assinanteMatch[1].trim() : undefined;

  return {
    id_externo: p.classPK,
    secao: p.pubName?.toLowerCase() ?? "",
    data_publicacao: normalizarData(p.pubDate),
    tipo_ato: p.artType ?? "",
    titulo: p.title ?? "",
    orgao: p.hierarchyStr ?? "",
    conteudo_html: p.content ?? "",
    cpfs_extraidos: cpfs,
    cnpjs_extraidos: cnpjs,
    url_titulo: p.urlTitle ?? "",
    assinante,
  };
}
