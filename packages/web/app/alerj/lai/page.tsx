/**
 * ALERJ — pedido de LAI: texto completo + status + cronologia.
 *
 * Rota: alerj.transparenciafederal.org/lai → /alerj/lai
 *
 * Este arquivo é editado manualmente conforme o pedido avança. Pontos de
 * atualização:
 *   - LAI_STATE — status do pedido
 *   - DATA_PROTOCOLO — data ISO em que foi protocolado (null = ainda em rascunho)
 *   - RESPOSTAS — array com cada interação registrada
 */
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Pedido formal de LAI — ALERJ | Transparência Federal",
  description:
    "Texto integral do pedido de Lei de Acesso à Informação requerendo os dados do DOCIGP em formato aberto. Status, cronologia e próximos passos.",
  alternates: { canonical: "https://alerj.transparenciafederal.org/lai" },
};

export const dynamic = "force-dynamic"; // recalcula contador a cada visita

// ── Estado do pedido (editar manualmente) ─────────────────────────────────

type LaiState = "rascunho" | "protocolado" | "respondido_total" | "respondido_parcial" | "negado";

const LAI_STATE: LaiState = "rascunho";

/** Data ISO (YYYY-MM-DD) em que o pedido foi protocolado. Null se ainda em rascunho. */
const DATA_PROTOCOLO: string | null = null;

/** Identificador do pedido no Alô ALERJ, se já protocolado. */
const PROTOCOLO_NUMERO: string | null = null;

type Resposta = {
  data: string;           // ISO YYYY-MM-DD
  tipo: "resposta" | "prorrogacao" | "recurso" | "nota";
  resumo: string;
  link?: string;
};

const RESPOSTAS: Resposta[] = [];

// ── Helpers ───────────────────────────────────────────────────────────────

