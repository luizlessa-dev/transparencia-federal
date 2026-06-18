/**
 * Cliente Inlabs para download de ZIPs com XML do DOU.
 * Autenticação via cookie de sessão (login com email/senha).
 * Credenciais: INLABS_EMAIL e INLABS_PASSWORD no .env
 */

import { Open as UnzipOpen } from "unzipper";

const BASE_URL = "https://inlabs.in.gov.br";
const USER_AGENT = "Mozilla/5.0 (compatible; BRInsider/1.0; +https://thebrinsider.com)";

export type SecaoDOU = "DO1" | "DO2" | "DO3" | "DO1E" | "DO2E" | "DO3E";

export interface PublicacaoDOU {
  pubName: string;
  title: string;
  urlTitle: string;
  content: string;
  pubDate: string;
  classPK: string;
  displayDateSortable: string;
  hierarchyStr: string;
  artType: string;
  assina?: string;
  cargo?: string;
}

let sessionCookie: string | null = null;
let sessionExpiresAt = 0;
let _email: string | null = null;
let _password: string | null = null;

async function renovarSessaoSeNecessario(): Promise<void> {
  if (Date.now() < sessionExpiresAt) return;
  if (!_email || !_password) throw new Error("Não autenticado — chame login() primeiro");
  await login(_email, _password);
}

export async function login(email: string, password: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/logar.php`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": USER_AGENT,
    },
    body: new URLSearchParams({ email, password }).toString(),
    redirect: "manual",
  });

  // Inlabs retorna três cookies (PHPSESSID, inlabs_session_cookie, TS*) — todos necessários.
  // getSetCookie() pode retornar [] em respostas 302 com redirect:manual; usar get() como fallback.
  const rawCookies = res.headers.getSetCookie?.() ?? [];
  const cookies = rawCookies.length
    ? rawCookies
    : (res.headers.get("set-cookie") ?? "").split(/,(?=[^ ].*?=)/).filter(Boolean);
  if (!cookies.length) throw new Error("Login Inlabs falhou — sem cookie de sessão");
  sessionCookie = cookies.map((c) => c.split(";")[0]).join("; ");
  sessionExpiresAt = Date.now() + 25 * 60 * 1000; // renova antes dos 30min de expiração
  _email = email;
  _password = password;
  console.log("[inlabs] Login OK");
}

async function downloadZip(data: string, secao: SecaoDOU): Promise<Buffer | null> {
  await renovarSessaoSeNecessario();

  const filename = `${data}-${secao}.zip`;
  const url = `${BASE_URL}/index.php?p=${data}&dl=${filename}`;

  const res = await fetch(url, {
    headers: {
      "User-Agent": USER_AGENT,
      Cookie: sessionCookie,
      origem: "736372697074", // hex de "script" — obrigatório para download automatizado
    },
    signal: AbortSignal.timeout(180_000),
  });

  if (res.status === 404 || res.status === 403) return null; // seção não publicada nesse dia
  if (!res.ok) throw new Error(`Download ${filename}: HTTP ${res.status}`);

  const buf = await res.arrayBuffer();
  return Buffer.from(buf);
}

function formatarData(data: Date): string {
  const yyyy = data.getFullYear();
  const mm = String(data.getMonth() + 1).padStart(2, "0");
  const dd = String(data.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

async function parseZip(zipBuf: Buffer, secao: SecaoDOU): Promise<PublicacaoDOU[]> {
  const zip = await UnzipOpen.buffer(zipBuf);
  const xmlEntries = zip.files.filter((f) => f.path.endsWith(".xml") && f.type === "File");

  const RE_ATTR = (attr: string) => new RegExp(`${attr}="([^"]*)"`, "i");
  const RE_ASSINA = /<p[^>]*class="assina"[^>]*>([\s\S]*?)<\/p>/i;

  const publicacoes: PublicacaoDOU[] = [];

  for (const entry of xmlEntries) {
    try {
      const buf = await entry.buffer();
      const xml = buf.toString("utf-8");

      const attr = (name: string) => xml.match(RE_ATTR(name))?.[1] ?? "";
      const cdata = xml.match(/<Texto[^>]*><!\[CDATA\[([\s\S]*?)\]\]><\/Texto>/i)?.[1] ?? "";
      const assinaMatch = cdata.match(RE_ASSINA);
      const assina = assinaMatch
        ? assinaMatch[1].replace(/<[^>]+>/g, "").trim()
        : undefined;

      const identifica = xml.match(/<Identifica[^>]*><!\[CDATA\[([\s\S]*?)\]\]><\/Identifica>/i)?.[1]?.trim() ?? "";
      const fileName = entry.path.split("/").pop() ?? entry.path;

      publicacoes.push({
        pubName: attr("pubName") || secao,
        title: identifica,
        urlTitle: attr("name") || fileName.replace(".xml", ""),
        content: cdata,
        pubDate: attr("pubDate"),
        classPK: attr("id") || fileName.replace(".xml", ""),
        displayDateSortable: attr("pubDate").replace(/\D/g, ""),
        hierarchyStr: attr("artCategory"),
        artType: attr("artType"),
        assina,
      });
    } catch {
      // XML malformado — ignora
    }
  }

  return publicacoes;
}

function extrairTexto(obj: unknown): string {
  if (typeof obj === "string") return obj;
  if (typeof obj !== "object" || obj === null) return "";
  return Object.values(obj).map(extrairTexto).join(" ");
}

function extrairTag(xml: string, tag: string): string | null {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i");
  const m = xml.match(re);
  return m ? m[1].replace(/<[^>]+>/g, "").trim() : null;
}

/** Baixa e parseia as seções especificadas para uma data. */
export async function buscarPorData(
  secoes: SecaoDOU[],
  data: Date = new Date()
): Promise<PublicacaoDOU[]> {
  const dataStr = formatarData(data);
  const resultados: PublicacaoDOU[] = [];

  for (const secao of secoes) {
    console.log(`[inlabs] Baixando ${dataStr}-${secao}.zip...`);
    const zip = await downloadZip(dataStr, secao);
    if (!zip) {
      console.log(`[inlabs] ${secao} não publicado em ${dataStr}`);
      continue;
    }
    const pubs = await parseZip(zip, secao);
    console.log(`[inlabs] ${secao}: ${pubs.length} atos`);
    resultados.push(...pubs);
  }

  return resultados;
}
