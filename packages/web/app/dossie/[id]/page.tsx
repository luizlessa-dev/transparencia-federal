/**
 * /dossie/[id] — Dossiê completo de deputado federal.
 *
 * Página PÚBLICA (não no middleware) — peça de SEO e descoberta.
 * Agrega: score G5, patrimônio, top doadores, frentes, comissões, proposições.
 * Para detalhes específicos (ranking de risco, votações, CEAP), linka pras
 * páginas protegidas no paywall.
 *
 * Acesso: /dossie/{id_camara}  (ex: /dossie/220559 → Nikolas Ferreira)
 */
import Link from "next/link";
import { notFound } from "next/navigation";
import { getParlamentarRisco } from "~/services/risco";
import { getFrentesDeDeputado, getComissoesDeDeputado } from "~/services/frentes";
import { getDeputadoProposicaoAgg } from "~/services/proposicoes";
import { getViewer, getReceitasDossie, getBensDossie } from "~/lib/dal";
import { ParedeDeAcesso } from "~/components/ParedeDeAcesso";
import { PaywallSchema } from "~/components/PaywallSchema";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ id: string }>;
}

// ── helpers ──────────────────────────────────────────────────────────────

function fmtBRL(v: number | null | undefined): string {
  if (v == null) return "—";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(v);
}

function fmtNum(v: number | null | undefined): string {
  if (v == null) return "—";
  return v.toLocaleString("pt-BR", { maximumFractionDigits: 0 });
}

function fmtPct(v: number | null | undefined): string {
  if (v == null) return "—";
  return `${Math.round(v * 10) / 10}%`;
}

const corScore = (s: number) =>
  s >= 70 ? "hsl(var(--danger))" : s >= 40 ? "hsl(var(--warning))" : "hsl(var(--success))";

const corBadge = (s: number) =>
  s >= 70 ? "badge-danger" : s >= 40 ? "badge-warn" : "badge-success";

// ── página ────────────────────────────────────────────────────────────────

