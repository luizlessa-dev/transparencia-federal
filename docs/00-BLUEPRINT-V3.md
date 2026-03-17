# Transparência Federal v3 — Blueprint Técnico

Documento de arquitetura e decisões estruturais. Primeira entrega: blueprint completo, sem implementação.

---

## 1. Objetivo da fase (Blueprint)

Definir a arquitetura completa da v3, os erros a evitar, a estrutura do repositório, o modelo de dados, os jobs, as políticas e o roadmap do MVP, para que toda implementação seja guiada por decisões explícitas e rastreáveis.

---

## 2. Diagnóstico — Erros estruturais que a v3 deve evitar

| Problema | Impacto | Mitigação na v3 |
|----------|---------|-----------------|
| **Excesso de funções e orquestração fragmentada** | Manutenção caótica, bugs em pontos obscuros | Poucas funções/jobs bem nomeados; orquestração em um único fluxo documentado |
| **Lógica crítica espalhada** | Imprevisibilidade, reprocessamento arriscado | Lógica crítica em camadas dedicadas (ingestão → enriquecimento → analytics); rastreabilidade por tabelas de execução |
| **Schemas ambíguos** | Dúvida sobre origem e uso dos dados | Tabelas com responsabilidade única; nomenclatura em português; documentação de schema em `/docs` |
| **Mistura ETL + publicação + frontend** | Acoplamento, deploy frágil, difícil evolução | Separação clara: pipeline (ingestão/enriquecimento/analytics) → API pública (somente leitura) → frontend (consome API) |
| **Baixa previsibilidade operacional** | Falhas silenciosas, cron obscuro | Observabilidade desde o início; `execucoes_pipeline` e `execucoes_pipeline_etapas`; cron explícito em doc |
| **Dificuldade de reprocessamento** | Retrabalho manual, inconsistências | Política de reprocessamento por ano/lote; cursor e retomada; nunca sobrescrever sem controle |
| **Observabilidade insuficiente** | Debug difícil, SLA indefinido | Logs estruturados, etapas registradas, status de cobertura exposto via API |
| **Manutenção difícil** | Custo alto para mudanças | Princípios obrigatórios; cada migration/job com responsabilidade única; documentação obrigatória |

**Resumo:** A v3 evita esses erros priorizando simplicidade, separação de camadas, responsabilidade única e observabilidade desde o desenho.

---

## 3. Decisão arquitetural

### 3.1 Visão em 5 blocos

- **Bloco 1 — Ingestão:** coleta da fonte oficial (Portal da Transparência), detecção de cobertura por ano, persistência em tabela bruta. Sem lógica de negócio além de “trazer e gravar”.
- **Bloco 2 — Enriquecimento:** atualização de empenhado/liquidado/pago; reprocessamento seguro com cursor/lote/retomada; escrita em camada intermediária, nunca direto na tabela pública.
- **Bloco 3 — Analytics:** consolidação por parlamentar, geração de ranking, snapshots; build em tabela de staging (`ranking_parlamentar_build`) antes da promoção.
- **Bloco 4 — API pública:** somente leitura sobre camada publicada (`ranking_parlamentar`, `cobertura_dados`, etc.); contratos estáveis; zero exposição de tabelas brutas.
- **Bloco 5 — Frontend:** interface institucional; transparência metodológica; consumo exclusivo da API pública.

### 3.2 Princípios aplicados

- **Simplicidade antes de sofisticação:** não criar camadas ou jobs sem justificativa.
- **Separação clara:** ingestão → enriquecimento → transformação analítica → publicação.
- **Publicação explícita:** ranking público só após build analítico validado; promoção é passo documentado.
- **Não criar complexidade invisível:** sem caches não documentados; sem lógica crítica espalhada.
- **Stack preferencial mantida:** Supabase (banco + auth técnica), Next.js (frontend), TypeScript, monorepo simples, edge functions/jobs mínimos, docs em `/docs`, secrets via env.

---

## 4. Estrutura proposta

### 4.1 Estrutura de pastas do repositório

```
transparencia-v3/
├── .cursor/
├── .github/
│   └── workflows/           # CI (lint, typecheck, testes)
├── docs/
│   ├── 00-BLUEPRINT-V3.md   # Este documento
│   ├── 01-ARQUITETURA.md
│   ├── 02-MODELO-DADOS.md
│   ├── 03-PIPELINE-E-JOBS.md
│   ├── 04-API-PUBLICA.md
│   ├── 05-POLITICAS.md      # Publicação, reprocessamento, cron
│   └── 06-ROADMAP-MVP.md
├── packages/
│   ├── ingestao/            # Coleta Portal da Transparência
│   │   ├── src/
│   │   ├── package.json
│   │   └── tsconfig.json
│   ├── enriquecimento/      # Atualização financeira, cursor/lote
│   │   ├── src/
│   │   ├── package.json
│   │   └── tsconfig.json
│   ├── analytics/           # Ranking, snapshots, build
│   │   ├── src/
│   │   ├── package.json
│   │   └── tsconfig.json
│   ├── api/                 # API pública (Next.js API routes ou Supabase Edge)
│   │   ├── src/
│   │   ├── package.json
│   │   └── tsconfig.json
│   └── web/                 # Frontend Next.js
│       ├── src/
│       ├── app/
│       ├── package.json
│       └── tsconfig.json
├── supabase/
│   ├── migrations/          # Schema e tabelas
│   └── config.toml
├── scripts/                 # Utilitários (seed, dev, reprocessar)
├── package.json             # Monorepo (workspaces)
├── tsconfig.base.json
├── .env.example
└── README.md
```

