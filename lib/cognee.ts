// Cognee Cloud client. Server/scripts only — the API key must never reach
// the browser. Guarded at runtime (not via the `server-only` package,
// because tsx scripts import this too and `server-only` throws under plain
// Node).
if (typeof window !== 'undefined') {
  throw new Error('lib/cognee.ts is server-only')
}

// Validated against the live API (2026-07-02). INSIGHTS is NOT accepted —
// graph structure comes from getDatasetGraph(), not recall().
export type SearchType =
  | 'GRAPH_COMPLETION'
  | 'RAG_COMPLETION'
  | 'CHUNKS'

export class CogneeConfigError extends Error {}

function baseUrl(): string {
  return (process.env.COGNEE_SERVICE_URL || 'https://api.cognee.ai').replace(
    /\/$/,
    '',
  )
}

function apiKey(): string {
  const key = process.env.COGNEE_API_KEY
  if (!key) {
    throw new CogneeConfigError(
      'COGNEE_API_KEY is not set. Copy .env.example to .env and add your key.',
    )
  }
  return key
}

async function cogneeFetch(path: string, init: RequestInit): Promise<unknown> {
  const res = await fetch(`${baseUrl()}${path}`, {
    ...init,
    headers: { 'X-Api-Key': apiKey(), ...init.headers },
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Cognee ${path} failed: ${res.status} ${body.slice(0, 500)}`)
  }
  return res.json()
}

/**
 * Ingest + extract in one call (Cognee V2 memory API `remember()`).
 * `graphModel` (JSON Schema) + `customPrompt` steer extraction into typed
 * domain nodes/edges instead of generic chunk entities — verified live.
 */
export function remember(opts: {
  text: string
  datasetName: string
  filename?: string
  graphModel?: object
  customPrompt?: string
}): Promise<unknown> {
  const form = new FormData()
  form.append(
    'data',
    new Blob([opts.text], { type: 'text/markdown' }),
    opts.filename ?? 'document.md',
  )
  form.append('datasetName', opts.datasetName)
  form.append('run_in_background', 'false')
  if (opts.graphModel) form.append('graph_model', JSON.stringify(opts.graphModel))
  if (opts.customPrompt) form.append('custom_prompt', opts.customPrompt)
  return cogneeFetch('/api/v1/remember', { method: 'POST', body: form })
}

/**
 * Query memory. Validated: GRAPH_COMPLETION returns [{text, raw:{value}}],
 * CHUNKS returns [{text, metadata, raw}]. Returned as `unknown`; callers
 * narrow via lib/recall-parse.
 */
export function recall(opts: {
  query: string
  datasets: string[]
  searchType: SearchType
  topK?: number
}): Promise<unknown> {
  return cogneeFetch('/api/v1/recall', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: opts.query,
      datasets: opts.datasets,
      search_type: opts.searchType,
      top_k: opts.topK ?? 10,
    }),
  })
}

interface DatasetSummary {
  id: string
  name?: string
  dataset_name?: string
}

/** List the caller's datasets — used to resolve datasetName → id. */
async function listDatasets(): Promise<DatasetSummary[]> {
  const res = await cogneeFetch('/api/v1/datasets', { method: 'GET' })
  if (Array.isArray(res)) return res as DatasetSummary[]
  if (res && typeof res === 'object' && Array.isArray((res as { datasets?: unknown }).datasets)) {
    return (res as { datasets: DatasetSummary[] }).datasets
  }
  return []
}

/**
 * Fetch a dataset's knowledge graph by name.
 * GET /api/v1/datasets/{id}/graph → { nodes:[{id,label,properties}],
 * edges:[{source,target,label}] }. Returns null if the dataset does not
 * exist yet (not ingested).
 */
export async function getDatasetGraph(
  datasetName: string,
): Promise<unknown | null> {
  const match = (await listDatasets()).find(
    (d) => (d.name ?? d.dataset_name) === datasetName,
  )
  if (!match) return null
  return cogneeFetch(`/api/v1/datasets/${match.id}/graph`, { method: 'GET' })
}
