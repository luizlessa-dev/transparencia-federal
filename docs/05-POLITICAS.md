# 05 — Políticas

## Publicação do ranking

- Só job_publicar_ranking escreve em ranking_parlamentar.
- Fonte da publicação é sempre ranking_parlamentar_build, após validação.
- Metodologia exposta via endpoint próprio.

## Reprocessamento

- Por ano: ingestão e enriquecimento com chave estável (ex.: ano + id emenda).
- Por lote: enriquecimento com cursor e retomada; registrar etapas.
- Nunca sobrescrever tabela pública sem passar pelo build e validação.

## Cron (a definir na implementação)

- Documentar em este arquivo e no README: frequência e ordem dos jobs.
- Exemplo: ingestão diária; enriquecimento após ingestão; analytics após enriquecimento; publicação após validação.
