/**
 * Fila com throttle de 1s entre chamadas — exigência do servidor ALMG
 * (2 req/s simultâneas + 1s mínimo entre calls; bloqueio sem aviso se descumprido).
 *
 * Uso:
 *   const tt = new Throttle({ minIntervalMs: 1000 });
 *   const html = await tt.run(() => fetch(url).then(r => r.text()));
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
    // Mantém o chain vivo mesmo se task falhar
    this.chain = next.catch(() => undefined);
    return next as Promise<T>;
  }
}
