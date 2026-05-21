# 09 — Judiciário: análise de votos do STF

Documento de design para o subdomínio `judiciario.transparenciafederal.org`.
Status: **backlog** — desenho de Fase 2 da v3, sem implementação prevista no MVP.

Última revisão: 2026-05-20.

---

## 1. Objetivo

Construir uma camada de inteligência pública sobre os votos individuais dos 11 ministros do STF, expondo padrões de convergência, divergência e alinhamento temático ao longo do tempo.

**O que é:** observatório quantitativo de comportamento decisório, baseado em acórdãos publicados.
**O que não é:** rotulador ideológico ("ministro X é de esquerda/direita"). Esse tipo de classificação destrói credibilidade do projeto cívico e não é defensável metodologicamente. Ver §7.

---

## 2. Erros estruturais a evitar

| Risco | Mitigação |
|-------|-----------|
| Rótulos ideológicos sem base empírica | Métricas restritas a comportamento observável (concordância, divergência, alinhamento com relator, frequência de voto vencido) |
| Parsing impreciso de PDFs de acórdão | LLM como classificador, mas com schema rígido e revisão humana por amostragem (≥5%) antes de publicar |
| Mistura de votos colegiados, monocráticos e cautelares | Tabela separada por tipo de decisão; nunca agregar tipos diferentes na mesma métrica |
| Mudança de jurisprudência interpretada como "virada ideológica" | Eixo temporal explícito; nunca agregar décadas diferentes sem segmentação |
| Dependência de uma única fonte (ex: só DataJud) | Ingestão dupla: DataJud + portal STF + DJe, com reconciliação |

---

## 3. Fontes de dados

### 3.1 Fontes primárias

> **Atualização pós-J0 (2026-05-21):** validação manual descartou DataJud como fonte para STF (índice `api_publica_stf` não existe; CNJ cobre apenas STJ/TST/TSE/STM) e confirmou que o dataset Corte Aberta da Base dos Dados é metadado processual, não voto individual. Schema reorganizado abaixo.

| Fonte | URL / endpoint | Cobertura | Papel no pipeline |
|-------|----------------|-----------|-------------------|
| **Corte Aberta (BD)** | BigQuery: `basedosdados.br_stf_corte_aberta.decisoes` | jan/2000–presente, todas as decisões do STF | **Tabela-índice canônica**: lista de quais decisões existem, com `link`, `relator`, `modalidade_julgamento`, `tipo_julgamento`, `data_decisao`. Sem voto individual. |
| **Acórdãos STF (jurisprudência)** | `https://jurisprudencia.stf.jus.br/pages/search` | Inteiro teor em PDF + ementa | **Fonte do voto individual**: scraping a partir do `link` da BD; parsing via LLM (Camada B) |
| **DJe — Diário da Justiça eletrônico** | `https://portal.stf.jus.br/servicos/dje/` | Publicação oficial dos acórdãos | Fonte de **validação** quando jurisprudência divergir |
| **Plenário Virtual** | `https://portal.stf.jus.br/hotsites/plenariovirtual/` | Votos em sessões virtuais, em tempo real | Cobertura de decisões virtuais (cresceu pós-2020); scraping específico |
| **Portal STF — Corte Aberta (oficial)** | `https://portal.stf.jus.br/dadosabertos/` | Painéis estatísticos institucionais | Validação cruzada com BD; nunca fonte primária |

**Fontes descartadas após J0:**
- ❌ **DataJud CNJ**: não cobre STF (confirmado em wiki oficial 2026-05-21)
- ❌ **API REST própria do STF**: não existe documentação pública de endpoints REST com voto individual

### 3.2 Fontes complementares (validação)

- **API Câmara** (já ingerida na v3) — para cruzar processos cujo objeto é norma aprovada pelo Congresso.
- **Diário Oficial da União** — para datas de nomeação dos ministros e composição da Corte ao longo do tempo.

