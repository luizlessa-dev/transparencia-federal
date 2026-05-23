/**
 * Stream de despesas de gabinete da ALESP.
 *
 * Fonte: `https://www.al.sp.gov.br/repositorioDados/deputados/despesas_gabinetes.xml`
 * Tamanho: ~170 MB, ~611k registros. Streaming via saxes (SAX-style).
 *
 * DUAS estratégias de uso, conforme cenário:
 *
 *   (1) `processarStreamDespesas(...)` — stream direto HTTP → saxes → onBatch.
 *       Bom pra incremental pequeno (poucas despesas emitidas por filtro).
 *       Risco: se onBatch demora (round-trips DB), o servidor ALESP pode
 *       fechar a conexão por idle timeout no meio do download.
 *
 *   (2) `baixarDespesasParaArquivo()` + `processarArquivoDespesas(...)` —
 *       download cru e contínuo pra /tmp, depois processamento offline
 *       sem pressão de keep-alive. RECOMENDADO pra load completo.
 *
 * Uso típico (load completo):
 *   const path = "/tmp/alesp_despesas.xml";
 *   await baixarDespesasParaArquivo({ path, onProgress: ... });
 *   await processarArquivoDespesas({
 *     path,
 *     batchSize: 500,
 *     onBatch: async (lote) => { await supabase.upsert(lote); },
 *   });
 */
import { SaxesParser, type SaxesTagPlain } from "saxes";
import { createWriteStream, createReadStream } from "fs";
import { stat } from "fs/promises";
import { Readable } from "stream";
import { pipeline } from "stream/promises";
import type { DespesaAlesp } from "./types.js";

export const URL_DESPESAS =
  "https://www.al.sp.gov.br/repositorioDados/deputados/despesas_gabinetes.xml";

const USER_AGENT = "TransparenciaFederal/alesp-ingest (luiz@gastronomizae.com)";

// ─── Tipos públicos ─────────────────────────────────────────────────────

export type ProcessarStreamOpts = {
  /** Só emite despesas com Ano >= anoMin. Default: sem filtro. */
  anoMin?: number;
  /** Só emite despesas com Ano <= anoMax. Default: sem filtro. */
  anoMax?: number;
  /** Só emite despesas no Ano exato. Conflita com anoMin/anoMax. */
  anoExato?: number;
  /** Só emite despesas em algum desses meses (1-12). Default: todos. */
  mesesExatos?: number[];
  /** Quantos registros por lote. Default: 500. */
  batchSize?: number;
  /** Callback executado pra cada lote (mesmo o último parcial). */
  onBatch: (lote: DespesaAlesp[]) => Promise<void>;
  /** Callback de progresso (executa periodicamente, não pra cada despesa). */
  onProgress?: (info: { lidos: number; emitidos: number; bytes: number }) => void;
  /** URL alternativa (testes). */
  url?: string;
};

export type ProcessarStreamResult = {
  status: "ok" | "erro";
  lidos: number;        // total de <despesa> encontrados no XML
  emitidos: number;     // total que passou nos filtros e foi enviado em batches
  bytes: number;        // bytes processados (baixados ou lidos do disco)
  duracao_ms: number;
  erro?: string;
};

export type BaixarArquivoOpts = {
  /** Path absoluto de destino. */
  path: string;
  /** URL alternativa. Default: URL_DESPESAS. */
  url?: string;
  /** Callback de progresso (1× a cada ~5 MB baixados). */
  onProgress?: (info: { bytes: number }) => void;
};

export type BaixarArquivoResult = {
  status: "ok" | "erro";
  bytes: number;
  duracao_ms: number;
  path?: string;
  erro?: string;
};

export type ProcessarArquivoOpts = Omit<ProcessarStreamOpts, "url"> & {
  /** Path absoluto do XML local pra processar. */
  path: string;
};

// ─── 1. Download → arquivo local (rápido, contínuo) ─────────────────────

/**
 * Baixa o XML de despesas da ALESP pra um caminho local. Stream curto e
 * contínuo (sem pausas no consumer) — evita o keep-alive timeout do Apache
 * da ALESP que cortava conexões em loads com onBatch lento.
 */