- **Regra:** pipeline (ingestao, enriquecimento, analytics) pode rodar como jobs agendados ou edge functions; API e web são serviços de leitura e apresentação.

### 4.2 Lista mínima de tabelas do banco

| Tabela | Responsabilidade | Camada |
|--------|------------------|--------|
| **emendas_brutas** | Dados crus da ingestão (Portal da Transparência); uma linha por emenda/ano conforme fonte | Bruta |
| **emendas_financeiro** | Emendas com valores de empenhado, liquidado, pago; resultado do enriquecimento; chave estável para reprocessamento | Intermediária |
| **parlamentares** | Cadastro/identificador de parlamentar (nome, partido, uf, etc.); pode ser derivado da ingestão ou de fonte auxiliar | Referência |
| **ranking_parlamentar_build** | Ranking calculado por build; staging antes de virar público | Analytics (staging) |
| **ranking_parlamentar** | Ranking publicado; somente leitura pela API e frontend | Publicada |
| **snapshots_ranking** | Snapshots históricos do ranking (por data de build); auditoria e série temporal | Analytics |
| **cobertura_dados** | Metadados de cobertura por ano (última ingestão, status, anos disponíveis) | Operacional/API |
| **execucoes_pipeline** | Registro de cada execução do pipeline (job, início, fim, status) | Operacional |
| **execucoes_pipeline_etapas** | Etapas dentro de uma execução (ingestão ano X, enriquecimento lote Y, etc.) | Operacional |

**Não criar:** tabelas “cache” sem justificativa; tabelas que misturam bruto com público; tabelas ambíguas (ex.: “emendas” sem sufixo que indique camada).

### 4.3 Lista mínima de funções/jobs

| Job/Função | Responsabilidade | Disparo |
|------------|------------------|---------|
| **job_ingestao_emendas** | Chamar API Portal da Transparência (API key via secret); detectar anos com dados; persistir em `emendas_brutas`; registrar em `execucoes_pipeline` / `execucoes_pipeline_etapas` | Cron (ex.: diário) ou manual |
| **job_enriquecimento_financeiro** | Ler de `emendas_brutas`, atualizar empenhado/liquidado/pago, escrever em `emendas_financeiro`; usar cursor/lote e retomada; registrar etapas | Cron ou após ingestão |
| **job_analytics_ranking** | Calcular ranking a partir de `emendas_financeiro` (e `parlamentares`); escrever em `ranking_parlamentar_build`; gerar snapshot em `snapshots_ranking` | Após enriquecimento |
| **job_publicar_ranking** | Validar `ranking_parlamentar_build`; copiar/promover para `ranking_parlamentar`; atualizar `cobertura_dados` se necessário | Após analytics; manual ou automático com validação |
| **Atualização de cobertura** | Atualizar `cobertura_dados` (anos disponíveis, última execução) | Incluso em job_ingestao ou job_publicar |

**Não criar:** jobs redundantes; job que “reconstrói” ranking direto na tabela pública; API pública como etapa do pipeline.

### 4.4 Fluxo de dados ponta a ponta

```
[Portal da Transparência]
         │
         ▼
  job_ingestao_emendas  ──► emendas_brutas
         │                      │
         │                      ▼
         │              job_enriquecimento_financeiro
         │                      │
         │                      ▼
         │                 emendas_financeiro
         │                      │
         │                      ▼
         │              job_analytics_ranking
         │                      │
         │                      ├──► ranking_parlamentar_build
         │                      └──► snapshots_ranking
         │                      │
         │                      ▼
         │              job_publicar_ranking (validação)
         │                      │
         │                      ▼
         │                 ranking_parlamentar
         │                 cobertura_dados
         │                      │
         ▼                      ▼
  execucoes_pipeline    [API Pública] ◄── somente leitura
  execucoes_pipeline_etapas     │
                               ▼
                        [Frontend]
```

- **Frontend** e **API** não acessam `emendas_brutas`, `emendas_financeiro` nem `ranking_parlamentar_build`; apenas a camada publicada e `cobertura_dados` (e metodologia/status).

### 4.5 Política de publicação do ranking

- O ranking público é **somente** a tabela `ranking_parlamentar`.
- Nada escreve direto em `ranking_parlamentar` exceto o **job_publicar_ranking**.
- **job_analytics_ranking** escreve apenas em `ranking_parlamentar_build` e em `snapshots_ranking`.
- **Promoção:** job_publicar_ranking valida (ex.: consistência, existência de dados, regras de negócio); se OK, substitui o conteúdo de `ranking_parlamentar` pelo de `ranking_parlamentar_build` (ou mecanismo equivalente atômico).
- Metodologia do ranking é documentada e exposta via endpoint de metodologia; a API de ranking retorna apenas dados já publicados.