### 3.3 Hierarquia de confiança

```
DJe (oficial) > Jurisprudência STF (acórdão PDF) > Plenário Virtual > Corte Aberta BD (metadado de processo)
```

Conflito entre fontes → vence a mais alta na hierarquia; conflito registrado em `conflitos_fontes_stf`.

A Corte Aberta BD entra no **topo** apenas pra metadado de processo (relator, datas, modalidade) — onde é fonte oficial estruturada. Pra voto individual, sempre PDF do acórdão é a fonte.

---

## 4. Escopo de decisões cobertas

| Tipo | Incluir no MVP? | Justificativa |
|------|-----------------|---------------|
| **Plenário — colegiada** | ✅ Sim | Núcleo do produto; voto individual de cada ministro é público |
| **Turmas (1ª e 2ª) — colegiada** | ✅ Sim (Fase 2) | Compõem maioria do volume; voto individual publicado |
| **Monocráticas** | ❌ Não (Fase 3+) | Não permitem análise comparativa entre ministros |
| **Cautelares ad referendum** | ⚠️ Marcar separadamente | Voto isolado; só ganha valor após referendo do plenário |
| **Embargos / agravos** | ⚠️ Marcar separadamente | Volume alto, baixo valor analítico |
| **Repercussão geral / temas** | ✅ Prioritário | Maior peso político e institucional |

Recorte temporal MVP: **2020–presente** (5 anos). Expansão histórica em fase posterior.

---

## 5. Schema proposto

Seguindo as convenções do v3 (PT-BR, responsabilidade única, separação por camadas).

### 5.1 Classificação

| Classificação | Tabelas |
|---------------|---------|
| Referência | `ministros_stf`, `composicao_stf` |
| Bruta | `stf_acordaos_brutos`, `stf_pdfs_baixados` |
| Intermediária | `stf_votos_extraidos`, `stf_acordaos_parseados` |
| Analítica (staging) | `stf_metricas_build`, `snapshots_stf` |
| Pública | `stf_ministros_publico`, `stf_metricas_publico`, `stf_acordaos_publico` |
| Operacional | `conflitos_fontes_stf`, `revisao_humana_stf` |

### 5.2 Tabelas-chave

```sql
-- Referência: cadastro de ministros e composição histórica
ministros_stf (
  id, nome, slug, data_nascimento,
  indicado_por, partido_indicacao, data_nomeacao, data_saida,
  fonte_url, atualizado_em
)

composicao_stf (
  data_referencia, ministros_ids JSONB,  -- snapshot da composição em cada data
  primary key (data_referencia)
)

-- Bruta: o que veio das fontes, sem transformação
stf_acordaos_brutos (
  id, numero_processo, classe, relator_nome, data_julgamento,
  fonte TEXT,  -- 'datajud' | 'portal_stf' | 'jurisprudencia'
  payload_raw JSONB,
  pdf_url TEXT,
  ingerido_em TIMESTAMP
)

-- Intermediária: voto individual estruturado (saída do parser LLM)
stf_votos_extraidos (
  id, acordao_id, ministro_id,
  tipo_voto TEXT,           -- 'relator' | 'acompanha' | 'divergente' | 'parcial' | 'impedido' | 'ausente'
  direcao TEXT,             -- 'procedente' | 'improcedente' | 'parcial' | 'extinto' | 'nao_conhecido'
  texto_voto_trecho TEXT,   -- citação literal, ≤500 caracteres, com offset
  confianca_parser NUMERIC, -- 0..1
  revisado_humano BOOLEAN DEFAULT FALSE,
  parseado_em TIMESTAMP
)

-- Intermediária: acórdão com classificação temática
stf_acordaos_parseados (
  acordao_id PK,
  ementa TEXT,
  eixo_tematico TEXT[],     -- ver §6.2: lista controlada
  norma_questionada TEXT,
  origem_geografica TEXT,
  resultado_consolidado TEXT,
  unanime BOOLEAN,
  placar TEXT,              -- ex: "8x3"
  parseado_em TIMESTAMP
)

-- Pública: o que a API expõe
stf_ministros_publico (
  ministro_id PK, nome, slug, periodo_atividade,
  total_votos_periodo, eixo_predominante, ...
)

stf_metricas_publico (
  ministro_id, periodo, eixo_tematico,
  taxa_concordancia_com_relator NUMERIC,
  taxa_voto_vencido NUMERIC,
  par_concordancia JSONB,   -- {ministro_id_outro: taxa, ...}
  n_amostra INT,
  primary key (ministro_id, periodo, eixo_tematico)
)
```

