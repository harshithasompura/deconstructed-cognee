import { describe, expect, it } from 'vitest'
import { buildChain } from './chain'
import type { GraphData } from '@/types/graph'

const n = (id: string, type: string, meta: Record<string, unknown> = {}) => ({
  id,
  label: id,
  type: type as never,
  x: 0,
  y: 0,
  metadata: meta,
})

// alice raised issue1 ; pr1 resolves issue1 ; release1 includes pr1
const data: GraphData = {
  nodes: [
    n('alice', 'Contributor'),
    n('issue1', 'Issue', { raised_on: '2026-01-10' }),
    n('pr1', 'PullRequest', { merged_on: '2026-02-01' }),
    n('release1', 'Release', { published_on: '2026-03-01' }),
    n('lonely', 'Issue'),
  ],
  edges: [
    { from: 'issue1', to: 'alice', type: 'raised_by' },
    { from: 'pr1', to: 'issue1', type: 'resolves_issues' },
    { from: 'release1', to: 'pr1', type: 'includes_pull_requests' },
  ],
}

describe('buildChain', () => {
  it('orders connected evidence along the evolution spine', () => {
    const { stages } = buildChain('issue1', data)
    // depth-2 from issue1 reaches alice, pr1, release1
    expect(stages.map((s) => s.heading)).toEqual([
      'People',
      'Problem',
      'Implementation',
      'Shipped',
    ])
    expect(stages[0].nodes[0].id).toBe('alice')
    expect(stages[3].nodes[0].id).toBe('release1')
  })

  it('returns empty for no selection or unknown id', () => {
    expect(buildChain(null, data).stages).toEqual([])
    expect(buildChain('ghost', data).stages).toEqual([])
  })

  it('handles a node with no connections', () => {
    const { stages } = buildChain('lonely', data)
    expect(stages).toHaveLength(1)
    expect(stages[0].nodes[0].id).toBe('lonely')
  })
})
