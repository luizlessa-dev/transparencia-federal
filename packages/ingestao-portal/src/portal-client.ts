/**
 * Cliente da API do Portal da Transparência — emendas parlamentares.
 * Suporta paginação; coleta por ano; não assume ausência de dados como erro.
 */

import type { EmendaPortal } from "./types.js";
import {
  normalizarParlamentar,
  normalizarPartido,
  normalizarEstado,
  normalizarValor,
} from "./normalizers/index.js";
import type { EmendaBrutaDados } from "./types.js";

const DEFAULT_BASE_URL = "https://api.portaldatransparencia.gov.br";

export interface PortalClientConfig {
  apiKey: string;
  baseUrl?: string;
}

/** Resposta típica da API (array ou objeto com lista). */
export type RespostaPortal =
  | EmendaPortal[]
  | { data?: EmendaPortal[]; dados?: EmendaPortal[]; lista?: EmendaPortal[]; items?: EmendaPortal[]; response?: { items?: EmendaPortal[] }; totalRegistros?: number };

function asArray(resposta: RespostaPortal): EmendaPortal[] {
  if (Array.isArray(resposta)) return resposta;
  const obj = resposta as Record<string, unknown>;
  const arr =
    (obj.data as EmendaPortal[]) ??
    (obj.dados as EmendaPortal[]) ??
    (obj.lista as EmendaPortal[]) ??
    (obj.items as EmendaPortal[]) ??
    (obj.response as Record<string, unknown>)?.items ??
    [];
  return Array.isArray(arr) ? arr : [];
}

/** Extrai id único da emenda para (ano, id_externo). */
function extrairIdExterno(item: EmendaPortal, ano: number): string {
  const id =
    item.id ??
    item.codigoEmenda ??
    item.numeroEmenda ??
    item.codigo;
  if (id !== undefined && id !== null && String(id).trim() !== "") {
    return String(id).trim();
  }
  const partes = [
    ano,
    normalizarParlamentar(item.autor ?? item.parlamentar),
    item.tipoEmenda ?? "",
    item.numeroEmenda ?? "",
  ].filter(Boolean);
  const candidato = partes.join("|");
  if (candidato.length > 0) return candidato;
  return `hash-${ano}-${JSON.stringify(item).length}-${Date.now()}`;
}

/** Mapeia um item da API para EmendaBrutaDados (normalizado + payload bruto). */
export function normalizarItemPortal(
  item: EmendaPortal,
  ano: number
): { id_externo: string; dados: EmendaBrutaDados } {
  const id_externo = extrairIdExterno(item, ano);
  const parlamentar = normalizarParlamentar(item.autor ?? item.parlamentar ?? item.nomeParlamentar);
  const partido = normalizarPartido(item.partido ?? item.siglaPartido);
  const estado = normalizarEstado(item.uf ?? item.estado ?? item.siglaUf);
  const tipo_emenda = item.tipoEmenda != null ? String(item.tipoEmenda).trim() : null;
  const valor =
    normalizarValor(
      item.valor ?? item.valorEmpenhado ?? item.valorLiquidado ?? item.valorPago ?? 0
    );

  const dados: EmendaBrutaDados = {
    id_emenda: id_externo,
    parlamentar,
    partido,
    estado,
    tipo_emenda,
    valor,
    payload_bruto: item,
  };

  return { id_externo, dados };
}

export class PortalClient {
  private apiKey: string;
  private baseUrl: string;

  constructor(config: PortalClientConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = (config.baseUrl ?? DEFAULT_BASE_URL).replace(/\/$/, "");
  }

  /**
   * Busca emendas para um ano.
   * Suporta paginação: múltiplas páginas até não haver mais dados.
   */
  async buscarEmendasPorAno(
    ano: number,
    opts?: { paginaInicial?: number; tamanhoPagina?: number; maxPaginas?: number }
  ): Promise<EmendaPortal[]> {
    const tamanhoPagina = opts?.tamanhoPagina ?? 100;
    const maxPaginas = opts?.maxPaginas ?? 500;
    const todos: EmendaPortal[] = [];
    let pagina = opts?.paginaInicial ?? 1;

    const url = new URL(`${this.baseUrl}/api-de-dados/emendas`);
    url.searchParams.set("ano", String(ano));
    url.searchParams.set("pagina", String(pagina));
    url.searchParams.set("tamanhoPagina", String(tamanhoPagina));

    for (let p = 0; p < maxPaginas; p++) {
      url.searchParams.set("pagina", String(pagina));
      const res = await fetch(url.toString(), {
        headers: {
          Accept: "application/json",
          "chave-api-dados": this.apiKey,
        },
      });

      if (!res.ok) {
        throw new Error(
          `Portal API erro ${res.status} para ano=${ano} pagina=${pagina}: ${res.statusText}`
        );
      }

      const body = (await res.json()) as RespostaPortal;
      const chunk = asArray(body);
      todos.push(...chunk);

      if (chunk.length === 0) break;
      pagina++;
    }

    return todos;
  }
}