### 5.3 Dependências

```
ministros_stf                    (sem FK)
composicao_stf                   (sem FK)
stf_acordaos_brutos              (sem FK)

stf_votos_extraidos              → stf_acordaos_brutos, ministros_stf
stf_acordaos_parseados           → stf_acordaos_brutos
stf_metricas_publico             → ministros_stf (denormalizado)
revisao_humana_stf               → stf_votos_extraidos
```

---

## 6. Pipeline (jobs)

### 6.1 Etapas

```
[1] coleta-acordaos-stf       → stf_acordaos_brutos + stf_pdfs_baixados
[2] parse-acordao-llm         → stf_acordaos_parseados + stf_votos_extraidos
[3] revisao-amostragem        → revisao_humana_stf (humano-in-the-loop)
[4] reconciliacao-fontes      → resolve conflitos por hierarquia (§3.3)
[5] computar-metricas-stf     → stf_metricas_build
[6] publicar-stf              → stf_metricas_publico + snapshots_stf
```

Cada etapa registrada em `execucoes_pipeline_etapas` (reutiliza infra v3).

### 6.2 Eixos temáticos (lista controlada inicial)

Definidos a priori, não derivados por clustering livre (evita rótulos arbitrários):

- `penal` — direito penal e processo penal
- `tributario` — matéria tributária federal/estadual/municipal
- `constitucional_fundamentais` — direitos e garantias fundamentais
- `eleitoral` — matéria eleitoral e partidária
- `administrativo` — servidores, licitações, organização administrativa
- `previdenciario` — RGPS, RPPS, benefícios
- `trabalhista` — relações de trabalho e CLT
- `economico` — concorrência, regulação econômica
- `ambiental` — meio ambiente
- `federativo` — conflitos União/estados/municípios
- `controle_concentrado` — ADI/ADC/ADPF/ADO (transversal)

Classificação por LLM, com schema rígido (one-of). Revisão humana obrigatória em ≥5% por mês.

### 6.3 Custo estimado (LLM)

- Volume estimado: ~3.000 acórdãos colegiados/ano no plenário + turmas.
- Parsing médio: ~15k tokens entrada + 3k saída por acórdão (Claude Sonnet).
- Custo estimado: **~USD 40-60/mês** em regime permanente. Recálculo histórico (5 anos): one-shot ~USD 600-900.

---

## 7. Metodologia: o que medir, o que não medir

### 7.1 Métricas defensáveis (incluir)

| Métrica | Definição | Apresentação pública |
|---------|-----------|----------------------|
| **Taxa de concordância par-a-par** | % de julgamentos em que ministro A e B votaram na mesma direção | Matriz 11×11 |
| **Taxa de voto vencido** | % em que o ministro ficou na minoria | Série temporal por eixo |
| **Alinhamento com relator** | % em que acompanha o voto do relator | Por eixo e por ministro |
| **Divergência temática** | Eixo em que o ministro mais diverge da maioria | Top-3 eixos por ministro |
| **Unanimidade do colegiado** | % de decisões unânimes por período | Indicador da Corte como um todo |
| **Tempo médio de voto** | Dias entre vista e voto registrado | Indicador de processo |

### 7.2 Métricas vetadas (não incluir)

