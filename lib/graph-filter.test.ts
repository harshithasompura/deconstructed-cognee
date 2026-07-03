import { describe, expect, it } from 'vitest'
import { filterGraph } from './graph-filter'
import type { GraphData, NodeType } from '@/types/graph'

const node = (id: string, type: NodeType, label: string): GraphData['nodes'][0] => ({
  id,
  label,
  type,
  x: 0,
  y: 0,
  metadata: {},
})

const data: GraphData = {
  nodes: [
    node('p', 'Product', 'Plane'),
    node('f', 'Feature', 'kanban board'),
    node('i', 'Issue', 'kanban drag bug'),
    node('c', 'Contributor', 'alice'),
  ],
  edges: [
    { from: 'i', to: 'f', type: 'concerns_feature' },
    { from: 'f', to: 'p', type: 'part_of' },
  ],
}

describe('filterGraph', () => {
  it('returns input unchanged with no filters', () => {
    expect(filterGraph(data, { query: '', types: new Set() })).toBe(data)
  })

  it('matches label case-insensitively and drops now-dangling edges', () => {
    const out = filterGraph(data, { query: 'KANBAN', types: new Set() })
    expect(out.nodes.map((n) => n.id).sort()).toEqual(['f', 'i'])
    // i→f survives (both kept); f→p drops (p filtered out)
    expect(out.edges).toEqual([{ from: 'i', to: 'f', type: 'concerns_feature' }])
  })

  it('filters by type set', () => {
    const out = filterGraph(data, { query: '', types: new Set<NodeType>(['Issue']) })
    expect(out.nodes.map((n) => n.id)).toEqual(['i'])
    expect(out.edges).toEqual([])
  })

  it('combines query and type (AND)', () => {
    const out = filterGraph(data, {
      query: 'kanban',
      types: new Set<NodeType>(['Feature']),
    })
    expect(out.nodes.map((n) => n.id)).toEqual(['f'])
  })
})