function fmtData(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

/** Dias úteis entre duas datas (inclusive). Aproximação — não considera feriados nacionais. */
function diasUteis(inicio: Date, fim: Date): number {
  if (fim < inicio) return 0;
  let count = 0;
  const cur = new Date(inicio);
  while (cur <= fim) {
    const dow = cur.getDay();
    if (dow !== 0 && dow !== 6) count++;
    cur.setDate(cur.getDate() + 1);
  }
  return count;
}

// ── Page ──────────────────────────────────────────────────────────────────

export default function LaiPage() {
  const hoje = new Date();
  const protocoloDate = DATA_PROTOCOLO ? new Date(DATA_PROTOCOLO + "T12:00:00") : null;
  const diasDesdeProtocolo = protocoloDate ? diasUteis(protocoloDate, hoje) : 0;
  const prazoLegal = 20;
  const prazoComProrrogacao = 30;
  const dentroPrazo = diasDesdeProtocolo <= prazoLegal;
  const prorrogavel = diasDesdeProtocolo > prazoLegal && diasDesdeProtocolo <= prazoComProrrogacao;

  return (
    <>
      {/* ── Cabeçalho ────────────────────────────────────────────────────── */}
      <section
        style={{
          borderBottom: "1px solid hsl(var(--border))",
          backgroundColor: "hsl(var(--background))",
        }}
      >
        <div className="container" style={{ padding: "2rem 1.5rem 1.5rem", maxWidth: "880px" }}>
          {/* Breadcrumb */}
          <div
            style={{
              fontSize: "0.75rem",
              color: "hsl(var(--text-caption))",
              marginBottom: "1rem",
              display: "flex",
              alignItems: "center",
              gap: "0.375rem",
            }}
          >
            <Link href="/" style={{ color: "hsl(var(--primary))", textDecoration: "none" }}>
              ALERJ
            </Link>
            <span>/</span>
            <span>Pedido de LAI</span>
          </div>

          <h1 style={{ fontSize: "1.625rem", margin: 0, lineHeight: 1.2 }}>
            Pedido formal de acesso aos dados do DOCIGP
          </h1>

          <p
            style={{
              fontSize: "0.875rem",
              color: "hsl(var(--text-body))",
              margin: "0.5rem 0 0",
              maxWidth: "560px",
            }}
          >
            Requerendo a publicação dos dados de despesas de gabinete dos
            deputados estaduais do Rio de Janeiro em formato aberto, com base
            na Lei nº 12.527/2011 (LAI).
          </p>
        </div>
      </section>

      <div className="container" style={{ padding: "1.5rem 1.5rem 4rem", maxWidth: "880px" }}>

        {/* ── Status ──────────────────────────────────────────────────────── */}
        <div className="bloomberg-card" style={{ marginBottom: "1.25rem" }}>
          <h2 style={sectionTitle}>Status do pedido</h2>
          {LAI_STATE === "rascunho" ? (
            <>
              <p style={paragraph}>
                <span className="badge-warn" style={{ fontSize: "0.75rem", marginRight: "0.5rem" }}>
                  EM RASCUNHO
                </span>
                O texto abaixo está pronto pra ser protocolado no Alô ALERJ. A
                publicação aqui na página é simultânea ao protocolo — sem
                pedido secreto, sem barganha de bastidor.
              </p>
              <p style={{ ...paragraph, margin: 0 }}>
                Protocolo previsto: nesta semana. Esta página será atualizada
                em tempo real conforme o pedido avança.
              </p>
            </>
          ) : (
            <>
              <p style={paragraph}>
                <span
                  className={dentroPrazo ? "badge-success" : prorrogavel ? "badge-warn" : "badge-danger"}
                  style={{ fontSize: "0.75rem", marginRight: "0.5rem" }}
                >
                  {LAI_STATE === "protocolado" && (dentroPrazo ? "AGUARDANDO RESPOSTA" : prorrogavel ? "PRORROGADO" : "VENCIDO")}
                  {LAI_STATE === "respondido_total" && "RESPONDIDO INTEGRALMENTE"}
                  {LAI_STATE === "respondido_parcial" && "RESPONDIDO PARCIALMENTE"}
                  {LAI_STATE === "negado" && "NEGADO"}
                </span>
                {protocoloDate && (
                  <>
                    Protocolado em <strong>{fmtData(DATA_PROTOCOLO!)}</strong>
                    {PROTOCOLO_NUMERO && (
                      <>
                        {" "}
                        — protocolo nº{" "}
                        <code style={{ fontFamily: "var(--font-mono)" }}>{PROTOCOLO_NUMERO}</code>
                      </>
                    )}
                    .
                  </>
                )}
              </p>
              {protocoloDate && (
                <p style={{ ...paragraph, margin: 0, fontSize: "0.8125rem" }}>
                  Dia <strong>{diasDesdeProtocolo}</strong> de <strong>{prazoLegal}</strong> dias
                  úteis (prazo legal LAI), prorrogável por mais <strong>10</strong>.
                </p>
              )}
            </>
          )}
        </div>

        {/* ── Cronologia ──────────────────────────────────────────────────── */}
        {RESPOSTAS.length > 0 && (
          <div className="bloomberg-card" style={{ marginBottom: "1.25rem" }}>
            <h2 style={sectionTitle}>Cronologia</h2>
            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {RESPOSTAS.map((r, idx) => (
                <li
                  key={idx}
                  style={{
                    paddingLeft: "0.875rem",
                    borderLeft: "2px solid hsl(var(--border))",
                    marginBottom: "0.875rem",
                  }}
                >
                  <div
                    style={{
                      fontSize: "0.6875rem",
                      fontFamily: "var(--font-mono)",
                      color: "hsl(var(--text-caption))",
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                    }}
                  >
                    {fmtData(r.data)} · {r.tipo}
                  </div>
                  <div
                    style={{
                      fontSize: "0.875rem",
                      color: "hsl(var(--text-body))",
                      marginTop: "0.25rem",
                    }}
                  >
                    {r.resumo}
                    {r.link && (
                      <>
                        {" — "}
                        <a
                          href={r.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ color: "hsl(var(--primary))" }}
                        >
                          documento
                        </a>
                      </>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* ── Texto do pedido ─────────────────────────────────────────────── */}
        <div className="bloomberg-card" style={{ marginBottom: "1.25rem" }}>
          <h2 style={sectionTitle}>Texto integral do pedido</h2>
          <p style={{ ...paragraph, fontSize: "0.8125rem", color: "hsl(var(--text-caption))" }}>
            Cópia idêntica do texto enviado pelo formulário do Alô ALERJ.
            Reproduzido aqui pra que qualquer cidadão possa replicá-lo no
            próprio nome.
          </p>

          <div
            style={{
              backgroundColor: "hsl(var(--surface))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "4px",
              padding: "1.25rem",
              fontSize: "0.875rem",
              lineHeight: 1.65,
              color: "hsl(var(--text-body))",
              whiteSpace: "pre-wrap",
              fontFamily: "var(--font-sans)",
            }}
          >
{`Excelentíssimo(a) Sr.(a) responsável pelo Serviço de Informação ao Cidadão (SIC) da Assembleia Legislativa do Estado do Rio de Janeiro,

Com fundamento na Lei Federal nº 12.527/2011 (Lei de Acesso à Informação), no art. 5º, XXXIII, da Constituição Federal, e no princípio da publicidade (art. 37, caput, CF), solicito o fornecimento das seguintes informações, em formato aberto e estruturado (CSV ou XML), conforme padrões adotados pela própria Administração Pública estadual paulista (ALESP) e mineira (ALMG):

OBJETO DO PEDIDO

Histórico completo de despesas autorizadas pela Descentralização Orçamentária de Custeio Individualizado para Gabinete Parlamentar (DOCIGP), instituída pelo Ato N/MD nº 641/2019, contemplando:

  1. Identificação do(a) deputado(a) ou gabinete beneficiário;
  2. Mês e ano de competência da despesa;
  3. Identificação do fornecedor (razão social);
  4. CNPJ (ou CPF, quando aplicável) do fornecedor;
  5. Categoria/natureza da despesa;
  6. Valor da despesa;
  7. Data de pagamento (quando disponível);
  8. Número do documento fiscal (quando disponível).

PERÍODO

Janeiro de 2019 até o mês mais recente disponível na base interna do DOCIGP.

FORMA DE ENTREGA

Arquivo único em formato CSV ou XML, com codificação UTF-8, separador de campos padrão da Administração (vírgula ou ponto-e-vírgula), conforme já praticado pelo Portal de Dados Abertos da Assembleia Legislativa do Estado de São Paulo (https://www.al.sp.gov.br/dados-abertos/).

JUSTIFICATIVA

A informação solicitada constitui dado público de despesa orçamentária descentralizada, custeada com recursos do Tesouro Estadual. A Lei de Acesso à Informação estabelece como regra geral a transparência ativa de tais informações (art. 8º, § 1º, II, c/c § 3º, II e III), sendo o sigilo exceção restrita às hipóteses do art. 23 da mesma lei — nenhuma das quais aplicável a despesas de gabinete.

Cumpre destacar que:

  (a) A ALMG publica integralmente, em seu portal de transparência, as despesas individualizadas equivalentes (Verba Indenizatória), com identificação do fornecedor, CNPJ, valor e categoria, desde 2019;

  (b) A ALESP publica historicamente, em formato XML aberto, todas as despesas de gabinete desde 2015, contemplando os mesmos campos ora solicitados;

  (c) A Câmara dos Deputados publica, desde 2010, a Cota para Exercício da Atividade Parlamentar (CEAP) com nível equivalente de detalhamento;

  (d) Não há razão técnica, jurídica ou de proteção de dados pessoais que justifique restringir o acesso público a esses mesmos campos no âmbito da ALERJ, sendo o tratamento dispensado pelas demais casas legislativas demonstração inequívoca de viabilidade.

PEDIDO SUBSIDIÁRIO

Caso a Casa entenda existir alguma restrição parcial sobre algum dos campos solicitados, requer-se:

  (i) a entrega dos campos não restritos no formato solicitado, e
  (ii) fundamentação expressa, por escrito, da restrição aplicada a cada campo eventualmente sonegado, com indicação do dispositivo legal e do prazo de classificação, nos termos do art. 11, § 4º, da LAI.

Esclareço, por fim, que esta informação será utilizada para fins jornalísticos e de fiscalização pública, integrando a plataforma Transparência Federal (https://www.transparenciafederal.com), e que cópia integral deste pedido e da resposta será publicada em https://alerj.transparenciafederal.org/lai, no exercício do direito à informação e do interesse público.

Atenciosamente,

Luiz Lessa
Jornalista
luiz@gastronomizae.com
Plataforma Transparência Federal — www.transparenciafederal.com`}
          </div>
        </div>

        {/* ── Próximos passos legais ──────────────────────────────────────── */}
        <div className="bloomberg-card">
          <h2 style={sectionTitle}>Próximos passos previstos</h2>
          <ul
            style={{
              listStyle: "none",
              padding: 0,
              margin: 0,
              display: "flex",
              flexDirection: "column",
              gap: "0.875rem",
            }}
          >
            <Passo
              prazo="20 dias úteis"
              titulo="Resposta inicial obrigatória"
              descricao="Prazo legal pra que a ALERJ atenda integralmente, atenda parcialmente, prorrogue ou negue o pedido. Art. 11, LAI."
            />
            <Passo
              prazo="+10 dias úteis"
              titulo="Prorrogação possível"
              descricao="A casa pode prorrogar uma única vez, por até 10 dias úteis, justificando expressamente. Art. 11, § 2º, LAI."
            />
            <Passo
              prazo="10 dias do indeferimento"
              titulo="Recurso à autoridade superior"
              descricao="Se houver negativa total ou parcial, é cabível recurso à autoridade hierarquicamente superior. Art. 15, LAI."
            />
            <Passo
              prazo="10 dias do recurso"
              titulo="Recurso à CGE-RJ"
              descricao="Em caso de manutenção da negativa, o recurso sobe à Controladoria-Geral do Estado do RJ. Art. 16, LAI."
            />
            <Passo
              prazo="Esgotada a via administrativa"
              titulo="Ação judicial"
              descricao="Mandado de segurança com base na LAI + art. 5º, XXXIII e LXIX, CF. Pode ser ajuizada por jornalista, cidadão ou entidade da sociedade civil."
            />
          </ul>
        </div>

        <p
          style={{
            fontSize: "0.75rem",
            color: "hsl(var(--text-caption))",
            marginTop: "1.25rem",
            lineHeight: 1.6,
          }}
        >
          Esta página é atualizada manualmente conforme a ALERJ responde ao
          pedido. Cada movimentação — resposta, prorrogação, indeferimento,
          recurso — é registrada na cronologia acima e divulgada na newsletter{" "}
          <em>Bastidores BR</em>.
        </p>
      </div>
    </>
  );
}

// ── primitives ───────────────────────────────────────────────────────────

const sectionTitle: React.CSSProperties = {
  fontSize: "0.625rem",
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.12em",
  color: "hsl(var(--text-caption))",
  margin: "0 0 0.875rem 0",
};

const paragraph: React.CSSProperties = {
  fontSize: "0.9375rem",
  color: "hsl(var(--text-body))",
  lineHeight: 1.65,
  margin: "0 0 0.75rem",
};

function Passo({
  prazo,
  titulo,
  descricao,
}: {
  prazo: string;
  titulo: string;
  descricao: string;
}) {
  return (
    <li style={{ paddingLeft: "0.875rem", borderLeft: "2px solid hsl(var(--border))" }}>
      <div
        style={{
          fontSize: "0.6875rem",
          fontFamily: "var(--font-mono)",
          color: "hsl(var(--accent))",
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          marginBottom: "0.125rem",
        }}
      >
        {prazo}
      </div>
      <div
        style={{
          fontSize: "0.875rem",
          fontWeight: 600,
          color: "hsl(var(--text-headline))",
          marginBottom: "0.25rem",
        }}
      >
        {titulo}
      </div>
      <div style={{ fontSize: "0.8125rem", color: "hsl(var(--text-body))", lineHeight: 1.55 }}>
        {descricao}
      </div>
    </li>
  );
}
