/**
 * Validações antes de inserir em emendas_brutas.
 * Registros inválidos são registrados e ignorados; não interrompem a ingestão.
 */

import type { EmendaBrutaInsert } from "./types.js";
import { valorNumericoValido } from "./normalizers/index.js";

const ANOS_PERMITIDOS = [2023, 2024, 2025, 2026] as const;

export function anoValido(ano: number): boolean {
  return ANOS_PERMITIDOS.includes(ano as (typeof ANOS_PERMITIDOS)[number]);
}

export function validarRegistroEmenda(registro: EmendaBrutaInsert): {
  valido: boolean;
  erro?: string;
} {
  if (!anoValido(registro.ano)) {
    return { valido: false, erro: "ano_invalido" };
  }
  const id = registro.id_externo?.trim();
  if (!id || id.length === 0) {
    return { valido: false, erro: "id_emenda_vazio" };
  }
  const parlamentar = registro.dados?.parlamentar?.trim();
  if (!parlamentar || parlamentar.length === 0) {
    return { valido: false, erro: "parlamentar_vazio" };
  }
  if (!valorNumericoValido(registro.dados?.valor)) {
    return { valido: false, erro: "valor_invalido" };
  }
  return { valido: true };
}

export function getAnosCobertos(): number[] {
  return [...ANOS_PERMITIDOS];
}
