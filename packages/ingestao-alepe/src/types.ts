/**
 * Tipos compartilhados do pacote ingestao-alepe.
 *
 * API base: https://www.alepe.pe.gov.br/servicos/transparencia/
 *
 * Endpoints:
 *   dep/deputados.php?leg={leg}
 *   adm/verbaindenizatoria-dep-meses.php?dep={id}&ano={ano}
 *   adm/verbaindenizatoria.php?dep={id}&ano={ano}&mes={mes}
 *   adm/verbaindenizatorianotas.php?docid={docid}
 *
 * NOTAS sobre o formato dos dados:
 *   - `docid`: hex hash de 32 chars (2015–2018) ou inteiro sequencial (2019+)
 *   - `valor` / `total`: pode vir com vírgula decimal ("3447,5") ou inteiro ("21880")
 *   - `sequencial` nas notas: SEMPRE "0" ou "1" — não é único por documento.
 *     Chave real de deduplicação: {docid}_{rubrica}_{cnpj}_{valorNorm}
 */

/** Deputado ALEPE. */
export type DeputadoAlepe = {
  id: string;               // campo `id` da API — chave de junção com verbas
  nome: string;
  partido: string | null;
  email: string | null;
  foto: string | null;      // path relativo (ex: "/imagens/deputados/foo.jpg")
};

/** Um documento de verba indenizatória (por deputado/ano/mês). */
export type VerbaHeader = {
  docid: string;
  numero: string;
  tipo: "P" | "C" | string; // P = principal, C = complementação
  ano: number;
  mes: number;              // convertido de nome pt-BR pra número 1-12
  deputadoNome: string;
  total: number;
};

/** Uma nota (line item) dentro de um documento de verba. */
export type VerbaNota = {
  docid: string;            // do header pai
  rubrica: string;          // código numérico da categoria ("3", "6", etc.)
  sequencial: string;       // "0" ou "1" — não confiável como chave única
  data: string | null;      // ISO YYYY-MM-DD ou null
  cnpj: string;
  empresa: string;
  valor: number;
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
  cod_categoria: string;      // rubrica numérica ("3")
  categoria: string;          // nome do tipo de despesa
  fornecedor: string | null;
  cnpj_cpf: string;
  num_documento: string;      // "{docid}_{rubrica}_{cnpj}_{valorCentavos}"
  data_emissao: string | null;
  valor_bruto: number;
  valor_reembolso: number;
  url_origem: string;
  metadata: Record<string, unknown> | null;
};

/** Resultado padrão de jobs. */
export type JobResult = {
  status: "ok" | "erro";
  total: number;
  processados: number;
  upsertados: number;
  ignorados: number;
  erro?: string;
  duracao_ms?: number;
};

// ── Utilitários ──────────────────────────────────────────────────────────────

/**
 * Converte valor BRL da API ALEPE pra number.
 * Suporta os dois formatos históricos:
 *   - "3447,5"  → 3447.5  (2015–2018, vírgula decimal)
 *   - "21880"   → 21880   (2019+, inteiro)
 */
export function parseValorAlepe(s: string | null | undefined): number {
  if (!s) return NaN;
  const n = parseFloat(s.trim().replace(",", "."));
  return Number.isFinite(n) ? n : NaN;
}

/** DD/MM/YYYY → YYYY-MM-DD (ou null se formato inválido). */
export function parseDataBR(s: string | null | undefined): string | null {
  if (!s) return null;
  const m = s.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return null;
  return `${m[3]}-${m[2]}-${m[1]}`;
}

/** Nome de mês pt-BR → número 1-12 (ou NaN). */
export function parseMesPtBR(s: string): number {
  const MAP: Record<string, number> = {
    janeiro: 1, fevereiro: 2, março: 3, marco: 3, abril: 4, maio: 5, junho: 6,
    julho: 7, agosto: 8, setembro: 9, outubro: 10, novembro: 11, dezembro: 12,
  };
  return MAP[s.toLowerCase().trim()] ?? NaN;
}

/**
 * Mapa de códigos de rubrica ALEPE → nome da categoria.
 * Fonte: observação empírica + portal de transparência ALEPE.
 * Rubricas desconhecidas ficam como "RUBRICA_{n}".
 */
export const RUBRICAS_ALEPE: Record<string, string> = {
  "1":  "LOCAÇÃO DE IMÓVEIS",
  "2":  "SERVIÇOS DE APOIO ADMINISTRATIVO",
  "3":  "SERVIÇOS JURÍDICOS",
  "4":  "CONSULTORIA",
  "5":  "PUBLICIDADE E COMUNICAÇÃO",
  "6":  "TELECOMUNICAÇÕES",
  "7":  "MATERIAL DE CONSUMO",
  "8":  "TRANSPORTE",
  "9":  "COMBUSTÍVEIS E LUBRIFICANTES",
  "10": "SERVIÇOS POSTAIS",
  "11": "ÁGUA E ESGOTO",
  "12": "ENERGIA ELÉTRICA",
  "13": "PASSAGENS",
  "14": "ALIMENTAÇÃO",
  "15": "HOSPEDAGEM",
};

/** Nome da categoria para um código de rubrica ALEPE. */
export function categoriaAlepe(rubrica: string): string {
  return RUBRICAS_ALEPE[rubrica] ?? `RUBRICA_${rubrica}`;
}

/**
 * Gera o `num_documento` canônico para uma nota ALEPE.
 * Combinação estável e única: docid + rubrica + cnpj + valor em centavos.
 */
export function numDocumentoAlepe(nota: {
  docid: string;
  rubrica: string;
  cnpj: string;
  valor: number;
}): string {
  const centavos = Math.round(nota.valor * 100);
  return `${nota.docid}_r${nota.rubrica}_${nota.cnpj}_${centavos}`;
}