export default async function DossiePage({ params }: Props) {
  const { id } = await params;
  const deputadoId = Number(id);
  if (!Number.isFinite(deputadoId)) notFound();

  const dep = await getParlamentarRisco(deputadoId);
  if (!dep) notFound();

  const viewer = await getViewer();

  // dados paralelos (receitas/bens já vêm cortados pelo DAL conforme o plano)
  const [frentes, comissoes, propAgg, receitas, bens] = await Promise.all([
    getFrentesDeDeputado(deputadoId),
    getComissoesDeDeputado(deputadoId),
    getDeputadoProposicaoAgg(deputadoId),
    getReceitasDossie(dep.cpf, viewer),
    getBensDossie(dep.cpf, viewer),
  ]);
  const totalDoadoresOcultos = receitas.reduce((s, r) => s + r.n_doadores, 0);

  const score = Math.round(dep.score_total);
  const scoreCor = corScore(dep.score_total);
  const scoreBadge = corBadge(dep.score_total);

  // detecta frentes "sensíveis" (financeiro/orçamento/mercado)
  const REGEX_SENSIVEL = /financ|banco|fgc|mercado|capit|invest|trib|imp[oô]st|cota|orçament|seguros|cripto|economia/i;
  const frentesSensiveis = frentes.filter((f) => REGEX_SENSIVEL.test(f.titulo));
  const frentesNormais = frentes.filter((f) => !REGEX_SENSIVEL.test(f.titulo));

  // perguntas sugeridas pra caixa de pesquisa pré-preencher
  const nomeUrl = encodeURIComponent(dep.nome);
  const perguntasSugeridas = [
    `Quanto ${dep.nome} gastou em passagens aéreas?`,
    `Quem doou para a campanha de ${dep.nome}?`,
    `Quais proposições ${dep.nome} apresentou?`,
    `${dep.nome} está em quais frentes parlamentares?`,
  ];

  return (
    <>
      <PaywallSchema
        url={`https://www.thebrinsider.com/dossie/${deputadoId}`}
        headline={`${dep.nome} — Dossiê | The BR Insider`}
        type="ProfilePage"
        paywallSelector=".bloomberg-card"
      />
      <div className="container" style={{ paddingTop: "2rem", paddingBottom: "3rem", maxWidth: "1100px" }}>

        {/* ── Breadcrumb ──────────────────────────────────────── */}
        <div style={{ fontSize: "0.75rem", color: "hsl(var(--text-caption))", marginBottom: "1rem" }}>
          <Link href="/" style={{ color: "inherit", textDecoration: "none" }}>Início</Link>
          {" / "}
          <Link href="/risco" style={{ color: "inherit", textDecoration: "none" }}>Ranking</Link>
          {" / "}
          <span style={{ color: "hsl(var(--text-headline))", fontWeight: 600 }}>{dep.nome}</span>
        </div>

        {/* ── Header ──────────────────────────────────────────── */}
        <header style={{ display: "flex", gap: "1.5rem", alignItems: "flex-start", marginBottom: "2rem", flexWrap: "wrap" }}>
          {dep.url_foto && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={dep.url_foto}
              alt={dep.nome}
              width={120}
              height={160}
              style={{ borderRadius: "4px", border: "1px solid hsl(var(--border))", objectFit: "cover" }}
            />
          )}
          <div style={{ flex: 1, minWidth: "260px" }}>
            <h1 style={{ fontSize: "1.875rem", fontWeight: 700, margin: 0, color: "hsl(var(--text-headline))", lineHeight: 1.1 }}>
              {dep.nome}
            </h1>
            <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.75rem", flexWrap: "wrap", alignItems: "center" }}>
              <span className="badge-neutral">{dep.sigla_partido}</span>
              <span className="badge-neutral">{dep.sigla_uf}</span>
              <span className="badge-neutral">Deputado(a) Federal</span>
              {dep.total_legislaturas != null && dep.total_legislaturas > 0 && (
                <span className="badge-neutral">
                  {dep.total_legislaturas}ª legislatura
                </span>
              )}
              {dep.cpf && (
                <span style={{ fontSize: "0.6875rem", color: "hsl(var(--text-caption))", fontFamily: "var(--font-mono)" }}>
                  CPF {dep.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4")}
                </span>
              )}
            </div>
            {dep.cargo_anterior && (
              <p style={{ fontSize: "0.8125rem", color: "hsl(var(--text-body))", marginTop: "0.5rem" }}>
                Ocupação anterior: <em style={{ fontStyle: "italic" }}>{dep.cargo_anterior}</em>
              </p>
            )}
          </div>
        </header>

        {/* ── KPI grid ─────────────────────────────────────────── */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: "0.75rem",
            marginBottom: "1.5rem",
          }}
        >
          <Kpi
            label="Score de risco G5"
            value={`${score}/100`}
            badge={scoreBadge}
            cor={scoreCor}
            hint="0=baixo · 70+=alto"
          />
          <Kpi
            label="Patrimônio 2022"
            value={fmtBRL(dep.patrimonio_2022)}
            hint="declaração eleitoral TSE"
          />
          <Kpi
            label="CEAP 2024"
            value={fmtBRL(dep.ceap_total_2024)}
            hint="cota gabinete (Câmara)"
          />
          <Kpi
            label="Proposições"
            value={fmtNum(dep.total_proposicoes)}
            hint={`${fmtNum(dep.total_substantivo)} substantivas`}
          />
        </div>

        {/* ── Dimensões score G5 ──────────────────────────────── */}
        <div className="bloomberg-card" style={{ padding: "1.25rem", marginBottom: "1.5rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.875rem" }}>
            <h2 style={{ fontSize: "0.875rem", fontWeight: 700, margin: 0, color: "hsl(var(--text-headline))", textTransform: "uppercase", letterSpacing: "0.08em" }}>
              Score G5 · 5 dimensões
            </h2>
            <Link href={`/risco/${deputadoId}`} style={{ fontSize: "0.75rem", color: "hsl(var(--primary))", textDecoration: "none" }}>
              Ver detalhes →
            </Link>
          </div>
          <div style={{ display: "grid", gap: "0.625rem" }}>
            <Dim label="CEAP (gasto gabinete)" valor={dep.dim_ceap} peso="30%" />
            <Dim label="Ausência (presença plenário)" valor={dep.dim_presenca} peso="20%" />
            <Dim label="Produção legislativa" valor={dep.dim_producao} peso="15%" />
            <Dim label="Financiamento campanha" valor={dep.dim_financiamento} peso="20%" />
            <Dim label="RP-9 (orçamento secreto)" valor={dep.dim_rp9} peso="15%" />
          </div>
        </div>

        {/* ── CTA caixa de pesquisa ───────────────────────────── */}
        <div
          className="bloomberg-card"
          style={{ padding: "1.25rem", marginBottom: "1.5rem", background: "hsl(var(--surface, var(--muted)))" }}
        >
          <h2 style={{ fontSize: "0.875rem", fontWeight: 700, margin: "0 0 0.625rem", color: "hsl(var(--text-headline))", textTransform: "uppercase", letterSpacing: "0.08em" }}>
            Faça uma pergunta sobre {dep.nome}
          </h2>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
            {perguntasSugeridas.map((p) => (
              <Link
                key={p}
                href={`/?q=${encodeURIComponent(p)}#askbox`}
                style={{
                  fontSize: "0.75rem",
                  padding: "0.375rem 0.75rem",
                  background: "hsl(var(--background))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "2px",
                  color: "hsl(var(--foreground))",
                  textDecoration: "none",
                  lineHeight: 1.4,
                }}
              >
                → {p}
              </Link>
            ))}
          </div>
        </div>

        {/* ── Receitas + top doadores TSE ─────────────────────── */}
        {receitas.length > 0 && (
          <div className="bloomberg-card" style={{ padding: "1.25rem", marginBottom: "1.5rem" }}>
            <h2 style={{ fontSize: "0.875rem", fontWeight: 700, margin: "0 0 0.875rem", color: "hsl(var(--text-headline))", textTransform: "uppercase", letterSpacing: "0.08em" }}>
              Financiamento de campanha (TSE)
            </h2>
            {receitas.map((r) => (
              <div key={r.ano_eleicao + r.sq_candidato} style={{ marginBottom: "1rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: "0.5rem" }}>
                  <p style={{ fontSize: "0.875rem", margin: 0, fontWeight: 600, color: "hsl(var(--text-headline))" }}>
                    {r.ano_eleicao} — {r.sg_partido}/{r.sg_uf} · {r.ds_cargo}
                  </p>
                  <p style={{ fontSize: "0.875rem", margin: 0, fontFamily: "var(--font-mono)", fontWeight: 700 }}>
                    {fmtBRL(r.total_receitas)}
                  </p>
                </div>
                {r.top_doadores && r.top_doadores.length > 0 && (
                  <table className="bloomberg-table" style={{ marginTop: "0.5rem", fontSize: "0.8125rem" }}>
                    <thead>
                      <tr>
                        <th style={{ textAlign: "left" }}>Top doadores</th>
                        <th style={{ textAlign: "right" }}>Valor</th>
                      </tr>
                    </thead>
                    <tbody>
                      {r.top_doadores.slice(0, 5).map((d, i) => (
                        <tr key={i}>
                          <td>{d.nome}</td>
                          <td style={{ textAlign: "right", fontFamily: "var(--font-mono)" }}>{fmtBRL(d.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            ))}
            {!viewer.pago && totalDoadoresOcultos > 0 && (
              <ParedeDeAcesso
                tipo="pago"
                titulo="Quem financiou esta campanha (plano pago)"
                descricao={`${totalDoadoresOcultos} principal(is) doador(es) identificado(s) no TSE. Assine para ver os nomes e os valores doados a ${dep.nome}.`}
                next={`/dossie/${deputadoId}`}
              />
            )}
          </div>
        )}

        {/* ── Patrimônio histórico TSE ────────────────────────── */}
        {bens.anosComBens > 0 && (
          <div className="bloomberg-card" style={{ padding: "1.25rem", marginBottom: "1.5rem" }}>
            <h2 style={{ fontSize: "0.875rem", fontWeight: 700, margin: "0 0 0.875rem", color: "hsl(var(--text-headline))", textTransform: "uppercase", letterSpacing: "0.08em" }}>
              Patrimônio declarado (TSE)
            </h2>
            {bens.detalhe ? (
              <>
                <table className="bloomberg-table">
                  <thead>
                    <tr>
                      <th style={{ textAlign: "left" }}>Ano eleição</th>
                      <th style={{ textAlign: "right" }}>Bens declarados</th>
                      <th style={{ textAlign: "right" }}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bens.detalhe.map((b) => (
                      <tr key={b.ano}>
                        <td>{b.ano}</td>
                        <td style={{ textAlign: "right" }}>{b.quantidade}</td>
                        <td style={{ textAlign: "right", fontFamily: "var(--font-mono)", fontWeight: 600 }}>{fmtBRL(b.valor)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p style={{ fontSize: "0.6875rem", color: "hsl(var(--text-caption))", marginTop: "0.625rem" }}>
                  <Link href="/patrimonios" style={{ color: "hsl(var(--primary))", textDecoration: "none" }}>
                    → Ver bens detalhados
                  </Link>
                </p>
              </>
            ) : (
              <ParedeDeAcesso
                tipo="pago"
                titulo="Patrimônio declarado ano a ano (plano pago)"
                descricao={`Maior patrimônio declarado: ${fmtBRL(bens.maiorTotal)} em ${bens.anosComBens} eleição(ões). Assine para ver a evolução por ano e a quantidade de bens.`}
                next={`/dossie/${deputadoId}`}
              />
            )}
          </div>
        )}

        {/* ── Frentes parlamentares ───────────────────────────── */}
        {frentes.length > 0 && (
          <div className="bloomberg-card" style={{ padding: "1.25rem", marginBottom: "1.5rem" }}>
            <h2 style={{ fontSize: "0.875rem", fontWeight: 700, margin: "0 0 0.875rem", color: "hsl(var(--text-headline))", textTransform: "uppercase", letterSpacing: "0.08em" }}>
              Frentes parlamentares ({frentes.length})
            </h2>
            {frentesSensiveis.length > 0 && (
              <div style={{ marginBottom: "0.75rem" }}>
                <p style={{ fontSize: "0.6875rem", textTransform: "uppercase", letterSpacing: "0.08em", color: "hsl(var(--danger, var(--primary)))", margin: "0 0 0.375rem", fontWeight: 600 }}>
                  ⚠ Frentes financeiras/orçamentárias
                </p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.375rem" }}>
                  {frentesSensiveis.map((f) => (
                    <Link
                      key={f.frente_id}
                      href={`/frentes/${f.frente_id}`}
                      style={{
                        display: "inline-block",
                        padding: "0.2rem 0.5rem",
                        border: "1px solid hsl(var(--danger, var(--primary)))",
                        borderRadius: "2px",
                        fontSize: "0.6875rem",
                        color: "hsl(var(--danger, var(--primary)))",
                        textDecoration: "none",
                        lineHeight: 1.4,
                        fontWeight: 600,
                      }}
                      title={f.titulo}
                    >
                      {f.titulo}
                    </Link>
                  ))}
                </div>
              </div>
            )}
            {frentesNormais.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.375rem" }}>
                {frentesNormais.slice(0, 30).map((f) => (
                  <Link
                    key={f.frente_id}
                    href={`/frentes/${f.frente_id}`}
                    style={{
                      display: "inline-block",
                      padding: "0.2rem 0.5rem",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "2px",
                      fontSize: "0.6875rem",
                      color: "hsl(var(--primary))",
                      textDecoration: "none",
                      lineHeight: 1.4,
                      maxWidth: "240px",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                    title={f.titulo}
                  >
                    {f.titulo}
                  </Link>
                ))}
                {frentesNormais.length > 30 && (
                  <span style={{ fontSize: "0.6875rem", color: "hsl(var(--text-caption))" }}>
                    +{frentesNormais.length - 30}
                  </span>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── Comissões ───────────────────────────────────────── */}
        {comissoes.length > 0 && (
          <div className="bloomberg-card" style={{ padding: "1.25rem", marginBottom: "1.5rem" }}>
            <h2 style={{ fontSize: "0.875rem", fontWeight: 700, margin: "0 0 0.875rem", color: "hsl(var(--text-headline))", textTransform: "uppercase", letterSpacing: "0.08em" }}>
              Comissões permanentes
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
              {comissoes.map((c) => (
                <div key={c.comissao_id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.8125rem" }}>
                  <span style={{ color: "hsl(var(--text-body))" }}>
                    {c.sigla ? (
                      <strong style={{ fontFamily: "var(--font-mono)", marginRight: "0.375rem" }}>{c.sigla}</strong>
                    ) : null}
                    {c.nome}
                  </span>
                  {c.titulo && (
                    <span className="badge-neutral" style={{ fontSize: "0.625rem", flexShrink: 0, marginLeft: "0.5rem" }}>
                      {c.titulo}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Atividade legislativa resumo ─────────────────────── */}
        {propAgg && (
          <div className="bloomberg-card" style={{ padding: "1.25rem", marginBottom: "1.5rem" }}>
            <h2 style={{ fontSize: "0.875rem", fontWeight: 700, margin: "0 0 0.875rem", color: "hsl(var(--text-headline))", textTransform: "uppercase", letterSpacing: "0.08em" }}>
              Atividade legislativa
            </h2>
            <table className="bloomberg-table">
              <tbody>
                <tr><td style={{ color: "hsl(var(--text-caption))" }}>Total de proposições</td><td style={{ textAlign: "right", fontFamily: "var(--font-mono)", fontWeight: 600 }}>{fmtNum(propAgg.total)}</td></tr>
                <tr><td style={{ color: "hsl(var(--text-caption))" }}>Substantivas (não-requerimentos)</td><td style={{ textAlign: "right", fontFamily: "var(--font-mono)" }}>{fmtNum(propAgg.total_substantivo)}</td></tr>
                <tr><td style={{ color: "hsl(var(--text-caption))" }}>Projetos de Lei (PL)</td><td style={{ textAlign: "right", fontFamily: "var(--font-mono)" }}>{fmtNum(propAgg.total_pl)}</td></tr>
                <tr><td style={{ color: "hsl(var(--text-caption))" }}>PECs</td><td style={{ textAlign: "right", fontFamily: "var(--font-mono)" }}>{fmtNum(propAgg.total_pec)}</td></tr>
                <tr><td style={{ color: "hsl(var(--text-caption))" }}>Requerimentos</td><td style={{ textAlign: "right", fontFamily: "var(--font-mono)" }}>{fmtNum(propAgg.total_req)}</td></tr>
                <tr><td style={{ color: "hsl(var(--text-caption))" }}>Presença em plenário</td><td style={{ textAlign: "right", fontFamily: "var(--font-mono)" }}>{fmtPct(dep.presenca_pct)}</td></tr>
                <tr><td style={{ color: "hsl(var(--text-caption))" }}>Concordância com partido</td><td style={{ textAlign: "right", fontFamily: "var(--font-mono)" }}>{fmtPct(dep.concordancia_partido)}</td></tr>
              </tbody>
            </table>
          </div>
        )}

        {/* ── Footer CTAs ─────────────────────────────────────── */}
        <div style={{ marginTop: "2rem", display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
          <Link
            href={`/risco/${deputadoId}`}
            style={{
              fontSize: "0.8125rem",
              padding: "0.5rem 1rem",
              background: "hsl(var(--primary))",
              color: "white",
              textDecoration: "none",
              borderRadius: "2px",
              fontWeight: 600,
            }}
          >
            Ver score de risco completo →
          </Link>
          <Link
            href="/risco"
            style={{
              fontSize: "0.8125rem",
              padding: "0.5rem 1rem",
              border: "1px solid hsl(var(--border))",
              color: "hsl(var(--text-body))",
              textDecoration: "none",
              borderRadius: "2px",
            }}
          >
            ← Ranking nacional
          </Link>
        </div>

        <p style={{ fontSize: "0.6875rem", color: "hsl(var(--text-caption))", marginTop: "1.5rem", lineHeight: 1.5 }}>
          Dados de fontes públicas: Câmara dos Deputados (CEAP, proposições, frentes, comissões),
          TSE (receitas eleitorais, bens declarados) e Portal da Transparência (sancionados, emendas).
          Atualizado em {new Date(dep.atualizado_em ?? Date.now()).toLocaleDateString("pt-BR")}.
        </p>
      </div>
    </>
  );
}

// ── components inline ────────────────────────────────────────────────────

interface KpiProps {
  label: string;
  value: string;
  badge?: string;
  cor?: string;
  hint?: string;
}

function Kpi({ label, value, badge, cor, hint }: KpiProps) {
  return (
    <div className="bloomberg-kpi" style={{ padding: "0.875rem", border: "1px solid hsl(var(--border))", borderRadius: "2px" }}>
      <div className="bloomberg-kpi-label" style={{ fontSize: "0.6875rem", textTransform: "uppercase", letterSpacing: "0.08em", color: "hsl(var(--text-caption))", marginBottom: "0.375rem" }}>
        {label}
      </div>
      <div
        className="bloomberg-kpi-value"
        style={{
          fontSize: "1.5rem",
          fontWeight: 700,
          fontFamily: "var(--font-mono)",
          color: cor ?? "hsl(var(--text-headline))",
          lineHeight: 1,
        }}
      >
        {value}
        {badge && <span className={badge} style={{ fontSize: "0.625rem", marginLeft: "0.5rem", verticalAlign: "middle" }}>•</span>}
      </div>
      {hint && (
        <div style={{ fontSize: "0.6875rem", color: "hsl(var(--text-caption))", marginTop: "0.375rem" }}>
          {hint}
        </div>
      )}
    </div>
  );
}

interface DimProps {
  label: string;
  valor: number;
  peso: string;
}

function Dim({ label, valor, peso }: DimProps) {
  const v = Math.min(100, Math.max(0, valor || 0));
  const cor = corScore(v);
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.25rem" }}>
        <span style={{ fontSize: "0.8125rem", color: "hsl(var(--text-body))" }}>
          {label} <span style={{ color: "hsl(var(--text-caption))", fontSize: "0.6875rem" }}>· peso {peso}</span>
        </span>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.8125rem", fontWeight: 700, color: cor }}>
          {Math.round(v)}
        </span>
      </div>
      <div style={{ height: "6px", background: "hsl(var(--border))", borderRadius: "2px" }}>
        <div style={{ width: `${v}%`, height: "100%", background: cor, borderRadius: "2px" }} />
      </div>
    </div>
  );
}
