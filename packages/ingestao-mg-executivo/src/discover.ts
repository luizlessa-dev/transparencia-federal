/**
 * Mapeia o catálogo CKAN de MG e localiza os datasets dos 4 eixos do MVP:
 * remuneração (supersalários), diárias, contratos/fornecedores e despesas/orçamento.
 *
 * Por que existe: não dá pra adivinhar os `resource_id` reais sem bater no CKAN,
 * e o CKAN bloqueia IP de datacenter (403). Você roda isto no IP residencial
 * (ou via proxy) UMA vez; ele cospe os datasets + resources (id, formato, url)
 * que os jobs de ingestão vão consumir.
 */
import { packageList, packageSearch, packageShow, type CkanPackage } from "./ckan-client.js";

/** Eixos do MVP → termos de busca no CKAN. */
export const EIXOS: { eixo: string; termos: string[] }[] = [
  { eixo: "remuneracao", termos: ["remuneração", "remuneracao", "servidores", "folha", "pessoal", "salário"] },
  { eixo: "diarias", termos: ["diária", "diarias", "viagem", "viagens", "passagens"] },
  { eixo: "contratos", termos: ["contrato", "contratos", "fornecedor", "compras", "licitação", "sancionada"] },
  { eixo: "despesas", termos: ["despesa", "despesas", "orçamento", "orcamento", "empenho", "execução"] },
];

export type DescobertaEixo = {
  eixo: string;
  pacotes: {
    name: string;
    title: string | null;
    organizacao: string | null;
    resources: { id: string; name: string | null; format: string | null; url: string | null; datastore: boolean }[];
  }[];
};

export type Descoberta = {
  base: string;
  totalPacotesCatalogo: number | null;
  eixos: DescobertaEixo[];
  geradoEm: string;
};

function resumePacote(p: CkanPackage) {
  return {
    name: p.name,
    title: p.title ?? null,
    organizacao: p.organization?.title ?? null,
    resources: (p.resources ?? []).map((r) => ({
      id: r.id,
      name: r.name ?? null,
      format: (r.format ?? "").toUpperCase() || null,
      url: r.url ?? null,
      datastore: Boolean(r.datastore_active),
    })),
  };
}

export async function descobrir(base: string, geradoEm: string): Promise<Descoberta> {
  let totalCatalogo: number | null = null;
  try {
    const todos = await packageList();
    totalCatalogo = todos.length;
  } catch {
    // package_list pode estar desabilitado em algumas instâncias; segue no search.
  }

  const eixos: DescobertaEixo[] = [];
  for (const { eixo, termos } of EIXOS) {
    const vistos = new Map<string, CkanPackage>();
    for (const termo of termos) {
      try {
        const { results } = await packageSearch(termo, 30);
        for (const r of results) if (!vistos.has(r.name)) vistos.set(r.name, r);
      } catch (err) {
        console.error(`  ! busca "${termo}" falhou: ${err instanceof Error ? err.message : err}`);
      }
    }
    // Enriquecer com package_show pra garantir resources completos.
    const pacotes = [];
    for (const [name, parcial] of vistos) {
      try {
        const full = (parcial.resources?.length ?? 0) > 0 ? parcial : await packageShow(name);
        pacotes.push(resumePacote(full));
      } catch {
        pacotes.push(resumePacote(parcial));
      }
    }
    eixos.push({ eixo, pacotes });
  }

  return { base, totalPacotesCatalogo: totalCatalogo, eixos, geradoEm };
}

/** Renderiza um relatório legível pro stdout. */
export function imprimirRelatorio(d: Descoberta): void {
  console.log(`\n📚 Catálogo CKAN: ${d.base}`);
  console.log(`   Total de datasets no catálogo: ${d.totalPacotesCatalogo ?? "(indisponível)"}`);
  for (const e of d.eixos) {
    console.log(`\n── eixo: ${e.eixo.toUpperCase()} — ${e.pacotes.length} dataset(s) ──`);
    for (const p of e.pacotes) {
      console.log(`  • ${p.name}  «${p.title ?? ""}»  [${p.organizacao ?? "?"}]`);
      for (const r of p.resources) {
        const ds = r.datastore ? " {datastore}" : "";
        console.log(`      - [${r.format ?? "?"}]${ds} id=${r.id}`);
        if (r.url) console.log(`        ${r.url}`);
      }
    }
  }
}
