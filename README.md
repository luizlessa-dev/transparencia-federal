# Transparência Federal v3

Plataforma de inteligência institucional e dados públicos sobre o Congresso Nacional (emendas parlamentares, execução financeira, ranking analítico).

## Documentação

- [Blueprint e arquitetura](docs/00-BLUEPRINT-V3.md)
- [Modelo de dados](docs/02-MODELO-DADOS.md)
- [Pipeline e jobs](docs/03-PIPELINE-E-JOBS.md)
- [Roadmap MVP](docs/06-ROADMAP-MVP.md)

## Estrutura

Monorepo com pacotes em `packages/`: ingestao, enriquecimento, analytics, api, web. Banco e migrations em `supabase/`.

## Desenvolvimento

- Configurar variáveis a partir de `.env.example` (raiz do repo).
- Migrations: `supabase db push` (ou fluxo Supabase adotado).
- **Fase 1 (ingestão):** job implementado em `packages/ingestao`. Executar com `npm run ingestao` (requer SUPABASE_* e PORTAL_TRANSPARENCIA_API_KEY). Ver `docs/08-FASE-1-INGESTAO.md`.
