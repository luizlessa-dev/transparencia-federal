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

# Deploy — SEMPRE a partir de packages/web (não da raiz)
# A raiz instala todos os workspaces incluindo ingestao-almg (jsdom/tsx), o que
# falha no ambiente Vercel. De dentro de packages/web, só as deps do Next.js são instaladas.
cd packages/web && vercel --prod --yes

# Migrations
supabase db push --dry-run              # ver o que será aplicado
supabase db push                        # aplicar no banco remoto

# Ingestão — Portal da Transparência (packages/ingestao-portal)
npm run emendas-completas:ts -w @transparencia/ingestao-portal   # emendas via API (até 2024)
npm run emendas-csv:ts -w @transparencia/ingestao-portal -- /caminho/EmendasParlamentares.csv 2025,2026  # CSV bulk do Portal (2015–2026)
npm run tse-receitas:ts -w @transparencia/ingestao-portal        # receitas TSE 2022/2018
npm run ceaps-senado:ts -w @transparencia/ingestao-portal        # CEAP Senado (passa anos: "2019,2025,2026")
npm run ceaps:ts -w @transparencia/ingestao-camara               # CEAP Câmara — deputados ATUAIS (57ª leg.) por ano via API
npm run ceaps-historico:ts -w @transparencia/ingestao-camara    # CEAP Câmara histórico — CSV bulk (qualquer ano, inclui deputados de outras legislaturas)
npm run tse-bens:ts -w @transparencia/ingestao-portal            # bens TSE (passa ano: "2022")

# Ingestão — Câmara dos Deputados (packages/ingestao-camara)
npm run votacoes:ts -w @transparencia/ingestao-camara            # votações plenário 57ª leg.
npm run proposicoes:ts -w @transparencia/ingestao-camara         # proposições de autoria (resumível)
npm run ingestao-camara:ts -w @transparencia/ingestao-camara     # deputados + CEAP câmara
npm run frentes-comissoes:ts -w @transparencia/ingestao-camara  # frentes parlamentares + comissões permanentes
npm run mandatos:ts -w @transparencia/ingestao-camara            # mandatos anteriores + ocupações por deputado

# Analytics (packages/analytics)
npm run votacoes-agg:ts -w @transparencia/analytics              # agrega plen_deputado_agg
npm run ceaps:ts -w @transparencia/analytics                     # agrega ceaps_ranking
npm run risco:ts -w @transparencia/analytics                     # recalcula score G5 de risco composto
npm run cpf-enrich:ts -w @transparencia/analytics                # enriquece cam_parlamentar_risco com CPF (Câmara API)
npm run doadores-sancionados:ts -w @transparencia/analytics      # cruza top_doadores TSE × portal_sancionados
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

O `packages/web` **nunca escreve no banco** exceto via Server Actions de auth, e usa `SUPABASE_SERVICE_ROLE_KEY` para todas as operações (leitura de dados + auth). Não há anon key. RLS está ativa apenas nas tabelas `user_profiles` e `codigos_acesso`.

### Tabelas principais e períodos cobertos

| Tabela | Fonte | Período |
|--------|-------|---------|
| `emendas_completas` | Portal Transparência API + CSV bulk | 2015–2026 |
| `ceaps_brutas` | Câmara CSV bulk + API | 2019–2026 (histórico: 2019–2022 via CSV bulk; atual: 2023–2026 via API) |
| `ceaps_ranking` | Câmara API (CEAP) | 2023–2025 |
| `ceaps_senado` | Senado CSV | 2019–2026 |
| `plen_votacoes` + `plen_votos` | Câmara API | fev/2023–atual |
| `plen_deputado_agg` | RPC `computar_votacoes_agg` | 57ª legislatura |
| `cam_proposicoes` + `cam_proposicoes_agg` | Câmara API | 2019–2026 |
| `tse_candidatos_receitas_agg` | TSE CSV | 2018, 2022 |
| `tse_bens_candidatos` + `tse_bens_agg` | TSE CSV | 2018, 2022 (dep. federais + senadores) |
| `cam_parlamentar_risco` | analytics/run-risco.ts | score G5, CPF, mandatos, frentes, comissões |
| `cam_frentes` + `cam_frentes_membros` | Câmara API `/frentes` | 57ª legislatura (319 frentes) |
| `cam_comissoes` + `cam_comissoes_membros` | Câmara API `/orgaos` | Comissões permanentes (30) |
| `user_profiles` | Supabase Auth trigger | plano free/individual/institucional + validade |
| `codigos_acesso` | manual via SQL/Studio | códigos enviados por e-mail para ativar plano |

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

