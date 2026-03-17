# 02 — Modelo de dados

Documento técnico do schema relacional. Responsabilidade única por tabela; nomenclatura em português.

---

## Classificação das tabelas

| Classificação | Tabelas | Uso |
|---------------|---------|-----|
| **Operacional** | execucoes_pipeline, execucoes_pipeline_etapas, cobertura_dados | Rastreabilidade, cron, status; API pode ler cobertura_dados |
| **Bruta** | emendas_brutas | Saída da ingestão; apenas pipeline |
| **Intermediária** | emendas_financeiro | Enriquecimento; apenas pipeline |
| **Referência** | parlamentares | Cadastro; pipeline e API (leitura) |
| **Analítica (staging)** | ranking_parlamentar_build, snapshots_ranking | Build e histórico; apenas pipeline |
| **Pública** | ranking_parlamentar | Exposição via API e frontend |

---

## Dependências entre tabelas

```
parlamentares                    (sem FK)
execucoes_pipeline                (sem FK)
emendas_brutas                    (sem FK)
cobertura_dados                   (sem FK)

execucoes_pipeline_etapas         → execucoes_pipeline
emendas_financeiro                → parlamentares (opcional)
ranking_parlamentar_build         → parlamentares
ranking_parlamentar               → parlamentares
snapshots_ranking                 (sem FK)
```

Ordem de criação na migration: parlamentares → execucoes_pipeline → execucoes_pipeline_etapas → emendas_brutas → cobertura_dados → emendas_financeiro → ranking_parlamentar_build → ranking_parlamentar → snapshots_ranking.

---

## 1. parlamentares

**Finalidade:** Cadastro de parlamentar (nome, partido, UF). Pode ser derivado da ingestão ou de fonte auxiliar. Referenciado por emendas_financeiro e rankings.

| Coluna | Tipo | Restrições | Descrição |
|--------|------|------------|-----------|
| id | uuid | PK, DEFAULT gen_random_uuid() | Identificador estável |
| nome | text | NOT NULL | Nome do parlamentar |
| partido | text | | Sigla do partido |
| uf | text | | Unidade da Federação |
| id_externo | text | | Identificador na fonte (Portal ou outra) |
| created_at | timestamptz | NOT NULL, DEFAULT now() | |
| updated_at | timestamptz | NOT NULL, DEFAULT now() | |

**Índices:** (nenhum adicional além da PK para MVP).  
**Uniques:** opcional UNIQUE(id_externo) se a fonte garantir unicidade.

---

## 2. emendas_brutas

**Finalidade:** Dados crus da ingestão (Portal da Transparência). Uma linha por emenda/ano conforme retorno da API. Reprocessamento por ano: upsert por (ano, id_externo).

| Coluna | Tipo | Restrições | Descrição |
|--------|------|------------|-----------|
| id | uuid | PK, DEFAULT gen_random_uuid() | |
| ano | int | NOT NULL | Ano de referência |
| id_externo | text | NOT NULL | ID na API do Portal |
| dados | jsonb | NOT NULL | Payload bruto ou campos normalizados mínimos |
| created_at | timestamptz | NOT NULL, DEFAULT now() | |

**Uniques:** UNIQUE(ano, id_externo).  
**Índices:** CREATE INDEX idx_emendas_brutas_ano ON emendas_brutas(ano);  
**Classificação:** bruta.

---

## 3. cobertura_dados

**Finalidade:** Metadados de cobertura por ano (última ingestão, status, total de registros). Usado pelo job de ingestão e exposto pela API de cobertura/status.

| Coluna | Tipo | Restrições | Descrição |
|--------|------|------------|-----------|
| ano | int | PK | Ano de referência |
| ultima_ingestao_em | timestamptz | | Última execução de ingestão para este ano |
| status | text | | ok, erro, vazio, etc. |
| total_registros | int | | Quantidade de registros ingeridos no ano |
| created_at | timestamptz | NOT NULL, DEFAULT now() | |
| updated_at | timestamptz | NOT NULL, DEFAULT now() | |

**Classificação:** operacional (API pode ler).

---

## 4. execucoes_pipeline

**Finalidade:** Registro de cada execução de job (ingestão, enriquecimento, etc.): início, fim, status. Base da observabilidade.

| Coluna | Tipo | Restrições | Descrição |
|--------|------|------------|-----------|
| id | uuid | PK, DEFAULT gen_random_uuid() | |
| job_nome | text | NOT NULL | Nome do job (ex.: job_ingestao_emendas) |
| iniciado_em | timestamptz | NOT NULL, DEFAULT now() | |
| finalizado_em | timestamptz | | Preenchido ao terminar |
| status | text | NOT NULL | em_andamento, sucesso, erro |
| detalhes | jsonb | | Payload livre para erros, contagens, etc. |
| created_at | timestamptz | NOT NULL, DEFAULT now() | |

**Índices:** CREATE INDEX idx_execucoes_pipeline_job_iniciado ON execucoes_pipeline(job_nome, iniciado_em DESC);  
**Classificação:** operacional.

---

## 5. execucoes_pipeline_etapas

**Finalidade:** Etapas dentro de uma execução (ex.: ingestão ano 2023, enriquecimento lote 1). Rastreabilidade fina.

| Coluna | Tipo | Restrições | Descrição |
|--------|------|------------|-----------|
| id | uuid | PK, DEFAULT gen_random_uuid() | |
| execucao_id | uuid | NOT NULL, FK → execucoes_pipeline(id) ON DELETE CASCADE | |
| etapa_nome | text | NOT NULL | Nome da etapa |
| iniciado_em | timestamptz | NOT NULL, DEFAULT now() | |
| finalizado_em | timestamptz | | |
| status | text | NOT NULL | em_andamento, sucesso, erro |
| detalhes | jsonb | | |
| created_at | timestamptz | NOT NULL, DEFAULT now() | |

