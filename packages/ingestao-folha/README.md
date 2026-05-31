# @transparencia/ingestao-folha

Ingestão da **folha de pessoal dos gabinetes parlamentares federais** → `folha_gabinete`.

Estado: **Câmara** sem salário (Fase 1). **Senado** com salário (Fase 2, ✅ no ar).

## Fontes

| Casa | Fonte | Filtro | Liga ao parlamentar por | Salário |
|------|-------|--------|-------------------------|---------|
| Câmara | `dadosabertos.camara.leg.br/arquivos/funcionarios/csv/funcionarios.csv` (UTF-8, BOM) | `grupo = "Secretário Parlamentar"` | `uriLotacao` → id do deputado (regex) | — (Fase 2 pendente) |
| Senado | API admin `adm.senado.gov.br/adm-dadosabertos` (UTF-8) | `SITUAÇÃO=ATIVO` + lotação de senador | `parlamentar_nome` extraído de `NOME LOTAÇÃO` | ✅ `REMUNERAÇÃO BÁSICA` |

As fontes são snapshots diários sem histórico. Nós historiamos via **snapshot
mensal** (`snapshot_date` = 1º dia do mês). Re-rodar o mesmo mês é idempotente
(upsert em `casa,chave_natural,snapshot_date`).

## Uso

```bash
# Câmara (~10,5 mil secretários, sem salário)
npm run ingestao-folha:camara

# Senado (~3,2 mil comissionados de gabinete, COM salário do mês anterior)
npm run ingestao-folha:senado

# overrides:
npm run secretarios-camara:ts -w @transparencia/ingestao-folha -- 2026-05-01           # snapshot
npm run comissionados-senado:ts -w @transparencia/ingestao-folha -- 2026-05-01 2026-04  # snapshot + mês remuneração
```

Cron mensal: `scripts/folha-cron.sh` via launchd `com.thebrinsider.folha-mensal`.

## Senado — Fase 2 (salário): como funciona

Dois endpoints da API admin, **unidos por NOME normalizado**:

- `GET /api/v1/servidores/servidores/comissionados/csv` → quem é, situação, lotação.
- `GET /api/v1/servidores/remuneracoes/{ano}/{mes}/csv` → salário (`TIPO FOLHA=Normal`).

> ⚠️ **O campo `SEQUENCIAL` NÃO é ID de pessoa** — é sequencial por arquivo e
> difere entre os dois endpoints (a mesma pessoa tem SEQUENCIAL distinto em cada).
> Por isso o join é por **nome**, não por SEQUENCIAL. Cobertura ~96%.

Tratamentos: nomes repetidos na folha (~2,5%) viram `dados.salario_ambiguo=true`
e ficam sem valor; `REMUNERAÇÃO BÁSICA` ≤ 0 (estorno) é descartado. `dados`
guarda líquida, vantagens e `remuneracao_mes_ref`. Lideranças/blocos (sem senador
nominal) ficam fora.

## Limitações conhecidas

- **Senado liga ao senador por nome** (`parlamentar_nome`), não por ID. Resolver
  para um `senador_id` é trabalho do analytics (risco de homônimo).
- **Câmara `parlamentar_id_externo` é referência soft** (sem FK): alguns lotados
  apontam para órgão/liderança em vez de deputado → fica `NULL`.
- **Salário do Senado é do mês de referência** (mês anterior ao snapshot), não do
  mês exato do snapshot. Estável o suficiente mês a mês.

## Câmara — Fase 2 (pendente)

NÃO há CSV de remuneração individual — só o sistema de consulta
(`www2.camara.leg.br/transpnet/consulta`, fonte SIGESP). Dois caminhos:

- **2a (fácil, estimado):** mapear o `cargo` já capturado (níveis SP — SP01C…SP22S)
  → faixa da tabela pública do secretariado
  (`www2.camara.leg.br/transparencia/recursos-humanos/remuneracao/tabelas-de-remuneracao`,
  faixa R$ 1.764,93–9.359,94). Estimativa por nível.
- **2b (exato, caro):** scraping do `transpnet/consulta` por nome/mês. Frágil.
