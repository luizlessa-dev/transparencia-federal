import Link from "next/link";
import { IndependenceNotice } from "~/components/IndependenceNotice";

export const metadata = {
  title: "Metodologia do Score de Risco — The BR Insider",
  description:
    "Documentação completa do Score de Risco G5: fórmula, pesos, fontes, exemplo numérico, limitações e o que o índice não é.",
  alternates: { canonical: "/risco/metodologia" },
};

const VIGENCIA = "24 de maio de 2026 · v1.0";

function H2({ children }: { children: React.ReactNode }) {
  return (
    <h2 style={{ fontSize: "1.125rem", margin: "2.25rem 0 0.625rem", color: "hsl(var(--text-headline))" }}>
      {children}
    </h2>
  );
}
function H3({ children }: { children: React.ReactNode }) {
  return (
    <h3 style={{ fontSize: "0.9375rem", margin: "1.25rem 0 0.5rem", color: "hsl(var(--text-headline))" }}>
      {children}
    </h3>
  );
}
function P({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontSize: "0.9375rem", color: "hsl(var(--text-body))", lineHeight: 1.7, margin: "0 0 0.875rem" }}>
      {children}
    </p>
  );
}

interface Dim {
  nome: string;
  peso: string;
  fonte: string;
  formula: string;
  o_que_pega: string;
}

const DIMENSOES: Dim[] = [
  {
    nome: "CEAP (Gastos de Gabinete)",
    peso: "30%",
    fonte: "Câmara dos Deputados — API Dados Abertos · Cota para Exercício da Atividade Parlamentar",
    formula: "Total gasto na cota no ano corrente / teto da cota da UF, normalizado 0–100",
    o_que_pega: "Uso intensivo da cota com relação ao teto — não diferencia gasto regular de gasto concentrado em fornecedores únicos (essa diferenciação está no perfil individual).",
  },
  {
    nome: "Ausência em votações nominais",
    peso: "20%",
    fonte: "Câmara dos Deputados — endpoint /votacoes e /votos",
    formula: "% de votações nominais em que o deputado não votou nem orientou bancada, 57ª legislatura",
    o_que_pega: "Baixa presença em deliberações de plenário. Não conta missões oficiais nem licenças regulamentares; mas conta ausências repetidas em deliberações relevantes.",
  },
  {
    nome: "Baixa produção legislativa",
    peso: "15%",
    fonte: "Câmara dos Deputados — endpoint /proposicoes",
    formula: "Inverso do número de proposições de autoria principal apresentadas no mandato, normalizado",
    o_que_pega: "Mandato com produção legislativa muito abaixo da mediana da Casa.",
  },
  {
    nome: "Concentração de financiamento eleitoral",
    peso: "20%",
    fonte: "TSE — prestação de contas eleitoral 2022",
    formula: "Soma de doações dos 5 maiores doadores / total arrecadado, normalizado 0–100",
    o_que_pega: "Dependência alta de poucos financiadores. Não atribui ilícito ao doador nem ao mandato — captura concentração como sinal.",
  },
  {
    nome: "Emendas RP9 (orçamento secreto)",
    peso: "15%",
    fonte: "Portal da Transparência — emendas individuais com indicador RP9",
    formula: "Total empenhado em emendas RP9 no mandato / mediana da Casa, normalizado 0–100",
    o_que_pega: "Volume relevante de emendas via Relator-Geral (instrumento conhecido como orçamento secreto, vigente entre 2020 e 2022).",
  },
];

