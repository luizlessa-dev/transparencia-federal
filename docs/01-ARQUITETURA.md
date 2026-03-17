# 01 — Arquitetura

## Visão em 5 blocos

1. **Ingestão** — Coleta fonte oficial, detecção de cobertura, persistência bruta.
2. **Enriquecimento** — Atualização financeira, cursor/lote/retomada, camada intermediária.
3. **Analytics** — Consolidação por parlamentar, ranking, snapshots, build em staging.
4. **API pública** — Somente leitura da camada publicada; contratos estáveis.
5. **Frontend** — Interface institucional; consome apenas a API.

## Regras de fronteira

- Pipeline (1→2→3) não é exposto ao público.
- API e frontend não acessam tabelas brutas nem de build.
- Publicação do ranking é etapa explícita (job_publicar_ranking) após validação.

## Stack

- Supabase: banco, auth técnica.
- Next.js: frontend e, se desejado, API routes.
- TypeScript em todo o projeto.
- Monorepo; docs em `/docs`; secrets via env.
