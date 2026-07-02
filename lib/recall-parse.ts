// Defensive parsers for Cognee recall() responses. Shapes are unvalidated
// until scripts/validate-cognee.ts runs against a live key — these accept
// the known variants and degrade to empty results, never throw on shape.
import Graph from 'graphology'
import forceAtlas2 from 'graphology-layout-forceatlas2'
import type {
  GraphData,
  GraphEdge,
  GraphNode,
  NodeType,
  RelationshipType,
} from '@/types/graph'

import { DOMAIN_TYPES } from './graph-schema'

const RELATIONSHIPS = new Set<string>([
  'part_of',
  'raised_by',
  'concerns_feature',
  'author',
  'resolves_issues',
  'implements_feature',
  'includes_pull_requests',
  'supersedes',
  'superseded_by',
  'introduced_in',
  'discusses_issues',
  'started_by',
])

// Only graph_model entities render; everything else in the dataset graph
// (DocumentChunk, TextSummary, TextDocument, schema-wrapper node) is
// Cognee housekeeping.
const DOMAIN = new Set<string>(DOMAIN_TYPES)

type Dict = Record<string, unknown>

function isDict(v: unknown): v is Dict {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

function toNode(raw: unknown): GraphNode | null {
  if (!isDict(raw)) return null
  const props = isDict(raw.properties) ? raw.properties : {}
  const id = raw.id ?? raw.uuid ?? raw.node_id ?? props.id
  if (id == null) return null
  const type = String(props.type ?? raw.type ?? '')
  if (!DOMAIN.has(type)) return null
  const label = String(
    raw.label ?? props.name ?? props.title ?? raw.name ?? id,
  )
  const merged = { ...props, ...raw }
  const metadata: Dict = {}
  for (const [k, v] of Object.entries(merged)) {
    if ((typeof v === 'string' || typeof v === 'number') && k !== 'properties') {
      metadata[k] = v
    }
  }
  return {
    id: String(id),
    label,
    type: type as NodeType,
    x: 0,
    y: 0,
    metadata,
  }
}

function toRelationship(name: unknown): RelationshipType {
  const label = String(name ?? '').toLowerCase().replace(/\s+/g, '_')
  return (RELATIONSHIPS.has(label) ? label : 'related_to') as RelationshipType
}

/**
 * Cognee dataset-graph payload → domain nodes + deduped edges (positions
 * unset). Shape: { nodes:[{id,label,properties}], edges:[{source,target,
 * label}] }. Housekeeping nodes are dropped; cognify over-emits duplicate
 * edges (verified live), so edges dedup on (from,to,type). Degrades to
 * empty on anything unexpected — never throws on shape.
 */
export function parseGraph(raw: unknown): GraphData {
  const rawNodes = isDict(raw) && Array.isArray(raw.nodes) ? raw.nodes : []
  const rawEdges = isDict(raw) && Array.isArray(raw.edges) ? raw.edges : []

  // Cloud cognify has no cross-batch entity resolution (verified live:
  // 314 duplicate Product nodes across 9 batches) — merge by (type, label),
  // absorbing metadata the canonical copy lacks, and remap edges.
  const nodes = new Map<string, GraphNode>() // canonical id → node
  const canonical = new Map<string, string>() // type|label → canonical id
  const alias = new Map<string, string>() // duplicate id → canonical id
  for (const item of rawNodes) {
    const node = toNode(item)
    if (!node) continue
    const key = `${node.type}|${node.label.toLowerCase()}`
    const canonId = canonical.get(key)
    if (canonId != null) {
      alias.set(node.id, canonId)
      const canon = nodes.get(canonId)!
      for (const [k, v] of Object.entries(node.metadata)) {
        if (!(k in canon.metadata)) canon.metadata[k] = v
      }
    } else if (!nodes.has(node.id)) {
      canonical.set(key, node.id)
      nodes.set(node.id, node)
    }
  }

  const edges: GraphEdge[] = []
  const seen = new Set<string>()
  for (const item of rawEdges) {
    if (!isDict(item)) continue
    const rawFrom = String(item.source ?? item.from ?? '')
    const rawTo = String(item.target ?? item.to ?? '')
    const from = alias.get(rawFrom) ?? rawFrom
    const to = alias.get(rawTo) ?? rawTo
    // drop dangling edges — sigma throws on a node that isn't in the graph
    if (!nodes.has(from) || !nodes.has(to)) continue
    if (from === to) continue // self-loop after merge
    const type = toRelationship(item.label ?? item.type)
    const key = `${from}|${to}|${type}`
    if (seen.has(key)) continue
    seen.add(key)
    edges.push({ from, to, type })
  }

  return { nodes: [...nodes.values()], edges }
}

/** GRAPH_COMPLETION result → answer text, whatever shape it arrived in. */
export function extractAnswer(raw: unknown): string {
  if (typeof raw === 'string') return raw
  if (Array.isArray(raw)) return raw.map(extractAnswer).filter(Boolean).join('\n')
  if (isDict(raw)) {
    for (const key of ['answer', 'text', 'result', 'search_result', 'completion']) {
      if (raw[key] != null) return extractAnswer(raw[key])
    }
  }
  return ''
}

// Deterministic 0–1 position from node id, as FA2's starting point.
function seed(id: string, salt: number): number {
  let h = salt
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0
  return (h % 1000) / 1000
}

/** Run ForceAtlas2 server-side, return nodes with x/y normalized to 0–1. */
export function layoutGraph(data: GraphData): GraphData {
  if (data.nodes.length === 0) return data

  const graph = new Graph({ multi: true })
  for (const node of data.nodes) {
    graph.addNode(node.id, { x: seed(node.id, 7), y: seed(node.id, 13) })
  }
  for (const edge of data.edges) {
    graph.addEdge(edge.from, edge.to)
  }

  // linLog + high scalingRatio + low gravity spreads the hub-and-spoke shape
  // (one Product connected to everything) instead of clumping it in a corner.
  forceAtlas2.assign(graph, {
    iterations: 300,
    settings: {
      ...forceAtlas2.inferSettings(graph),
      linLogMode: true,
      outboundAttractionDistribution: true,
      scalingRatio: 12,
      gravity: 0.4,
      barnesHutOptimize: graph.order > 200,
    },
  })

  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
  graph.forEachNode((_, attrs) => {
    minX = Math.min(minX, attrs.x); maxX = Math.max(maxX, attrs.x)
    minY = Math.min(minY, attrs.y); maxY = Math.max(maxY, attrs.y)
  })
  const spanX = maxX - minX || 1
  const spanY = maxY - minY || 1

  return {
    edges: data.edges,
    nodes: data.nodes.map((node) => {
      const attrs = graph.getNodeAttributes(node.id)
      return {
        ...node,
        x: (attrs.x - minX) / spanX,
        y: (attrs.y - minY) / spanY,
      }
    }),
  }
}
