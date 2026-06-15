#!/usr/bin/env python3
"""
Backfill histórico do DOU via Base dos Dados (BigQuery).
Cobre 2023-01-01 até 2026-02-12 (antes do Inlabs disponível).

Dependências:
    pip install google-cloud-bigquery db-dtypes supabase python-dotenv

Autenticação BigQuery:
    gcloud auth application-default login
    (ou defina GOOGLE_APPLICATION_CREDENTIALS apontando para um service account JSON)

Uso:
    python3 backfill_bq.py              # 2023-01-01 até 2026-02-12
    python3 backfill_bq.py 2024-01-01   # data de início customizada
"""

import sys
import re
import os
from datetime import date, timedelta
from dotenv import load_dotenv

load_dotenv()
load_dotenv("../../.env")

try:
    from google.cloud import bigquery
except ImportError:
    print("Instale: pip install google-cloud-bigquery db-dtypes")
    sys.exit(1)

try:
    from supabase import create_client
except ImportError:
    print("Instale: pip install supabase")
    sys.exit(1)

# ── Config ──────────────────────────────────────────────────────────────────

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]

DATA_INICIO = date.fromisoformat(sys.argv[1]) if len(sys.argv) > 1 else date(2023, 1, 1)
DATA_FIM    = date(2026, 2, 12)  # Inlabs começa em 13/02/2026

BATCH_SIZE  = 500   # registros por upsert no Supabase
CHUNK_DIAS  = 30    # dias por query no BigQuery (evita timeout)

RE_CPF  = re.compile(r'\d{3}\.\d{3}\.\d{3}-\d{2}')
RE_CNPJ = re.compile(r'\d{2}\.\d{3}\.\d{3}/\d{4}-\d{2}')

# ── BigQuery ─────────────────────────────────────────────────────────────────

BQ_PROJECT = "basedosdados"
BQ_DATASET = "br_imprensa_nacional_dou"

# Colunas disponíveis nas tabelas secao_2 e secao_3
QUERY_TEMPLATE = """
SELECT
  url                   AS id_externo,
  '{secao_nome}'        AS secao,
  data_publicacao,
  CAST(NULL AS STRING)  AS tipo_ato,
  titulo,
  orgao,
  texto_completo        AS conteudo_html,
  assinatura            AS assinante,
  cargo
FROM `{project}.{dataset}.{tabela}`
WHERE data_publicacao BETWEEN '{inicio}' AND '{fim}'
  AND data_publicacao IS NOT NULL
  AND url IS NOT NULL
"""

def query_bq(client: bigquery.Client, tabela: str, secao_nome: str,
             inicio: date, fim: date) -> list[dict]:
    sql = QUERY_TEMPLATE.format(
        project=BQ_PROJECT,
        dataset=BQ_DATASET,
        tabela=tabela,
        secao_nome=secao_nome,
        inicio=inicio.isoformat(),
        fim=fim.isoformat(),
    )
    job = client.query(sql)
    rows = list(job.result())
    return rows

# ── Transformação ─────────────────────────────────────────────────────────────

def extrair_entidades(texto: str) -> tuple[list[str], list[str]]:
    if not texto:
        return [], []
    cpfs  = list(set(RE_CPF.findall(texto)))
    cnpjs = list(set(RE_CNPJ.findall(texto)))
    return cpfs, cnpjs

def normalizar(row) -> dict:
    texto   = row.conteudo_html or ""
    cpfs, cnpjs = extrair_entidades(texto)
    pub_date = row.data_publicacao
    if hasattr(pub_date, "isoformat"):
        data_str = pub_date.isoformat()
    else:
        data_str = str(pub_date)

    return {
        "id_externo":       row.id_externo,
        "secao":            row.secao,
        "data_publicacao":  data_str,
        "tipo_ato":         row.tipo_ato or "",
        "titulo":           (row.titulo or "")[:1000],
        "orgao":            (row.orgao or "")[:500],
        "conteudo_html":    texto,
        "cpfs_extraidos":   cpfs,
        "cnpjs_extraidos":  cnpjs,
        "url_titulo":       "",
        "assinante":        (row.assinante or "").split("|")[0].strip() or None,
    }

# ── Supabase ──────────────────────────────────────────────────────────────────

def upsert_batch(sb, registros: list[dict]) -> int:
    resp = (
        sb.table("dou_publicacoes")
        .upsert(registros, on_conflict="id_externo")
        .execute()
    )
    return len(resp.data) if resp.data else 0

# ── Main ──────────────────────────────────────────────────────────────────────

def chunks_de_dias(inicio: date, fim: date, tamanho: int):
    cur = inicio
    while cur <= fim:
        yield cur, min(cur + timedelta(days=tamanho - 1), fim)
        cur += timedelta(days=tamanho)

def main():
    print(f"[bq-backfill] {DATA_INICIO} → {DATA_FIM}")

    bq  = bigquery.Client(project="brinsider-dou")
    sb  = create_client(SUPABASE_URL, SUPABASE_KEY)

    # Datas já ingeridas
    resp = (
        sb.table("dou_publicacoes")
        .select("data_publicacao")
        .gte("data_publicacao", DATA_INICIO.isoformat())
        .lte("data_publicacao", DATA_FIM.isoformat())
        .execute()
    )
    ja_ingeridas = {r["data_publicacao"] for r in (resp.data or [])}
    print(f"[bq-backfill] {len(ja_ingeridas)} datas já no banco")

    secoes = [
        ("secao_2", "do2"),
        ("secao_3", "do3"),
    ]

    total_inseridos = 0

    for tabela, secao_nome in secoes:
        print(f"\n[bq-backfill] === {tabela.upper()} ===")

        for inicio_chunk, fim_chunk in chunks_de_dias(DATA_INICIO, DATA_FIM, CHUNK_DIAS):
            # Pula chunk se todas as datas já foram ingeridas
            datas_chunk = {
                (inicio_chunk + timedelta(days=i)).isoformat()
                for i in range((fim_chunk - inicio_chunk).days + 1)
            }
            if datas_chunk.issubset(ja_ingeridas) and secao_nome == "do3":
                print(f"  [{inicio_chunk} → {fim_chunk}] já ingerido, pulando")
                continue

            print(f"  [{inicio_chunk} → {fim_chunk}] consultando BigQuery...", end=" ", flush=True)
            try:
                rows = query_bq(bq, tabela, secao_nome, inicio_chunk, fim_chunk)
            except Exception as e:
                print(f"ERRO BQ: {e}")
                continue

            print(f"{len(rows)} atos", end=" → ", flush=True)

            if not rows:
                print("vazio")
                continue

            registros = [normalizar(r) for r in rows]

            # Upsert em batches
            inseridos = 0
            for i in range(0, len(registros), BATCH_SIZE):
                batch = registros[i:i + BATCH_SIZE]
                try:
                    inseridos += upsert_batch(sb, batch)
                except Exception as e:
                    print(f"\n  ERRO upsert batch {i}: {e}")

            print(f"{inseridos} inseridos")
            total_inseridos += inseridos

    print(f"\n[bq-backfill] Concluído: {total_inseridos} atos inseridos no total")

if __name__ == "__main__":
    main()