export default function ScoreMetodologiaPage() {
  return (
    <>
      <section style={{ borderBottom: "1px solid hsl(var(--border))", backgroundColor: "hsl(var(--background))" }}>
        <div className="container" style={{ padding: "2rem 1.5rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.5rem" }}>
            <div style={{ height: "2rem", width: "3px", flexShrink: 0, backgroundColor: "hsl(var(--danger))" }} />
            <h1 style={{ fontSize: "1.75rem", margin: 0 }}>Metodologia do Score de Risco</h1>
          </div>
          <p style={{ fontSize: "0.8125rem", color: "hsl(var(--text-caption))", margin: "0 0 0 calc(3px + 0.75rem)", fontFamily: "var(--font-sans)" }}>
            Documento técnico {VIGENCIA} · Atualizado mensalmente
          </p>
        </div>
      </section>

      <div className="container" style={{ padding: "2rem 1.5rem 3rem", maxWidth: "820px" }}>

        {/* Disclaimer no topo */}
        <div style={{ marginBottom: "1.5rem" }}>
          <IndependenceNotice variant="card" />
        </div>

        {/* O que NÃO é (essencial) */}
        <div style={{
          padding: "1rem 1.25rem",
          backgroundColor: "hsl(var(--surface))",
          border: "1px solid hsl(var(--border))",
          borderLeft: "3px solid hsl(var(--danger))",
          borderRadius: "2px",
          marginBottom: "2rem",
        }}>
          <div style={{ fontSize: "0.625rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: "hsl(var(--danger))", marginBottom: "0.5rem" }}>
            Leia primeiro — o que o Score não é
          </div>
          <p style={{ fontSize: "0.9375rem", color: "hsl(var(--text-body))", lineHeight: 1.65, margin: 0 }}>
            O Score de Risco é um <strong>alerta analítico</strong>. Ele <strong>não</strong> declara
            que o parlamentar cometeu ilegalidade, improbidade administrativa, irregularidade ou crime.
            Não tem valor judicial, processual ou administrativo. Um score alto sinaliza que cinco
            dimensões públicas combinadas merecem inspeção mais cuidadosa — é uma <em>ferramenta de
            pauta</em>, não uma sentença.
          </p>
        </div>

        <H2>1. Para que serve</H2>
        <P>
          Reunir, em um único indicador comparável, padrões públicos de gasto, presença, produção e
          financiamento que, isolados, exigiriam horas de cruzamento manual. O objetivo é{" "}
          <strong>reduzir o custo de busca</strong> para quem investiga: jornalistas, pesquisadores,
          ONGs de transparência e cidadãos.
        </P>
        <P>
          Inspiração metodológica: indicadores compostos de transparência usados por Transparência
          Internacional, observatórios da OCDE e agências de classificação de risco soberano.
          A diferença é que aqui o nível de análise é o <em>parlamentar individual</em>, e todas as
          variáveis são públicas, oficiais e reprocessáveis.
        </P>

        <H2>2. Fórmula</H2>
        <div style={{
          padding: "1.25rem",
          backgroundColor: "hsl(var(--card))",
          border: "1px solid hsl(var(--border))",
          borderRadius: "2px",
          marginBottom: "1rem",
          fontFamily: "var(--font-mono)",
          fontSize: "0.9375rem",
          color: "hsl(var(--text-headline))",
          lineHeight: 1.6,
        }}>
          Score = (CEAP × 0,30) + (Ausência × 0,20) + (Produção × 0,15) + (Financiamento × 0,20) + (RP9 × 0,15)
          <br />
          <span style={{ color: "hsl(var(--text-caption))", fontSize: "0.8125rem" }}>
            Cada dimensão normalizada em 0–100 antes da soma ponderada. Score final ∈ [0, 100].
          </span>
        </div>

        <H2>3. As cinco dimensões</H2>
        {DIMENSOES.map((d) => (
          <div key={d.nome} className="bloomberg-card" style={{ marginBottom: "0.875rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "0.5rem" }}>
              <h3 style={{ fontSize: "0.9375rem", margin: 0, color: "hsl(var(--text-headline))" }}>{d.nome}</h3>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.875rem", color: "hsl(var(--primary))", fontWeight: 700 }}>{d.peso}</span>
            </div>
            <p style={{ fontSize: "0.8125rem", color: "hsl(var(--text-caption))", margin: "0 0 0.5rem", lineHeight: 1.5 }}>
              <strong>Fonte:</strong> {d.fonte}
            </p>
            <p style={{ fontSize: "0.8125rem", color: "hsl(var(--text-caption))", margin: "0 0 0.5rem", lineHeight: 1.5 }}>
              <strong>Cálculo:</strong> {d.formula}
            </p>
            <p style={{ fontSize: "0.8125rem", color: "hsl(var(--text-body))", margin: 0, lineHeight: 1.5 }}>
              <strong>O que capta (e o que não capta):</strong> {d.o_que_pega}
            </p>
          </div>
        ))}

        <H2>4. Justificativa dos pesos</H2>
        <P>
          Os pesos são <strong>escolhas editoriais</strong> — não derivam de otimização estatística. A
          lógica: <strong>CEAP recebe o maior peso (30%)</strong> porque é a dimensão com cobertura
          temporal mais consistente, atualização semanal e correspondência direta com gasto efetivo.
          Ausência e financiamento dividem o segundo nível (20% cada) por serem sinais robustos e
          complementares — comportamento legislativo e relações de campanha. Produção legislativa e
          RP9 recebem 15% cada: importantes, mas com mais ruído (produção depende do papel do
          parlamentar em comissões; RP9 deixou de existir como instrumento após 2022).
        </P>
        <P>
          A versão 1.0 publicada aqui é a primeira calibragem. Versões futuras podem ajustar os pesos
          após análise de correlação cruzada — todas as mudanças serão registradas com data e
          justificativa nesta mesma página.
        </P>

        <H2>5. Exemplo numérico</H2>
        <P>
          Um deputado hipotético com as seguintes dimensões normalizadas:
        </P>
        <div style={{ overflowX: "auto", margin: "0.5rem 0 1rem" }}>
          <table className="bloomberg-table" style={{ minWidth: "560px" }}>
            <thead>
              <tr>
                <th>Dimensão</th>
                <th style={{ textAlign: "right" }}>Valor 0–100</th>
                <th style={{ textAlign: "right" }}>Peso</th>
                <th style={{ textAlign: "right" }}>Contribuição</th>
              </tr>
            </thead>
            <tbody>
              <tr><td>CEAP</td><td style={{ textAlign: "right", fontFamily: "var(--font-mono)" }}>72</td><td style={{ textAlign: "right", fontFamily: "var(--font-mono)" }}>0,30</td><td style={{ textAlign: "right", fontFamily: "var(--font-mono)" }}>21,6</td></tr>
              <tr><td>Ausência</td><td style={{ textAlign: "right", fontFamily: "var(--font-mono)" }}>45</td><td style={{ textAlign: "right", fontFamily: "var(--font-mono)" }}>0,20</td><td style={{ textAlign: "right", fontFamily: "var(--font-mono)" }}>9,0</td></tr>
              <tr><td>Produção (inv.)</td><td style={{ textAlign: "right", fontFamily: "var(--font-mono)" }}>60</td><td style={{ textAlign: "right", fontFamily: "var(--font-mono)" }}>0,15</td><td style={{ textAlign: "right", fontFamily: "var(--font-mono)" }}>9,0</td></tr>
              <tr><td>Financiamento</td><td style={{ textAlign: "right", fontFamily: "var(--font-mono)" }}>88</td><td style={{ textAlign: "right", fontFamily: "var(--font-mono)" }}>0,20</td><td style={{ textAlign: "right", fontFamily: "var(--font-mono)" }}>17,6</td></tr>
              <tr><td>RP9</td><td style={{ textAlign: "right", fontFamily: "var(--font-mono)" }}>30</td><td style={{ textAlign: "right", fontFamily: "var(--font-mono)" }}>0,15</td><td style={{ textAlign: "right", fontFamily: "var(--font-mono)" }}>4,5</td></tr>
              <tr style={{ borderTop: "2px solid hsl(var(--border))", backgroundColor: "hsl(var(--surface))" }}>
                <td style={{ fontWeight: 700 }}>Score final</td>
                <td colSpan={2} />
                <td style={{ textAlign: "right", fontFamily: "var(--font-mono)", fontWeight: 700, color: "hsl(var(--warning))" }}>61,7</td>
              </tr>
            </tbody>
          </table>
        </div>
        <P>
          Score 61,7 cai na faixa amarela (40–70): merece olhar, mas não é caso isolado de alarme.
          Score ≥ 70 entra na faixa vermelha — não porque o deputado seja &quot;culpado&quot; de algo,
          mas porque a combinação das cinco dimensões está fora do padrão da Casa.
        </P>

        <H2>6. Faixas de leitura</H2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "0.5rem", margin: "0.5rem 0 1rem" }}>
          {[
            { label: "0 – 39", cor: "hsl(var(--success))", t: "Padrão da Casa", d: "Nenhum sinal combinado relevante." },
            { label: "40 – 69", cor: "hsl(var(--warning))", t: "Atenção", d: "Pelo menos duas dimensões fora do padrão. Vale checar." },
            { label: "70 – 100", cor: "hsl(var(--danger))", t: "Alerta alto", d: "Combinação atípica. Apuração jornalística recomendada." },
          ].map((f) => (
            <div key={f.label} style={{
              padding: "0.875rem 1rem",
              backgroundColor: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderLeft: `3px solid ${f.cor}`,
              borderRadius: "2px",
            }}>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.875rem", fontWeight: 700, color: f.cor, marginBottom: "0.25rem" }}>{f.label}</div>
              <div style={{ fontSize: "0.8125rem", fontWeight: 600, color: "hsl(var(--text-headline))", marginBottom: "0.25rem" }}>{f.t}</div>
              <div style={{ fontSize: "0.75rem", color: "hsl(var(--text-caption))", lineHeight: 1.5 }}>{f.d}</div>
            </div>
          ))}
        </div>

        <H2>7. Limitações conhecidas</H2>
        <ul style={{ fontSize: "0.9375rem", color: "hsl(var(--text-body))", lineHeight: 1.7, paddingLeft: "1.25rem" }}>
          <li>
            <strong>Cobertura temporal desigual</strong>: votações cobrem fev/2023–atual; RP9 só
            existiu até 2022. Comparações entre legislaturas exigem cautela.
          </li>
          <li>
            <strong>Deputado recém-empossado</strong> tem produção legislativa baixa naturalmente —
            a dimensão de produção pode penalizar quem tem poucos meses de mandato. Trabalhamos
            num ajuste por tempo de mandato para v1.1.
          </li>
          <li>
            <strong>Reconciliação por CPF</strong>: o cruzamento TSE × Câmara depende de CPF, que é
            público para candidaturas. Em raríssimos casos, há divergência de grafia em nomes parlamentares
            que podem não bater — esses casos ficam fora do Score até serem corrigidos manualmente.
          </li>
          <li>
            <strong>Senadores</strong>: o Score atual cobre apenas deputados federais. Versão Senado está
            no roadmap.
          </li>
          <li>
            <strong>Dependência das fontes</strong>: defasagens, mudanças de schema ou indisponibilidade
            das APIs oficiais afetam diretamente a atualização do Score.
          </li>
        </ul>

        <H2>8. Reprodutibilidade</H2>
        <P>
          O script que calcula o Score está em código aberto:{" "}
          <code style={{ fontFamily: "var(--font-mono)", fontSize: "0.8125rem", color: "hsl(var(--primary))" }}>
            packages/analytics/run-risco.ts
          </code>{" "}
          no repositório{" "}
          <a href="https://github.com/luizlessa-dev/transparencia-federal" target="_blank" rel="noopener noreferrer"
            style={{ color: "hsl(var(--primary))", fontWeight: 600, textDecoration: "none" }}>
            github.com/luizlessa-dev/transparencia-federal
          </a>.
          Pesquisadores que queiram replicar localmente podem clonar o repo, conectar ao próprio Supabase
          e rodar a pipeline contra as APIs públicas.
        </P>

        <H2>9. Contestação de cálculo ou metodologia</H2>
        <P>
          Encontrou um erro no cálculo, discorda dos pesos ou identificou um caso em que o Score
          atribuiu sinal incorreto? Envie pelo canal de{" "}
          <Link href="/correcoes" style={{ color: "hsl(var(--primary))", textDecoration: "none", fontWeight: 600 }}>
            correções
          </Link>{" "}
          ou diretamente para{" "}
          <a href="mailto:contato@thebrinsider.com?subject=Score%20de%20Risco%20%E2%80%94%20Metodologia"
            style={{ color: "hsl(var(--primary))", textDecoration: "none", fontWeight: 600 }}>
            contato@thebrinsider.com
          </a>.
          Contestações sobre cálculo entram na fila de severidade Alta (resposta em 24h).
        </P>

        <p style={{ fontSize: "0.75rem", color: "hsl(var(--text-caption))", marginTop: "2.5rem", borderTop: "1px solid hsl(var(--border))", paddingTop: "1rem" }}>
          Documento técnico — {VIGENCIA} · Editor responsável: Luiz Lessa ·{" "}
          <Link href="/risco" style={{ color: "hsl(var(--primary))" }}>← Voltar ao ranking</Link>
        </p>
      </div>
    </>
  );
}
