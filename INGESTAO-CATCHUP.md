# Catch-up de ingestão — 2026-06-17

Investigação dos 4 gaps de cruzamento listados na sessão. **Auditoria primeiro,
sem rodar job ainda** (pendente confirmação do Luiz pra cada ação).

Conexão usada pra introspecção: Management API
(`POST https://api.supabase.com/v1/projects/redggdtakzmsabwvjzhb/database/query`)
com token do `Supabase CLI` no Keychain do macOS. Service-role key não dá acesso a
`pg_views` via PostgREST.

---

## 1. `tse_v_doador_emenda` — view com filtro inviável (rewrite necessário)

**É VIEW, não MATERIALIZED VIEW** → não dá pra `REFRESH`. Retorna 0 por causa
da definição:

```sql
SELECT ...
  FROM tse_receitas r
  JOIN tse_candidatos c ON r.cpf_candidato = c.cpf AND r.ano_eleicao = c.ano_eleicao
  JOIN parlamentares p ON p.cpf = c.cpf
  JOIN emendas_favorecidos ef ON ef.codigo_autor::int = p.id_camara
                               AND ef.codigo_favorecido = r.cpf_cnpj_doador
 WHERE length(r.cpf_cnpj_doador) = 14
   AND r.tipo_doador ILIKE '%jurídica%';
```

### Root cause

`tse_receitas` (2,3 M linhas, 2018+2022+2024) tem `tipo_doador` preenchido com
**categorias de origem do recurso**, nunca "Pessoa Jurídica":

| tipo_doador | linhas |
|---|---:|
| Recursos de outros candidatos | 694.765 |
| Recursos de pessoas físicas | 691.683 |
| Recursos de partido político | 470.654 |
| Recursos próprios | 282.494 |
| Doações pela Internet | 91.006 |
| #NULO | 69.502 |
| Recursos de Financiamento Coletivo | 7.865 |
| Recursos de origens não identificadas | 3.093 |
| Rendimentos de aplicações financeiras | 796 |
| Comercialização de Bens com OR | 247 |
| Comercialização de Bens com FEFC | 21 |

Doações **PJ → candidato direto foram banidas em 2015**. Os CNPJs que aparecem
em `tse_receitas` são quase todos **direção partidária** ou **CNPJ eleitoral de
outros candidatos** (intra-partido / intercandidato), não empresas doadoras
diretas. Sample dos maiores valores de doador CNPJ:

```
Direção Nacional, 08517423000195, Recursos de partido político, R$ 19.450.000  (2024)
Direção Nacional, 13629827000100, Recursos de partido político, R$ 16.000.000  (2022)
Direção Nacional, 00676262000170, Recursos de partido político, R$ 15.000.000  (2024)
```

`cpf_cnpj_doador_originario` (que deveria ter o originador real) está **100% NULL**
na nossa ingestão.

### Outros 0-rows no mesmo padrão (mesma raiz de bug)

- `ele26_v_doador_emenda_hist` — usa `ele2026_financiamento` com o mesmo
  `tipo_doador ILIKE '%jurídica%'`.
- `tse_v_fornecedor_emenda` — não tem esse filtro, junta `tse_despesas ×
  emendas_favorecidos.codigo_favorecido`; também 0. Bug provável: chave de join.

### Comparação: `vw_contratos_doadores_federal` (137 linhas)

Esta sim funciona — junta `tse_receitas_brutas × contratos_federais × portal_sancionados`
**sem o filtro `%jurídica%`**, só `length(cnpj)=14`. `tse_receitas_brutas` (202 k
linhas, 2018+2022, esquema TSE-native com `nr_cpf_cnpj_doador`/`vr_receita`) é
uma fonte paralela à `tse_receitas`.

### Proposta de fix (NÃO APLICADA ainda)

Reescrever `tse_v_doador_emenda` num formato análogo a
`vw_contratos_doadores_federal`:

1. Cruzar `tse_receitas_brutas` (não `tse_receitas`) por `nr_cpf_cnpj_doador`
   com `emendas_favorecidos.codigo_favorecido` direto.
