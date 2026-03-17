/**
 * Tipos da camada de ingestão.
 * Ref: docs/02-MODELO-DADOS.md
 */

/** Registro bruto retornado pela API do Portal (forma genérica para acomodar variações). */
export type EmendaPortal = Record<string, unknown> & {
  id?: string | number;
  codigoEmenda?: string;
  numeroEmenda?: string;
  ano?: number;
  autor?: string;
  partido?: string;
  uf?: string;
  estado?: string;
  tipoEmenda?: string;
  valorEmpenhado?: number | string;
  valorLiquidado?: number | string;
  valorPago?: number | string;
  valor?: number | string;
  [key: string]: unknown;
};

/** Linha a ser persistida em emendas_brutas. */
export interface EmendaBrutaInsert {
  ano: number;
  id_externo: string;
  dados: EmendaBrutaDados;
}

/** Campos normalizados + payload bruto dentro de emendas_brutas.dados. */
export interface EmendaBrutaDados {
  id_emenda: string;
  parlamentar: string;
  partido: string | null;
  estado: string | null;
  tipo_emenda: string | null;
  valor: number;
  payload_bruto: EmendaPortal;
}

/** Status de cobertura por ano (cobertura_dados.status). */
export type StatusCobertura =
  | "dados_encontrados"
  | "vazio_na_fonte"
  | "erro_coleta";

/** Status de execução (execucoes_pipeline / execucoes_pipeline_etapas). */
export type StatusExecucao = "em_andamento" | "sucesso" | "erro";

/** Detalhes opcionais em execucoes_pipeline.detalhes. */
export interface DetalhesExecucao {
  correlation_id?: string;
  anos?: number[];
  totais_por_ano?: Record<number, number>;
  erro?: string;
  [key: string]: unknown;
}
