/**
 * Callback de confirmação de e-mail do Supabase.
 * Recebe o ?code=... gerado pelo Supabase, troca por sessão e redireciona.
 */

import { NextRequest, NextResponse } from "next/server";
import { createAuthClient } from "~/lib/supabase-auth";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.transparenciafederal.com";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/conta?confirmado=1";

  if (code) {
    const supabase = await createAuthClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(new URL(next, SITE));
    }
  }

  // Falha na troca de código — manda para login com mensagem
  return NextResponse.redirect(
    new URL("/login?error=" + encodeURIComponent("Link inválido ou expirado. Faça login abaixo."), SITE)
  );
}
