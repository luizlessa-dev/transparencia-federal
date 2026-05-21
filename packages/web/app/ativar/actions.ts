"use server";

import { redirect } from "next/navigation";
import { getUser } from "~/lib/supabase-auth";
import { getSupabase } from "~/lib/supabase-server";

export async function ativarCodigoAction(formData: FormData) {
  const codigo = (formData.get("codigo") as string)?.trim().toUpperCase();

  if (!codigo) {
    redirect("/ativar?error=Código inválido.");
  }

  const user = await getUser();
  if (!user) {
    redirect("/login?next=/ativar");
  }

  const sb = getSupabase();

  // Busca o código
  const { data: cod } = await sb
    .from("codigos_acesso")
    .select("*")
    .eq("codigo", codigo)
    .single();

  if (!cod) {
    redirect(`/ativar?error=${encodeURIComponent("Código não encontrado.")}`);
  }

  if (cod.usado_em) {
    redirect(`/ativar?error=${encodeURIComponent("Este código já foi utilizado.")}`);
  }

  // Calcula validade
  const validade = new Date();
  validade.setDate(validade.getDate() + cod.validade_dias);

  // Atualiza perfil do usuário
  await sb
    .from("user_profiles")
    .update({
      plano: cod.plano,
      plano_valido_ate: validade.toISOString(),
      atualizado_em: new Date().toISOString(),
    })
    .eq("id", user.id);

  // Marca código como usado
  await sb
    .from("codigos_acesso")
    .update({
      usado_em: new Date().toISOString(),
      usado_por: user.id,
    })
    .eq("codigo", codigo);

  redirect("/conta?ativado=1");
}
