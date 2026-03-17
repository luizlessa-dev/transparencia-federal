import { getMetodologia } from "@/services/api";
import { ErrorBlock } from "@/components";

export const dynamic = "force-dynamic";

export default async function MetodologiaPage() {
  const result = await getMetodologia();

  if (!result.ok) {
    return (
      <section className="section">
        <h1 className="page-title">Metodologia do ranking</h1>
        <ErrorBlock message={result.error} />
      </section>
    );
  }

  const data = result.data;
  const hasContent = data.conteudo || data.texto || (data.secoes && data.secoes.length > 0);

  if (!hasContent) {
    return (
      <section className="section">
        <h1 className="page-title">Metodologia do ranking</h1>
        <p className="lead">Como os indicadores e a ordenação dos parlamentares são calculados.</p>
        <p>Em breve, será publicada aqui a explicação detalhada da metodologia.</p>
      </section>
    );
  }

  return (
    <section className="section">
      <h1 className="page-title">{data.titulo ?? "Metodologia do ranking"}</h1>
      <p className="lead">Como os indicadores e a ordenação dos parlamentares são calculados.</p>
      {(data.conteudo || data.texto) && (
        <div className="section">
          <p style={{ whiteSpace: "pre-wrap" }}>{data.conteudo ?? data.texto}</p>
        </div>
      )}
      {data.secoes && data.secoes.length > 0 && (
        <div className="section">
          {data.secoes.map((sec, i) => (
            <div key={i} className="section">
              <h2>{sec.titulo}</h2>
              <p>{sec.corpo}</p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
