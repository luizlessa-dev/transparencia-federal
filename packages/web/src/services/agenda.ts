import { getSupabase } from "../lib/supabase-server";

// ── Tipos ─────────────────────────────────────────────────────────────────────

export interface AgendaCamaraEvento {
  id: string;
  data_hora_inicio: string | null;
  data_hora_fim: string | null;
  data_inicio_date: string | null;
  tipo_evento: string | null;
  situacao: string | null;
  descricao: string | null;
  local_nome: string | null;
  local_sala: string | null;
  orgaos_siglas: string[] | null;
  url_documento_pauta: string | null;
  url_registro: string | null;
}

export interface AgendaSenado {
  id: string;
  data_hora_inicio: string | null;
  data_inicio_date: string | null;
  titulo: string | null;
  descricao: string | null;
  comissao_sigla: string | null;
  comissao_nome: string | null;
  situacao: string | null;
  tipo_desc: string | null;
  local: string | null;
  tipo_presenca: string | null;
  url_pauta_completa: string | null;
}

export interface AgendaSenadoPlenario {
  id: string;
  data_sessao: string;
  hora: string | null;
  tipo_sessao: string | null;
  situacao: string | null;
  evento_desc: string | null;
  local: string | null;
  tipo_presenca: string | null;
}

export interface AgendaExecutivo {
  id: string;
  data_inicio: string | null;
  hora_inicio: string | null;
  hora_termino: string | null;
  orgao_sigla: string | null;
  autoridade_nome: string | null;
  autoridade_cargo: string | null;
  tipo_compromisso: string | null;
  assunto: string | null;
  local: string | null;
  tem_participantes_privados: boolean;
  n_participantes_privados: number;
}

export interface AgendaDia {
  camara: AgendaCamaraEvento[];
  senado_comissoes: AgendaSenado[];
  senado_plenario: AgendaSenadoPlenario[];
  executivo: AgendaExecutivo[];
  data: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function hoje(): string {
  return new Date().toISOString().slice(0, 10);
}

function diasAtras(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

function diasAFrente(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

// ── Queries ───────────────────────────────────────────────────────────────────

export async function getAgendaCamara(
  dataInicio: string,
  dataFim: string,
  tipo?: string,
): Promise<AgendaCamaraEvento[]> {
  const sb = getSupabase();
  let q = sb
    .from("agenda_camara_eventos")
    .select(
      "id,data_hora_inicio,data_hora_fim,data_inicio_date,tipo_evento,situacao,descricao,local_nome,local_sala,orgaos_siglas,url_documento_pauta,url_registro",
    )
    .gte("data_inicio_date", dataInicio)
    .lte("data_inicio_date", dataFim)
    .order("data_hora_inicio", { ascending: true });

  if (tipo) q = q.ilike("tipo_evento", `%${tipo}%`);

  const { data, error } = await q.limit(200);
  if (error) throw error;
  return (data ?? []) as AgendaCamaraEvento[];
}

export async function getAgendaSenadoComissoes(
  dataInicio: string,
  dataFim: string,
): Promise<AgendaSenado[]> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from("agenda_senado_comissoes")
    .select(
      "id,data_hora_inicio,data_inicio_date,titulo,descricao,comissao_sigla,comissao_nome,situacao,tipo_desc,local,tipo_presenca,url_pauta_completa",
    )
    .gte("data_inicio_date", dataInicio)
    .lte("data_inicio_date", dataFim)
    .order("data_hora_inicio", { ascending: true })
    .limit(200);
  if (error) throw error;
  return (data ?? []) as AgendaSenado[];
}

export async function getAgendaSenadoPlenario(
  dataInicio: string,
  dataFim: string,
): Promise<AgendaSenadoPlenario[]> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from("agenda_senado_plenario")
    .select(
      "id,data_sessao,hora,tipo_sessao,situacao,evento_desc,local,tipo_presenca",
    )
    .gte("data_sessao", dataInicio)
    .lte("data_sessao", dataFim)
    .order("data_sessao", { ascending: true })
    .limit(100);
  if (error) throw error;
  return (data ?? []) as AgendaSenadoPlenario[];
}

export async function getAgendaExecutivo(
  dataInicio: string,
  dataFim: string,
  orgao?: string,
): Promise<AgendaExecutivo[]> {
  const sb = getSupabase();
  let q = sb
    .from("agenda_executivo_compromissos")
    .select(
      "id,data_inicio,hora_inicio,hora_termino,orgao_sigla,autoridade_nome,autoridade_cargo,tipo_compromisso,assunto,local,tem_participantes_privados,n_participantes_privados",
    )
    .gte("data_inicio", dataInicio)
    .lte("data_inicio", dataFim)
    .order("data_inicio", { ascending: true })
    .order("hora_inicio", { ascending: true });

  if (orgao) q = q.eq("orgao_sigla", orgao);

  const { data, error } = await q.limit(300);
  if (error) throw error;
  return (data ?? []) as AgendaExecutivo[];
}

export async function getAgendaDia(data?: string): Promise<AgendaDia> {
  const d = data ?? hoje();
  const [camara, senado_comissoes, senado_plenario, executivo] =
    await Promise.all([
      getAgendaCamara(d, d),
      getAgendaSenadoComissoes(d, d),
      getAgendaSenadoPlenario(d, d),
      getAgendaExecutivo(d, d),
    ]);
  return { camara, senado_comissoes, senado_plenario, executivo, data: d };
}

export async function getAgendaSemana(): Promise<AgendaDia> {
  const ini = diasAtras(1);
  const fim = diasAFrente(6);
  const [camara, senado_comissoes, senado_plenario, executivo] =
    await Promise.all([
      getAgendaCamara(ini, fim),
      getAgendaSenadoComissoes(ini, fim),
      getAgendaSenadoPlenario(ini, fim),
      getAgendaExecutivo(ini, fim),
    ]);
  return {
    camara,
    senado_comissoes,
    senado_plenario,
    executivo,
    data: ini,
  };
}

// ── Órgãos do Executivo (para filtro) ────────────────────────────────────────
export async function getOrgaosExecutivo(): Promise<string[]> {
  const sb = getSupabase();
  const { data } = await sb
    .from("agenda_executivo_compromissos")
    .select("orgao_sigla")
    .gte("data_inicio", diasAtras(30))
    .order("orgao_sigla");
  const siglas = [...new Set((data ?? []).map((r: { orgao_sigla: string }) => r.orgao_sigla).filter(Boolean))];
  return siglas as string[];
}
