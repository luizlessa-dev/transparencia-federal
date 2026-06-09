import Link from "next/link";

export const revalidate = 86400;

export const metadata = {
  title: "Metodologia",
  description:
    "Como o Radar FAB monitora os voos de autoridades na FAB: fontes (GABAER, Portal da Transparência, DOU, CEAP), estimativa de custo e limitações declaradas.",
  alternates: { canonical: "/metodologia" },
};

const ACCENT = "hsl(350 73% 44%)";

function H({ children }: { children: React.ReactNode }) {
  return (
    <h2 style={{ fontSize: "1.1875rem", fontFamily: "var(--font-display)", color: "hsl(var(--text-headline))", margin: "2rem 0 0.75rem", paddingBottom: "0.375rem", borderBottom: "1px solid hsl(var(--border))" }}>{children}</h2>
  );
}
function P({ children }: { children: React.ReactNode }) {
  return <p style={{ fontSize: "0.9375rem", color: "hsl(var(--text-body))", lineHeight: 1.7, margin: "0 0 0.875rem" }}>{children}</p>;
}

export default function MetodologiaPage() {
  return (
    <>
      <div style={{ borderBottom: "1px solid hsl(var(--border))", backgroundColor: "hsl(var(--surface))" }}>
        <div className="container" style={{ padding: "0.75rem 1.5rem", display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.8125rem", color: "hsl(var(--text-caption))" }}>
          <Link href="/" style={{ color: "hsl(var(--text-caption))", textDecoration: "none" }}>Radar FAB</Link>
          <span>›</span><span style={{ color: "hsl(var(--text-body))", fontWeight: 500 }}>Metodologia</span>
        </div>
      </div>

      <div className="container" style={{ padding: "2.5rem 1.5rem", maxWidth: "48rem" }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.75rem" }}>
          <div style={{ height: "2px", width: "1.5rem", backgroundColor: ACCENT }} />
          <span style={{ fontSize: "0.6875rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.2em", color: ACCENT }}>Transparência sobre a transparência</span>
        </div>
        <h1 style={{ fontSize: "clamp(1.75rem, 4vw, 2.5rem)", marginBottom: "1rem" }}>Metodologia</h1>
        <P>
          O Radar FAB é um produto jornalístico de monitoramento serial dos voos de autoridades
          em aeronaves da Força Aérea Brasileira. Esta página descreve as fontes, os métodos e —
          principalmente — os <strong style={{ color: "hsl(var(--text-headline))" }}>limites</strong> do que afirmamos.
          Acreditamos que um produto de transparência precisa ser transparente sobre si mesmo.
        </P>

        <H>De onde vêm os dados</H>
        <P>
          A base primária é o repositório público <a href="https://github.com/FABdadosabertos/GABAER" target="_blank" rel="noopener" style={{ color: ACCENT }}>FABdadosabertos/GABAER</a>,
          mantido pelo Comando da Aeronáutica (COMAER) em cumprimento ao Decreto nº 10.267/2020.
          Ele lista cada voo de autoridade com origem, destino, horários de decolagem e pouso,
          motivo e número de passageiros. Cobrimos <strong style={{ color: "hsl(var(--text-headline))" }}>10.012 voos de 2020 a 2026</strong>.
        </P>
        <P>
          A atualização é automática: um workflow verifica diariamente se há CSV novo no GABAER
          e regenera as análises. O código é aberto.
        </P>

        <H>Como estimamos o custo</H>
        <P>
          A FAB <strong style={{ color: "hsl(var(--text-headline))" }}>não divulga</strong> o custo por hora de voo de cada aeronave.
          Por isso, todo custo neste site é <strong style={{ color: ACCENT }}>estimativa</strong>, calculada assim:
          tempo real de voo (decolagem → pouso) multiplicado por um custo/hora de referência por
          tipo de aeronave — R$ 42.500/h para o presidencial (VC-1) e R$ 34.000/h para o Legacy 600
          (VC-99C), usado pela maioria das autoridades. Quando não há pouso registrado, usamos o
          custo médio por missão apurado pelo TCU.
        </P>
        <P>
          A referência oficial é o Acórdão <strong style={{ color: "hsl(var(--text-headline))" }}>TCU TC 008.687/2024-2</strong>,
          que apurou R$ 285,2 milhões em 7.491 missões entre 2020 e 2024 — média de R$ 38.100/missão.
          Sempre que citamos um valor, ele é uma aproximação, não um número oficial da FAB.
        </P>

        <H>Cruzamento com outras fontes</H>
        <P>
          Para reduzir erros, cruzamos os voos com três fontes independentes:
        </P>
        <ul style={{ fontSize: "0.9375rem", color: "hsl(var(--text-body))", lineHeight: 1.7, paddingLeft: "1.25rem", marginBottom: "0.875rem" }}>
          <li><strong style={{ color: "hsl(var(--text-headline))" }}>Diário Oficial da União</strong> — verifica se há ato oficial publicado na data do voo.</li>
          <li><strong style={{ color: "hsl(var(--text-headline))" }}>Portal da Transparência</strong> — identifica servidores que viajaram ao mesmo destino (a comitiva).</li>
          <li><strong style={{ color: "hsl(var(--text-headline))" }}>CEAP</strong> — detecta gasto paralelo com passagens comerciais.</li>
        </ul>
        <P>
          Esse cruzamento já nos impediu de publicar uma acusação falsa: um voo de fim de semana
          que parecia sem justificativa tinha, no Portal, uma diária oficial para inauguração de
          um hospital. <strong style={{ color: "hsl(var(--text-headline))" }}>Não publicamos.</strong>
        </P>

        <H>O que NÃO afirmamos</H>
        <P>
          Os registros do GABAER trazem o <em>cargo</em> da autoridade, não o nome da pessoa. Quando
          atribuímos um voo a um ministro específico, usamos a tabela de quem ocupava o cargo na data —
          mas o passageiro real pode ser outro. Os passageiros das missões marcadas
          <strong style={{ color: "hsl(var(--text-headline))" }}> "À Disposição de"</strong> não são identificados nos dados públicos.
        </P>
        <P>
          Co-viagem de um servidor ao mesmo destino <strong style={{ color: "hsl(var(--text-headline))" }}>não prova</strong> que
          ele estava na aeronave da FAB. Custo estimado <strong style={{ color: "hsl(var(--text-headline))" }}>não é</strong> custo
          oficial. Tratamos esses cruzamentos como ponto de partida de apuração, nunca como conclusão.
        </P>

        <H>Correção e contato</H>
        <P>
          Erramos? Escreva para <a href="mailto:luiz@gastronomizae.com" style={{ color: ACCENT }}>luiz@gastronomizae.com</a>.
          Publicamos correções. Todos os dados brutos estão abertos e podem ser auditados por qualquer pessoa.
        </P>

        <div style={{ marginTop: "2rem", paddingTop: "1.5rem", borderTop: "1px solid hsl(var(--border))" }}>
          <Link href="/ranking" style={{ fontSize: "0.875rem", fontWeight: 600, color: ACCENT, textDecoration: "none" }}>Ver o ranking de autoridades →</Link>
        </div>
      </div>
    </>
  );
}