**Índices:** CREATE INDEX idx_execucoes_pipeline_etapas_execucao ON execucoes_pipeline_etapas(execucao_id);  
**Classificação:** operacional.

---

## 6. emendas_financeiro

**Finalidade:** Emendas com valores de empenhado, liquidado e pago; resultado do enriquecimento. Chave estável (ano, id_externo) para reprocessamento por ano/lote.

| Coluna | Tipo | Restrições | Descrição |
|--------|------|------------|-----------|
| id | uuid | PK, DEFAULT gen_random_uuid() | |
| ano | int | NOT NULL | Ano de referência |
| id_externo | text | NOT NULL | Mesmo id_externo da emenda bruta (vínculo lógico) |
| parlamentar_id | uuid | FK → parlamentares(id) ON DELETE SET NULL | Preenchido no enriquecimento ou analytics |
| valor_empenhado | numeric(18,2) | NOT NULL, DEFAULT 0 | |
| valor_liquidado | numeric(18,2) | NOT NULL, DEFAULT 0 | |
| valor_pago | numeric(18,2) | NOT NULL, DEFAULT 0 | |
| created_at | timestamptz | NOT NULL, DEFAULT now() | |
| updated_at | timestamptz | NOT NULL, DEFAULT now() | |

**Uniques:** UNIQUE(ano, id_externo).  
**Índices:** idx_emendas_financeiro_ano, idx_emendas_financeiro_parlamentar ON emendas_financeiro(parlamentar_id).  
**Classificação:** intermediária.

---

## 7. ranking_parlamentar_build

**Finalidade:** Ranking calculado por build; staging antes da publicação. Cada execução do job_analytics_ranking gera um build_id e insere linhas aqui; job_publicar_ranking valida e copia para ranking_parlamentar.

| Coluna | Tipo | Restrições | Descrição |
|--------|------|------------|-----------|
| id | uuid | PK, DEFAULT gen_random_uuid() | |
| build_id | uuid | NOT NULL | Identificador do build (gerado pelo job; não é FK) |
| parlamentar_id | uuid | NOT NULL, FK → parlamentares(id) ON DELETE CASCADE | |
| ano | int | NOT NULL | Ano do ranking |
| posicao | int | NOT NULL | Posição no ranking (1-based) |
| valor_total | numeric(18,2) | NOT NULL | Valor agregado usado no ranking |
| metricas | jsonb | | Outras métricas opcionais |
| created_at | timestamptz | NOT NULL, DEFAULT now() | |

**Uniques:** UNIQUE(build_id, parlamentar_id, ano).  
**Índices:** idx_ranking_parlamentar_build_build ON ranking_parlamentar_build(build_id); idx_ranking_parlamentar_build_parlamentar_ano ON ranking_parlamentar_build(parlamentar_id, ano).  
**Classificação:** analítica (staging).

---

## 8. ranking_parlamentar

**Finalidade:** Ranking publicado; única tabela de ranking exposta pela API e pelo frontend. Só job_publicar_ranking escreve aqui.

| Coluna | Tipo | Restrições | Descrição |
|--------|------|------------|-----------|
| parlamentar_id | uuid | NOT NULL, PK, FK → parlamentares(id) ON DELETE CASCADE | |
| ano | int | NOT NULL, PK | Ano do ranking |
| posicao | int | NOT NULL | Posição no ranking |
| valor_total | numeric(18,2) | NOT NULL | Valor agregado |
| metricas | jsonb | | |
| atualizado_em | timestamptz | NOT NULL, DEFAULT now() | Momento da última publicação |

**PK composta:** (parlamentar_id, ano).  
**Índices:** idx_ranking_parlamentar_ano ON ranking_parlamentar(ano); idx_ranking_parlamentar_posicao_ano ON ranking_parlamentar(ano, posicao).  
**Classificação:** pública.

---

## 9. snapshots_ranking

**Finalidade:** Snapshots históricos do ranking por data de build; auditoria e série temporal. Dados armazenados em jsonb (cópia do ranking no momento do build).

| Coluna | Tipo | Restrições | Descrição |
|--------|------|------------|-----------|
| id | uuid | PK, DEFAULT gen_random_uuid() | |
| build_em | timestamptz | NOT NULL | Momento do build |
| ano | int | NOT NULL | Ano do ranking |
| dados | jsonb | NOT NULL | Cópia do ranking (ex.: array de posições/parlamentares) |
| created_at | timestamptz | NOT NULL, DEFAULT now() | |

**Índices:** idx_snapshots_ranking_ano ON snapshots_ranking(ano); idx_snapshots_ranking_build_em ON snapshots_ranking(build_em DESC).  
**Classificação:** analítica.

---

## Resumo de constraints importantes

- **emendas_brutas:** UNIQUE(ano, id_externo) — evita duplicata e permite upsert por ano.
- **emendas_financeiro:** UNIQUE(ano, id_externo) — idem; FK parlamentar_id opcional.
- **ranking_parlamentar:** PK (parlamentar_id, ano) — uma posição por parlamentar por ano.
- **ranking_parlamentar_build:** UNIQUE(build_id, parlamentar_id, ano) — um build contém uma linha por (parlamentar, ano).
- **execucoes_pipeline_etapas:** FK execucao_id com ON DELETE CASCADE — apagar execução apaga etapas.

Nenhuma extensão extra é obrigatória para o MVP (uuid e jsonb são nativos do PostgreSQL).
