# @transparencia/ingestao-folha

Ingestão da **folha de pessoal dos gabinetes parlamentares federais** → `folha_gabinete`.

## Fase 1 (atual): grafo "quem trabalha pra qual gabinete" — SEM salário

`valor_remuneracao` fica `NULL`. O valor jornalístico aqui está em cruzar
**secretário × doadores TSE × sobrenome do parlamentar** (nepotismo cruzado,
funcionário-doador) — não depende do salário.

## Fontes

| Casa | Arquivo | Filtro | Liga ao parlamentar por |
|------|---------|--------|-------------------------|
| Câmara | `dadosabertos.camara.leg.br/arquivos/funcionarios/csv/funcionarios.csv` (UTF-8, BOM) | `grupo = "Secretário Parlamentar"` | `uriLotacao` → id do deputado (regex) |
| Senado | `senado.leg.br/transparencia/lai/secrh/servidores_comissionados.csv` (latin-1) | `SETOR2` começa com `GABSEN` | `parlamentar_nome` extraído de `SETOR_EXERCÍCIO` |

As fontes são snapshots diários sem histórico. Nós historiamos via **snapshot
mensal** (`snapshot_date` = 1º dia do mês). Re-rodar o mesmo mês é idempotente
(upsert em `casa,chave_natural,snapshot_date`).

## Uso

```bash
# Câmara (~10,5 mil secretários)
npm run ingestao-folha:camara          # raiz
npm run secretarios-camara:ts -w @transparencia/ingestao-folha

# Senado (~comissionados GABSEN)
npm run ingestao-folha:senado

# forçar uma data de snapshot específica:
npm run secretarios-camara:ts -w @transparencia/ingestao-folha -- 2026-05-01
```

Cron mensal: `scripts/folha-cron.sh` via launchd `com.thebrinsider.folha-mensal`.

## Limitações conhecidas

- **Senado sem ID/matrícula**: o vínculo ao senador é por nome (`parlamentar_nome`).
  Resolver para um `senador_id` é trabalho do analytics (risco de homônimo).
- **Câmara `parlamentar_id_externo` é referência soft** (sem FK): alguns lotados
  podem apontar para órgão/liderança em vez de deputado → fica `NULL`.
- **Senado GABLID** (lideranças) fica fora desta fase — não liga a um senador único.

## Fase 2 (pendente)

Acoplar `valor_remuneracao`. Câmara: join por matrícula no sistema de
remuneração (`transpnet/consulta`). Senado: CSV de remuneração mensal, join por
nome+setor. Depende de resolver o endpoint bulk da remuneração individual.
