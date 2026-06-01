# Auditoria estrutural — packages/web (thebrinsider.com)

Feita em mai/2026, antes de adicionar a folha de gabinete ao site. Sem alteração de código.

---

## (a) Mapa do que existe

**Stack:** Next.js 16 App Router, Supabase (server-side, read-only), Vercel. 62 páginas, 3 rotas de API. Subdomínios por casa estadual (almg./alesp./alerj.) via rewrite no middleware.

**O que já está bom (não jogar fora):**
- **Tabela `parlamentares` unificada** (com `casa_legislativa`) + `ranking_parlamentar`: o modelo de entidade bi-cameral (Câmara + Senado) já existe no banco.
- **Camada `services/` por dataset** (`risco`, `despesas`, `emendas`, `votacoes`, `frentes`, `tse`, `ceaps-senado`, `proposicoes`, `ranking`, `sancionados`). Já separa dado de view.
- **`/parlamentares` (índice) é real** (não stub): delega pro client `ParlamentaresGrid` com busca/filtros, usa `listarParlamentares()`, tem metadata + canonical. Linka pros perfis.
- **`/ranking/[id]` é o perfil de-facto** (751 linhas, linkado pelo índice): usa a tabela `parlamentares`, **cobre Câmara E Senado**, já tem `generateMetadata`. Focado em emendas. É o backbone entity-first real.
- **Navegação temática** (Parlamentares · Ranking · Despesas▾ · Atividade▾ · Mais▾) em `site-config.ts`.
- **Componentes primitivos** (`ValorBRL`, `FotoAvatar`, `NavLinks`, `AskBox`…) e design system `bloomberg-*`.
- Tem `sitemap.ts`, `opengraph-image`, busca em linguagem natural (`/api/ask`).

**Os 7 problemas que travam escalar:**

1. **Dois perfis concorrentes, com chaves de id diferentes.** `/ranking/[id]` (linkado, bi-cameral, focado em emendas, chave `parlamentares.id`) e `/dossie/[id]` (órfão, rico — risco/patrimônio/doadores/frentes —, **só Câmara**, chave `deputadoId` da API da Câmara). São páginas de perfil paralelas que não conversam. Mais 6-8 rotas `/[id]` por dataset (`/expenses/[id]`, `/voting/deputado/[id]`, `/amendments/[id]`, `/funding/[id]`, `/senate-expenses/[id]`, `/risco/[id]`, `/proposicoes/deputado/[id]`). Sem rota canônica → URL e SEO diluídos.
2. **A riqueza do perfil é só da Câmara.** O perfil bi-cameral (`/ranking/[id]`) só mostra emendas. As seções ricas (risco, patrimônio, doadores, frentes) estão no dossiê, que é só Câmara. Senador tem perfil, mas raso. Reconciliar exige um mapa entre `parlamentares.id` e o id da Câmara.
3. **Vínculos por nome.** Tanto emendas (`/ranking/[id]`) quanto várias seções casam parlamentar por **nome**, não por id — frágil (homônimo), já sinalizado no rodapé das páginas. Reforça a necessidade da camada de confiança.
4. **SEO cego a entidades.** `sitemap.ts` é 100% estático (14 URLs fixas, nenhum perfil). Só 18 de 62 páginas têm `generateMetadata`. Só 1 página tem JSON-LD. O ativo de SEO de uma plataforma de transparência (a página de cada político, que é o que as pessoas pesquisam) está invisível pro Google.
5. **`force-dynamic` no dossiê.** Sem cache/ISR: lento e sem vantagem de indexação.
6. **Sem componente de "seção de dataset".** Os cabeçalhos de seção do dossiê são `<h2 style={{...}}>` inline, copy-pasted ~6 vezes. Adicionar folha hoje = mais copy-paste.
7. **Design inconsistente.** Mistura de inline styles e classes `bloomberg-*`.

---

## (b) Arquitetura-alvo (entity-first)

