# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Visão geral

Monorepo TypeScript de ingestão e exibição de dados públicos do Congresso Nacional brasileiro. O banco é Supabase (PostgreSQL). O front é Next.js 16 App Router deployado na Vercel.

## Comandos essenciais

```bash
# Web (packages/web)
cd packages/web && npm run dev          # dev server
cd packages/web && npm run build        # build de produção (sempre rodar antes do deploy)
cd packages/web && npm run typecheck    # verificação TypeScript sem build

# Deploy (a partir da raiz ou de packages/web)
vercel --prod --yes

# Migrations
supabase db push --dry-run              # ver o que será aplicado
supabase db push                        # aplicar no banco remoto

# Ingestão — Portal da Transparência (packages/ingestao-portal)
npm run emendas-completas:ts -w @transparencia/ingestao-portal   # emendas 2019–2024
npm run tse-receitas:ts -w @transparencia/ingestao-portal        # receitas TSE 2022/2018
npm run ceaps-senado:ts -w @transparencia/ingestao-portal        # CEAP Senado (passa anos: "2019,2025,2026")
npm run tse-bens:ts -w @transparencia/ingestao-portal            # bens TSE (passa ano: "2022")

# Ingestão — Câmara dos Deputados (packages/ingestao-camara)
npm run votacoes:ts -w @transparencia/ingestao-camara            # votações plenário 57ª leg.
npm run proposicoes:ts -w @transparencia/ingestao-camara         # proposições de autoria (resumível)
npm run ingestao-camara:ts -w @transparencia/ingestao-camara     # deputados + CEAP câmara

# Analytics (packages/analytics)
npm run votacoes-agg:ts -w @transparencia/analytics              # agrega plen_deputado_agg
npm run ceaps:ts -w @transparencia/analytics                     # agrega ceaps_ranking
```

## Variáveis de ambiente

Copiar `.env.example` → `.env` na raiz. Os jobs de ingestão carregam dotenv da raiz automaticamente. O `packages/web` usa variáveis injetadas pelo Vercel — nunca com prefixo `NEXT_PUBLIC_`, pois tudo é server-side.

Variáveis obrigatórias:
- `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` — usadas por todos os pacotes
- `PORTAL_TRANSPARENCIA_API_KEY` — apenas `ingestao-portal`

**Atenção Vercel**: ao salvar env vars via `vercel env add`, usar `echo -n` (sem newline) ou a flag correta. Um `\n` no final da URL ou da key quebra todas as queries Supabase em produção.

## Arquitetura

```
packages/
  ingestao-portal/    Baixa CSVs/JSONs do Portal da Transparência e TSE → Supabase
  ingestao-camara/    Consome API dadosabertos.camara.leg.br → Supabase
  analytics/          RPCs e agregações pós-ingestão (rodado após cada ingestão)
  web/                Next.js 16 — único consumer público dos dados
  api/                (não usado ativamente)
  enriquecimento/     (não usado ativamente)
supabase/
  migrations/         SQL idempotente numerado por timestamp
```

### Fluxo de dados

```
Fonte externa → job de ingestão → tabelas brutas/staging → analytics (RPC) → tabelas _agg → web (read-only)
```

O `packages/web` **nunca escreve no banco** e usa apenas `SUPABASE_SERVICE_ROLE_KEY` pelo singleton `getSupabase()` em `src/lib/supabase-server.ts`. Não há anon key nem RLS ativa para as tabelas do projeto.

### Tabelas principais e períodos cobertos

| Tabela | Fonte | Período |
|--------|-------|---------|
| `emendas_completas` | Portal Transparência API | 2019–2024 |
| `ceaps_ranking` | Câmara API (CEAP) | 2023–2025 |
| `ceaps_senado` | Senado CSV | 2019–2026 |
| `plen_votacoes` + `plen_votos` | Câmara API | fev/2023–atual |
| `plen_deputado_agg` | RPC `computar_votacoes_agg` | 57ª legislatura |
| `cam_proposicoes` + `cam_proposicoes_agg` | Câmara API | 2019–2026 |
| `tse_candidatos_receitas_agg` | TSE CSV | 2018, 2022 |
| `tse_bens_candidatos` + `tse_bens_agg` | TSE CSV | 2022 |

### Web — design system

Nenhum componente de UI externo. Estilização 100% via inline styles + classes utilitárias definidas em `globals.css`:
- `bloomberg-table` — tabela de dados densa
- `bloomberg-kpi-grid` / `bloomberg-kpi` / `bloomberg-kpi-label` / `bloomberg-kpi-value`
- `bloomberg-card`
- `badge-success` / `badge-warn` / `badge-danger` / `badge-neutral`

**Não usar** `className` com valores arbitrários — não existe Tailwind puro aqui, só as classes acima e as CSS vars (`hsl(var(--primary))`, `hsl(var(--text-body))` etc.).

### Padrões Next.js 16

```typescript
// searchParams e params são sempre Promise no App Router do Next 16
export default async function Page({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ano?: string }>;
}) {
  const { id } = await params;
  const { ano } = await searchParams;
  // ...
}

// Todos os server components com dados dinâmicos precisam de:
export const dynamic = "force-dynamic";
```

### Restrições críticas da API da Câmara

- `GET /votacoes`: aceita `dataInicio` sozinho; rejeita `siglaOrgao`, `idLegislatura`, `dataFim` combinados → 400
- `GET /votacoes/{id}/votos`: **não aceita** `pagina` / `itens` → 400 se passados
- `GET /votacoes/{id}/orientacoes`: idem
- Ranges longos (> ~2 anos) com `ordem=DESC` causam 504 → estratégia: busca ano a ano com `ordem=ASC`
- Campos reais: `orientacaoVoto` (não `orientacao`) e `siglaPartidoBloco` (não `bancada.apelido`)

### Jobs de ingestão — padrões

- Todos carregam `.env` da raiz via `dotenv.config({ path: resolve(__dirname, "../../../.env") })`
- Estratégia de resume: verificam registros já existentes antes de reprocessar
- Upsert via `onConflict` explícito (nunca insert puro)
- CSVs do TSE/Senado: encoding `latin-1`, separador `;`, primeira(s) linha(s) de metadado
- Lotes de upsert: 200–500 registros para evitar timeout do PostgREST
