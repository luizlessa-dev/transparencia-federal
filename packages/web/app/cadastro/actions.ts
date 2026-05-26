"use server";

import { redirect } from "next/navigation";
import { createAuthClient } from "~/lib/supabase-auth";

export async function cadastroAction(formData: FormData) {
  const email = (formData.get("email") as string)?.trim();
  const password = formData.get("password") as string;
  const confirm = formData.get("confirm") as string;

  if (!email || !password) {
    redirect(`/cadastro?error=${encodeURIComponent("Preencha todos os campos.")}`);
  }

  if (password !== confirm) {
    redirect(`/cadastro?error=${encodeURIComponent("As senhas não coincidem.")}`);
  }

  if (password.length < 8) {
    redirect(`/cadastro?error=${encodeURIComponent("A senha deve ter ao menos 8 caracteres.")}`);
  }

  const supabase = await createAuthClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.thebrinsider.com"}/auth/confirm`,
    },
  });

  if (error) {
    const msg = error.message.includes("already registered")
      ? "Este e-mail já está cadastrado. Faça login."
      : error.message;
    redirect(`/cadastro?error=${encodeURIComponent(msg)}`);
  }

  redirect("/cadastro?ok=1");
}