### 4.6 Política de reprocessamento

- **Por ano:** ingestão e enriquecimento devem permitir reprocessar um ano específico (ex.: 2023) sem apagar outros anos; uso de chave (ex.: ano + identificador da emenda).
- **Por lote/cursor:** enriquecimento em lotes com cursor e retomada; falha em um lote não invalida os já processados; etapas registradas em `execucoes_pipeline_etapas`.
- **Reprocessamento total:** sequência explícita: ingestão (todos os anos cobertos) → enriquecimento → analytics → publicação; nunca “sobrescrever tabela pública direto” sem passar pelo build.
- **Secrets:** API key e demais segredos via variáveis de ambiente/secrets; nunca no código.

---

## 5. Próximo passo técnico

Após aprovação deste blueprint:

1. **Criar repositório e estrutura de pastas** conforme § 4.1.
2. **Documentar em `/docs`** os arquivos 01 a 06 (arquitetura, modelo de dados, pipeline e jobs, API pública, políticas, roadmap).
3. **Especificar o schema** de cada tabela em `02-MODELO-DADOS.md` e gerar a primeira migration Supabase (sem dados, só estrutura).
4. **Implementar Fase 1:** ingestão (job + tabela `emendas_brutas` + `execucoes_pipeline` / `execucoes_pipeline_etapas` + cobertura).

Não iniciar enriquecimento, analytics ou frontend antes de validar a ingestão e a persistência bruta.

---

## 6. Riscos e cuidados

| Risco | Mitigação |
|-------|-----------|
| API do Portal instável ou mudando contrato | Tratar ingestão como fonte única; versionar contrato em doc; ter fallback de “sem dados” (ex.: 2025/2026 array vazio) sem quebrar pipeline |
| Reprocessamento parcial corromper dados | Chaves estáveis; reprocessar por ano/lote; nunca atualizar tabela pública sem passar por build validado |
| Expor dados brutos por engano | API e frontend só acessam camada publicada; RLS/roles no Supabase para separar leitura pública de escrita do pipeline |
| Cron e jobs mal definidos | Documentar em `05-POLITICAS.md` e no README: frequência, ordem, e quem dispara cada job |
| Complexidade crescente | Revisar cada nova tabela/job contra “responsabilidade única” e “simplicidade antes de sofisticação” |

---

## 7. Roadmap do MVP em fases

| Fase | Objetivo | Entregas |
|------|----------|----------|
| **F0** | Blueprint e docs | Este documento; estrutura de pastas; docs 01–06 |
| **F1** | Ingestão | Schema `emendas_brutas`, `cobertura_dados`, `execucoes_pipeline`, `execucoes_pipeline_etapas`; job_ingestao_emendas; API key por secret; cobertura 2023/2024 |
| **F2** | Enriquecimento | Tabela `emendas_financeiro`; job_enriquecimento_financeiro com cursor/lote/retomada |
| **F3** | Analytics | Tabelas `parlamentares`, `ranking_parlamentar_build`, `snapshots_ranking`; job_analytics_ranking |
| **F4** | Publicação | Tabela `ranking_parlamentar`; job_publicar_ranking; política de validação |
| **F5** | API pública | Endpoints: ranking, parlamentar, metodologia, cobertura/status; somente leitura |
| **F6** | Frontend | Home, ranking, metodologia, sobre, página de parlamentar, página de cobertura/fonte |

Validação entre fases: não avançar para F(n+1) sem validar F(n).

---

## 8. O que reaproveitar das versões anteriores

- **Fonte e contrato:** confirmação de que a ingestão confiável vem do Portal da Transparência; endpoint e formato já validados para 2023 e 2024.
- **Regras de negócio:** qualquer regra já consolidada sobre “o que é uma emenda”, “como agregar por parlamentar” e “como calcular o ranking” pode ser reutilizada na camada de analytics, reimplementada de forma limpa.
- **Textos e metodologia:** conteúdo de metodologia, sobre e explicações para jornalistas/pesquisadores pode ser reaproveitado no frontend e no endpoint de metodologia.
- **Nada de código legado:** reaproveitar apenas conhecimento e decisões de produto/dados; código será novo.

---

## 9. O que descartar definitivamente

- Código das versões anteriores (evitar copiar/colar; reescrever com arquitetura limpa).
- Tabelas ou jobs que misturam ETL com publicação ou com frontend.
- Orquestração fragmentada e funções com responsabilidades múltiplas ou obscuras.
- Qualquer acesso do frontend a tabelas brutas ou de staging.
- Caches ou tabelas “temporárias” sem nome e responsabilidade claros.
- Assunção de que payload bruto substitui reingestão oficial (a fonte da verdade é a ingestão do Portal).
- Jobs que escrevem ranking direto na tabela pública sem camada de build e validação.

---

*Documento vivo: atualizar em `/docs` conforme decisões forem refinadas na implementação.*
