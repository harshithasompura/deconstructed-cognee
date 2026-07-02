import type { NodeType } from '@/types/graph'

// Single source for node styling — sigma needs raw hex (no CSS vars on
// canvas), legend/timeline reuse the same map. Magenta is reserved for
// Feature: the thing the product is actually made of.
export const NODE_STYLE: Record<NodeType, { color: string; label: string }> = {
  Product: { color: '#111111', label: 'Product' },
  Feature: { color: '#FF01FF', label: 'Feature' },
  Issue: { color: '#C77800', label: 'Issue' },
  PullRequest: { color: '#0F8A80', label: 'Pull request' },
  Release: { color: '#2F4BD0', label: 'Release' },
  Discussion: { color: '#8A4DBF', label: 'Discussion' },
  Contributor: { color: '#777777', label: 'Contributor' },
}

export const EDGE_COLOR = '#DCDCDC'
export const EDGE_COLOR_ACTIVE = '#FF01FF'
