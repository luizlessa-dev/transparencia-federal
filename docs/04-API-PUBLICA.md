# 04 — API pública

## Contratos (MVP)

- **GET ranking** — Ranking publicado (ranking_parlamentar).
- **GET parlamentar/:id** — Detalhe do parlamentar (dados publicados).
- **GET metodologia** — Texto/estrutura da metodologia do ranking.
- **GET cobertura** ou **GET status** — Cobertura por ano e status da última execução (cobertura_dados).

## Regras

- Somente leitura.
- Nenhum endpoint expõe emendas_brutas, emendas_financeiro ou ranking_parlamentar_build.
- Contratos estáveis; versionamento se necessário.
