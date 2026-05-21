# 09a — J0: Validação de fontes (log)

Registro da etapa J0 do roadmap em `09-JUDICIARIO-STF.md`. Objetivo: validar fontes antes de gastar tempo em pipeline.

Executado em: **2026-05-21**
Duração: ~30 min (apenas validação de APIs e schema da BD; sem download de PDFs ainda)

---

## 1. DataJud CNJ — STF

**Hipótese inicial:** DataJud cobre STF, é a fonte primária de metadado processual.

**Teste:**
```bash
curl -X POST "https://api-publica.datajud.cnj.jus.br/api_publica_stf/_search" \
  -H "Authorization: APIKey <chave>" \
  -d '{"size": 5, "query": {"match_all": {}}}'
```

**Resultados em sequência:**
1. `401 illegal base64` — placeholder literal, não chave
2. `401 apikey not found` — chave do material de treino estava rotacionada
3. `404 index_not_found_exception` para `api_publica_stf` — **autenticação OK, mas índice não existe**

**Confirmação via wiki oficial:** [datajud-wiki.cnj.jus.br/api-publica/endpoints](http://datajud-wiki.cnj.jus.br/api-publica/endpoints/) lista apenas STJ, TST, TSE, STM entre Tribunais Superiores. **STF não está coberto pelo DataJud.**

**Conclusão:** ❌ DataJud descartado como fonte STF. §3.1 do doc principal corrigido.

**Aprendizado lateral pro pipeline futuro:** a chave do CNJ é rotacionada — qualquer ingestão deve ler de `DATAJUD_API_KEY` env var, nunca hardcoded. Documentar fallback para a wiki como fonte da chave vigente.

---

## 2. Base dos Dados — Corte Aberta

**Hipótese:** se a BD tiver voto individual já estruturado, salva 80% do trabalho do projeto.

**Teste:** abrir [dataset Corte Aberta](https://basedosdados.org/dataset/b46bb892-3273-434d-9335-f502b8656ef1) e inspecionar schema das tabelas.

**Schema da tabela principal (`decisoes`):**

| Coluna | Tipo | Descrição |
|---|---|---|
| `ano` | INT64 | Ano da decisão |
| `classe` | STRING | Tipo da classe |
| `numero` | STRING | Número de identificação do processo |
| `relator` | STRING | Relator do processo (**singular** — não os 11 ministros) |
| `link` | STRING | Link do processo no portal STF |
| `subgrupo_andamento` | STRING | Subgrupo do andamento |
| `andamento` | STRING | Andamento da decisão |
| `observacao_andamento_decisao` | STRING | Observação sobre andamento |
| `modalidade_julgamento` | STRING | virtual / presencial / monocrática |
| `tipo_julgamento` | STRING | colegiada / monocrático |
| `meio_tramitacao` | STRING | eletrônico / físico |
| `indicador_tramitacao` | BOOLEAN | Em tramitação |
| `assunto_processo` | STRING | Assunto |
| `ramo_direito` | STRING | Ramo |
| `data_autuacao` | DATE | Data de autuação |
| `data_decisao` | DATE | Data da decisão |
| `data_baixa_processo` | DATE | Data de baixa |

**Granularidade:** uma linha por decisão/andamento. Não há `ministro`, `voto`, `direcao_voto`, `divergente` ou similar.

**Conclusão:** ✅ Útil como tabela-índice (lista canônica + classificação institucional pronta). ❌ Não substitui parsing dos PDFs de acórdão para voto individual.

**Custo:** BD Grátis basta (descartado BD Pro R$ 37/mês — não há benefício marginal pro caso de uso).

---

## 3. Recapitulação do pipeline pós-J0

Antes do J0:
```
DataJud (metadados) + Portal STF (HTML) + Jurisprudência (PDFs) → parser LLM → voto individual
```

Depois do J0:
```
Base dos Dados Corte Aberta (BigQuery, grátis)
   ↓ ingestão direta (Camada A)
stf_acordaos_brutos  ← já vem com link, relator, modalidade, tipo
   ↓ scraping PDF a partir do `link`
stf_pdfs_baixados
   ↓ parser LLM (Camada B)
stf_votos_extraidos  ← aqui aparece o voto individual de cada ministro
```

**Impacto no esforço:** Camada A simplificou (uma query BigQuery substitui o scraping de descoberta). Camada B continua igual. Total: estimativa de J1+J2 cai de ~3 semanas focadas pra ~2 semanas focadas.

---

## 4. Pendências do J0 (não bloqueantes para a decisão)

Itens que podem ser validados quando o projeto sair do backlog:

- [ ] Baixar 10 acórdãos do plenário 2025 e tentar extração manual de voto (estimativa: 2-3h)
- [ ] Testar query BigQuery efetiva sobre `basedosdados.br_stf_corte_aberta.decisoes` (estimativa: 30 min, exige conta GCP)
- [ ] Mapear quantidade de decisões colegiadas vs. monocráticas no período 2020-2026 (define escala real do parsing LLM)
- [ ] Verificar se o Plenário Virtual tem endpoint JSON acessível ou só HTML

---

## 5. Decisão pós-J0

✅ **Projeto continua viável**, com escopo confirmado.
✅ **Doc principal atualizado** (§3.1 e §3.3 corrigidos).
⏸ **Implementação segue no backlog** — gatilho para retomada permanece o mesmo: emendas Pix com tração de imprensa antes de abrir nova frente.
