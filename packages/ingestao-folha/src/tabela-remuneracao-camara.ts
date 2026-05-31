/**
 * Tabela de remuneração do Secretário Parlamentar da Câmara (base 2023,
 * Ato da Mesa nº 268/2023). Valores BRUTOS mensais.
 *
 * O cargo vem como SP{nível}{sufixo}, ex: SP09C, SP19S, SP25U.
 *   sufixo S → sem GRG  → vencimento
 *   sufixo C → com GRG  → vencimento + GRG (= 2× vencimento, exato na tabela)
 *   sufixo U → categoria especial (~2%): usamos o vencimento (piso) e sinalizamos
 *
 * É ESTIMATIVA: a Câmara não publica o salário individual em bulk; inferimos
 * pelo nível do cargo. Marcar sempre `salario_estimado: true`.
 */

export const TABELA_REF = "2023";

// nível (1..25) → vencimento bruto sem GRG. Com GRG é 2× este valor.
const VENCIMENTO: Record<number, number> = {
  1: 1222.44, 2: 1403.27, 3: 1584.1, 4: 1764.93, 5: 1945.79,
  6: 2126.59, 7: 2307.46, 8: 2488.28, 9: 2669.12, 10: 2849.95,
  11: 3030.8, 12: 3211.61, 13: 3392.45, 14: 3754.12, 15: 4115.77,
  16: 4477.45, 17: 4839.11, 18: 5200.78, 19: 5743.28, 20: 6285.78,
  21: 6828.28, 22: 7370.78, 23: 7913.28, 24: 8636.63, 25: 9359.94,
};

export interface SalarioSP {
  valor: number | null; // bruto estimado
  nivel: string | null; // "SP09"
  grg: boolean | null; // tem Gratificação de Representação de Gabinete?
  sufixo: string | null; // C | S | U
}

/** Resolve o cargo (ex: "SP09C") em salário bruto estimado. */
export function salarioPorCargoSP(cargo: string | null | undefined): SalarioSP {
  const m = (cargo ?? "").trim().toUpperCase().match(/^SP(\d{2})([CSU])$/);
  if (!m) return { valor: null, nivel: null, grg: null, sufixo: null };
  const nivel = parseInt(m[1], 10);
  const sufixo = m[2];
  const venc = VENCIMENTO[nivel];
  if (venc == null) return { valor: null, nivel: `SP${m[1]}`, grg: null, sufixo };
  const grg = sufixo === "C";
  const valor = grg ? Math.round(venc * 2 * 100) / 100 : venc;
  return { valor, nivel: `SP${m[1]}`, grg: sufixo === "U" ? null : grg, sufixo };
}