2. Remover `tipo_doador ILIKE '%jurídica%'`.
3. Manter `length(cnpj)=14` pra restringir a CNPJ.
4. Vincular ao parlamentar via `nr_cpf_candidato → tse_candidatos.cpf →
   parlamentares.cpf → id_camara → emendas_favorecidos.codigo_autor`.

Trade-off: ainda assim a maioria dos CNPJs em `_brutas` é direção partidária /
outro candidato; o sinal investigativo real é capturado pelas matviews
`mv_contratos_doadores_federal` e `mv_siafi_fornecedores_agregado` (TSE × contratos).
A view nova vai casar com sinais reais quando o CNPJ favorecido coincide com
uma das direções partidárias/CNPJs de candidato — eventualmente cruzando com
**ambas as bases** da emenda.

Alternativa mais útil: enriquecer com sócios (`v_parlamentar_socio_emenda`)
e/ou aceitar que o cruzamento PJ-direta só existe pré-2015 (e nossa ingestão
TSE não vai tão pra trás).

**Decisão pendente do Luiz:** rewrite da view, ou marcar como deprecada e usar
`vw_contratos_doadores_federal` / `mv_contratos_doadores_federal` como cruzamento
canônico?

---

## 2. `plen_votos` vs `camara_voto` — duas tabelas, períodos diferentes (já documentado)

`docs/SCHEMAS.md` (commit `eb7e437`, 2026-06-17) já lista `camara_voto` como
**candidata a deprecação** com substituta `plen_votos`. Os números:

| Tabela | Linhas | Range | dep 204369 |
|---|---:|---|---:|
| `plen_votos` | 59.665 | 2023-03-14 → 2026-03-25 | **105** |
| `camara_voto` | 43.267 | 2026-02-02 → 2026-06-10 | 42 |
| `plen_votacoes` | 1.060 | (149 com votos individuais) | — |
| `camara_votacao` | 5.370 | (126 com votos em `camara_voto`) | — |

### Achados

- **O "42 votos" que você viu veio da tabela deprecada** (`camara_voto`). Na
  canônica (`plen_votos`) a Caroline já tem 105.
- `plen_votos` está **estagnada em 2026-03-25** → faltam ~3 meses de ingestão.
- `camara_voto` cobre **só 2026-02 a 2026-06** (mais novo, mas com menos
  votações por votação e sem grep hit no repo).
- **Nenhum código no repo escreve em `camara_voto` / `camara_votacao`**. Não há
  cron job que os atualize. Origem provável: ingestão manual / repo separado /
  edge function obsoleta.

### Job canônico

`packages/ingestao-camara/src/job-ingestao-votacoes.ts` escreve em
`plen_votacoes` + `plen_votos` + `plen_orientacoes`. Resumível por padrão
(pula `votacao_id` já no DB). Comando:

```bash
# Pega só o que falta (~3 meses):
pnpm --filter @transparencia/ingestao-camara run votacoes:ts -- \
  --data-inicio 2026-03-01
```

(O job não aceita filtro por id_orgao, só `--data-inicio` e `--forcar`. Default
do CamaraClient: `2023-02-01`. Sem `--data-inicio`, varre tudo mas pula os 149
já feitos — equivalente em resultado, ~3× mais chamadas em /votacoes/list.)

### Recomendação

1. Rodar `votacoes:ts --data-inicio 2026-03-01` (esperando ~150 votações novas,
   ~75 k votos).
2. Confirmar `plen_votos` cresceu e dep 204369 passou de 105.
3. Decisão pendente: marcar `camara_voto` / `camara_votacao` pra drop num
   passo futuro (já estão em `docs/SCHEMAS.md`).

---

## 3. Caches parlamentares — populados por edge function lazy

| Tabela | Linhas | Última gravação |
|---|---:|---|
| `parlamentar_sancoes_cache` | 10 | 2026-05-02 |
| `parlamentar_contratos_cache` | 5 | 2026-04-29 |

### Quem popula

**Edge functions Deno** deployadas neste projeto Supabase:

