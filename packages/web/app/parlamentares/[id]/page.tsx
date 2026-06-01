import { notFound } from "next/navigation";
import Link from "next/link";
import { getParlamentar } from "~/services/ranking";
import { getEmendasParlamentarFull, type EmendaCompleta } from "~/services/emendas";
import { ConfiancaBadge } from "~/components/ConfiancaBadge";
import { FonteNota } from "~/components/FonteNota";
import { ParedeDeAcesso } from "~/components/ParedeDeAcesso";
import { DatasetSection } from "~/components/DatasetSection";
import { getUser, hasPaidAccess } from "~/lib/supabase-auth";
import { getParlamentarRisco } from "~/services/risco";
import { getFolhaGabinete, getFolhaLeads } from "~/services/folha";
import { getCeapsSenadorHistorico } from "~/services/ceaps-senado";
import { getFrentesDeDeputado } from "~/services/frentes";
import { getTopDoadoresPorCpf } from "~/services/tse";
import { normalizarNome } from "~/lib/texto";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ id: string }>;
}

function fmtBRL(valor: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(valor);
}

function fmtNum(valor: number) {
  return new Intl.NumberFormat("pt-BR").format(valor);
}

function tipoLabel(tipo: string): string {
  const t = tipo.toLowerCase();
  if (t.includes("relator")) return "RP9";
  if (t.includes("bancada")) return "Bancada";
  if (t.includes("comissão") || t.includes("comissao")) return "Comissão";
  if (t.includes("individual") && t.includes("especiais")) return "Pix";
  if (t.includes("individual")) return "Individual";
  return tipo.split(" ")[0];
}

function tipoBadge(tipo: string): string {
  const t = tipo.toLowerCase();
  if (t.includes("relator")) return "badge-danger";
  if (t.includes("bancada")) return "badge-warn";
  if (t.includes("comissão") || t.includes("comissao")) return "badge-neutral";
  return "badge-success";
}

const sectionTitle: React.CSSProperties = {
  fontSize: "0.625rem",
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.12em",
  color: "hsl(var(--text-caption))",
  margin: "0 0 0.875rem 0",
};

function Kpi({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bloomberg-kpi">
      <div className="bloomberg-kpi-label">{label}</div>
      <div className="bloomberg-kpi-value">{value}</div>
      {sub && <div className="bloomberg-kpi-sub">{sub}</div>}
    </div>
  );
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const resultado = await getParlamentar(id);
  if (!resultado) return { title: "Parlamentar não encontrado — The BR Insider" };
  const { parlamentar: p } = resultado;
  const nome = p.nome_parlamentar || p.nome;
  const descricao = `Emendas, ranking e detalhamento de ${nome} (${p.partido}/${p.uf}).`;
  return {
    title: `${nome} — The BR Insider`,
    description: descricao,
    alternates: { canonical: `/parlamentares/${id}` },
    openGraph: {
      type: "profile",
      title: `${nome} — The BR Insider`,
      description: descricao,
      url: `/parlamentares/${id}`,
      // imagem: gerada por opengraph-image.tsx (card de marca com nome + partido)
    },
  };
}

