/**
 * Fila com throttle entre chamadas — o CKAN/portal de MG bloqueia IP de
 * datacenter (403) e não documenta limite de taxa. Mesma estratégia da ALMG:
 * serializa as requisições com intervalo mínimo. Rodar de IP residencial BR
 * (cron local via launchd) ou atrás do Cloudflare Worker `almg-proxy`.
 *
 * Uso:
 *   const tt = new Throttle({ minIntervalMs: 1500 });
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
