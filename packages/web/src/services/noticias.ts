import { getSupabase } from "../lib/supabase-server";

export type NoticiaTipo = "investigacao" | "curadoria";

export interface NoticiaCard {
  slug: string;
  titulo: string;
  resumo: string;
  tag: string;
  data_pub: string;
  destaque: boolean;
  tipo: NoticiaTipo;
  fonte_nome: string | null;
  fonte_url: string | null;
}

function fmt(data_pub: string): string {
  return new Date(data_pub + "T12:00:00Z").toLocaleDateString("pt-BR", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

const SELECT = "slug, titulo, resumo, tag, data_pub, destaque, tipo, fonte_nome, fonte_url";

export async function getNoticias(): Promise<NoticiaCard[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("noticias")
    .select(SELECT)
    .eq("publicado", true)
    .order("data_pub", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => ({ ...r, data_pub: fmt(r.data_pub) }));
}

export async function getNoticia(slug: string): Promise<NoticiaCard | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("noticias")
    .select(SELECT)
    .eq("slug", slug)
    .eq("publicado", true)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;
  return { ...data, data_pub: fmt(data.data_pub) };
}

export async function getNoticiasDestaque(limit = 3): Promise<NoticiaCard[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("noticias")
    .select(SELECT)
    .eq("publicado", true)
    .eq("destaque", true)
    .order("data_pub", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => ({ ...r, data_pub: fmt(r.data_pub) }));
}
