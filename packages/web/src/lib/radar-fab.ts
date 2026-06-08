/**
 * Radar FAB — utilitários de dados
 *
 * Busca os arquivos de análise do repo luizlessa-dev/voos-oficiais via GitHub raw/API.
 * Todos os fetches usam ISR (revalidate: 3600) para evitar rate-limit.
 */

const REPO = "luizlessa-dev/voos-oficiais";
const RAW  = `https://raw.githubusercontent.com/${REPO}/main`;
const API  = `https://api.github.com/repos/${REPO}/contents`;

const FETCH_OPTS = { next: { revalidate: 3600 } } as const;
const GH_HEADERS = { Accept: "application/vnd.github+json", "User-Agent": "radar-fab/1.0" };

// ──────────────────────── tipos ────────────────────────

export interface AnaliseInfo {
  mes:    string; // "2026-04"
  titulo: string; // "Abril 2026"
}

export interface VooRow {
  autoridade: string;
  origem:     string;
  decolagem:  string; // "dd/mm/aaaa - HH:MM"
  destino:    string;
  aeronave:   string;
  motivo:     string;
  passageiros:string;
  ano:        number;
  mes:        number;
}

// ──────────────────────── helpers ────────────────────────

const MESES_PT = [
  "Janeiro","Fevereiro","Março","Abril","Maio","Junho",
  "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro",
];

export function formatMes(mes: string): string {
  const [ano, m] = mes.split("-");
  return `${MESES_PT[parseInt(m) - 1]} ${ano}`;
}

// ──────────────────────── listagem ────────────────────────

export async function listarAnalises(): Promise<AnaliseInfo[]> {
  try {
    const res = await fetch(`${API}/dados/analises`, {
      ...FETCH_OPTS,
      headers: GH_HEADERS,
    });
    if (!res.ok) return [];
    const items: Array<{ name: string }> = await res.json();
    return items
      .filter(it => /^\d{4}-\d{2}\.md$/.test(it.name))
      .map(it => ({ mes: it.name.replace(".md", ""), titulo: formatMes(it.name.replace(".md", "")) }))
      .sort((a, b) => b.mes.localeCompare(a.mes));
  } catch {
    return [];
  }
}

// ──────────────────────── conteúdo md ────────────────────────

export async function getAnalise(mes: string): Promise<string | null> {
  try {
    const res = await fetch(`${RAW}/dados/analises/${mes}.md`, FETCH_OPTS);
    return res.ok ? res.text() : null;
  } catch { return null; }
}

export async function getHistorico(): Promise<string | null> {
  try {
    const res = await fetch(`${RAW}/dados/analises/historico.md`, FETCH_OPTS);
    return res.ok ? res.text() : null;
  } catch { return null; }
}

// ──────────────────────── frota ────────────────────────

export interface Aeronave {
  designacao: string;
  modelo: string;
  fabricante: string;
  categoria: string;
  quantidade: number;
  quantidade_prevista?: number;
  matriculas?: string[];
  capacidade: string;
  velocidade_kmh?: number | null;
  alcance_km?: number | null;
  autonomia_h?: number;
  entrada_servico: number;
  custo_hora: string;
  curiosidade: string;
  destaque?: boolean;
}

export interface CategoriaFrota {
  id: string;
  nome: string;
  descricao: string;
  aeronaves: Aeronave[];
}

export interface FrotaFAB {
  _meta: { atualizado: string; total_aproximado_fab: number; avisos: string[] };
  categorias: CategoriaFrota[];
  aposentadas: Array<{ designacao: string; modelo: string; status: string; curiosidade: string }>;
}

export async function getFrotaFAB(): Promise<FrotaFAB | null> {
  try {
    const res = await fetch(`${RAW}/dados/frota_fab.json`, FETCH_OPTS);
    return res.ok ? res.json() : null;
  } catch { return null; }
}

export interface FrotaPub {
  _meta: { total_aeronaves: number; data_rab: string };
  frotas: Record<string, Record<string, Array<{ marca: string; modelo: string; fabricante: string; uf: string }>>>;
}

export async function getFrotaPublica(): Promise<FrotaPub | null> {
  try {
    const res = await fetch(`${RAW}/dados/frotas_pub.json`, FETCH_OPTS);
    return res.ok ? res.json() : null;
  } catch { return null; }
}

// ──────────────────────── CSVs para busca ────────────────────────

function parseCsv(text: string, ano: number, mes: number): VooRow[] {
  const linhas = text.split(/\r?\n/);
  const rows: VooRow[] = [];
  for (let i = 1; i < linhas.length; i++) {
    const cols = linhas[i].split(";");
    if (cols.length < 4 || !cols[0].trim()) continue;
    rows.push({
      autoridade:  cols[0]?.trim() ?? "",
      origem:      cols[1]?.trim() ?? "",
      decolagem:   cols[2]?.trim() ?? "",
      destino:     cols[3]?.trim() ?? "",
      aeronave:    cols[4]?.trim() ?? "",
      motivo:      cols[5]?.trim() ?? "",
      passageiros: cols[6]?.trim() ?? "",
      ano,
      mes,
    });
  }
  return rows;
}