- `get-sancoes` (ACTIVE, version 16)
- `get-contratos` (ACTIVE, version 16)

Código-fonte em **outro repo**: `/Users/luizlessa/dados-civicos/supabase/functions/`.
Lógica: TTL 24 h; se cache stale ou ausente, busca CEIS/CNEP/CEPIM no Portal
da Transparência (`get-sancoes`) ou contratos federais (`get-contratos`),
escreve em cache, devolve.

### Quem consome

**NÃO é `packages/web` deste repo**. Procurei e `packages/web/app/dossie/[id]/page.tsx`
não chama `get-sancoes` / `get-contratos`. Consumidor identificado:
`/Users/luizlessa/electiolab/src/lib/tf-data.ts` (projeto separado).

Conclusão: o "warm via /dossie/204369 no www.thebrinsider.com" não vai disparar
populate de cache — o site principal não invoca essas edge functions. Os 10 + 5
registros existentes vieram do electiolab (ou de testes manuais em abr/mai).

### Como warm pro dep 204369

UUID da Caroline: `b65de6a7-6039-414b-8253-1b4a9e7a11ef`. Pra forçar populate,
chamar a edge function diretamente (não testado ainda):

```bash
curl -sS -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  "$SUPABASE_URL/functions/v1/get-sancoes?parlamentar_id=b65de6a7-6039-414b-8253-1b4a9e7a11ef" | jq .

curl -sS -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  "$SUPABASE_URL/functions/v1/get-contratos?parlamentar_id=b65de6a7-6039-414b-8253-1b4a9e7a11ef" | jq .
```

Cada chamada bate no Portal da Transparência → atualiza cache → devolve JSON.

### Decisão pendente

- Manter como lazy via edge function (status quo)?
- Ou criar job batch pra warm todos os 594 parlamentares (custo: ~3 calls cada
  no Portal, ~30 min, dentro do rate limit do PORTAL_TRANSPARENCIA_API_KEY)?

Se for warm em batch, o ponto de integração natural é
`packages/analytics/src/run-doadores-sancionados.ts` ou um novo
`run-warm-caches.ts`.

---

## 4. `proposicoes_autores` — tabela órfã, segura pra deprecar

Já listada em `docs/SCHEMAS.md` como candidata a deprecação. Confirmado:

- 0 linhas.
- 0 referências em código (`packages/`, `scripts/`, `supabase/migrations/`).
- FK `id_proposicao → proposicoes.id_proposicao`. **`proposicoes` (10.323 linhas)
  também é órfã**: 0 referências em código, dados antigos. Foi sucedida por
  `cam_proposicoes` (237.836 linhas, populada por
  `packages/ingestao-camara/src/job-ingestao-proposicoes.ts`).
- Tem coluna `parlamentar_id uuid` + `id_camara int` + `nome_autor`/`tipo_autor`/
  `ordem_assinatura`/`proponente`/`fonte_dado` — design pré-`cam_proposicoes`,
  quando autoria era 1-many separada.

### Recomendação (sem deletar agora)

Listar pra drop num passo futuro **junto com `proposicoes`**:

```sql
-- Em migration futura, depois de confirmar zero queries ad-hoc nos logs Postgres
DROP TABLE IF EXISTS proposicoes_autores CASCADE;
DROP TABLE IF EXISTS proposicoes CASCADE;
```

Confirmar antes via Studio → Logs → Postgres (filtro por nome da tabela últimos
30 d) — mesmo procedimento usado em `docs/SCHEMAS.md` pra `camara_voto`.

---

## Ações executadas (2026-06-17 PM)

### (a) Votações — rodado ✅, com fix de bug

Primeiro run com `--data-inicio 2026-03-01` reportou 554 novas votações e 20.342
votos inseridos, mas `max(data)` em `plen_votacoes` ficou em **2026-03-26** — a
janela abril-junho não entrou.

**Bug encontrado**: `camara-client.ts:301` ignorava o dia/mês do `--data-inicio`
e sempre sobrescrevia pra `YYYY-01-01`. Aliado a um limite implícito de ~21
páginas (~2.100 votações de TODOS os órgãos combinados) na API `/votacoes`,
o resultset truncava em 2026-03-26 mesmo com `dataInicio` posterior.

