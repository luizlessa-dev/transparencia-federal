/**
 * Verifica se o Portal da Transparência já publicou dados de emendas para
 * o ano informado (default: 2025). Retorna exit code 0 se há dados, 1 se não há.
 *
 * Usado pelo GitHub Actions para decidir se deve rodar o pipeline.
 *
 * Uso:
 *   node scripts/check-2025.mjs            → verifica 2025
 *   node scripts/check-2025.mjs 2026       → verifica 2026
 */

const ano = Number(process.argv[2] ?? 2025);
const apiKey = process.env.PORTAL_TRANSPARENCIA_API_KEY;

if (!apiKey) {
  console.error("❌ PORTAL_TRANSPARENCIA_API_KEY não definida.");
  process.exit(2);
}

const url = `https://api.portaldatransparencia.gov.br/api-de-dados/emendas?ano=${ano}&pagina=1`;

console.log(`🔍 Verificando dados de emendas ${ano} no Portal da Transparência...`);

try {
  const res = await fetch(url, {
    headers: {
      "chave-api-dados": apiKey,
      "User-Agent": "Mozilla/5.0 (compatible; TransparenciaFederal/3.0; +https://transparenciafederal.com)",
    },
  });

  if (!res.ok) {
    console.error(`❌ Portal respondeu HTTP ${res.status}`);
    process.exit(2);
  }

  const data = await res.json();
  const total = Array.isArray(data) ? data.length : 0;

  if (total === 0) {
    console.log(`⏳ Nenhum registro de emendas ${ano} disponível ainda. Pipeline não será executado.`);
    // Seta output para o GitHub Actions (se disponível)
    if (process.env.GITHUB_OUTPUT) {
      const fs = await import("fs");
      fs.appendFileSync(process.env.GITHUB_OUTPUT, `dados_disponiveis=false\n`);
      fs.appendFileSync(process.env.GITHUB_OUTPUT, `ano=${ano}\n`);
    }
    process.exit(1);
  }

  console.log(`✅ ${total} registros encontrados para ${ano} (pág 1). Pipeline será executado.`);
  if (process.env.GITHUB_OUTPUT) {
    const fs = await import("fs");
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `dados_disponiveis=true\n`);
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `ano=${ano}\n`);
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `registros_pagina1=${total}\n`);
  }
  process.exit(0);
} catch (err) {
  console.error("❌ Erro ao consultar Portal:", err.message);
  process.exit(2);
}
