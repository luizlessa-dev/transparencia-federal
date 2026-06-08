import type { Metadata } from "next";
import Link from "next/link";
import {
  getAgendaCamara,
  getAgendaSenadoComissoes,
  getAgendaSenadoPlenario,
  getAgendaExecutivo,
  type AgendaCamaraEvento,
  type AgendaSenado,
  type AgendaSenadoPlenario,
  type AgendaExecutivo,
} from "~/services/agenda";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Agenda — BR Insider",
  description:
    "Agenda diária do Legislativo e Executivo Federal: reuniões de comissões, sessões plenárias e compromissos dos ministros.",
};

// ── Helpers ───────────────────────────────────────────────────────────────────

interface SearchParams {
  data?: string;
  fonte?: string;
  orgao?: string;
}

function hoje(): string {
  return new Date().toISOString().slice(0, 10);
}

function fmtData(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

function fmtHora(hora: string | null): string {
  if (!hora) return "";
  return hora.slice(0, 5);
}

function fmtDataHora(iso: string | null): string {
  if (!iso) return "";
  const dt = new Date(iso);
  return dt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function situacaoBadge(s: string | null): string {
  if (!s) return "";
  const v = s.toLowerCase();
  if (v.includes("encerrada") || v.includes("realizada")) return "badge-neutral";
  if (v.includes("cancelada") || v.includes("não realizada")) return "badge-danger";
  return "badge-success";
}

function presencaBadge(p: string | null): string {
  if (!p) return "";
  const v = p.toLowerCase();
  if (v.includes("remoto")) return "🖥️ Remoto";
  if (v.includes("semi") || v === "s") return "📡 Semipresencial";
  return "🏛️ Presencial";
}

// ── Componentes ───────────────────────────────────────────────────────────────

function SecaoHeader({ icon, titulo, total, cor }: {
  icon: string;
  titulo: string;
  total: number;
  cor: string;
}) {
  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      gap: "0.75rem",
      padding: "0.875rem 1.25rem",
      backgroundColor: "hsl(var(--surface))",
      borderLeft: `3px solid ${cor}`,
      marginBottom: "0.5rem",
    }}>
      <span style={{ fontSize: "1.25rem" }}>{icon}</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 700, fontSize: "0.9375rem", color: "hsl(var(--text-headline))" }}>
          {titulo}
        </div>
      </div>
      <span style={{
        fontSize: "0.75rem",
        fontWeight: 600,
        color: cor,
        backgroundColor: `${cor}18`,
        padding: "0.2rem 0.6rem",
        borderRadius: "2px",
      }}>
        {total} evento{total !== 1 ? "s" : ""}
      </span>
    </div>
  );
}

