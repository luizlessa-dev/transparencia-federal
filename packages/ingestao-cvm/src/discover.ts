/**
 * Mapeia o catálogo CKAN da CVM e localiza os datasets dos eixos do MVP:
 * cadastro de fundos (nós do grafo), carteira/CDA e informes de FIP/FIDC
 * (arestas do grafo fundo-sobre-fundo), ofertas públicas/debêntures (emissores)
 * e companhias abertas (demonstrações financeiras).
 *
 * Diferente do discover de MG: aqui combinamos uma lista CURADA de slugs
 * conhecidos (resolvidos via package_show, garante os resources certos) com uma
 * busca por termos (pega datasets novos que ainda não mapeamos). O resultado vai
 * pro discover-output.json que os jobs consomem.
 */
import { packageList, packageSearch, packageShow, type CkanPackage } from "./ckan-client.js";

/** Eixos do MVP → slugs conhecidos + termos de busca. */
export const EIXOS: { eixo: string; slugs: string[]; termos: string[] }[] = [
  {
    eixo: "fundos-cadastro",
    slugs: ["fi-cad"],
    termos: ["cadastro fundo", "fundos de investimento cadastral"],
  },
  {
    eixo: "fundos-carteira",
    slugs: ["fi-doc-cda", "fi-doc-perfil_mensal", "fidc-doc-inf_mensal"],
    termos: ["composição diversificação", "carteira fundo", "CDA"],
  },
  {
    eixo: "fip",
    slugs: ["fip-doc-inf_trimestral", "fip-doc-inf_quadrimestral"],
    termos: ["FIP", "participações", "informe trimestral"],
  },
  {
    eixo: "ofertas-emissores",
    slugs: ["oferta-distrib", "coord_oferta-cad", "securit-doc-inf_mensal_cri", "securit-doc-inf_mensal_cra"],
    termos: ["oferta pública", "debênture", "distribuição", "securitizadora"],
  },
  {
    eixo: "cia-aberta",
    slugs: ["cia_aberta-cad", "cia_aberta-doc-dfp", "cia_aberta-doc-itr", "cia_aberta-doc-fre"],
    termos: ["companhia aberta", "demonstrações financeiras", "formulário de referência"],
  },
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
    // segue no search.
  }

  const eixos: DescobertaEixo[] = [];
  for (const { eixo, slugs, termos } of EIXOS) {
    const vistos = new Map<string, CkanPackage>();
    // 1) slugs curados — resolução direta e confiável.
    for (const slug of slugs) {
      try {
        const full = await packageShow(slug);
        vistos.set(full.name, full);
      } catch (err) {
        console.error(`  ! slug "${slug}" não resolveu: ${err instanceof Error ? err.message : err}`);
      }
    }
    // 2) busca por termos — pega o que ainda não mapeamos.
    for (const termo of termos) {
      try {
        const { results } = await packageSearch(termo, 15);
        for (const r of results) if (!vistos.has(r.name)) vistos.set(r.name, r);
      } catch (err) {
        console.error(`  ! busca "${termo}" falhou: ${err instanceof Error ? err.message : err}`);
      }
    }
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

/** Renderiza um relatório legível pro stdout (só resources CSV/ZIP relevantes). */
export function imprimirRelatorio(d: Descoberta): void {
  console.log(`\n📚 Catálogo CKAN: ${d.base}`);
  console.log(`   Total de datasets no catálogo: ${d.totalPacotesCatalogo ?? "(indisponível)"}`);
  for (const e of d.eixos) {
    console.log(`\n── eixo: ${e.eixo.toUpperCase()} — ${e.pacotes.length} dataset(s) ──`);
    for (const p of e.pacotes) {
      console.log(`  • ${p.name}  «${p.title ?? ""}»  [${p.organizacao ?? "?"}]`);
      // Mostra só os 4 primeiros resources pra não poluir (datasets de FI têm dezenas de anos).
      const rs = p.resources.slice(0, 4);
      for (const r of rs) {
        const ds = r.datastore ? " {datastore}" : "";
        console.log(`      - [${r.format ?? "?"}]${ds} ${r.name ?? r.id}`);
        if (r.url) console.log(`        ${r.url}`);
      }
      if (p.resources.length > rs.length) console.log(`      … +${p.resources.length - rs.length} resources`);
    }
  }
}