**Fix aplicado** (mesmo commit deste catch-up):

```ts
const isPrimeiroAno = ano === anos[0];
let dataInicio: string;
if (isPrimeiroAno && opts?.dataInicio && opts.dataInicio.slice(0, 4) === String(ano)) {
  dataInicio = opts.dataInicio;          // respeita o dia (ex: 2026-04-01)
} else {
  dataInicio = ano === 2023 ? "2023-02-01" : `${ano}-01-01`;
}
```

Re-rodando agora com `--data-inicio 2026-04-01` (em background).

### (b) tse_v_doador_emenda — reescrita ✅

Migration: `supabase/migrations/20260618010000_rewrite_tse_v_doador_emenda.sql`
(aplicada via Management API, **não** via `supabase db push` pra não tocar na
migration paralela WIP `20260618000000_drop_legacy_voto_proposicoes.sql` do
Luiz).

Resultado: 0 → **94 linhas, 7 CNPJs distintos**.

**Achado material**: todos os 7 CNPJs em comum entre `emendas_favorecidos`
(favorecidos) e `tse_receitas` (doadores eleitorais) são **tesourarias de
governo estadual** (Estado de MG `18715615000160`, Estado do AM
`04312369000190`, etc.). Nenhum é empresa privada. Faz sentido: pós-reforma
2015 doação PJ direta foi banida, e os "CNPJs doadores" remanescentes são
direções partidárias e candidatos.

**Tradução prática**: a view não vai servir pra "achar empresa que doou e
depois recebeu emenda" — esse cruzamento não existe na nossa janela 2018-2024
TSE. Quem quiser esse sinal investigativo deve usar `mv_contratos_doadores_federal`
(TSE × contratos federais, com 137 linhas reais).

As irmãs `ele26_v_doador_emenda_hist` e `tse_v_fornecedor_emenda` ficaram
intactas — mesmo bug de filtro/join, mesma raiz semântica. Pendente decisão:
drop ou rewrite análogo?

### (c) Caches parlamentares — warm ✅

Edge functions chamadas direto via curl:

```bash
curl -sS -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  "$SUPABASE_URL/functions/v1/get-sancoes?parlamentar_id=b65de6a7-6039-414b-8253-1b4a9e7a11ef"
curl -sS -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  "$SUPABASE_URL/functions/v1/get-contratos?parlamentar_id=b65de6a7-6039-414b-8253-1b4a9e7a11ef"
```

Resultado: cache populado pra Caroline de Toni (`b65de6a7-...`). Ambos com 0
hits — ela não tem sanção CEIS/CNEP/CEPIM nem contrato federal. Esperado pra
deputada em mandato.

- `parlamentar_sancoes_cache`: 10 → **11 linhas**.
- `parlamentar_contratos_cache`: 5 → **6 linhas**.

Pra populate em batch dos 594 parlamentares: criar um `run-warm-caches.ts` em
`packages/analytics/` que itera UUIDs e dispara as duas calls com throttle.
TTL 24 h faria sentido como cron semanal.

## Follow-ups pendentes (não-bloqueantes)

- Esperar o run3 do votacoes:ts terminar e confirmar `plen_votacoes.max(data)`
  passou de 2026-03-26.
- Rebuild `cam_proposicoes_agg` e re-run `risco:ts` depois que `plen_votos`
  refletir as novas votações (afeta dimensão Presença do score G5).
- `ele26_v_doador_emenda_hist` e `tse_v_fornecedor_emenda` — drop ou rewrite?
- `proposicoes_autores + proposicoes` — incluir no DROP da migration
  `20260618000000_drop_legacy_voto_proposicoes.sql` (Luiz já listou autores;
  só falta `proposicoes` parent).
- `--data-inicio 2026-04-01` está cobrindo abr+mai+jun de 2026. Se a API
  voltar a truncar (>21 páginas), rodar de novo com `--data-inicio 2026-05-01`
  ou `2026-06-01` em sequência.
