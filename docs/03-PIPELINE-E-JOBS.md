# 03 — Pipeline e jobs

## Jobs mínimos

| Job | Entrada | Saída | Disparo |
|-----|---------|-------|---------|
| job_ingestao_emendas | API Portal (secret) | emendas_brutas, cobertura_dados, execucoes_* | Cron / manual |
| job_enriquecimento_financeiro | emendas_brutas | emendas_financeiro | Cron / pós-ingestão |
| job_analytics_ranking | emendas_financeiro, parlamentares | ranking_parlamentar_build, snapshots_ranking | Pós-enriquecimento |
| job_publicar_ranking | ranking_parlamentar_build | ranking_parlamentar (após validação) | Pós-analytics |

## Ordem do pipeline

Ingestão → Enriquecimento → Analytics → Publicação.

## Observabilidade

Cada execução: registro em execucoes_pipeline. Cada etapa relevante: execucoes_pipeline_etapas.
