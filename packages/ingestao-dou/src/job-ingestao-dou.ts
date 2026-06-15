import type { SupabaseClient } from "@supabase/supabase-js";
import { login, buscarPorData } from "./dou-client.js";
import { normalizarPublicacao } from "./extratores.js";
import {
  upsertPublicacoesDOU,
  buscarNomesFuncionarios,
  buscarCNPJsDoadores,
  upsertAlertas,
  type AlertaCruzamento,
} from "./db.js";

export async function jobIngestaoDOU(supabase: SupabaseClient, data?: Date): Promise<void> {
  const alvo = data ?? new Date();
  console.log(`[dou] Ingerindo DO2 + DO3 (+ extras) — ${alvo.toISOString().slice(0, 10)}`);

  const email = process.env.INLABS_EMAIL;
  const password = process.env.INLABS_PASSWORD;
  if (!email || !password) throw new Error("Defina INLABS_EMAIL e INLABS_PASSWORD no .env");

  await login(email, password);

  const atos = await buscarPorData(["DO2", "DO3", "DO2E", "DO3E"], alvo);
  const publicacoes = atos.map(normalizarPublicacao);
  console.log(`[dou] ${publicacoes.length} publicações encontradas`);

  if (publicacoes.length === 0) {
    console.log("[dou] Nenhuma publicação — dia sem DOU ou fim de semana.");
    return;
  }

  const { inseridos, erros } = await upsertPublicacoesDOU(supabase, publicacoes);
  console.log(`[dou] Upsert: ${inseridos} inseridos/atualizados, ${erros} erros`);

  await jobCruzamento(supabase, publicacoes);
}

type PubParaCruzamento = {
  id_externo: string;
  titulo: string;
  data_publicacao: string;
  orgao: string;
  assinante?: string;
  cpfs_extraidos: string[];
  cnpjs_extraidos: string[];
};

const PAGE_SIZE = 1000;

async function* paginarPublicacoes(supabase: SupabaseClient): AsyncGenerator<PubParaCruzamento[]> {
  let cursor = "";
  while (true) {
    const q = supabase
      .from("dou_publicacoes")
      .select("id_externo,titulo,data_publicacao,orgao,assinante,cpfs_extraidos,cnpjs_extraidos")
      .order("id_externo", { ascending: true })
      .limit(PAGE_SIZE);
    const { data, error } = cursor ? await q.gt("id_externo", cursor) : await q;
    if (error) throw new Error(`Paginar publicações: ${error.message}`);
    if (!data || data.length === 0) break;
    yield data as PubParaCruzamento[];
    if (data.length < PAGE_SIZE) break;
    cursor = (data[data.length - 1] as PubParaCruzamento).id_externo;
  }
}

async function processarLote(
  lote: PubParaCruzamento[],
  nomesFuncionarios: Set<string>,
  cnpjsDoadores: Set<string>,
  supabase: SupabaseClient
): Promise<number> {
  const alertas: AlertaCruzamento[] = [];

  for (const pub of lote) {
    const assinante = pub.assinante?.toUpperCase();
    if (assinante && nomesFuncionarios.has(assinante)) {
      alertas.push({
        id_externo: pub.id_externo,
        titulo: pub.titulo,
        data_publicacao: pub.data_publicacao,
        orgao: pub.orgao,
        tipo_match: "cpf_funcionario",
        valor_match: assinante,
      });
    }
    for (const cnpj of pub.cnpjs_extraidos ?? []) {
      if (cnpjsDoadores.has(cnpj)) {
        alertas.push({
          id_externo: pub.id_externo,
          titulo: pub.titulo,
          data_publicacao: pub.data_publicacao,
          orgao: pub.orgao,
          tipo_match: "cnpj_doador",
          valor_match: cnpj,
        });
      }
    }
  }

  if (alertas.length > 0) await upsertAlertas(supabase, alertas);
  return alertas.length;
}

export async function jobCruzamento(
  supabase: SupabaseClient,
  publicacoes?: PubParaCruzamento[]
): Promise<void> {
  console.log("[dou] Iniciando cruzamento com funcionários e doadores...");

  const [nomesFuncionarios, cnpjsDoadores] = await Promise.all([
    buscarNomesFuncionarios(supabase),
    buscarCNPJsDoadores(supabase),
  ]);

  console.log(`[dou] Base de referência: ${nomesFuncionarios.size} nomes, ${cnpjsDoadores.size} CNPJs`);

  let totalAlertas = 0;
  let totalPubs = 0;

  if (publicacoes) {
    // Chamada da ingestão diária — processa o lote já em memória
    totalAlertas = await processarLote(publicacoes, nomesFuncionarios, cnpjsDoadores, supabase);
    totalPubs = publicacoes.length;
  } else {
    // Cruzamento histórico — pagina todo o banco em lotes de PAGE_SIZE
    for await (const pagina of paginarPublicacoes(supabase)) {
      const n = await processarLote(pagina, nomesFuncionarios, cnpjsDoadores, supabase);
      totalAlertas += n;
      totalPubs += pagina.length;
      process.stdout.write(
        `\r[dou] Cruzamento: ${totalPubs} publicações processadas, ${totalAlertas} alertas`
      );
    }
    console.log(); // quebra de linha após o \r
  }

  console.log(`[dou] Cruzamento concluído: ${totalPubs} publicações, ${totalAlertas} alertas gerados`);

  if (totalAlertas > 0 && publicacoes) {
    // Preview de alertas só na ingestão diária (histórico seria enorme)
    console.log("[dou] (alertas salvos em dou_alertas_cruzamento)");
  }
}