**Princípio:** a entidade (parlamentar) é o backbone; cada dataset é uma seção plugável. Toda fonte nova (folha incluída) entra pelo mesmo contrato, não como rota órfã.

1. **Uma rota canônica por político** cobrindo Câmara E Senado (ex: consolidar tudo em `/dossie/[id]` ou `/parlamentares/[id]`). As `/[id]` de dataset viram âncoras/sub-seções da canônica ou `301` pra ela.
2. **Service unificado `getParlamentar(id)`** que compõe os services existentes; o Senado entra no mesmo contrato (hoje ausente).
3. **Componente `<DatasetSection>`** com contrato fixo: título, fonte oficial, "última atualização", badge de confiança, CTA "ver detalhe". Folha, doador, nepotismo e custo entram como instâncias.
4. **Camada de confiança como primitiva** (`<FonteNota>`, `<Atualizado>`, `<ConfiancaBadge alta|revisar>`). Obrigatória em todo dado de match — é o fosso da marca e o que protege você juridicamente nos leads.
5. **SEO entity-first:** sitemap dinâmico com as ~594 URLs de parlamentar (+ datasets indexáveis), `generateMetadata` em todas as páginas, JSON-LD (`Person`/`GovernmentOrganization` + `Dataset`), e **ISR/cache no lugar de `force-dynamic`**. Este é o maior ROI de autoridade.
6. **Política free/paid coerente por seção** (definir antes de adicionar superfície).

---

## (c) Caminho de migração (incremental, sem big bang)

Cada fase é deployável sozinha.

- **Fase 0 — decisão.** Rota canônica + estrela-guia (ver recomendação abaixo).
- **Fase 1 — fundação de UI.** Extrair `<DatasetSection>` + camada de confiança; refatorar o dossiê pra usá-los (sem mudar dado). Base de tudo.
- **Fase 2 — entidade completa.** `getParlamentar` unificado + estender o dossiê pro **Senado** (perfil de senador).
- **Fase 3 — SEO (maior ROI de autoridade).** Sitemap dinâmico + `generateMetadata` em tudo + JSON-LD + trocar `force-dynamic` por ISR.
- **Fase 4 — consolidar.** `/[id]` de dataset → seções ou `301` pra canônica; completar o índice `/parlamentares` (busca/filtros de verdade).
- **Fase 5 — SÓ ENTÃO a folha.** Adicionar folha (gabinete, salário, doador, nepotismo, custo) como seções no perfil + páginas de dataset, já dentro da camada de confiança.

**Recomendação de estrela-guia: busca orgânica / público amplo como primária**, tooling de jornalista como secundária. Razão: é o que liga direto no seu objetivo declarado de relevância e autoridade, e é onde a plataforma tem ativo único (uma página forte por político ranqueia pra "deputado fulano gastos"). Isso prioriza a **Fase 3**. Se a estrela for o produto institucional/API paga, a ordem muda (densidade e export antes de SEO).

---

## Decisões de produto (jun/2026)

- **Estrela-guia:** busca orgânica / público amplo (confirmado).
- **Rota canônica:** `/parlamentares/[id]` (renomeada de `/ranking/[id]`, com 301).
- **Escada freemium-SEO** (confirmada):
  1. **Anônimo** (inclui Googlebot): teaser indexável — identificação, KPIs, agregados e uma prévia de linhas. É o que ranqueia.
  2. **Free (cadastro)**: dados de transparência completos do perfil (lista de emendas etc). `gate = user != null`.
  3. **Pago** (`hasPaidAccess`): camada de inteligência — score de risco, export/API e os **leads de folha (doador/nepotismo)** quando entrarem.
- **Implicação pra folha:** seções de transparência da folha (quem trabalha, salário) → free login; seções de **leads/análise** (doador-funcionário, nepotismo) → pago. A `ParedeDeAcesso` aceita os dois (é só o destino do CTA + a checagem `user` vs `hasPaidAccess`).