async function fetchCsv(url: string, ano: number, mes: number): Promise<VooRow[]> {
  try {
    const res = await fetch(url, FETCH_OPTS);
    if (!res.ok) return [];
    const buf = await res.arrayBuffer();
    // Detecta encoding: tenta UTF-8, cai para Latin-1
    let text: string;
    try {
      text = new TextDecoder("utf-8", { fatal: true }).decode(buf);
    } catch {
      text = new TextDecoder("latin1").decode(buf);
    }
    return parseCsv(text, ano, mes);
  } catch { return []; }
}

export async function buscarVoos(params: {
  q?: string;
  ano?: string;
  mes?: string;
  destino?: string;
}): Promise<VooRow[]> {
  // Monta lista de arquivos a buscar
  const anos = params.ano
    ? [parseInt(params.ano)]
    : [2020, 2021, 2022, 2023, 2024, 2025, 2026];

  const promises: Promise<VooRow[]>[] = [];

  for (const ano of anos) {
    if (ano <= 2025) {
      // Arquivo anual
      promises.push(
        fetchCsv(`${RAW}/dados/snapshots/voos_${ano}_anual.csv`, ano, 0)
      );
    } else {
      // Arquivos mensais de 2026
      const mesesBusca = params.mes
        ? [parseInt(params.mes)]
        : [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
      for (const m of mesesBusca) {
        const mm = String(m).padStart(2, "0");
        promises.push(
          fetchCsv(`${RAW}/dados/snapshots/voos_${ano}_${mm}.csv`, ano, m)
        );
      }
    }
  }

  const lotes = await Promise.all(promises);
  let todos = lotes.flat();

  // Filtros
  if (params.q) {
    const q = params.q.toLowerCase();
    todos = todos.filter(v => v.autoridade.toLowerCase().includes(q));
  }
  if (params.destino) {
    const d = params.destino.toLowerCase();
    todos = todos.filter(v => v.destino.toLowerCase().includes(d) || v.origem.toLowerCase().includes(d));
  }

  // Ordena por data mais recente
  todos.sort((a, b) => {
    const da = a.decolagem.split(" - ")[0]?.split("/").reverse().join("") ?? "";
    const db = b.decolagem.split(" - ")[0]?.split("/").reverse().join("") ?? "";
    return db.localeCompare(da);
  });

  return todos.slice(0, 500); // limita a 500 resultados
}

// ──────────────────────── markdown → HTML ────────────────────────

export function mdToHtml(md: string): string {
  const lines = md.split("\n");
  const out: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Tabela
    if (line.startsWith("|") && lines[i + 1]?.match(/^\|[-| :]+\|/)) {
      const tableLines: string[] = [line];
      i += 2; // pula separador
      while (i < lines.length && lines[i].startsWith("|")) {
        tableLines.push(lines[i]);
        i++;
      }
      out.push(renderTable(tableLines));
      continue;
    }

    // Headers
    if (line.startsWith("### ")) { out.push(`<h3 class="radar-h3">${inlines(line.slice(4))}</h3>`); i++; continue; }
    if (line.startsWith("## "))  { out.push(`<h2 class="radar-h2">${inlines(line.slice(3))}</h2>`); i++; continue; }
    if (line.startsWith("# "))   { out.push(`<h1 class="radar-h1">${inlines(line.slice(2))}</h1>`); i++; continue; }

    // Lista
    if (line.startsWith("- ")) {
      const items: string[] = [];
      while (i < lines.length && lines[i].startsWith("- ")) {
        items.push(`<li>${inlines(lines[i].slice(2))}</li>`);
        i++;
      }
      out.push(`<ul class="radar-list">${items.join("")}</ul>`);
      continue;
    }

    // Linha vazia
    if (!line.trim()) { out.push(""); i++; continue; }

    // Parágrafo normal
    out.push(`<p class="radar-p">${inlines(line)}</p>`);
    i++;
  }

  return out.join("\n");
}

function inlines(s: string): string {
  return s
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/_([^_]+)_/g,       "<em>$1</em>")
    .replace(/`([^`]+)`/g,       "<code>$1</code>")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
}

function renderTable(tableLines: string[]): string {
  const parse = (row: string) =>
    row.split("|").slice(1, -1).map(c => c.trim());

  const header = parse(tableLines[0]);
  const body   = tableLines.slice(1);

  const ths = header.map(h => `<th>${inlines(h)}</th>`).join("");
  const trs = body.map(row => {
    const cells = parse(row).map(c => `<td>${inlines(c)}</td>`).join("");
    return `<tr>${cells}</tr>`;
  }).join("");

  return `<div class="radar-table-wrap"><table class="bloomberg-table"><thead><tr>${ths}</tr></thead><tbody>${trs}</tbody></table></div>`;
}
