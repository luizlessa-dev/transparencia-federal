import { readFileSync } from "node:fs";

// Carrega .env da raiz
const env = readFileSync(new URL("../.env", import.meta.url), "utf8");
const get = (k) => env.match(new RegExp(`^${k}=(.*)$`, "m"))?.[1]?.trim();
const URL_ = get("SUPABASE_URL");
const KEY = get("SUPABASE_SERVICE_ROLE_KEY");
const H = { apikey: KEY, Authorization: `Bearer ${KEY}` };

const semAcento = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "");
const norm = (s) => semAcento(s || "").toUpperCase().trim();

async function pagedAll(path, select) {
  const out = [];
  const PAGE = 1000;
  for (let off = 0; ; off += PAGE) {
    const r = await fetch(`${URL_}/rest/v1/${path}?select=${select}`, {
      headers: { ...H, Range: `${off}-${off + PAGE - 1}`, "Range-Unit": "items" },
    });
    const rows = await r.json();
    out.push(...rows);
    if (rows.length < PAGE) break;
  }
  return out;
}

// 1) Todos os autor_nome distintos (normalizados)
console.error("Baixando autor_nome de emendas_completas...");
const emendas = await pagedAll("emendas_completas", "autor_nome");
const autores = new Set(emendas.map((e) => norm(e.autor_nome)).filter(Boolean));
console.error(`  ${emendas.length} emendas, ${autores.size} autores distintos`);

// 2) Parlamentares que aparecem no ranking (logo TÊM emendas)
console.error("Baixando ranking_parlamentar...");
const ranking = await pagedAll("ranking_parlamentar", "parlamentar_id,ano,valor_total");
const idsRanking = new Map(); // id -> {anos, total}
for (const r of ranking) {
  const cur = idsRanking.get(r.parlamentar_id) || { anos: new Set(), total: 0 };
  cur.anos.add(r.ano);
  cur.total += Number(r.valor_total) || 0;
  idsRanking.set(r.parlamentar_id, cur);
}
console.error(`  ${idsRanking.size} parlamentares no ranking`);

// 3) Dados dos parlamentares
console.error("Baixando parlamentares...");
const parls = await pagedAll("parlamentares", "id,nome,nome_parlamentar,partido,uf,casa_legislativa");
const byId = new Map(parls.map((p) => [p.id, p]));

// 4) Para cada parlamentar do ranking, replica a query do site:
//    %semAcento(nome_parlamentar||nome)% (substring, case+accent-insensitive)
const arr = [...autores];
const quebrados = [];
for (const [id, info] of idsRanking) {
  const p = byId.get(id);
  if (!p) {
    quebrados.push({ id, motivo: "id no ranking sem registro em parlamentares" });
    continue;
  }
  const nomeExibido = p.nome_parlamentar || p.nome;
  const alvo = norm(nomeExibido);
  const bate = arr.some((a) => a.includes(alvo));
  if (!bate) {
    quebrados.push({
      id,
      nome: nomeExibido,
      partido: p.partido,
      uf: p.uf,
      total: info.total,
      anos: [...info.anos].sort().join(","),
    });
  }
}

console.log(`\n=== RESULTADO ===`);
console.log(`Parlamentares no ranking: ${idsRanking.size}`);
console.log(`Detalhe AINDA quebrado (0 emendas no site apesar de ter ranking): ${quebrados.length}\n`);
quebrados
  .sort((a, b) => (b.total || 0) - (a.total || 0))
  .forEach((q) =>
    console.log(
      `  ${q.nome || "(sem nome)"} ${q.partido ? `(${q.partido}/${q.uf})` : ""} — R$ ${(q.total || 0).toLocaleString("pt-BR")} — anos ${q.anos || "?"} — id ${q.id}${q.motivo ? " — " + q.motivo : ""}`
    )
  );
