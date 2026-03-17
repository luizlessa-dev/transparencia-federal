/**
 * Cliente HTTP da API pública.
 * Base URL via NEXT_PUBLIC_API_URL (ex.: https://api.exemplo.org ou /api para same-origin).
 */

const getBaseUrl = (): string => {
  if (typeof process !== "undefined" && process.env?.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, "");
  }
  return "/api";
};

export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; status?: number };

export async function apiGet<T>(path: string, params?: Record<string, string>): Promise<ApiResult<T>> {
  const base = getBaseUrl();
  const url = new URL(path.startsWith("http") ? path : `${base}${path.startsWith("/") ? path : `/${path}`}`, base || "http://localhost");
  if (params) {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  }
  const href = base ? `${base}${url.pathname}${url.search}` : `${url.pathname}${url.search}`;
  try {
    const res = await fetch(href, {
      method: "GET",
      headers: { Accept: "application/json" },
      next: { revalidate: 60 },
    });
    if (!res.ok) {
      const text = await res.text();
      let message = `HTTP ${res.status}`;
      try {
        const j = JSON.parse(text);
        if (j?.message) message = j.message;
        else if (j?.error) message = j.error;
      } catch {
        if (text) message = text.slice(0, 200);
      }
      return { ok: false, error: message, status: res.status };
    }
    const contentType = res.headers.get("content-type");
    if (contentType?.includes("application/json")) {
      const data = (await res.json()) as T;
      return { ok: true, data };
    }
    return { ok: false, error: "Resposta não é JSON" };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erro de rede";
    return { ok: false, error: message };
  }
}
