"use server";

import { redirect } from "next/navigation";
import { createAuthClient } from "~/lib/supabase-auth";

export async function loginAction(formData: FormData) {
  const email = (formData.get("email") as string)?.trim();
  const password = formData.get("password") as string;
  const next = (formData.get("next") as string) || "/risco";

  if (!email || !password) {
    redirect(`/login?error=${encodeURIComponent("E-mail e senha são obrigatórios.")}&next=${encodeURIComponent(next)}`);
  }

  const supabase = await createAuthClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    const msg = error.message.includes("Invalid")
      ? "E-mail ou senha incorretos."
      : error.message;
    redirect(`/login?error=${encodeURIComponent(msg)}&next=${encodeURIComponent(next)}`);
  }

  redirect(next);
}
