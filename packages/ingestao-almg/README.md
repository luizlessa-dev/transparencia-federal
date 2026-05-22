# @transparencia/ingestao-almg

Ingestão de dados da Assembleia Legislativa de Minas Gerais (ALMG).
Primeiro nó estadual da plataforma Transparência Federal.

## Por que esse pacote existe (e o que ele NÃO usa)

A ALMG publica um CSV "oficial" de verba indenizatória em
`dadosabertos.almg.gov.br/arquivo/verbas-indenizatorias/download`. **Esse CSV
é inutilizável** — 167k linhas, mas as colunas críticas (ValorDespesa,
ValorReembolso, Emitente, CpfCnpj, Emissao) estão **vazias em 100% dos
registros** em todo o escopo histórico (2019-2026). Foi confirmado em spike
em 2026-05-21.

O dado real só aparece na página HTML de detalhe, renderizada no servidor
em resposta a um POST com `periodo=MMYYYY`. O parser deste pacote raspa
essa página.

## Fontes

| Dataset | Origem | Formato |
|---|---|---|
| Deputados em exercício | `dadosabertos.almg.gov.br/api/v2/deputados/em_exercicio` | XML |
| Verba indenizatória | `www.almg.gov.br/transparencia/.../verba-indenizatoria/detalhe.html` | HTML (POST `periodo=MMYYYY`) |

## Rate limit

ALMG limita a 2 requests simultâneas com intervalo mínimo de 1s. Bloqueia
sem aviso se descumprido. O cliente respeita 1.1s por padrão (`Throttle`).

## Schema Supabase

Migration: `supabase/migrations/20260522090000_create_almg_verba.sql`

- `public.almg_deputados` — lista de deputados
- `public.almg_verba_indenizatoria` — 1 linha = 1 nota fiscal
- `public.almg_verba_resumo_mensal` (view) — agregado por deputado/mês

Ambas com RLS habilitada: leitura pública, escrita só por service_role.

## Comandos

```bash
# Variáveis necessárias no .env raiz do monorepo:
#   SUPABASE_URL
#   SUPABASE_SERVICE_ROLE_KEY

# 1. Lista de deputados (rodar uma vez por legislatura)
npm run deputados:ts -w @transparencia/ingestao-almg

# 2. Verba do mês corrente
npm run verba:ts -w @transparencia/ingestao-almg

# 3. Verba de um mês específico
npm run verba:ts -w @transparencia/ingestao-almg -- 4 2026

# 4. Verba de um mês, só pra deputados específicos
npm run verba:ts -w @transparencia/ingestao-almg -- 4 2026 12193,28859

# 5. Load histórico completo (2019-01 → hoje) — ~2h
npm run verba:historico:ts -w @transparencia/ingestao-almg

# 6. Histórico de um intervalo
npm run verba:historico:ts -w @transparencia/ingestao-almg -- 2024-01 2024-12
```

## Volume estimado

- 77 deputados na 20ª legislatura
- ~7 anos de histórico (2019-2026)
- ~7.400 requests pro load inicial × 1.1s ≈ 2h15min
- Incremental mensal: 77 requests ≈ 1min30s

## Idempotência

Tudo upsertado. Reexecutar o mesmo período não duplica linhas (UNIQUE INDEX
em `(deputado, ano, mes, num_doc, cnpj, categoria, valor)`).

## Observações

- O badge "total da categoria" na página representa a soma de
  `valor_reembolso`, não `valor_despesa`. Em reembolsos parciais, despesa
  pode ser > reembolso. Usar `valor_reembolso` como métrica de gasto público.
- O endpoint API `dadosabertos.almg.gov.br/api/v2/verbas-indenizatorias*`
  retorna 500 em todas as variantes — não existe. Não tente.
