/**
 * Ingestão de despesas de gabinete da ALESC via CSV.
 * Fonte: https://transparencia.alesc.sc.gov.br/gabinetes-parlamentares/csv/{ano}
 * Formato: UTF-8 BOM, separador ";", cabeçalho: Verba;Descrição;Conta;Favorecido;Trecho;Vencimento;Valor
 */

import { createInterface } from "readline";
import { Readable } from "stream";

export interface DespesaAlesc {
  nome_deputado: string;
  ano: number;
  mes: number | null;
  verba: string | null;
  descricao: string | null;
  favorecido: string | null;
  vencimento: string | null;
  valor: number | null;
}

function parseBRL(v: string): number | null {
  const s = v.replace(/\./g, "").replace(",", ".").trim();
  const n = parseFloat(s);
  return isNaN(n) ? null : n;
}

function parseData(v: string): { data: string | null; mes: number | null } {
  const m = v.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return { data: null, mes: null };
  return { data: `${m[3]}-${m[2]}-${m[1]}`, mes: parseInt(m[2], 10) };
}

function limpar(v: string): string | null {
  const s = v.replace(/^"|"$/g, "").trim();
  return s || null;
}

function parseLinha(linha: string): string[] {
  const result: string[] = [];
  let cur = "";
  let inQ = false;
  for (const ch of linha) {
    if (ch === '"') { inQ = !inQ; }
    else if (ch === ";" && !inQ) { result.push(cur); cur = ""; }
    else cur += ch;
  }
  result.push(cur);
  return result;
}

export async function fetchDespesasAlesc(
  nomeDeputado: string,
  ano: number
): Promise<DespesaAlesc[]> {
  const url = `https://transparencia.alesc.sc.gov.br/gabinetes-parlamentares/csv/${ano}`;
  const res = await fetch(url, {
    headers: { "User-Agent": "TransparenciaFederal/alesc-ingest (luiz@gastronomizae.com)" },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} em ${url}`);

  const text = await res.text();
  // Remove BOM
  const clean = text.replace(/^﻿/, "");
  const lines = clean.split(/\r?\n/);

  // Descarta cabeçalho
  const out: DespesaAlesc[] = [];
  let isHeader = true;

  for (const rawLine of lines) {
    const linha = rawLine.trim();
    if (!linha) continue;
    if (isHeader) { isHeader = false; continue; }

    const f = parseLinha(linha);
    if (f.length < 7) continue;

    const [verba, descricao, conta, favorecido, , vencimentoRaw, valorRaw] = f;

    // A coluna "Conta" tem o nome do deputado (parlamentar)
    const dep = limpar(conta);
    if (!dep) continue;

    const { data: vencimento, mes } = parseData(limpar(vencimentoRaw) ?? "");

    out.push({
      nome_deputado: dep,
      ano,
      mes,
      verba: limpar(verba),
      descricao: limpar(descricao),
      favorecido: limpar(favorecido),
      vencimento,
      valor: parseBRL(limpar(valorRaw) ?? ""),
    });
  }

  return out;
}
