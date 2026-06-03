-- RLS: policies de leitura pública para o role `anon`.
--
-- Estratégia: tabelas públicas (dados abertos, CC-BY) → ENABLE RLS + SELECT anon.
-- Tabelas sensíveis já têm RLS via migrations anteriores (deny by default).
-- O app usa service_role (ignora RLS), então não há mudança de comportamento.

-- Helper reutilizável: habilita RLS + cria policy anon SELECT se a tabela existir.
create or replace function pg_temp.enable_public_read(p_table text)
returns void language plpgsql as $$
begin
  if exists (select 1 from pg_tables where schemaname='public' and tablename=p_table) then
    execute format('alter table public.%I enable row level security', p_table);
    if not exists (
      select 1 from pg_policies
      where schemaname='public' and tablename=p_table and policyname='anon: public read'
    ) then
      execute format(
        'create policy "anon: public read" on public.%I for select to anon using (true)',
        p_table
      );
    end if;
  end if;
end $$;

-- ── Federal ──────────────────────────────────────────────────────────────────
select pg_temp.enable_public_read(t) from unnest(array[
  'parlamentares', 'ranking_parlamentar', 'emendas_completas',
  'cam_parlamentar_risco', 'ceaps_ranking', 'ceaps_senado_ranking',
  'cam_proposicoes', 'cam_proposicoes_agg',
  'plen_deputado_agg', 'cam_mandatos', 'cam_ocupacoes'
]) t;

-- ── Assembleias estaduais ────────────────────────────────────────────────────
select pg_temp.enable_public_read(t) from unnest(array[
  'almg_verba_resumo_mensal', 'almg_fornecedores_intersetados',
  'alesp_despesas_resumo_mensal', 'alepe_verba_resumo_mensal',
  'fornecedores_intersetados'
]) t;

-- ── MG Executivo (CC-BY-4.0) ─────────────────────────────────────────────────
select pg_temp.enable_public_read(t) from unnest(array[
  'mg_supersalarios', 'mg_contratos_sancionados', 'mg_obras',
  'mg_obras_sancionadas', 'mg_obras_paradas',
  'mg_convenios', 'mg_convenios_sancionados',
  'mg_covid_compras', 'mg_covid_sobrepreco', 'mg_covid_sancionados',
  'mg_terceirizados', 'mg_terceirizados_sancionados',
  'mg_empenhos_sancionados', 'mg_pagamentos_condenadas',
  'mg_licitacao_sobrepreco_rel', 'mg_licitacao_sobrepreco_por_ano',
  'mg_licitacao_sobrepreco_por_orgao',
  'mg_emendas_federais', 'mg_diarias_orgao', 'mg_restos_orgao',
  'mg_lrf_limites', 'mg_lrf_pessoal',
  'mg_reparacao_vale', 'mg_doacoes', 'mg_voos_governador',
  'mg_os_parcerias', 'mg_convenios_entrada',
  'mg_notas_resumo', 'mg_notas_fornecedor_total',
  'mg_compras_resumo', 'mg_compras_fornecedor_total',
  'mg_empresas_sancionadas',
  'mg_emendas_estaduais', 'mg_emendas_estaduais_resumo',
  'mg_emendas_estaduais_por_autor',
  'mg_fornecedor_perfil', 'mg_fornecedor_perfil_resumo'
]) t;
