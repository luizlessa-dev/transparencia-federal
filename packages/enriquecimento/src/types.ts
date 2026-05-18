export interface EmendaBruta {
  id: string;
  ano: number;
  id_externo: string;
  dados: {
    id_emenda: string;
    parlamentar: string | null;
    partido: string | null;
    estado: string | null;
    tipo_emenda: string | null;
    valor: number;
    payload_bruto: Record<string, unknown>;
  };
}

export interface ParlamentarLookup {
  id: string;
  nome_normalizado: string;
}

export interface EmendaFinanceiroInsert {
  ano: number;
  id_externo: string;
  parlamentar_id: string | null;
  valor_empenhado: number;
  valor_liquidado: number;
  valor_pago: number;
}

export interface ResultadoEnriquecimento {
  total: number;
  inseridos: number;
  sem_parlamentar: number;
  erros: number;
}