export async function baixarDespesasParaArquivo(
  opts: BaixarArquivoOpts,
): Promise<BaixarArquivoResult> {
  const url = opts.url ?? URL_DESPESAS;
  const inicio = Date.now();
  let bytes = 0;

  try {
    const res = await fetch(url, {
      headers: {
        accept: "application/xml",
        "user-agent": USER_AGENT,
      },
    });
    if (!res.ok) {
      return {
        status: "erro",
        bytes: 0,
        duracao_ms: Date.now() - inicio,
        erro: `HTTP ${res.status} em ${url}`,
      };
    }
    if (!res.body) {
      return {
        status: "erro",
        bytes: 0,
        duracao_ms: Date.now() - inicio,
        erro: "response sem body",
      };
    }

    // Tee pra contar bytes enquanto escreve no disco — pipeline é o caminho
    // limpo, mas perde o callback de progresso. Usamos for-await pra ter
    // ambos. O stream HTTP não pausa porque a escrita em disco é rápida.
    const writeStream = createWriteStream(opts.path);
    let proximoProgresso = 5 * 1024 * 1024;  // 5 MB

    for await (const chunk of res.body as unknown as AsyncIterable<Uint8Array>) {
      bytes += chunk.byteLength;
      if (!writeStream.write(chunk)) {
        // Backpressure: aguarda drain
        await new Promise<void>((resolve) => writeStream.once("drain", resolve));
      }
      if (opts.onProgress && bytes >= proximoProgresso) {
        opts.onProgress({ bytes });
        proximoProgresso += 5 * 1024 * 1024;
      }
    }
    await new Promise<void>((resolve, reject) => {
      writeStream.end((err: Error | null | undefined) => (err ? reject(err) : resolve()));
    });

    return {
      status: "ok",
      bytes,
      duracao_ms: Date.now() - inicio,
      path: opts.path,
    };
  } catch (err) {
    return {
      status: "erro",
      bytes,
      duracao_ms: Date.now() - inicio,
      erro: err instanceof Error ? err.message : String(err),
    };
  }
}

// ─── 2. Sax state machine (compartilhada entre stream e file) ───────────

type SaxState = {
  parser: SaxesParser;
  saxError: { current: Error | null };
  passaFiltro: (d: DespesaAlesp) => boolean;
  lote: DespesaAlesp[];
  counters: { lidos: number; emitidos: number };
};

function criarSaxState(
  filterOpts: Pick<ProcessarStreamOpts, "anoMin" | "anoMax" | "anoExato" | "mesesExatos">,
): SaxState {
  const passaFiltro = (d: DespesaAlesp): boolean => {
    if (filterOpts.anoExato != null && d.ano !== filterOpts.anoExato) return false;
    if (filterOpts.anoMin != null && d.ano < filterOpts.anoMin) return false;
    if (filterOpts.anoMax != null && d.ano > filterOpts.anoMax) return false;
    if (filterOpts.mesesExatos && !filterOpts.mesesExatos.includes(d.mes)) return false;
    return true;
  };

  const parser = new SaxesParser();
  let currentField: string | null = null;
  let textBuf = "";
  let acc: Partial<DespesaAlesp> & { __ano?: string; __mes?: string; __valor?: string } = {};
  let dentroDespesa = false;
  const saxError = { current: null as Error | null };
  const lote: DespesaAlesp[] = [];
  const counters = { lidos: 0, emitidos: 0 };

  parser.on("error", (err) => {
    saxError.current = err instanceof Error ? err : new Error(String(err));
  });

  parser.on("opentag", (node: SaxesTagPlain) => {
    if (node.name === "despesa") {
      dentroDespesa = true;
      acc = {};
      return;
    }
    if (dentroDespesa) {
      currentField = node.name;
      textBuf = "";
    }
  });

  parser.on("text", (text: string) => {
    if (currentField) textBuf += text;
  });

  parser.on("closetag", (node: SaxesTagPlain) => {
    if (node.name === "despesa") {
      counters.lidos++;
      const ano = Number(acc.__ano);
      const mes = Number(acc.__mes);
      const valor = parseFloat((acc.__valor ?? "0").replace(",", "."));
      const matricula = String(acc.matricula ?? "").trim();

      if (
        Number.isFinite(ano) && ano > 0 &&
        Number.isFinite(mes) && mes >= 1 && mes <= 12 &&
        Number.isFinite(valor) && matricula
      ) {
        const despesa: DespesaAlesp = {
          matricula,
          nome_deputado: String(acc.nome_deputado ?? "").trim(),
          ano,
          mes,
          valor,
          cnpj: String(acc.cnpj ?? "").trim(),
          tipo: String(acc.tipo ?? "").trim(),
          fornecedor: String(acc.fornecedor ?? "").trim(),
        };
        if (passaFiltro(despesa)) {
          lote.push(despesa);
          counters.emitidos++;
        }
      }

      dentroDespesa = false;
      currentField = null;
      acc = {};
      return;
    }

    if (dentroDespesa && currentField) {
      const value = textBuf.trim();
      switch (currentField) {
        case "Ano":         acc.__ano = value; break;
        case "Mes":         acc.__mes = value; break;
        case "Valor":       acc.__valor = value; break;
        case "Matricula":   acc.matricula = value; break;
        case "Deputado":    acc.nome_deputado = value; break;
        case "CNPJ":        acc.cnpj = value; break;
        case "Tipo":        acc.tipo = value; break;
        case "Fornecedor":  acc.fornecedor = value; break;
      }
      currentField = null;
      textBuf = "";
    }
  });

  return { parser, saxError, passaFiltro, lote, counters };
}

// ─── 3. Stream HTTP direto (mantido pra incremental) ────────────────────