- ❌ Classificação ideológica (esquerda/direita/centro)
- ❌ "Alinhamento com governo X" — exceto em recorte explícito de controle concentrado, e marcado como tal
- ❌ Score agregado único por ministro (ex: "índice de ativismo")
- ❌ Previsão de voto futuro
- ❌ Qualquer métrica com n < 30 julgamentos no recorte

### 7.3 Apresentação pública obrigatória

Toda métrica exposta no frontend deve mostrar:
- Período coberto
- Tamanho da amostra (n)
- Tipos de decisão incluídos
- Data do último update
- Link para a metodologia desta página

### 7.4 Como o robô decide — e o que ele recusa decidir

**Premissa central:** o robô não decide tendência política. Ele computa métricas determinísticas a partir de votos publicados e expõe os números crus. A leitura política dos números é do leitor — jornalista, advogado, pesquisador ou cidadão.

Há três camadas de processamento, com naturezas epistêmicas distintas:

#### Camada A — Cálculo determinístico (SQL, sem LLM, sem juízo)

Toda métrica visível no produto é aritmética trivial sobre `stf_votos_extraidos`. Exemplo:

```sql
taxa_concordancia(A, B) = COUNT(julgamentos em que A votou na mesma direção que B)
                        / COUNT(julgamentos em que ambos votaram)
```

O robô **não infere** que ministros A e B são "próximos". Ele **conta** quantas vezes votaram igual. Qualquer pessoa com acesso à tabela bruta refaz o número. O mesmo vale para alinhamento com relator, taxa de voto vencido, divergência por eixo, unanimidade. Tudo é `COUNT/COUNT`.

#### Camada B — Extração estruturada via LLM (classificador, não analista)

Duas operações exigem LLM porque os PDFs do STF não são estruturados:

1. **Extrair voto individual do PDF do acórdão.**
   Entrada: texto bruto. Saída: `{ministro, tipo_voto ∈ enum, direcao ∈ enum, trecho_literal}`.
   Schema rígido, valores enumerados (nunca texto livre), trecho literal obrigatório como evidência rastreável. `confianca_parser ∈ [0,1]` persistida na tabela. Amostragem humana ≥5% antes de qualquer publicação.

2. **Classificar o acórdão em eixo temático.**
   Entrada: ementa. Saída: um ou mais valores da **lista controlada de 11 eixos** (§6.2). O LLM não inventa categoria — escolhe de uma enum fechada.

Em nenhuma das duas operações o LLM emite opinião sobre o ministro ou sobre o mérito da decisão. Função é OCR semântico, não análise.

#### Camada C — O que o robô recusa fazer

Reforço explícito de §7.2, agora com a razão epistêmica:

- ❌ **Rotulação ideológica** ("garantista", "punitivista", "alinhado ao governo X"): exige um modelo causal de motivação que o voto registrado não sustenta. Ministro pode acompanhar voto por convicção, estratégia, pragmatismo ou relação com o relator — o registro público não distingue. Atribuir motivação a partir de comportamento agregado é especulação, não dado.
- ❌ **Score agregado único** ("índice de ativismo", "nota de independência"): comprime múltiplas dimensões em um ranking, que é exatamente o que destrói nuance e abre flanco editorial.
- ❌ **Previsão de voto futuro**: não é função de observatório, é função de modelo preditivo, com requisitos metodológicos e de validação completamente distintos.
- ❌ **Métricas com n < 30 julgamentos no recorte**: ruído estatístico vira manchete.

#### Auditabilidade como contrato

Toda métrica é falsificável em 30 segundos: o leitor clica no número, vê a lista de julgamentos que entraram no cálculo, abre o PDF do acórdão e confere. Se o parser errou um voto, qualquer leitor identifica e o canal de retificação pública (§8) corrige.

**Contrato implícito com o leitor:**

