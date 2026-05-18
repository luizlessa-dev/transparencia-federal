export interface AgregadoParlamentar {
  parlamentar_id: string;
  ano: number;
  total_emendas: number;
  valor_empenhado: number;
  valor_liquidado: number;
  valor_pago: number;
}

export interface RankingBuildRow {
  build_id: string;
  parlamentar_id: string;
  ano: number;
  posicao: number;
  valor_total: number;
  metricas: {
    total_emendas: number;
    valor_empenhado: number;
    valor_liquidado: number;
    valor_pago: number;
    taxa_execucao: number;
  };
}

export interface ResultadoBuild {
  build_id: string;
  anos: number[];
  total_parlamentares: number;
  duracao_ms: number;
}
