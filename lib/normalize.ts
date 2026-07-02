// GitHub artifact → prose document. Cognee extracts the knowledge graph
// from natural language, so every relationship in the shared schema
// (RAISED_BY, IMPLEMENTED_BY, SHIPPED_IN, …) is stated explicitly as a
// sentence. Pure functions — unit-tested without network.

const BODY_LIMIT = 1500

export interface RawIssue {
  number: number
  title: string
  body: string | null
  state: string
  labels: { name: string }[]
  user: string
  created_at: string
  closed_at: string | null
  html_url: string
}

export interface RawPullRequest {
  number: number
  title: string
  body: string | null
  state: string
  user: string
  created_at: string
  merged_at: string | null
  html_url: string
}

export interface RawRelease {
  tag_name: string
  name: string | null
  body: string | null
  published_at: string | null
  html_url: string
}

export interface RawDiscussion {
  number: number
  title: string
  body: string | null
  author: string
  createdAt: string
  category: string
  url: string
}

function clip(body: string | null): string {
  if (!body) return '(no description)'
  const text = body.trim()
  return text.length > BODY_LIMIT ? `${text.slice(0, BODY_LIMIT)}…` : text
}

function day(iso: string | null): string {
  return iso ? iso.slice(0, 10) : 'an unknown date'
}

export function normalizeIssue(product: string, issue: RawIssue): string {
  const labels = issue.labels.map((l) => l.name).join(', ')
  return [
    `Product: ${product}.`,
    `Issue #${issue.number} "${issue.title}" is an issue of the product ${product}.`,
    `It was raised by contributor ${issue.user} on ${day(issue.created_at)}.`,
    issue.state === 'closed'
      ? `It was closed on ${day(issue.closed_at)}.`
      : 'It is still open.',
    labels ? `It is labeled: ${labels}.` : '',
    `URL: ${issue.html_url}`,
    `Description: ${clip(issue.body)}`,
  ]
    .filter(Boolean)
    .join('\n')
}

export function normalizePullRequest(
  product: string,
  pr: RawPullRequest,
): string {
  return [
    `Product: ${product}.`,
    `Pull request #${pr.number} "${pr.title}" is a pull request of the product ${product}.`,
    `It was authored by contributor ${pr.user} on ${day(pr.created_at)}.`,
    pr.merged_at
      ? `It was merged on ${day(pr.merged_at)}, implementing a change in ${product}.`
      : `It is ${pr.state} and not merged.`,
    `URL: ${pr.html_url}`,
    `Description: ${clip(pr.body)}`,
  ]
    .filter(Boolean)
    .join('\n')
}

export function normalizeRelease(product: string, release: RawRelease): string {
  const name = release.name || release.tag_name
  return [
    `Product: ${product}.`,
    `Release ${release.tag_name} "${name}" is a release of the product ${product}, published on ${day(release.published_at)}.`,
    `Changes shipped in this release of ${product}:`,
    `URL: ${release.html_url}`,
    clip(release.body),
  ].join('\n')
}

export function normalizeDiscussion(
  product: string,
  d: RawDiscussion,
): string {
  return [
    `Product: ${product}.`,
    `Discussion #${d.number} "${d.title}" is a community discussion of the product ${product}, in category ${d.category}.`,
    `It was started by contributor ${d.author} on ${day(d.createdAt)}.`,
    `URL: ${d.url}`,
    `Content: ${clip(d.body)}`,
  ].join('\n')
}

/** Join normalized docs into ingest batches, N docs per remember() call. */
export function batchDocuments(docs: string[], perBatch: number): string[] {
  const batches: string[] = []
  for (let i = 0; i < docs.length; i += perBatch) {
    batches.push(docs.slice(i, i + perBatch).join('\n\n---\n\n'))
  }
  return batches
}
