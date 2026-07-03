import type { GraphData, NodeType } from '@/types/graph'

/**
 * Narrow a graph to nodes matching a text query (label, case-insensitive) and
 * an optional set of node types. Empty query + empty type set returns the input
 * unchanged. Edges survive only when both endpoints do, so the result is always
 * a valid graph (no dangling edges for sigma to choke on).
 */
export function filterGraph(
  data: GraphData,
  opts: { query: string; types: Set<NodeType> },
): GraphData {
  const q = opts.query.trim().toLowerCase()
  const byType = opts.types.size > 0
  if (!q && !byType) return data

  const nodes = data.nodes.filter(
    (n) =>
      (!byType || opts.types.has(n.type)) &&
      (!q || n.label.toLowerCase().includes(q)),
  )
  const ids = new Set(nodes.map((n) => n.id))
  const edges = data.edges.filter((e) => ids.has(e.from) && ids.has(e.to))
  return { nodes, edges }
}
