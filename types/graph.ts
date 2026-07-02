export type NodeType =
  | 'Product'
  | 'Feature'
  | 'Issue'
  | 'Discussion'
  | 'PullRequest'
  | 'Release'
  | 'Contributor'
  | 'Documentation'
  | 'Blog'

export type RelationshipType =
  | 'HAS_FEATURE'
  | 'RAISED_BY'
  | 'DISCUSSED_IN'
  | 'IMPLEMENTED_BY'
  | 'SHIPPED_IN'
  | 'AUTHORED_BY'
  | 'DOCUMENTED_IN'
  | 'REFERENCED_IN'
  | 'SUPERSEDED_BY'

export interface GraphNode {
  id: string
  label: string
  type: NodeType
  x: number // normalized 0-1, set by ForceAtlas2 layout
  y: number
  metadata: Record<string, unknown>
}

export interface GraphEdge {
  from: string
  to: string
  type: RelationshipType
}

export interface GraphData {
  nodes: GraphNode[]
  edges: GraphEdge[]
}

// One product = one Cognee Cloud dataset. Same schema across products,
// per the "one engine, two case studies" design (shared ontology, not
// per-product one-offs).
export interface ProductDataset {
  id: string // e.g. "vercel-ai-sdk", "cal-com"
  name: string
  repo: string // "owner/repo"
  datasetName: string // Cognee Cloud dataset_name for this product
}
