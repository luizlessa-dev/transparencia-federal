/**
 * Tipos da API pública (contratos docs/04-API-PUBLICA.md).
 * Alinhados ao schema: ranking_parlamentar, parlamentares, cobertura_dados.
 */

export interface Parlamentar {
  id: string;
  nome: string;
  partido: string | null;
  uf: string | null;
  id_externo: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface RankingItem {
  parlamentar_id: string;
  ano: number;
  posicao: number;
  valor_total: number;
  metricas: Record<string, unknown> | null;
  atualizado_em?: string;
  /** Preenchido quando a API retorna join com parlamentares */
  parlamentar?: Parlamentar;
}

export interface CoberturaItem {
  ano: number;
  ultima_ingestao_em: string | null;
  status: string | null;
  total_registros: number | null;
  created_at?: string;
  updated_at?: string;
}

export interface MetodologiaResponse {
  titulo?: string;
  conteudo?: string;
  secoes?: Array<{ titulo: string; corpo: string }>;
  /** Se a API retornar apenas texto */
  texto?: string;
}
