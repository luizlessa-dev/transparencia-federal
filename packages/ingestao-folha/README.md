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

## Fase 2 (planejada — endpoints já mapeados)

Acoplar `valor_remuneracao`. As fontes foram caçadas e validadas em mai/2026:

### Senado — LIMPO e EXATO ✅ (recomendado começar por aqui)

API admin de dados abertos (`adm.senado.gov.br/adm-dadosabertos`, **UTF-8**),
join por `SEQUENCIAL` (matrícula), não por nome:

- `GET /api/v1/servidores/remuneracoes/{ano}/{mes}/csv`
  → `SEQUENCIAL; NOME; MES; ANO; TIPO FOLHA; REMUNERAÇÃO BÁSICA; ...; REMUNERAÇÃO LÍQUIDA; ...`
  (filtrar `TIPO FOLHA = Normal`; ignorar Suplementar pra não duplicar)
- `GET /api/v1/servidores/servidores/comissionados/csv`
  → `SEQUENCIAL; NOME; VINCULO; SITUAÇÃO; CARGO; FUNÇÃO; SIGLA LOTAÇÃO; NOME LOTAÇÃO; ...`
  (`NOME LOTAÇÃO` = "Gabinete/Escritório de Apoio do Senador X"; filtrar `SITUAÇÃO = ATIVO`)

Plano: re-fazer a ingestão do Senado por essa API (melhor que o secrh público,
que não tem ID), gravando `secretario_id_externo = SEQUENCIAL`, e um job de
remuneração mensal que dá `UPDATE valor_remuneracao` por `SEQUENCIAL`.

### Câmara — sem bulk exato; usar faixa por nível (estimado)

NÃO há CSV de remuneração individual — só o sistema de consulta
(`www2.camara.leg.br/transpnet/consulta`, fonte SIGESP). Dois caminhos:

- **2a (fácil, estimado):** mapear o `cargo` já capturado (níveis SP — SP01C…SP22S)
  → faixa salarial da tabela pública de remuneração do secretariado
  (`www2.camara.leg.br/transparencia/recursos-humanos/remuneracao/tabelas-de-remuneracao`).
  Faixa R$ 1.764,93–9.359,94. Preenche `valor_remuneracao` como estimativa por nível.
- **2b (exato, caro):** scraping do `transpnet/consulta` por nome/mês. Frágil; só se
  precisar do valor nominal exato.
