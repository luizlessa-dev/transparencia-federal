# @transparencia/ingestao-alesp

Ingestão de dados da Assembleia Legislativa do Estado de São Paulo (ALESP).
Segundo nó estadual da plataforma Transparência Federal, depois da ALMG.

## Por que esse pacote difere do ALMG

A ALESP publica dados abertos em XML estático, sem auth e sem rate limit
hostil — **caso significativamente mais fácil que ALMG**. Não há HTML scraping,
não há janela rolante, não há CSV vazio. O trabalho real está no volume:

- `deputados.xml`: ~300 KB (94 deputados, 1 arquivo)
- `despesas_gabinetes.xml`: **~170 MB** (todas as despesas desde 2015 num
  único arquivo, ~420k registros) — exige streaming SAX-style.

## Fontes

| Dataset | Origem | Formato |
|---|---|---|
| Deputados | `https://www.al.sp.gov.br/repositorioDados/deputados/deputados.xml` | XML |
| Despesas de gabinete | `https://www.al.sp.gov.br/repositorioDados/deputados/despesas_gabinetes.xml` | XML (stream) |

Last-Modified: ambos atualizados diariamente.

## Schema dos campos da ALESP

### `<Deputado>` (deputados.xml)
- `IdDeputado` — ID interno (numérico)
- `IdSPL`, `IdUA` — IDs auxiliares
- `Matricula` — **chave de junção com despesas**
- `Situacao` (EXE = em exercício)
- `NomeParlamentar`, `Partido`, `Email`, `Telefone`
- `Andar`, `Sala`, `PlacaVeiculo`
- `Aniversario`, `txtAreaAtuacao`, `txtBaseEleitoral`, `Biografia`

### `<despesa>` (despesas_gabinetes.xml)
- `Ano`, `Mes` — granularidade temporal (não há data exata)
- `Matricula` — chave do deputado
- `Deputado` — nome em caixa alta (denormalizado)
- `Valor` — string com ponto decimal (ex: "200.0", "2850.0")
- `CNPJ` — sem formatação (ex: "71806251000106"). CPF aparece com 11 dígitos.
- `Tipo` — categoria com letra prefixada (ex: "A - COMBUSTÍVEIS E LUBRIFICANTES")
- `Fornecedor` — nome do fornecedor

## Limitações conhecidas da fonte ALESP

1. **Sem número de documento fiscal.** A UNIQUE constraint do schema canônico
   (`parlamentar_id, ano, mes, num_documento, cnpj_cpf, categoria, valor_bruto`)
   vai colapsar duas despesas idênticas legítimas (ex: 2 abastecimentos de
   R$ 200 no mesmo posto, mesmo mês) em uma só durante o upsert. Risco baixo
   na prática (despesas exatamente repetidas são raras). Se virar problema,
   adicionar `seq` na constraint via nova migration.

2. **Granularidade temporal mensal.** Não há `data_emissao` — `data_emissao`
   fica NULL pra registros ALESP.

3. **Sem `valor_reembolso` distinto.** A ALESP paga o valor da nota; não há
   reembolso parcial. `valor_bruto` e `valor_reembolso` são iguais.

## Mapeamento ALESP → schema canônico

| Canônico (`parlamentares`) | Origem ALESP |
|---|---|
| `casa_id` | (FK pra `casas` WHERE sigla='ALESP') |
| `id_externo` | `Matricula` (não `IdDeputado`! a junção é por Matricula) |
| `nome` | `NomeParlamentar` |
| `partido` | `Partido` |
| `tag_localizacao` | `Andar + ' / Sala ' + Sala` |
| `ativo` | `Situacao == 'EXE'` |
| `metadata` | JSON com IdDeputado, IdSPL, IdUA, Email, Telefone, Biografia |

| Canônico (`gastos_parlamentares`) | Origem ALESP |
|---|---|
| `parlamentar_id` | lookup via `Matricula` |
| `casa_id` | ALESP |
| `ano` / `mes` | `Ano` / `Mes` |
| `categoria` | `Tipo` (sem letra prefixada — extraída pra `cod_categoria`) |
| `cod_categoria` | letra de `Tipo` (ex: "A", "E") |
| `fornecedor` | `Fornecedor` |
| `cnpj_cpf` | `CNPJ` (mantido sem formatação) |
| `num_documento` | `''` (vazio — ALESP não publica) |
| `data_emissao` | `NULL` (não publicado) |
| `valor_bruto` | `parseFloat(Valor)` |
| `valor_reembolso` | igual a `valor_bruto` |
| `url_origem` | URL do XML |

## Comandos

```bash
# Variáveis necessárias no .env raiz do monorepo:
#   SUPABASE_URL
#   SUPABASE_SERVICE_ROLE_KEY

# 1. Lista de deputados (rodar uma vez por legislatura, mensalmente pra atualizar)
npm run deputados:ts -w @transparencia/ingestao-alesp

# 2. Load histórico completo (~170MB, ~420k despesas, 5-15min via stream)
npm run despesas:ts -w @transparencia/ingestao-alesp

# 3. Incremental — só ano/mês específicos (filtra durante o stream)
npm run despesas:incremental:ts -w @transparencia/ingestao-alesp -- 2026 4 5
#                                                                   ^ano ^meses
```

## Volume estimado

- 94 deputados em exercício (legislatura atual)
- ~420 mil despesas históricas (2015-2026)
- Load inicial: ~5-15 minutos (depende da banda — XML único, sem rate limit)
- Incremental mensal: stream completo + filtro em memória → ~2-3 minutos

## Idempotência

Tudo upsertado via `ON CONFLICT ... DO NOTHING` na constraint
`uq_gastos_parlamentares_nota`. Re-rodar o histórico não duplica linhas (mas
veja "Limitações" #1 sobre o caso de colapso de despesas idênticas legítimas).

## Streaming XML (importante)

`despesas.xml` tem 169 MB. Carregar inteiro com JSDOM/DOMParser estoura RAM
ou trava por minutos. Usamos `saxes` (SAX-style streaming) — processa um
`<despesa>` por vez, emite eventos `opentag` / `text` / `closetag`, mantém
buffer mínimo.

Lotes de upsert: 500 registros (limite seguro de PostgREST).