export default async function ParlamentarPage({ params }: Props) {
  const { id } = await params;
  const resultado = await getParlamentar(id);
  if (!resultado) notFound();

  const { parlamentar: p, historico } = resultado;
  const nomeExibido = p.nome_parlamentar || p.nome;
  const casa = p.casa_legislativa === "senado" ? "Senado Federal" : "Câmara dos Deputados";

  // Busca tudo de uma vez, agrega em memória (estilo ALMG)
  const emendas = await getEmendasParlamentarFull(nomeExibido, 2000).catch(() => [] as EmendaCompleta[]);

  // Freemium-SEO: anônimo (inclui Googlebot) vê o teaser indexável — KPIs e
  // agregados públicos + uma prévia da tabela; a lista completa exige login.
  const user = await getUser();
  const liberado = user != null;
  const emendasTabela = liberado ? emendas : emendas.slice(0, 5);

  // Indicadores agregados (score G5) — Câmara apenas. Funde a riqueza do dossiê
  // no perfil canônico via id_camara. Senadores ainda não têm risco.
  const risco =
    p.casa_legislativa === "camara" && p.id_camara
      ? await getParlamentarRisco(p.id_camara).catch(() => null)
      : null;

  // Senador: despesas de gabinete (CEAPS), vínculo por nome normalizado.
  const senadorNorm = p.casa_legislativa === "senado" ? normalizarNome(nomeExibido) : null;
  const ceapsSenado = senadorNorm
    ? await getCeapsSenadorHistorico(senadorNorm).catch(() => [])
    : [];
  const ceapsTotal = ceapsSenado.reduce((s, r) => s + (Number(r.total_reembolsado) || 0), 0);
  const ceapsDocs = ceapsSenado.reduce((s, r) => s + (Number(r.total_documentos) || 0), 0);

  // Paridade com o dossiê (Câmara): frentes + top doadores de campanha.
  const frentes = p.id_camara && risco ? await getFrentesDeDeputado(p.id_camara).catch(() => []) : [];
  const doadores = risco?.cpf ? await getTopDoadoresPorCpf(risco.cpf).catch(() => null) : null;

  // Folha de gabinete (Câmara: estimado por id; Senado: exato por nome) + leads.
  const folha = await getFolhaGabinete({
    idCamara: p.id_camara,
    senadorNome: p.casa_legislativa === "senado" ? nomeExibido : null,
  }).catch(() => null);
  const leadsFolha = p.id_camara ? await getFolhaLeads(p.id_camara).catch(() => null) : null;
  const pago = user ? await hasPaidAccess(user.id).catch(() => false) : false;

  // ── Agregações ────────────────────────────────────────────────────
  const totalEmpenhado = emendas.reduce((s, e) => s + (Number(e.valor_empenhado) || 0), 0);
  const totalPago = emendas.reduce((s, e) => s + (Number(e.valor_pago) || 0), 0);
  const totalRap = emendas.reduce((s, e) => s + (Number(e.valor_resto_pago) || 0), 0);
  const taxaExec = totalEmpenhado > 0 ? Math.round((totalPago / totalEmpenhado) * 100) : 0;

  // Por tipo
  const tipoMap = new Map<string, { qtd: number; empenhado: number; pago: number }>();
  for (const e of emendas) {
    const k = tipoLabel(e.tipo_emenda);
    const cur = tipoMap.get(k) ?? { qtd: 0, empenhado: 0, pago: 0 };
    cur.qtd++;
    cur.empenhado += Number(e.valor_empenhado) || 0;
    cur.pago += Number(e.valor_pago) || 0;
    tipoMap.set(k, cur);
  }
  const porTipo = Array.from(tipoMap.entries())
    .map(([tipo, v]) => ({ tipo, ...v }))
    .sort((a, b) => b.empenhado - a.empenhado);

  // Por ano
  const anoMap = new Map<number, { qtd: number; empenhado: number; pago: number }>();
  for (const e of emendas) {
    const cur = anoMap.get(e.ano) ?? { qtd: 0, empenhado: 0, pago: 0 };
    cur.qtd++;
    cur.empenhado += Number(e.valor_empenhado) || 0;
    cur.pago += Number(e.valor_pago) || 0;
    anoMap.set(e.ano, cur);
  }
  const porAno = Array.from(anoMap.entries())
    .map(([ano, v]) => ({ ano, ...v }))
    .sort((a, b) => a.ano - b.ano);
  const maxAnoEmp = Math.max(...porAno.map((a) => a.empenhado), 1);

  // Por função
  const funcaoMap = new Map<string, { qtd: number; empenhado: number }>();
  for (const e of emendas) {
    if (!e.funcao) continue;
    const cur = funcaoMap.get(e.funcao) ?? { qtd: 0, empenhado: 0 };
    cur.qtd++;
    cur.empenhado += Number(e.valor_empenhado) || 0;
    funcaoMap.set(e.funcao, cur);
  }
  const porFuncao = Array.from(funcaoMap.entries())
    .map(([funcao, v]) => ({ funcao, ...v }))
    .sort((a, b) => b.empenhado - a.empenhado)
    .slice(0, 8);

  // Por UF destino
  const ufMap = new Map<string, { qtd: number; empenhado: number }>();
  for (const e of emendas) {
    if (!e.uf) continue;
    const cur = ufMap.get(e.uf) ?? { qtd: 0, empenhado: 0 };
    cur.qtd++;
    cur.empenhado += Number(e.valor_empenhado) || 0;
    ufMap.set(e.uf, cur);
  }
  const porUf = Array.from(ufMap.entries())
    .map(([uf, v]) => ({ uf, ...v }))
    .sort((a, b) => b.empenhado - a.empenhado)
    .slice(0, 12);

  const anosAtivo = porAno.length;
  const qtdEmendas = emendas.length;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: nomeExibido,
    jobTitle: p.casa_legislativa === "senado" ? "Senador" : "Deputado Federal",
    affiliation: { "@type": "Organization", name: p.partido },
    memberOf: { "@type": "GovernmentOrganization", name: casa },
    ...(p.foto_url ? { image: p.foto_url } : {}),
    url: `https://www.thebrinsider.com/parlamentares/${id}`,
    address: { "@type": "PostalAddress", addressRegion: p.uf, addressCountry: "BR" },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {/* ── Cabeçalho ─────────────────────────────────────────────── */}
      <section
        style={{
          borderBottom: "1px solid hsl(var(--border))",
          backgroundColor: "hsl(var(--background))",
        }}
      >
        <div className="container" style={{ padding: "2rem 1.5rem 1.5rem", maxWidth: "1080px" }}>
          {/* Breadcrumb */}
          <p
            style={{
              fontSize: "0.75rem",
              color: "hsl(var(--text-caption))",
              marginBottom: "1rem",
              fontFamily: "var(--font-sans)",
            }}
          >
            <Link href="/ranking" style={{ color: "hsl(var(--primary))", textDecoration: "none" }}>
              Ranking
            </Link>
            <span style={{ margin: "0 0.375rem", color: "hsl(var(--border))" }}>/</span>
            <span>{nomeExibido}</span>
          </p>

          <div style={{ display: "flex", alignItems: "flex-start", gap: "1rem" }}>
            {p.foto_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={p.foto_url}
                alt={nomeExibido}
                width={56}
                height={56}
                style={{
                  width: "56px",
                  height: "56px",
                  borderRadius: "50%",
                  objectFit: "cover",
                  flexShrink: 0,
                  border: "1px solid hsl(var(--border))",
                }}
              />
            ) : (
              <div
                style={{
                  width: "56px",
                  height: "56px",
                  borderRadius: "50%",
                  backgroundColor: "hsl(var(--muted))",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "1.25rem",
                  fontWeight: 700,
                  color: "hsl(var(--text-caption))",
                  flexShrink: 0,
                }}
              >
                {nomeExibido.charAt(0)}
              </div>
            )}

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: "0.75rem", flexWrap: "wrap" }}>
                <h1 style={{ fontSize: "1.625rem", margin: 0, lineHeight: 1.2 }}>{nomeExibido}</h1>
                <span className="badge-neutral" style={{ fontSize: "0.75rem" }}>
                  {p.partido}
                </span>
                {!p.ativo && (
                  <span className="badge-neutral" style={{ fontSize: "0.75rem", opacity: 0.7 }}>
                    Inativo
                  </span>
                )}
              </div>
              <p
                style={{
                  fontSize: "0.8125rem",
                  color: "hsl(var(--text-caption))",
                  margin: "0.375rem 0 0",
                  fontFamily: "var(--font-sans)",
                }}
              >
                {p.partido} · {p.uf} · {casa}
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="container" style={{ padding: "1.5rem 1.5rem 4rem", maxWidth: "1080px" }}>
        {/* ── KPIs ──────────────────────────────────────────────── */}
        <div className="bloomberg-kpi-grid" style={{ marginBottom: "1.5rem" }}>
          <Kpi
            label="Total empenhado"
            value={fmtBRL(totalEmpenhado)}
            sub={`${anosAtivo} ${anosAtivo === 1 ? "ano" : "anos"}`}
          />
          <Kpi
            label="Total pago"
            value={fmtBRL(totalPago)}
            sub={`${taxaExec}% executado`}
          />
          <Kpi
            label="Restos a pagar"
            value={fmtBRL(totalRap)}
            sub="pago em anos posteriores"
          />
          <Kpi
            label="Total de emendas"
            value={fmtNum(qtdEmendas)}
            sub="todos os anos"
          />
        </div>

        {risco && (
          <DatasetSection
            titulo="Indicadores do mandato"
            fonte="Câmara dos Deputados · TSE"
            verDetalheHref={`/risco/${p.id_camara}`}
            verDetalheLabel="Ver score de risco G5 →"
            style={{ marginTop: "1.25rem", marginBottom: "1.25rem" }}
          >
            <div className="bloomberg-kpi-grid">
              <Kpi label="Patrimônio (2022)" value={fmtBRL(Number(risco.patrimonio_2022) || 0)} />
              <Kpi label="CEAP (2024)" value={fmtBRL(Number(risco.ceap_total_2024) || 0)} />
              <Kpi label="Presença" value={`${Math.round(Number(risco.presenca_pct) || 0)}%`} sub="votações nominais" />
              <Kpi label="Financiamento (2022)" value={fmtBRL(Number(risco.financiamento_total) || 0)} />
              <Kpi label="Frentes" value={fmtNum(Number(risco.total_frentes) || 0)} />
              <Kpi label="Comissões" value={fmtNum(Number(risco.total_comissoes) || 0)} />
            </div>
          </DatasetSection>
        )}

        {doadores && doadores.doadores.length > 0 && (
          <DatasetSection
            titulo={`Top doadores de campanha (${doadores.ano})`}
            fonte="TSE"
            verDetalheHref="/funding"
            verDetalheLabel="Financiamento eleitoral →"
            style={{ marginTop: "1.25rem", marginBottom: "1.25rem" }}
          >
            <table className="bloomberg-table" style={{ width: "100%" }}>
              <thead>
                <tr>
                  <th style={{ textAlign: "left" }}>Doador</th>
                  <th style={{ textAlign: "right" }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {doadores.doadores.slice(0, 8).map((d, i) => (
                  <tr key={i}>
                    <td>{d.nome}</td>
                    <td style={{ textAlign: "right" }}>{fmtBRL(Number(d.total) || 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </DatasetSection>
        )}

        {frentes.length > 0 && (
          <DatasetSection
            titulo={`Frentes parlamentares (${frentes.length})`}
            fonte="Câmara dos Deputados"
            verDetalheHref="/frentes"
            verDetalheLabel="Todas as frentes →"
            style={{ marginTop: "1.25rem", marginBottom: "1.25rem" }}
          >
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
              {frentes.slice(0, 24).map((f) => (
                <Link
                  key={f.frente_id}
                  href={`/frentes/${f.frente_id}`}
                  style={{
                    fontSize: "0.75rem",
                    padding: "0.25rem 0.625rem",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "2px",
                    color: "hsl(var(--text-body))",
                    textDecoration: "none",
                  }}
                >
                  {f.titulo}
                </Link>
              ))}
              {frentes.length > 24 && (
                <span style={{ fontSize: "0.75rem", color: "hsl(var(--text-caption))", alignSelf: "center" }}>
                  +{frentes.length - 24}
                </span>
              )}
            </div>
          </DatasetSection>
        )}

        {ceapsSenado.length > 0 && (
          <DatasetSection
            titulo="Despesas de gabinete (CEAPS)"
            confianca="revisar"
            fonte="Senado Federal"
            verDetalheHref={`/senate-expenses/${encodeURIComponent(senadorNorm ?? "")}`}
            verDetalheLabel="Ver notas e fornecedores →"
            style={{ marginTop: "1.25rem", marginBottom: "1.25rem" }}
          >
            <div className="bloomberg-kpi-grid">
              <Kpi label="Total reembolsado" value={fmtBRL(ceapsTotal)} sub={`${ceapsSenado.length} ano(s)`} />
              <Kpi label="Notas fiscais" value={fmtNum(ceapsDocs)} />
            </div>
          </DatasetSection>
        )}

        {folha && (
          <DatasetSection
            titulo="Gabinete (folha de pessoal)"
            confianca={folha.tipoSalario}
            fonte={
              folha.tipoSalario === "estimado"
                ? "Câmara dos Deputados (salário estimado por nível de cargo)"
                : "Senado Federal"
            }
            style={{ marginTop: "1.25rem", marginBottom: "1.25rem" }}
          >
            <div className="bloomberg-kpi-grid">
              <Kpi label="Funcionários" value={fmtNum(folha.total)} />
              <Kpi
                label={folha.tipoSalario === "estimado" ? "Custo mensal (estimado)" : "Custo mensal"}
                value={fmtBRL(folha.somaSalarios)}
              />
              <Kpi label="Maior salário" value={fmtBRL(folha.maiorSalario)} />
            </div>
          </DatasetSection>
        )}

        {leadsFolha && (
          <DatasetSection
            titulo="Investigação: funcionários-doadores e nepotismo"
            confianca="revisar"
            fonte="Câmara + TSE (cruzamento por nome)"
            style={{ marginTop: "1.25rem", marginBottom: "1.25rem" }}
          >
            {pago ? (
              <>
                {leadsFolha.doadores.length > 0 && (
                  <>
                    <p style={{ fontSize: "0.75rem", color: "hsl(var(--text-caption))", margin: "0 0 0.5rem" }}>
                      {leadsFolha.doadores.length} funcionário(s) que doaram à campanha do parlamentar:
                    </p>
                    <table className="bloomberg-table" style={{ width: "100%" }}>
                      <thead>
                        <tr>
                          <th style={{ textAlign: "left" }}>Funcionário</th>
                          <th style={{ textAlign: "right" }}>Doação</th>
                          <th style={{ textAlign: "right" }}>Ano</th>
                        </tr>
                      </thead>
                      <tbody>
                        {leadsFolha.doadores.slice(0, 20).map((d, i) => (
                          <tr key={i}>
                            <td>{d.secretario_nome}</td>
                            <td style={{ textAlign: "right" }}>{fmtBRL(Number(d.valor_doado) || 0)}</td>
                            <td style={{ textAlign: "right" }}>{d.ano_eleicao}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </>
                )}
                {leadsFolha.nepotismo.length > 0 && (
                  <p style={{ fontSize: "0.75rem", color: "hsl(var(--text-caption))", margin: "0.75rem 0 0", lineHeight: 1.5 }}>
                    {leadsFolha.nepotismo.length} sinal(is) de sobrenome compartilhado com parlamentar de outro
                    gabinete (possível nepotismo cruzado, verificar parentesco).
                  </p>
                )}
              </>
            ) : (
              <ParedeDeAcesso
                tipo="pago"
                titulo="Cruzamentos de investigação (plano pago)"
                descricao={`Este gabinete tem ${leadsFolha.doadores.length} funcionário(s)-doador(es) e ${leadsFolha.nepotismo.length} sinal(is) de nepotismo cruzado. Assine para ver os nomes, valores e o cruzamento.`}
                next={`/parlamentares/${id}`}
              />
            )}
          </DatasetSection>
        )}

        {qtdEmendas === 0 ? (
          <div
            style={{
              padding: "2.5rem 1.5rem",
              textAlign: "center",
              border: "1px dashed hsl(var(--border))",
              borderRadius: "2px",
              color: "hsl(var(--text-caption))",
            }}
          >
            <p style={{ fontSize: "0.9375rem" }}>
              Nenhuma emenda registrada para este parlamentar.
            </p>
            <p style={{ fontSize: "0.8125rem", marginTop: "0.5rem" }}>
              O nome pode estar fora do padrão usado no Portal da Transparência. Tente buscar em{" "}
              <Link href="/amendments" style={{ color: "hsl(var(--primary))" }}>
                /amendments
              </Link>.
            </p>
          </div>
        ) : (
          <>
            {/* ── Por tipo + Por ano ──────────────────────────── */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "1.25rem",
                marginBottom: "1.25rem",
              }}
            >
              {/* Por tipo */}
              <div className="bloomberg-card">
                <h3 style={sectionTitle}>Por tipo de emenda</h3>
                <table className="bloomberg-table" style={{ width: "100%" }}>
                  <thead>
                    <tr>
                      <th>Tipo</th>
                      <th style={{ textAlign: "right" }}>Empenhado</th>
                      <th style={{ textAlign: "right" }}>Pago</th>
                      <th style={{ textAlign: "right" }}>Qtd</th>
                    </tr>
                  </thead>
                  <tbody>
                    {porTipo.map(({ tipo, qtd, empenhado, pago }) => (
                      <tr key={tipo}>
                        <td style={{ fontSize: "0.8125rem" }}>
                          <span className={tipoBadge(tipo)} style={{ fontSize: "0.6875rem" }}>{tipo}</span>
                        </td>
                        <td
                          style={{
                            textAlign: "right",
                            fontVariantNumeric: "tabular-nums",
                            fontWeight: 600,
                            fontSize: "0.8125rem",
                          }}
                        >
                          {fmtBRL(empenhado)}
                        </td>
                        <td
                          style={{
                            textAlign: "right",
                            color: "hsl(var(--text-body))",
                            fontSize: "0.8125rem",
                            fontVariantNumeric: "tabular-nums",
                          }}
                        >
                          {fmtBRL(pago)}
                        </td>
                        <td
                          style={{
                            textAlign: "right",
                            color: "hsl(var(--text-caption))",
                            fontSize: "0.8125rem",
                          }}
                        >
                          {fmtNum(qtd)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Por ano */}
              <div className="bloomberg-card">
                <h3 style={sectionTitle}>Evolução anual</h3>
                <table className="bloomberg-table" style={{ width: "100%" }}>
                  <thead>
                    <tr>
                      <th>Ano</th>
                      <th style={{ textAlign: "right" }}>Empenhado</th>
                      <th style={{ textAlign: "right" }}>Qtd</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {porAno.map(({ ano, qtd, empenhado }) => {
                      const pct = maxAnoEmp > 0 ? (empenhado / maxAnoEmp) * 100 : 0;
                      return (
                        <tr key={ano}>
                          <td
                            style={{
                              fontFamily: "var(--font-mono)",
                              fontSize: "0.8125rem",
                              color: "hsl(var(--text-caption))",
                            }}
                          >
                            {ano}
                          </td>
                          <td
                            style={{
                              textAlign: "right",
                              fontVariantNumeric: "tabular-nums",
                              fontWeight: 600,
                              fontSize: "0.8125rem",
                            }}
                          >
                            {fmtBRL(empenhado)}
                          </td>
                          <td
                            style={{
                              textAlign: "right",
                              color: "hsl(var(--text-caption))",
                              fontSize: "0.75rem",
                            }}
                          >
                            {fmtNum(qtd)}
                          </td>
                          <td style={{ width: "4rem", paddingLeft: "0.5rem" }}>
                            <div
                              style={{
                                height: "4px",
                                borderRadius: "2px",
                                backgroundColor: "hsl(var(--border))",
                              }}
                            >
                              <div
                                style={{
                                  width: `${pct.toFixed(1)}%`,
                                  height: "100%",
                                  borderRadius: "2px",
                                  backgroundColor: "hsl(var(--primary))",
                                }}
                              />
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* ── Por função + Por UF destino ─────────────────── */}
            {(porFuncao.length > 0 || porUf.length > 0) && (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "1.25rem",
                  marginBottom: "1.25rem",
                }}
              >
                {porFuncao.length > 0 && (
                  <div className="bloomberg-card">
                    <h3 style={sectionTitle}>Top áreas (função)</h3>
                    <table className="bloomberg-table" style={{ width: "100%" }}>
                      <thead>
                        <tr>
                          <th>Função</th>
                          <th style={{ textAlign: "right" }}>Empenhado</th>
                          <th style={{ textAlign: "right" }}>%</th>
                        </tr>
                      </thead>
                      <tbody>
                        {porFuncao.map(({ funcao, empenhado }) => (
                          <tr key={funcao}>
                            <td style={{ fontSize: "0.8125rem" }}>{funcao}</td>
                            <td
                              style={{
                                textAlign: "right",
                                fontVariantNumeric: "tabular-nums",
                                fontWeight: 600,
                                fontSize: "0.8125rem",
                              }}
                            >
                              {fmtBRL(empenhado)}
                            </td>
                            <td
                              style={{
                                textAlign: "right",
                                color: "hsl(var(--text-caption))",
                                fontSize: "0.75rem",
                              }}
                            >
                              {totalEmpenhado > 0
                                ? ((empenhado / totalEmpenhado) * 100).toFixed(1)
                                : "0"}
                              %
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {porUf.length > 0 && (
                  <div className="bloomberg-card">
                    <h3 style={sectionTitle}>Top UFs destinatárias</h3>
                    <table className="bloomberg-table" style={{ width: "100%" }}>
                      <thead>
                        <tr>
                          <th>UF</th>
                          <th style={{ textAlign: "right" }}>Empenhado</th>
                          <th style={{ textAlign: "right" }}>Qtd</th>
                        </tr>
                      </thead>
                      <tbody>
                        {porUf.map(({ uf, qtd, empenhado }) => (
                          <tr key={uf}>
                            <td
                              style={{
                                fontFamily: "var(--font-mono)",
                                fontSize: "0.8125rem",
                                fontWeight: 600,
                              }}
                            >
                              {uf}
                            </td>
                            <td
                              style={{
                                textAlign: "right",
                                fontVariantNumeric: "tabular-nums",
                                fontWeight: 600,
                                fontSize: "0.8125rem",
                              }}
                            >
                              {fmtBRL(empenhado)}
                            </td>
                            <td
                              style={{
                                textAlign: "right",
                                color: "hsl(var(--text-caption))",
                                fontSize: "0.75rem",
                              }}
                            >
                              {fmtNum(qtd)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* ── Tabela de emendas individuais (clicáveis) ───── */}
            <div className="bloomberg-card" style={{ padding: 0, overflow: "hidden" }}>
              <div style={{ padding: "1rem 1.25rem 0.75rem" }}>
                <h3 style={{ ...sectionTitle, margin: 0 }}>
                  Emendas individuais{" "}
                  <span style={{ fontWeight: 400, color: "hsl(var(--text-caption))" }}>
                    ({fmtNum(qtdEmendas)} registros · clique em uma linha para detalhe)
                  </span>
                </h3>
              </div>
              <div style={{ overflowX: "auto" }}>
                <table className="bloomberg-table" style={{ width: "100%", minWidth: "880px" }}>
                  <thead>
                    <tr>
                      <th style={{ width: "3.5rem" }}>Ano</th>
                      <th>Localidade</th>
                      <th>Função</th>
                      <th style={{ width: "5rem" }}>Tipo</th>
                      <th style={{ textAlign: "right", width: "8rem" }}>Empenhado</th>
                      <th style={{ textAlign: "right", width: "8rem" }}>Pago</th>
                      <th style={{ textAlign: "right", width: "5rem" }}>Exec.</th>
                      <th style={{ width: "2rem" }} />
                    </tr>
                  </thead>
                  <tbody>
                    {emendasTabela.slice(0, 200).map((e) => {
                      const exec =
                        e.valor_empenhado > 0
                          ? Math.round((e.valor_pago / e.valor_empenhado) * 100)
                          : 0;
                      const execCls =
                        exec >= 80 ? "badge-success" : exec >= 50 ? "badge-warn" : "badge-danger";
                      const localidade =
                        [e.municipio, e.uf].filter(Boolean).join("/") || e.localidade || "—";
                      const href = `/amendments/${e.id}`;
                      const link = {
                        display: "block",
                        width: "100%",
                        color: "inherit",
                        textDecoration: "none",
                      } as const;
                      return (
                        <tr key={e.id} style={{ cursor: "pointer" }}>
                          <td
                            style={{
                              fontFamily: "var(--font-mono)",
                              fontSize: "0.75rem",
                              color: "hsl(var(--text-caption))",
                            }}
                          >
                            <Link href={href} style={link}>{e.ano}</Link>
                          </td>
                          <td style={{ fontSize: "0.8125rem" }}>
                            <Link href={href} style={{ ...link, color: "hsl(var(--text-headline))", fontWeight: 600 }}>
                              {localidade}
                            </Link>
                            {e.subfuncao && (
                              <span
                                style={{
                                  display: "block",
                                  fontSize: "0.6875rem",
                                  color: "hsl(var(--text-caption))",
                                  marginTop: "0.125rem",
                                }}
                              >
                                {e.subfuncao}
                              </span>
                            )}
                          </td>
                          <td
                            style={{
                              fontSize: "0.75rem",
                              color: "hsl(var(--text-body))",
                            }}
                          >
                            <Link href={href} style={link}>{e.funcao ?? "—"}</Link>
                          </td>
                          <td>
                            <Link href={href} style={link}>
                              <span
                                className={tipoBadge(e.tipo_emenda)}
                                style={{ fontSize: "0.6875rem" }}
                              >
                                {tipoLabel(e.tipo_emenda)}
                              </span>
                            </Link>
                          </td>
                          <td
                            style={{
                              textAlign: "right",
                              fontWeight: 600,
                              fontFamily: "var(--font-mono)",
                              fontSize: "0.8125rem",
                              color: "hsl(var(--text-headline))",
                            }}
                          >
                            <Link href={href} style={link}>{fmtBRL(e.valor_empenhado)}</Link>
                          </td>
                          <td
                            style={{
                              textAlign: "right",
                              fontFamily: "var(--font-mono)",
                              fontSize: "0.75rem",
                              color: "hsl(var(--text-body))",
                            }}
                          >
                            <Link href={href} style={link}>{fmtBRL(e.valor_pago)}</Link>
                          </td>
                          <td style={{ textAlign: "right" }}>
                            <Link href={href} style={link}>
                              <span className={execCls} style={{ fontSize: "0.6875rem" }}>{exec}%</span>
                            </Link>
                          </td>
                          <td style={{ textAlign: "center" }}>
                            <Link
                              href={href}
                              style={{ color: "hsl(var(--primary))", fontWeight: 600, fontSize: "0.875rem", textDecoration: "none" }}
                            >
                              →
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {liberado && qtdEmendas > 200 && (
                <p
                  style={{
                    padding: "0.75rem 1.25rem",
                    fontSize: "0.75rem",
                    color: "hsl(var(--text-caption))",
                    borderTop: "1px solid hsl(var(--border))",
                    textAlign: "center",
                  }}
                >
                  Exibindo as 200 maiores emendas. Total: {fmtNum(qtdEmendas)} ·{" "}
                  <Link href={`/amendments?autor=${encodeURIComponent(nomeExibido)}`} style={{ color: "hsl(var(--primary))" }}>
                    Ver todas →
                  </Link>
                </p>
              )}
            </div>
          </>
        )}

        {!liberado && emendas.length > 5 && (
          <div style={{ marginTop: "1.25rem" }}>
            <ParedeDeAcesso
              titulo="Lista completa de emendas"
              descricao={`Mostrando 5 de ${fmtNum(qtdEmendas)} emendas. Crie uma conta gratuita ou entre para ver a lista completa, com detalhamento por linha.`}
              next={`/parlamentares/${id}`}
            />
          </div>
        )}

        {/* Histórico de posição no ranking */}
        {historico.length > 0 && (
          <div className="bloomberg-card" style={{ marginTop: "1.25rem" }}>
            <h3 style={sectionTitle}>Posição no ranking por ano</h3>
            <table className="bloomberg-table" style={{ width: "100%" }}>
              <thead>
                <tr>
                  <th>Ano</th>
                  <th style={{ textAlign: "right" }}>Posição</th>
                  <th style={{ textAlign: "right" }}>Empenhado</th>
                  <th style={{ textAlign: "right" }}>Taxa exec.</th>
                </tr>
              </thead>
              <tbody>
                {historico.map((h) => (
                  <tr key={h.ano}>
                    <td
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: "0.8125rem",
                        color: "hsl(var(--text-caption))",
                      }}
                    >
                      {h.ano}
                    </td>
                    <td
                      style={{
                        textAlign: "right",
                        fontFamily: "var(--font-mono)",
                        fontWeight: 600,
                      }}
                    >
                      #{h.posicao}
                    </td>
                    <td
                      style={{
                        textAlign: "right",
                        fontVariantNumeric: "tabular-nums",
                        fontWeight: 600,
                        fontSize: "0.8125rem",
                      }}
                    >
                      {fmtBRL(h.metricas.valor_empenhado)}
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <span
                        className={
                          h.metricas.taxa_execucao >= 80
                            ? "badge-success"
                            : h.metricas.taxa_execucao >= 50
                            ? "badge-warn"
                            : "badge-danger"
                        }
                        style={{ fontSize: "0.6875rem" }}
                      >
                        {h.metricas.taxa_execucao}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div
          style={{
            marginTop: "1.5rem",
            display: "flex",
            alignItems: "baseline",
            gap: "0.5rem",
            flexWrap: "wrap",
          }}
        >
          <ConfiancaBadge nivel="revisar" />
          <span style={{ fontSize: "0.75rem", color: "hsl(var(--text-caption))", lineHeight: 1.6 }}>
            Vínculo emenda-parlamentar feito por nome (<code>{nomeExibido}</code>), pode haver
            homônimos. Valores em R$ nominais.
          </span>
        </div>
        <FonteNota
          fonte="Portal da Transparência do Governo Federal"
          href="https://portaldatransparencia.gov.br/"
        />
      </div>
    </>
  );
}