function CardCamara({ e }: { e: AgendaCamaraEvento }) {
  const hora = fmtDataHora(e.data_hora_inicio);
  const orgaos = (e.orgaos_siglas ?? []).join(" · ");
  const isAudiencia = e.tipo_evento?.toLowerCase().includes("audiência") ||
    e.tipo_evento?.toLowerCase().includes("audiencia");

  return (
    <div style={{
      padding: "0.875rem 1.25rem",
      borderBottom: "1px solid hsl(var(--border))",
      display: "flex",
      gap: "1rem",
    }}>
      {/* Hora */}
      <div style={{
        minWidth: "3.5rem",
        fontWeight: 600,
        fontSize: "0.875rem",
        color: "hsl(var(--text-caption))",
        paddingTop: "0.125rem",
      }}>
        {hora || "–"}
      </div>

      {/* Conteúdo */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem", flexWrap: "wrap" }}>
          {isAudiencia && (
            <span style={{
              fontSize: "0.6875rem", fontWeight: 700, textTransform: "uppercase",
              letterSpacing: "0.05em", color: "#c0392b",
              backgroundColor: "#c0392b18", padding: "0.1rem 0.5rem", borderRadius: "2px",
            }}>
              Audiência Pública
            </span>
          )}
          {e.tipo_evento && !isAudiencia && (
            <span style={{
              fontSize: "0.6875rem", fontWeight: 600,
              color: "hsl(var(--text-caption))", textTransform: "uppercase", letterSpacing: "0.04em",
            }}>
              {e.tipo_evento}
            </span>
          )}
          {e.situacao && (
            <span className={`badge ${situacaoBadge(e.situacao)}`} style={{ fontSize: "0.6875rem" }}>
              {e.situacao}
            </span>
          )}
        </div>

        <div style={{
          fontSize: "0.875rem",
          color: "hsl(var(--text-body))",
          lineHeight: 1.45,
          overflow: "hidden",
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
        }}>
          {e.descricao || "(sem descrição)"}
        </div>

        <div style={{ marginTop: "0.375rem", display: "flex", gap: "0.75rem", flexWrap: "wrap", alignItems: "center" }}>
          {orgaos && (
            <span style={{ fontSize: "0.75rem", color: "hsl(var(--accent))", fontWeight: 600 }}>
              {orgaos}
            </span>
          )}
          {(e.local_nome || e.local_sala) && (
            <span style={{ fontSize: "0.75rem", color: "hsl(var(--text-caption))" }}>
              📍 {[e.local_nome, e.local_sala].filter(Boolean).join(", ")}
            </span>
          )}
          {e.url_documento_pauta && (
            <a href={e.url_documento_pauta} target="_blank" rel="noopener noreferrer"
              style={{ fontSize: "0.75rem", color: "hsl(var(--accent))", textDecoration: "none" }}>
              📄 Pauta
            </a>
          )}
          {e.url_registro && (
            <a href={e.url_registro} target="_blank" rel="noopener noreferrer"
              style={{ fontSize: "0.75rem", color: "hsl(var(--accent))", textDecoration: "none" }}>
              🎥 Vídeo
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

function CardSenadoComissao({ r }: { r: AgendaSenado }) {
  const hora = fmtDataHora(r.data_hora_inicio);
  return (
    <div style={{
      padding: "0.875rem 1.25rem",
      borderBottom: "1px solid hsl(var(--border))",
      display: "flex",
      gap: "1rem",
    }}>
      <div style={{ minWidth: "3.5rem", fontWeight: 600, fontSize: "0.875rem", color: "hsl(var(--text-caption))", paddingTop: "0.125rem" }}>
        {hora || "–"}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem", flexWrap: "wrap" }}>
          {r.comissao_sigla && (
            <span style={{
              fontSize: "0.6875rem", fontWeight: 700,
              color: "hsl(var(--accent))", backgroundColor: "hsl(var(--surface))",
              padding: "0.1rem 0.5rem", borderRadius: "2px",
            }}>{r.comissao_sigla}</span>
          )}
          {r.tipo_desc && (
            <span style={{ fontSize: "0.6875rem", color: "hsl(var(--text-caption))", textTransform: "uppercase", letterSpacing: "0.04em" }}>
              {r.tipo_desc}
            </span>
          )}
          {r.situacao && (
            <span className={`badge ${situacaoBadge(r.situacao)}`} style={{ fontSize: "0.6875rem" }}>
              {r.situacao}
            </span>
          )}
        </div>
        <div style={{ fontSize: "0.875rem", color: "hsl(var(--text-body))", lineHeight: 1.45 }}>
          {r.titulo || r.comissao_nome || "(sem título)"}
        </div>
        <div style={{ marginTop: "0.375rem", display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
          {r.local && (
            <span style={{ fontSize: "0.75rem", color: "hsl(var(--text-caption))" }}>
              📍 {r.local}
            </span>
          )}
          {r.tipo_presenca && (
            <span style={{ fontSize: "0.75rem", color: "hsl(var(--text-caption))" }}>
              {presencaBadge(r.tipo_presenca)}
            </span>
          )}
          {r.url_pauta_completa && (
            <a href={r.url_pauta_completa} target="_blank" rel="noopener noreferrer"
              style={{ fontSize: "0.75rem", color: "hsl(var(--accent))", textDecoration: "none" }}>
              📄 Pauta
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

function CardSenadoPlenario({ s }: { s: AgendaSenadoPlenario }) {
  return (
    <div style={{
      padding: "0.875rem 1.25rem",
      borderBottom: "1px solid hsl(var(--border))",
      display: "flex",
      gap: "1rem",
    }}>
      <div style={{ minWidth: "3.5rem", fontWeight: 600, fontSize: "0.875rem", color: "hsl(var(--text-caption))", paddingTop: "0.125rem" }}>
        {fmtHora(s.hora) || "–"}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem", flexWrap: "wrap" }}>
          {s.tipo_sessao && (
            <span style={{
              fontSize: "0.6875rem", fontWeight: 700, textTransform: "uppercase",
              letterSpacing: "0.04em", color: "hsl(var(--text-caption))",
            }}>
              {s.tipo_sessao.trim()}
            </span>
          )}
          {s.situacao && (
            <span className={`badge ${situacaoBadge(s.situacao)}`} style={{ fontSize: "0.6875rem" }}>
              {s.situacao}
            </span>
          )}
        </div>
        {s.evento_desc && (
          <div style={{ fontSize: "0.875rem", color: "hsl(var(--text-body))", lineHeight: 1.45 }}>
            {s.evento_desc}
          </div>
        )}
        <div style={{ marginTop: "0.375rem", display: "flex", gap: "0.75rem" }}>
          {s.local && (
            <span style={{ fontSize: "0.75rem", color: "hsl(var(--text-caption))" }}>
              📍 {s.local}
            </span>
          )}
          {s.tipo_presenca && (
            <span style={{ fontSize: "0.75rem", color: "hsl(var(--text-caption))" }}>
              {presencaBadge(s.tipo_presenca)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function CardExecutivo({ c }: { c: AgendaExecutivo }) {
  return (
    <div style={{
      padding: "0.875rem 1.25rem",
      borderBottom: "1px solid hsl(var(--border))",
      display: "flex",
      gap: "1rem",
    }}>
      <div style={{ minWidth: "3.5rem", fontWeight: 600, fontSize: "0.875rem", color: "hsl(var(--text-caption))", paddingTop: "0.125rem" }}>
        {fmtHora(c.hora_inicio) || "–"}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem", flexWrap: "wrap" }}>
          {c.orgao_sigla && (
            <span style={{
              fontSize: "0.6875rem", fontWeight: 700,
              color: "hsl(var(--accent))", backgroundColor: "hsl(var(--surface))",
              padding: "0.1rem 0.5rem", borderRadius: "2px",
            }}>{c.orgao_sigla}</span>
          )}
          {c.tipo_compromisso && (
            <span style={{ fontSize: "0.6875rem", color: "hsl(var(--text-caption))", textTransform: "uppercase", letterSpacing: "0.04em" }}>
              {c.tipo_compromisso}
            </span>
          )}
          {c.tem_participantes_privados && (
            <span style={{
              fontSize: "0.6875rem", fontWeight: 700,
              color: "#c0392b", backgroundColor: "#c0392b18",
              padding: "0.1rem 0.5rem", borderRadius: "2px",
            }}>
              🤝 Setor privado ({c.n_participantes_privados})
            </span>
          )}
        </div>
        <div style={{ fontSize: "0.875rem", color: "hsl(var(--text-headline))", fontWeight: 500, marginBottom: "0.2rem" }}>
          {c.autoridade_nome || c.autoridade_cargo || "–"}
        </div>
        {c.assunto && (
          <div style={{
            fontSize: "0.8125rem", color: "hsl(var(--text-body))", lineHeight: 1.4,
            overflow: "hidden", display: "-webkit-box",
            WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
          }}>
            {c.assunto}
          </div>
        )}
        {c.local && (
          <div style={{ marginTop: "0.25rem", fontSize: "0.75rem", color: "hsl(var(--text-caption))" }}>
            📍 {c.local}
          </div>
        )}
      </div>
    </div>
  );
}

function Vazio() {
  return (
    <div style={{ padding: "1.5rem 1.25rem", color: "hsl(var(--text-caption))", fontSize: "0.875rem", textAlign: "center" }}>
      Nenhum evento para este dia.
    </div>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────

export default async function AgendaPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const data = sp.data ?? hoje();
  const fonte = sp.fonte ?? "todos";

  // Datas de navegação
  const dataPrev = new Date(data);
  dataPrev.setDate(dataPrev.getDate() - 1);
  const dataNext = new Date(data);
  dataNext.setDate(dataNext.getDate() + 1);
  const prevStr = dataPrev.toISOString().slice(0, 10);
  const nextStr = dataNext.toISOString().slice(0, 10);

  // Busca paralela por fonte selecionada
  const [camara, senadoCom, senadoPlen, executivo] = await Promise.all([
    fonte === "todos" || fonte === "camara"
      ? getAgendaCamara(data, data)
      : Promise.resolve([]),
    fonte === "todos" || fonte === "senado"
      ? getAgendaSenadoComissoes(data, data)
      : Promise.resolve([]),
    fonte === "todos" || fonte === "senado"
      ? getAgendaSenadoPlenario(data, data)
      : Promise.resolve([]),
    fonte === "todos" || fonte === "executivo"
      ? getAgendaExecutivo(data, data)
      : Promise.resolve([]),
  ]);

  const totalGeral = camara.length + senadoCom.length + senadoPlen.length + executivo.length;

  const fontes = [
    { value: "todos", label: "Todos" },
    { value: "camara", label: "Câmara" },
    { value: "senado", label: "Senado" },
    { value: "executivo", label: "Executivo" },
  ];

  return (
    <div style={{ maxWidth: "860px", margin: "0 auto", padding: "1.5rem 1rem 4rem" }}>

      {/* Cabeçalho */}
      <div style={{ marginBottom: "1.5rem" }}>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 800, color: "hsl(var(--text-headline))", marginBottom: "0.25rem" }}>
          Agenda Legislativa e Executiva
        </h1>
        <p style={{ fontSize: "0.875rem", color: "hsl(var(--text-caption))" }}>
          Reuniões, audiências e compromissos dos três poderes — atualizados 2× ao dia.
        </p>
      </div>

      {/* Navegação de data + filtro de fonte */}
      <div style={{
        display: "flex", alignItems: "center", gap: "0.75rem",
        marginBottom: "1.25rem", flexWrap: "wrap",
      }}>
        {/* Seta anterior */}
        <Link href={`/agenda?data=${prevStr}&fonte=${fonte}`} style={{
          padding: "0.375rem 0.75rem", fontSize: "0.875rem",
          color: "hsl(var(--text-body))", backgroundColor: "hsl(var(--surface))",
          border: "1px solid hsl(var(--border))", borderRadius: "2px",
          textDecoration: "none", fontWeight: 500,
        }}>← Anterior</Link>

        {/* Data atual */}
        <div style={{
          padding: "0.375rem 1rem", fontWeight: 700, fontSize: "0.9375rem",
          color: "hsl(var(--text-headline))", backgroundColor: "hsl(var(--surface))",
          border: "1px solid hsl(var(--border))", borderRadius: "2px",
        }}>
          {fmtData(data)}
        </div>

        {/* Seta próximo */}
        <Link href={`/agenda?data=${nextStr}&fonte=${fonte}`} style={{
          padding: "0.375rem 0.75rem", fontSize: "0.875rem",
          color: "hsl(var(--text-body))", backgroundColor: "hsl(var(--surface))",
          border: "1px solid hsl(var(--border))", borderRadius: "2px",
          textDecoration: "none", fontWeight: 500,
        }}>Próximo →</Link>

        {/* Hoje */}
        {data !== hoje() && (
          <Link href="/agenda" style={{
            padding: "0.375rem 0.75rem", fontSize: "0.8125rem",
            color: "hsl(var(--accent))",
            textDecoration: "none", fontWeight: 600,
          }}>Hoje</Link>
        )}

        {/* Separador */}
        <div style={{ flex: 1 }} />

        {/* Filtro fonte */}
        <div style={{ display: "flex", gap: "0.25rem", flexWrap: "wrap" }}>
          {fontes.map((f) => (
            <Link
              key={f.value}
              href={`/agenda?data=${data}&fonte=${f.value}`}
              style={{
                padding: "0.3rem 0.75rem", fontSize: "0.8125rem", fontWeight: fonte === f.value ? 700 : 500,
                color: fonte === f.value ? "hsl(var(--text-headline))" : "hsl(var(--text-body))",
                backgroundColor: fonte === f.value ? "hsl(var(--surface))" : "transparent",
                border: "1px solid hsl(var(--border))", borderRadius: "2px",
                textDecoration: "none",
              }}
            >{f.label}</Link>
          ))}
        </div>
      </div>

      {/* Total */}
      {totalGeral === 0 ? (
        <div style={{
          padding: "2rem", textAlign: "center",
          color: "hsl(var(--text-caption))", fontSize: "0.9375rem",
          backgroundColor: "hsl(var(--surface))", borderRadius: "4px",
          border: "1px solid hsl(var(--border))",
        }}>
          Nenhum evento encontrado para {fmtData(data)}.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>

          {/* Câmara */}
          {camara.length > 0 && (
            <div style={{ border: "1px solid hsl(var(--border))", borderRadius: "4px", overflow: "hidden" }}>
              <SecaoHeader icon="🏛️" titulo="Câmara dos Deputados" total={camara.length} cor="#1a6b3c" />
              {camara.map((e) => <CardCamara key={e.id} e={e} />)}
            </div>
          )}

          {/* Senado — Comissões */}
          {senadoCom.length > 0 && (
            <div style={{ border: "1px solid hsl(var(--border))", borderRadius: "4px", overflow: "hidden" }}>
              <SecaoHeader icon="🏛️" titulo="Senado Federal — Comissões" total={senadoCom.length} cor="#2980b9" />
              {senadoCom.map((r) => <CardSenadoComissao key={r.id} r={r} />)}
            </div>
          )}

          {/* Senado — Plenário */}
          {senadoPlen.length > 0 && (
            <div style={{ border: "1px solid hsl(var(--border))", borderRadius: "4px", overflow: "hidden" }}>
              <SecaoHeader icon="🎙️" titulo="Senado Federal — Plenário" total={senadoPlen.length} cor="#2980b9" />
              {senadoPlen.map((s) => <CardSenadoPlenario key={s.id} s={s} />)}
            </div>
          )}

          {/* Executivo */}
          {executivo.length > 0 && (
            <div style={{ border: "1px solid hsl(var(--border))", borderRadius: "4px", overflow: "hidden" }}>
              <SecaoHeader icon="🇧🇷" titulo="Poder Executivo — Ministros" total={executivo.length} cor="#c0392b" />
              {executivo.map((c) => <CardExecutivo key={c.id} c={c} />)}
            </div>
          )}

        </div>
      )}

      {/* Nota de fonte */}
      <div style={{
        marginTop: "2rem", padding: "0.875rem 1rem",
        backgroundColor: "hsl(var(--surface))",
        border: "1px solid hsl(var(--border))", borderRadius: "4px",
        fontSize: "0.75rem", color: "hsl(var(--text-caption))", lineHeight: 1.5,
      }}>
        <strong>Fontes:</strong>{" "}
        Câmara dos Deputados (dadosabertos.camara.leg.br) ·
        Senado Federal (legis.senado.leg.br/dadosabertos) ·
        e-Agendas CGU (eagendas.cgu.gov.br) — Decreto nº 10.889/2021.
        Atualizado automaticamente 2× ao dia (04h e 16h BRT).
      </div>
    </div>
  );
}
