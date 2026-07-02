// Decision-chain assembly: from a selected node, gather the connected
// evidence (bounded BFS over typed edges) and order it along the product
// evolution spine — people → problem → proposal → implementation → shipped.
// The chain IS the answer and the provenance; each stage node links out.
import type { GraphData, GraphNode, NodeType } from '@/types/graph'

// Evolution rank per node type — low = cause, high = effect.
const STAGE: Record<NodeType, { rank: number; heading: string }> = {
  Contributor: { rank: 0, heading: 'People' },
  Issue: { rank: 1, heading: 'Problem' },
  Discussion: { rank: 1, heading: 'Problem' },
  Feature: { rank: 2, heading: 'Concept' },
  PullRequest: { rank: 3, heading: 'Implementation' },
  Release: { rank: 4, heading: 'Shipped' },
  Product: { rank: 5, heading: 'Product' },
}

export interface ChainStage {
  heading: string
  rank: number
  nodes: GraphNode[]
}

const MAX_NODES = 40 // a Release fans out to many PRs — keep the panel bounded

// Every artifact is `part_of` the Product, making Product a hub that would
// connect the whole graph in 2 hops. Skip it (and Product nodes) so the
// chain follows the evolution spine, not membership.
const SKIP_EDGES = new Set(['part_of'])

/**
 * Connected evidence for `selectedId`, grouped into evolution stages.
 * BFS depth 2 over typed edges (both directions), capped, then bucketed by
 * node type rank and sorted by date within a stage. Empty when no selection.
 */
export function buildChain(
  selectedId: string | null,
  data: GraphData,
): { stages: ChainStage[]; selectedId: string | null } {
  if (!selectedId) return { stages: [], selectedId: null }
  const byId = new Map(data.nodes.map((n) => [n.id, n]))
  if (!byId.has(selectedId)) return { stages: [], selectedId: null }

  // undirected adjacency — a chain reads across an edge regardless of
  // direction — minus membership edges that would collapse via the Product hub
  const adj = new Map<string, Set<string>>()
  for (const e of data.edges) {
    if (SKIP_EDGES.has(e.type)) continue
    if (byId.get(e.from)?.type === 'Product' || byId.get(e.to)?.type === 'Product') continue
    if (!adj.has(e.from)) adj.set(e.from, new Set())
    if (!adj.has(e.to)) adj.set(e.to, new Set())
    adj.get(e.from)!.add(e.to)
    adj.get(e.to)!.add(e.from)
  }

  // BFS depth 2 from the selection
  const seen = new Set<string>([selectedId])
  let frontier = [selectedId]
  for (let depth = 0; depth < 2 && seen.size < MAX_NODES; depth++) {
    const next: string[] = []
    for (const id of frontier) {
      for (const nb of adj.get(id) ?? []) {
        if (!seen.has(nb)) {
          seen.add(nb)
          next.push(nb)
          if (seen.size >= MAX_NODES) break
        }
      }
      if (seen.size >= MAX_NODES) break
    }
    frontier = next
  }

  const buckets = new Map<number, ChainStage>()
  for (const id of seen) {
    const node = byId.get(id)
    if (!node) continue
    const stage = STAGE[node.type]
    if (!buckets.has(stage.rank)) {
      buckets.set(stage.rank, { heading: stage.heading, rank: stage.rank, nodes: [] })
    }
    buckets.get(stage.rank)!.nodes.push(node)
  }

  const stages = [...buckets.values()].sort((a, b) => a.rank - b.rank)
  for (const stage of stages) {
    stage.nodes.sort((a, b) => nodeDate(a).localeCompare(nodeDate(b)))
  }
  return { stages, selectedId }
}

const DATE_KEYS = ['raised_on', 'created_on', 'started_on', 'published_on', 'merged_on']

function nodeDate(node: GraphNode): string {
  for (const k of DATE_KEYS) {
    const v = node.metadata[k]
    if (typeof v === 'string') return v
  }
  return '' // undated sorts first
}

export function nodeUrl(node: GraphNode): string | null {
  const u = node.metadata.url ?? node.metadata.html_url
  return typeof u === 'string' ? u : null
}

export function nodeDateLabel(node: GraphNode): string | null {
  const d = nodeDate(node)
  return d ? d.slice(0, 10) : null
}