> Entregamos, de forma estruturada e auditável, o que cada ministro votou em cada julgamento público desde 2020, e relações estatísticas entre esses votos. A leitura política disso é sua.

Esse posicionamento é o que separa infraestrutura cívica séria de pseudo-análise — e é o que torna o produto defensável quando (não se) algum ministro contestar publicamente.

---

## 8. Riscos editoriais e mitigações

| Risco | Probabilidade | Impacto | Mitigação |
|-------|--------------|---------|-----------|
| Erro de parsing atribui voto errado a ministro | Média | Alto | Revisão humana 5%; confiança_parser exposto; correção pública |
| Cobertura assimétrica entre ministros vira "viés do produto" | Média | Médio | Indicador de cobertura por ministro na metodologia |
| Mudança de jurisprudência lida como inconsistência pessoal | Alta | Médio | Eixo temporal obrigatório em toda visualização |
| Press/redações simplificam métrica e geram manchete distorcida | Alta | Alto | Página de metodologia citável; embargos editoriais nas amostras humanas; FAQ pública |
| Resposta institucional do STF (ofício, contestação) | Baixa | Alto | Documentação metodológica pronta; canal de retificação público; nunca afirmar intenção subjetiva |

---

## 9. Roadmap

| Fase | Objetivo | Validação |
|------|----------|-----------|
| **J0** | Validação de fontes: DataJud STF + scraping piloto de 50 acórdãos | Schema confirma campos esperados; PDFs parseáveis |
| **J1** | Ingestão MVP: plenário 2024–2026, ~600 acórdãos | `stf_acordaos_brutos` populado; cobertura ≥95% vs. lista oficial |
| **J2** | Parser LLM + revisão humana de 100 acórdãos | Acurácia ≥90% em direção de voto; ≥85% em eixo temático |
| **J3** | Métricas + API pública | Endpoints `/ministros`, `/metricas`, `/acordaos` respondendo |
| **J4** | Frontend `judiciario.transparenciafederal.org` | Páginas: ministro, matriz, eixo, metodologia |
| **J5** | Expansão: turmas + retroativo 2020–2023 | Volume completo; histórico estável |
| **J6** | Análises editoriais derivadas (longreads, alertas) | Conteúdo jornalístico com dados próprios |

**Estimativa de esforço (referência):** J0-J4 = 4-6 semanas de trabalho focado. J5-J6 = mais 4-6 semanas.

---

## 10. Decisões abertas

1. **Subdomínio vs path**: `judiciario.transparenciafederal.org` (separado) ou `/judiciario` (mesmo app)?
   - Recomendação: subdomínio, porque o app principal é Vite/Lovable e a v3 é Next.js; manter separado evita acoplamento prematuro.
2. **LLM provider**: Claude Sonnet via Anthropic API direta (alinha com decisão de §2 do contexto mestre, que descontinuou LOVABLE_API_KEY).
3. **Frequência de atualização**: cron diário (acompanha publicação no DJe) ou semanal (lote)?
   - Recomendação MVP: semanal. Diário só após J5.
4. **Composição histórica**: ingerir todos os ministros desde 1988 ou só os ativos hoje?
   - Recomendação MVP: ativos hoje + os que saíram desde 2020 (período coberto).
5. **Acesso aos dados brutos**: API pública expõe acórdão parseado completo ou só métricas agregadas?
   - Recomendação: expor acórdão parseado (transparência) mas com aviso de "confiança_parser" e link pro PDF original.

---

## 11. Posicionamento estratégico

Este módulo só faz sentido depois que:
- A camada de emendas (atual v3) estiver sólida e com tração de imprensa.
- Houver capacidade operacional sustentável (humano-in-the-loop pra revisão de amostragem é o gargalo real, não a infra).
- O posicionamento institucional do projeto estiver consolidado o suficiente pra absorver eventual fricção com o STF.

**Não é projeto de fim de semana.** É infraestrutura cívica de longo prazo, com risco editorial não-trivial.