### Score G5 de risco (`cam_parlamentar_risco`)

Score composto por 5 dimensões: CEAP×0.30 + Presença×0.20 + Produção×0.15 + Financiamento×0.20 + RP9×0.15.
Colunas adicionadas ao longo das sprints: `cpf`, `total_legislaturas`, `primeira_legislatura`, `cargo_anterior`, `total_frentes`, `total_comissoes`.
Join TSE×Câmara é feito por CPF (nome parlamentar ≠ nome civil). Rodar `cpf-enrich:ts` antes de `risco:ts` se houver novos deputados.

### Autenticação e paywall

O sistema usa `@supabase/ssr` v0.10.3 com cookies de sessão. Toda lógica de auth é server-side.

**Arquivos-chave:**
- `packages/web/src/lib/supabase-auth.ts` — `createAuthClient()`, `getUser()`, `getPlano()`, `hasPaidAccess()`
- `packages/web/middleware.ts` — protege rotas; redireciona para `/login?next=<path>` se sem sessão
- `packages/web/app/auth/confirm/route.ts` — callback de confirmação de e-mail (troca `?code=` por sessão)

**Rotas de auth:**

| Rota | Tipo | Descrição |
|------|------|-----------|
| `/login` | Page + Action | Login com e-mail/senha |
| `/cadastro` | Page + Action | Cadastro; envia e-mail de confirmação |
| `/logout` | Route (POST) | SignOut + redirect para `/` |
| `/auth/confirm` | Route (GET) | Callback de confirmação de e-mail |
| `/ativar` | Page + Action | Usuário digita código → upgrada plano |
| `/conta` | Page | Plano atual, validade, logout |
| `/planos` | Page | Pricing: Gratuito / Individual / Institucional |

**Rotas protegidas pelo middleware** (requerem sessão ativa):
`/risco/[id]`, `/frentes/[id]`, `/ranking`, `/patrimonios`, `/amendments`, `/expenses`, `/funding`, `/senate-expenses`, `/proposicoes`, `/voting`, `/sancionados`, `/rp9`, `/conta`, `/ativar`

**Planos:** `free` (padrão), `individual`, `institucional`. Armazenados em `user_profiles.plano` com `plano_valido_ate`.

**Truncagem free em `/risco`:** usuários free veem apenas top 10, sem filtros de partido/UF. `hasPaidAccess(user.id)` retorna `false` para free ou plano expirado.

**Criar código de acesso:**
```sql
INSERT INTO codigos_acesso (codigo, plano, validade_dias)
VALUES ('BR-2026-XXXX', 'individual', 365);
```

**Supabase Dashboard — URL Configuration obrigatória:**
- Site URL: `https://www.thebrinsider.com`
- Redirect URLs: `https://www.thebrinsider.com/**`

### Jobs de ingestão — padrões

- Todos carregam `.env` da raiz via `dotenv.config({ path: resolve(__dirname, "../../../.env") })`
- Estratégia de resume: verificam registros já existentes antes de reprocessar
- Upsert via `onConflict` explícito (nunca insert puro)
- CSVs do TSE/Senado: encoding `latin-1`, separador `;`, primeira(s) linha(s) de metadado
- Lotes de upsert: 200–500 registros para evitar timeout do PostgREST
- Supabase tem limite de 1000 linhas por query — usar `.range()` paginado para tabelas com > 1000 registros
- Câmara API: throttle 150ms entre chamadas; alguns endpoints retornam membros duplicados (frentes/comissões) — deduplicate com `Set` antes do upsert
- Frentes/comissões: membros externos (senadores sem ID de deputado) têm `m.id = null` — filtrar com `.filter((m) => m.id != null)` antes do upsert
