# Schemas reais — armadilhas conhecidas

Notas escritas em jun/2026 depois de várias tentativas de filtrar por colunas que não
existem. Mantém os schemas exatos para evitar erros recorrentes.

Para introspecção rápida sem psql, usar:

```bash
node scripts/_introspect.mjs "SELECT ... LIMIT 10"
```

Roda via RPC `exec_readonly_query` (timeout 25s, LIMIT 200 automático, read-only).

---

## Views / MVs do CEAP (cota_despesa)

### `cota_cnpj_ranking` — MATERIALIZED VIEW (era VIEW até 2026-06-17)

Antes era VIEW que agregava 4M+ linhas de `cota_despesa` por CNPJ → **toda consulta
estourava `statement_timeout` (erro 57014)**. Convertida em MV em
`20260617000000_mv_cota_cnpj_ranking.sql` e fica em ~67 MB / 299 k linhas.

Colunas: `cnpj`, `nome_fornecedor`, `n_deputados`, `n_notas`, `total_liquido_brl`,
`primeira_nota`, `ultima_nota`. Ordenação por `total_liquido_brl DESC NULLS LAST` é
~0.4s.

**Refresh:** `SELECT public.refresh_cota_cnpj_ranking();` (uso CONCURRENTLY, não
bloqueia leitura). Rodar quando rodar a ingestão de CEAP da Câmara.

### `cota_cnpj_lookup` — TABLE

Só normalização de CNPJ, **não tem deputado_id**.

Colunas: `cnpj_raw`, `cnpj_norm`, `is_cnpj` (bool). 66 k linhas.

Para filtrar nota fiscal por deputado, use `cota_despesa` diretamente (tem
`id_deputado`).

---

## Caches de parlamentar

### `parlamentar_sancoes_cache` — TABLE
Usa **`parlamentar_id` (uuid)**, não `deputado_id`.
Colunas: `id`, `parlamentar_id`, `sancoes` (jsonb), `updated_at`.

### `parlamentar_contratos_cache` — TABLE
Idem. `parlamentar_id` é o uuid da tabela `parlamentares`, não o `id_externo`/`id_camara`.
Colunas: `id`, `parlamentar_id`, `contratos` (jsonb), `updated_at`.

Para resolver: `parlamentares.id` (uuid) ↔ `parlamentares.id_camara` (int) ↔
`cam_proposicoes.deputado_id` (int) ↔ `plen_votos.deputado_id` (int).

---

## Views cruzadas com emendas

### `tse_v_doador_emenda` — VIEW (reescrita 2026-06-17)

**Definição anterior está obsoleta** — antes filtrava por `tipo_doador ILIKE
'%jurídica%'` e exigia mesmo parlamentar como autor da emenda e recebedor da
doação. Resultado: 0 linhas. Doação PJ→candidato direto foi banida pela
reforma eleitoral de 2015.

Reescrita em `20260618010000_rewrite_tse_v_doador_emenda.sql` para abordagem
ampla: agrega `tse_receitas` por CNPJ e junta com `emendas_favorecidos` só
pelo CNPJ favorecido, sem exigir mesmo parlamentar. ~94 linhas hoje, top
dominado por entes públicos (Estado do AM, MG, etc.).

Colunas: `autor_codigo`, `autor_nome`, `ano_emenda`, `tipo_emenda`, `subtipo`,
`cnpj_favorecido`, `nome_favorecido`, `natureza_juridica_favorecido`,
`municipio_favorecido`, `uf_favorecido`, `valor_emenda`, `qtd_doacoes`,
`valor_total_doado`, `candidatos_distintos`, `eleicoes_doadas`,
`nome_doador_sample`, `setor_doador_sample`.

**Atenção:** o "doador" agora é o **CNPJ que recebeu emenda E aparece como
doador em alguma eleição** — não significa que doou pro autor da emenda nem
pro partido dele. Cruzamento informativo amplo, não direto.

### `v_sancao_emenda` — VIEW

Usa coluna `parlamentar` (texto livre vindo de `emendas_favorecidos.nome_autor`),
**não** `autor_nome`.

Colunas: `cadastro`, `cpf_cnpj`, `nome_sancionado`, `tipo_sancao`, `sancao_inicio`,
`sancao_fim`, `orgao_sancionador`, `orgao_uf`, `valor_emenda`, `ano_emenda`,
`parlamentar`, `municipio_favorecido`, `uf_favorecido`, `tipo_emenda`, `subtipo`.

Filtra por `length(s.cpf_cnpj) = 14` (só PJ sancionada).

### Views aposentadas em 2026-06-18

- `ele26_v_doador_emenda_hist` (0 linhas) — tabela base `ele2026_financiamento`
  vazia. Recriar quando ingestão rodar.
- `tse_v_fornecedor_emenda` (0 linhas) — mesma doença que `tse_v_doador_emenda`
  tinha (exigia mesmo parlamentar). Universo bruto existe (583 CNPJs comuns
  tse_despesas 2022 × emendas_favorecidos), mas a amarração zera. Se for
  útil depois, recriar como cruzamento amplo seguindo padrão da rewrite
  20260618010000. Migration `20260618030000_drop_views_doador_fornecedor.sql`.

### `vw_rp9_favorecidos_sancionados` — VIEW

Usa `nome_apoiador` (de `emendas_rp9_apoiamento`), **não** `autor_nome`.

Colunas: `nome_apoiador`, `cargo_apoiador`, `ano_emenda`, `numero_emenda`,
`cnpj_favorecido`, `nome_favorecido`, `orgao_uge_nome`, `ne_atual`, `tipo_registro`,
`tipo_sancao`, `data_inicio`, `data_fim`, `orgao_sancionador`.

---

## Objetos legacy droppados em 2026-06-18

Migration `20260618000000_drop_legacy_voto_proposicoes.sql`. Todos sem uso em
código (zero grep hits em TS/SQL/JS) e substituídos pelo cluster `plen_*`:

- `proposicoes_autores` (TABLE, 0 linhas) — função coberta por `cam_proposicoes`.
- `camara_voto` (TABLE, 43 k) → `plen_votos`.
- `camara_orientacao` (TABLE, 1.1 k) — sem equivalente em `plen_*` ainda.
- `camara_votacao` (TABLE, 5.4 k) → `plen_votacoes`.
- `camara_dissidencia` (VIEW) — derivada das 3 tabelas acima.
- `camara_ranking_dissidencia` (VIEW) — agregação da view acima.

Se precisar reconstruir lógica de dissidência (voto real ≠ orientação do
partido), o caminho é: criar view sobre `plen_votos` + uma nova tabela de
orientações (não existe equivalente da extinta `camara_orientacao`).
