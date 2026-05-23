/**
 * Tipos compartilhados do pacote ingestao-alesp.
 */

/**
 * Deputado ALESP — campos extraídos do XML público.
 *
 * IMPORTANTE: a chave de junção com despesas é `matricula`, NÃO `id_deputado`.
 */
export type DeputadoAlesp = {
  id_deputado: string;        // <IdDeputado> — ID interno numérico (string pra evitar overflow)
  id_spl: string | null;      // <IdSPL>
  id_ua: string | null;       // <IdUA>
  matricula: string;          // <Matricula> — chave de junção com despesas
  nome: string;               // <NomeParlamentar>
  partido: string | null;     // <Partido>
  situacao: string | null;    // <Situacao> ('EXE' = em exercício)
  email: string | null;
  telefone: string | null;
  andar: string | null;
  sala: string | null;
  placa_veiculo: string | null;
  aniversario: string | null;
  area_atuacao: string | null;
  base_eleitoral: string | null;
  biografia: string | null;
};

/**
 * Despesa de gabinete ALESP — campos extraídos do XML público.
 *
 * Granularidade: 1 despesa por linha. Sem número de documento fiscal.
 */
export type DespesaAlesp = {
  matricula: string;          // junção com deputado
  nome_deputado: string;      // denormalizado no XML
  ano: number;
  mes: number;
  valor: number;
  cnpj: string;
  tipo: string;               // ex: "A - COMBUSTÍVEIS E LUBRIFICANTES"
  fornecedor: string;
};

/**
 * Tipo derivado pra batch upsert em `gastos_parlamentares` (canônica).
 * Já carrega o parlamentar_id após resolução.
 */
export type GastoCanonico = {
  parlamentar_id: string;     // UUID
  casa_id: number;
  ano: number;
  mes: number;
  cod_categoria: string;      // letra extraída de tipo (ex: "A")
  categoria: string;          // tipo sem o prefixo de letra
  fornecedor: string | null;
  cnpj_cpf: string;
  num_documento: string;
  data_emissao: string | null;
  valor_bruto: number;
  valor_reembolso: number;
  url_origem: string;
  metadata: Record<string, unknown> | null;
};

/**
 * Resultado padrão de jobs.
 */
export type JobResult = {
  status: "ok" | "erro";
  total: number;
  processados: number;
  upsertados: number;
  ignorados: number;          // pulados por conflito ou validação
  erro?: string;
  duracao_ms?: number;
};

/**
 * Extrai a letra de categoria (ex: "A") do prefixo "A - COMBUSTÍVEIS...".
 * Retorna { cod, label } onde `label` é o tipo sem o prefixo.
 */
export function parseCategoriaAlesp(tipo: string): { cod: string; label: string } {
  const m = tipo.match(/^([A-Z])\s*-\s*(.+)$/);
  if (m) return { cod: m[1], label: m[2].trim() };
  return { cod: "", label: tipo.trim() };
}