/**
 * Faz o stream direto do XML via HTTP e dispara `onBatch` pra cada lote
 * filtrado. Bom pra incremental (poucas despesas emitidas).
 *
 * Pra load completo, prefira `baixarDespesasParaArquivo` +
 * `processarArquivoDespesas` — evita corte de conexão por idle timeout
 * quando o onBatch é lento (round-trips DB).
 */
export async function processarStreamDespesas(
  opts: ProcessarStreamOpts,
): Promise<ProcessarStreamResult> {
  const url = opts.url ?? URL_DESPESAS;
  const batchSize = opts.batchSize ?? 500;
  const inicio = Date.now();
  let bytes = 0;
  const state = criarSaxState(opts);

  try {
    const res = await fetch(url, {
      headers: {
        accept: "application/xml",
        "user-agent": USER_AGENT,
      },
    });
    if (!res.ok) {
      return {
        status: "erro",
        lidos: 0,
        emitidos: 0,
        bytes: 0,
        duracao_ms: Date.now() - inicio,
        erro: `HTTP ${res.status} em ${url}`,
      };
    }
    if (!res.body) {
      return {
        status: "erro",
        lidos: 0,
        emitidos: 0,
        bytes: 0,
        duracao_ms: Date.now() - inicio,
        erro: "response sem body",
      };
    }

    const decoder = new TextDecoder("utf-8");
    let proximoProgresso = 5000;

    for await (const chunk of res.body as unknown as AsyncIterable<Uint8Array>) {
      bytes += chunk.byteLength;
      state.parser.write(decoder.decode(chunk, { stream: true }));
      if (state.saxError.current) throw state.saxError.current;

      while (state.lote.length >= batchSize) {
        const batch = state.lote.splice(0, batchSize);
        await opts.onBatch(batch);
      }
      if (opts.onProgress && state.counters.lidos >= proximoProgresso) {
        opts.onProgress({
          lidos: state.counters.lidos,
          emitidos: state.counters.emitidos,
          bytes,
        });
        proximoProgresso += 5000;
      }
    }
    state.parser.write(decoder.decode());
    state.parser.close();
    if (state.saxError.current) throw state.saxError.current;

    if (state.lote.length > 0) {
      await opts.onBatch(state.lote.splice(0));
    }

    return {
      status: "ok",
      lidos: state.counters.lidos,
      emitidos: state.counters.emitidos,
      bytes,
      duracao_ms: Date.now() - inicio,
    };
  } catch (err) {
    return {
      status: "erro",
      lidos: state.counters.lidos,
      emitidos: state.counters.emitidos,
      bytes,
      duracao_ms: Date.now() - inicio,
      erro: err instanceof Error ? err.message : String(err),
    };
  }
}

// ─── 4. Processa arquivo local (recomendado pra load completo) ──────────

/**
 * Lê um XML local de despesas (já baixado) e dispara `onBatch` pra cada
 * lote filtrado. Não há pressão de keep-alive: o onBatch pode demorar à
 * vontade (round-trips DB, backfill, validações), o file stream pausa
 * automaticamente via backpressure.
 */
export async function processarArquivoDespesas(
  opts: ProcessarArquivoOpts,
): Promise<ProcessarStreamResult> {
  const batchSize = opts.batchSize ?? 500;
  const inicio = Date.now();
  let bytes = 0;
  const state = criarSaxState(opts);

  try {
    const stats = await stat(opts.path);
    if (stats.size === 0) {
      return {
        status: "erro",
        lidos: 0,
        emitidos: 0,
        bytes: 0,
        duracao_ms: Date.now() - inicio,
        erro: `arquivo vazio: ${opts.path}`,
      };
    }

    const fileStream = createReadStream(opts.path);
    const decoder = new TextDecoder("utf-8");
    let proximoProgresso = 5000;

    for await (const chunk of fileStream as AsyncIterable<Buffer>) {
      bytes += chunk.byteLength;
      state.parser.write(decoder.decode(chunk, { stream: true }));
      if (state.saxError.current) throw state.saxError.current;

      while (state.lote.length >= batchSize) {
        const batch = state.lote.splice(0, batchSize);
        await opts.onBatch(batch);
      }
      if (opts.onProgress && state.counters.lidos >= proximoProgresso) {
        opts.onProgress({
          lidos: state.counters.lidos,
          emitidos: state.counters.emitidos,
          bytes,
        });
        proximoProgresso += 5000;
      }
    }
    state.parser.write(decoder.decode());
    state.parser.close();
    if (state.saxError.current) throw state.saxError.current;

    if (state.lote.length > 0) {
      await opts.onBatch(state.lote.splice(0));
    }

    return {
      status: "ok",
      lidos: state.counters.lidos,
      emitidos: state.counters.emitidos,
      bytes,
      duracao_ms: Date.now() - inicio,
    };
  } catch (err) {
    return {
      status: "erro",
      lidos: state.counters.lidos,
      emitidos: state.counters.emitidos,
      bytes,
      duracao_ms: Date.now() - inicio,
      erro: err instanceof Error ? err.message : String(err),
    };
  }
}
