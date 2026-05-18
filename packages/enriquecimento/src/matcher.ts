import type { ParlamentarLookup } from "./types.js";
import { normalizarNome } from "./normalizers.js";

/** Prefixos que indicam comissão, bancada ou relator — não são parlamentares. */
const PREFIXOS_NAO_PARLAMENTAR = [
  "com.", "comissao", "bancada", "mesa", "relator", "lideranca",
  "bloco", "frente", "senado federal", "camara dos deputados",
];

export function ehNaoParlamentar(nome: string): boolean {
  const n = normalizarNome(nome);
  return PREFIXOS_NAO_PARLAMENTAR.some((p) => n.startsWith(p));
}

export class ParlamentarMatcher {
  private mapa: Map<string, string>; // nome_normalizado → id

  constructor(parlamentares: ParlamentarLookup[]) {
    this.mapa = new Map(parlamentares.map((p) => [p.nome_normalizado, p.id]));
  }

  match(autorRaw: string | null): string | null {
    if (!autorRaw) return null;
    if (ehNaoParlamentar(autorRaw)) return null;
    const normalizado = normalizarNome(autorRaw);
    return this.mapa.get(normalizado) ?? null;
  }
}
