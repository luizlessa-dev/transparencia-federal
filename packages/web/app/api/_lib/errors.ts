/**
 * Respostas de erro consistentes da API pública.
 * Sempre JSON: { error: string, code?: string }
 */

import { NextResponse } from "next/server";

const CODES = {
  BAD_REQUEST: "BAD_REQUEST",
  NOT_FOUND: "NOT_FOUND",
  INTERNAL_ERROR: "INTERNAL_ERROR",
} as const;

export function badRequest(message: string) {
  return NextResponse.json(
    { error: message, code: CODES.BAD_REQUEST },
    { status: 400 }
  );
}

export function notFound(message: string = "Recurso não encontrado.") {
  return NextResponse.json(
    { error: message, code: CODES.NOT_FOUND },
    { status: 404 }
  );
}

export function internalError(message: string = "Erro interno do servidor.") {
  return NextResponse.json(
    { error: message, code: CODES.INTERNAL_ERROR },
    { status: 500 }
  );
}
