/**
 * Utilitário para geração de CSV server-side.
 *
 * - UTF-8 com BOM (compatível com Excel no Windows)
 * - Campos com vírgula, aspas ou quebra de linha são automaticamente enquadrados
 * - Separador: vírgula (padrão internacional; Excel abre corretamente com BOM)
 */
import "server-only";

/** Converte um array de objetos em string CSV. */
export function toCsv<T extends object>(
  rows: T[],
  columns: { key: keyof T; label: string; format?: (v: unknown) => string }[],
): string {
  const BOM = "﻿";
  const escape = (v: unknown): string => {
    const s =
      v == null
        ? ""
        : v instanceof Date
        ? v.toISOString()
        : String(v);
    // enquadra se contiver vírgula, aspas ou nova linha
    return /[,"\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };

  const header = columns.map((c) => escape(c.label)).join(",");
  const body = rows
    .map((row) =>
      columns
        .map((c) => escape(c.format ? c.format(row[c.key]) : row[c.key]))
        .join(","),
    )
    .join("\n");

  return BOM + header + "\n" + body;
}

/** Headers HTTP padrão para download de CSV. */
export function csvResponse(csv: string, filename: string): Response {
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}

/** Formata número monetário BR (ex.: 1234567.89 → "R$ 1.234.567,89"). */
export function fmtBrlCsv(v: unknown): string {
  const n = Number(v);
  if (!isFinite(n)) return "";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 2,
  }).format(n);
}
