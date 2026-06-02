/**
 * Fila com throttle entre chamadas. A CVM não bloqueia IP de datacenter (ao
 * contrário do CKAN de MG/ALMG), mas não documenta limite de taxa — serializa
 * com intervalo mínimo por cortesia e pra não tomar 429. Mesmo helper dos
 * demais pacotes ingestao-* (mantido local pra o pacote ser autocontido).
 *
 * Uso:
 *   const tt = new Throttle({ minIntervalMs: 800 });
 *   const txt = await tt.run(() => fetch(url).then((r) => r.text()));
 */
export class Throttle {
  private last = 0;
  private chain: Promise<unknown> = Promise.resolve();
  constructor(private opts: { minIntervalMs: number }) {}

  run<T>(task: () => Promise<T>): Promise<T> {
    const next = this.chain.then(async () => {
      const wait = this.opts.minIntervalMs - (Date.now() - this.last);
      if (wait > 0) await new Promise((r) => setTimeout(r, wait));
      this.last = Date.now();
      return task();
    });
    this.chain = next.catch(() => undefined);
    return next as Promise<T>;
  }
}
