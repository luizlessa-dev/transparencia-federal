/**
 * Camada de acesso à API de transparência da ALEPE.
 *
 * Base: https://www.alepe.pe.gov.br/servicos/transparencia/
 *
 * Todos os endpoints retornam JSON. Sem autenticação.
 * Throttle recomendado: 300 ms entre chamadas (implementado nos jobs).
 */
import type { DeputadoAlepe, VerbaHeader, VerbaNota } from "./types.js";
import { parseValorAlepe, parseMesPtBR, parseDataBR } from "./types.js";

const BASE = "https://www.alepe.pe.gov.br/servicos/transparencia";
const UA   = "ThebrInsider/alepe-ingest (contato@thebrinsider.com)";

// ── Helpers ──────────────────────────────────────────────────────────────────

async function getJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(url, {
    headers: { "user-agent": UA, accept: "application/json" },
    signal,
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} em ${url}`);
  return res.json() as Promise<T>;
}

// ── Deputados ────────────────────────────────────────────────────────────────

type DeputadoRaw = {
  id: string;
  nome: string;
  partido?: string;
  email?: string;
  foto?: string;
  to_ascii?: string;
  vinculoinicial?: string;
  vinculoatual?: string;
};

/**
 * Lista deputados ALEPE por legislatura.
 *
 * @param leg  17 = atual (2023–2026); -16 = todos históricos (163 entradas).
 */
export async function fetchDeputadosAlepe(leg: number = 17): Promise<DeputadoAlepe[]> {
  const url = `${BASE}/dep/deputados.php?leg=${leg}`;
  const raw = await getJson<DeputadoRaw[]>(url);
  if (!Array.isArray(raw)) return [];

  return raw
    .filter((d) => d.id && d.nome)
    .map((d) => ({
      id: String(d.id).trim(),
      nome: (d.nome || "").trim(),
      partido: (d.partido || "").trim() || null,
      email: (d.email || "").trim() || null,
      foto: (d.foto || "").trim() || null,
    }));
}

// ── Meses disponíveis ────────────────────────────────────────────────────────

type MesRaw = { mes: string };

/**
 * Retorna lista de meses com verba registrada para um deputado/ano.
 * Ex: [1, 3, 5, 12] (meses em que há docid)
 */
export async function fetchMesesDisponiveis(
  depId: string,
  ano: number,
  signal?: AbortSignal,
): Promise<number[]> {
  const url = `${BASE}/adm/verbaindenizatoria-dep-meses.php?dep=${depId}&ano=${ano}`;
  try {
    const raw = await getJson<MesRaw[]>(url, signal);
    if (!Array.isArray(raw)) return [];
    return raw
      .map((m) => Number(m.mes))
      .filter((n) => n >= 1 && n <= 12);
  } catch {
    return [];
  }
}

// ── Header do documento ──────────────────────────────────────────────────────

type VerbaHeaderRaw = {
  docid: string;
  numero: string;
  tipo: string;
  ano: string;
  deputado: string;
  mes: string;    // nome pt-BR: "Janeiro", "Fevereiro", ...
  total: string;  // "59880" ou "6303,84"
};

/**
 * Retorna os cabeçalhos de verba de um deputado em um mês/ano.
 * Pode retornar mais de um (tipo "P" + tipo "C" para complementações).
 */
export async function fetchVerbaHeaders(
  depId: string,
  ano: number,
  mes: number,
  signal?: AbortSignal,
): Promise<VerbaHeader[]> {
  const url = `${BASE}/adm/verbaindenizatoria.php?dep=${depId}&ano=${ano}&mes=${mes}`;
  try {
    const raw = await getJson<VerbaHeaderRaw[]>(url, signal);
    if (!Array.isArray(raw)) return [];

    return raw
      .filter((h) => h.docid)
      .map((h) => ({
        docid: h.docid.trim(),
        numero: (h.numero || "").trim(),
        tipo: (h.tipo || "P").trim(),
        ano: Number(h.ano) || ano,
        mes: parseMesPtBR(h.mes) || mes,
        deputadoNome: (h.deputado || "").trim(),
        total: parseValorAlepe(h.total),
      }));
  } catch {
    return [];
  }
}

// ── Notas de um documento ────────────────────────────────────────────────────

type VerbaNotaRaw = {
  rubrica: string;
  sequencial: string;
  data: string;
  cnpj: string;
  empresa: string;
  valor: string;  // "21880" ou "3447,5"
};

/**
 * Retorna as notas (line items) de um documento de verba pelo docid.
 */
export async function fetchVerbaNotas(
  docid: string,
  signal?: AbortSignal,
): Promise<VerbaNota[]> {
  const url = `${BASE}/adm/verbaindenizatorianotas.php?docid=${encodeURIComponent(docid)}`;
  try {
    const raw = await getJson<VerbaNotaRaw[]>(url, signal);
    if (!Array.isArray(raw)) return [];

    return raw
      .filter((n) => n.rubrica && n.cnpj)
      .map((n) => ({
        docid,
        rubrica: n.rubrica.trim(),
        sequencial: n.sequencial.trim(),
        data: parseDataBR(n.data),
        cnpj: n.cnpj.trim().replace(/\D/g, ""), // só dígitos
        empresa: (n.empresa || "").trim(),
        valor: parseValorAlepe(n.valor),
      }))
      .filter((n) => Number.isFinite(n.valor));
  } catch {
    return [];
  }
}
