# @transparencia/ingestao-mg-executivo

Ingestão de dados do **Executivo do Estado de Minas Gerais** (fiscalização de
governo, diferente do legislativo coberto pelos demais pacotes). Eixos do MVP:

1. **Supersalários** — remuneração de servidores acima do teto _(implementado: Fase 1)_
2. Diárias e viagens _(próximo)_
3. Contratos × fornecedores × empresas sancionadas _(Fase 2)_
4. Despesas / orçamento (SIAFI-MG + SISOR) _(Fase 3)_

## Fonte

CKAN de dados abertos: **https://dados.mg.gov.br** (datasets da CGE, licença
**CC-BY-4.0** → redistribuição permitida com atribuição).

⚠️ **Bloqueio de IP:** o CKAN responde **403** para IP de datacenter (igual à
ALMG). Rode de **IP residencial BR** (cron local via launchd) ou aponte
`MG_CKAN_BASE` para o **Cloudflare Worker** proxy (ver `workers/almg-proxy`).

> O portal `transparencia.mg.gov.br/api/3` **não** é CKAN — é fachada de uma SPA
> Angular (Prodemge, mar/2026). Use o `dados.mg.gov.br`.

## Variáveis de ambiente

| Var | Default | Uso |
|-----|---------|-----|
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | — | obrigatórias |
| `MG_CKAN_BASE` | `https://dados.mg.gov.br` | aponte pro proxy se precisar |
| `MG_USER_AGENT` | identifica o BR Insider | educação com o servidor |
| `MG_THROTTLE_MS` | `1500` | intervalo entre requisições |

## Uso

```bash
# 1. Aplicar a migration (uma vez)
supabase db push        # cria mg_remuneracao + views mg_remuneracao_atual / mg_supersalarios

# 2. Descobrir os datasets/resources reais (rodar de IP residencial)
npm run ingestao-mg:discover
#   → relatório no stdout + packages/ingestao-mg-executivo/discover-output.json

# 3. Ingerir remuneração a partir do resource achado no passo 2
npm run ingestao-mg:remuneracao -- --resource-url "https://dados.mg.gov.br/.../remuneracao.csv"
#   flags: --encoding latin1 | --snapshot 2026-06 | --base bruta|liquida | --teto 46366.19
```

## Pendências (confirmar com o output do discover)

- **Nomes de coluna** da fonte de remuneração: `COLMAP_PADRAO` em
  `src/job-remuneracao.ts` traz palpites; ajuste após ver o header real.
- **Teto da competência**: default `46366.19` (STF 2025/26) — confirmar o valor
  por ano de referência.
- **Encoding**: testar `utf-8` vs `latin1` no CSV real.
- Depois: jobs de diárias, contratos e despesas + páginas `/mg/*` na web.
