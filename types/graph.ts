export type NodeType =
  | 'Product'
  | 'Feature'
  | 'Issue'
  | 'Discussion'
  | 'PullRequest'
  | 'Release'
  | 'Contributor'

// Edge labels = graph_model relationship field names (lib/graph-schema.ts).
// 'related_to' is the fallback for labels outside the schema vocabulary.
export type RelationshipType =
  | 'part_of'
  | 'raised_by'
  | 'concerns_feature'
  | 'author'
  | 'resolves_issues'
  | 'implements_feature'
  | 'includes_pull_requests'
  | 'supersedes'
  | 'superseded_by'
  | 'introduced_in'
  | 'discusses_issues'
  | 'started_by'
  | 'related_to'

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
