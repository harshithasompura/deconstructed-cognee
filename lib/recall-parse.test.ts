import { describe, expect, it } from 'vitest'
import { extractAnswer, layoutGraph, parseGraph } from './recall-parse'

describe('parseGraph', () => {
  const payload = {
    nodes: [
      {
        id: 'n1',
        label: 'Issue #483',
        properties: { type: 'Issue', name: 'Issue #483', raised_on: '2026-01-10' },
      },
      { id: 'n2', label: '#610', properties: { type: 'PullRequest', merged_on: '2026-03-02' } },
      { id: 'n3', label: 'alice', properties: { type: 'Contributor' } },
      // housekeeping — must be dropped
      { id: 'h1', label: 'DocumentChunk_x', properties: { type: 'DocumentChunk', text: '…' } },
      { id: 'h2', label: 'TextSummary_y', properties: { type: 'TextSummary' } },
    ],
    edges: [
      { source: 'n2', target: 'n1', label: 'resolves_issues' },
      // duplicate — remember() over-emits, must dedup
      { source: 'n2', target: 'n1', label: 'resolves_issues' },
      { source: 'n1', target: 'n3', label: 'raised_by' },
      // unknown label falls back
      { source: 'n2', target: 'n3', label: 'made_from' },
      // edge into a housekeeping node — dropped with the node
      { source: 'h1', target: 'n1', label: 'contains' },
    ],
  }

  it('keeps domain nodes with real types, drops housekeeping', () => {
    const data = parseGraph(payload)
    expect(data.nodes).toHaveLength(3)
    expect(data.nodes[0]).toMatchObject({ id: 'n1', label: 'Issue #483', type: 'Issue' })
    expect(data.nodes[0].metadata.raised_on).toBe('2026-01-10')
    expect(data.nodes[1].type).toBe('PullRequest')
    expect(data.nodes.map((n) => n.id)).not.toContain('h1')
  })

  it('dedups edges and coerces unknown labels to related_to', () => {
    const data = parseGraph(payload)
    expect(data.edges).toHaveLength(3)
    expect(data.edges[0].type).toBe('resolves_issues')
    expect(data.edges[1].type).toBe('raised_by')
    expect(data.edges[2].type).toBe('related_to')
  })

  it('merges duplicate entities by (type, label) and remaps their edges', () => {
    const data = parseGraph({
      nodes: [
        { id: 'p1', label: 'Vercel AI SDK', properties: { type: 'Product' } },
        { id: 'p2', label: 'vercel ai sdk', properties: { type: 'Product', url: 'x' } },
        { id: 'i1', label: 'Issue #1', properties: { type: 'Issue' } },
      ],
      edges: [
        { source: 'i1', target: 'p2', label: 'part_of' }, // → remapped to p1
        { source: 'p1', target: 'p2', label: 'part_of' }, // → self-loop, dropped
      ],
    })
    expect(data.nodes).toHaveLength(2)
    expect(data.nodes[0].metadata.url).toBe('x') // absorbed from duplicate
    expect(data.edges).toEqual([{ from: 'i1', to: 'p1', type: 'part_of' }])
  })

  it('drops nodes without a domain type (nothing is regex-guessed)', () => {
    const data = parseGraph({
      nodes: [{ id: 'a', label: 'pull request #2' }], // no type property
      edges: [],
    })
    expect(data.nodes).toEqual([])
  })

  it('drops edges pointing at missing nodes (sigma would throw otherwise)', () => {
    const data = parseGraph({
      nodes: [{ id: 'a', label: 'A', properties: { type: 'Feature' } }],
      edges: [{ source: 'a', target: 'ghost', label: 'part_of' }],
    })
    expect(data.nodes).toHaveLength(1)
    expect(data.edges).toEqual([])
  })

  it('degrades to empty on junk, never throws', () => {
    expect(parseGraph(null).nodes).toEqual([])
    expect(parseGraph('nope').nodes).toEqual([])
    expect(parseGraph({ nodes: [{}], edges: [{}] }).nodes).toEqual([])
  })
})

describe('extractAnswer', () => {
  it('handles string, array and nested object shapes', () => {
    expect(extractAnswer('plain')).toBe('plain')
    expect(extractAnswer(['a', 'b'])).toBe('a\nb')
    expect(extractAnswer([{ search_result: { text: 'nested' } }])).toBe('nested')
    expect(extractAnswer({ unknown_key: 1 })).toBe('')
  })
})

describe('layoutGraph', () => {
  it('assigns normalized 0-1 positions deterministically', () => {
    const data = parseGraph({
      nodes: [
        { id: 'a', label: 'A', properties: { type: 'Issue' } },
        { id: 'b', label: 'B', properties: { type: 'PullRequest' } },
        { id: 'c', label: 'C', properties: { type: 'Release' } },
      ],
      edges: [
        { source: 'b', target: 'a', label: 'resolves_issues' },
        { source: 'c', target: 'b', label: 'includes_pull_requests' },
      ],
    })
    const one = layoutGraph(data)
    const two = layoutGraph(data)
    expect(one.nodes).toHaveLength(3)
    for (const node of one.nodes) {
      expect(node.x).toBeGreaterThanOrEqual(0)
      expect(node.x).toBeLessThanOrEqual(1)
      expect(node.y).toBeGreaterThanOrEqual(0)
      expect(node.y).toBeLessThanOrEqual(1)
    }
    expect(one.nodes).toEqual(two.nodes)
  })

  it('passes empty graphs through', () => {
    expect(layoutGraph({ nodes: [], edges: [] })).toEqual({ nodes: [], edges: [] })
  })
})
