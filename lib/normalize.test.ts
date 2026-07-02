import { describe, expect, it } from 'vitest'
import {
  batchDocuments,
  normalizeDiscussion,
  normalizeIssue,
  normalizePullRequest,
  normalizeRelease,
} from './normalize'

const PRODUCT = 'Vercel AI SDK'

describe('normalizeIssue', () => {
  it('states product, contributor and status relationships explicitly', () => {
    const doc = normalizeIssue(PRODUCT, {
      number: 123,
      title: 'Streaming breaks on edge',
      body: 'It crashes.',
      state: 'closed',
      labels: [{ name: 'bug' }, { name: 'streaming' }],
      user: 'alice',
      created_at: '2024-05-01T10:00:00Z',
      closed_at: '2024-06-01T10:00:00Z',
      html_url: 'https://github.com/vercel/ai/issues/123',
    })
    expect(doc).toContain('issue of the product Vercel AI SDK')
    expect(doc).toContain('raised by contributor alice on 2024-05-01')
    expect(doc).toContain('closed on 2024-06-01')
    expect(doc).toContain('labeled: bug, streaming')
  })

  it('clips long bodies', () => {
    const doc = normalizeIssue(PRODUCT, {
      number: 1,
      title: 't',
      body: 'x'.repeat(5000),
      state: 'open',
      labels: [],
      user: 'a',
      created_at: '2024-01-01T00:00:00Z',
      closed_at: null,
      html_url: 'u',
    })
    expect(doc.length).toBeLessThan(2000)
    expect(doc).toContain('…')
    expect(doc).toContain('It is still open.')
  })
})

describe('normalizePullRequest', () => {
  it('marks merged PRs as implementing a change', () => {
    const doc = normalizePullRequest(PRODUCT, {
      number: 456,
      title: 'Add streamText',
      body: null,
      state: 'closed',
      user: 'bob',
      created_at: '2024-05-02T00:00:00Z',
      merged_at: '2024-05-03T00:00:00Z',
      html_url: 'u',
    })
    expect(doc).toContain('authored by contributor bob')
    expect(doc).toContain('merged on 2024-05-03, implementing a change')
    expect(doc).toContain('(no description)')
  })
})

describe('normalizeRelease', () => {
  it('falls back to tag name and handles missing dates', () => {
    const doc = normalizeRelease(PRODUCT, {
      tag_name: 'v3.0.0',
      name: null,
      body: 'Big release',
      published_at: null,
      html_url: 'u',
    })
    expect(doc).toContain('Release v3.0.0 "v3.0.0"')
    expect(doc).toContain('published on an unknown date')
  })
})

describe('normalizeDiscussion', () => {
  it('states category and author', () => {
    const doc = normalizeDiscussion(PRODUCT, {
      number: 9,
      title: 'RFC: providers',
      body: 'Thoughts?',
      author: 'carol',
      createdAt: '2024-03-01T00:00:00Z',
      category: 'Ideas',
      url: 'u',
    })
    expect(doc).toContain('community discussion of the product Vercel AI SDK')
    expect(doc).toContain('category Ideas')
    expect(doc).toContain('started by contributor carol on 2024-03-01')
  })
})

describe('batchDocuments', () => {
  it('splits docs into joined batches', () => {
    const batches = batchDocuments(['a', 'b', 'c', 'd', 'e'], 2)
    expect(batches).toHaveLength(3)
    expect(batches[0]).toBe('a\n\n---\n\nb')
    expect(batches[2]).toBe('e')
  })

  it('handles empty input', () => {
    expect(batchDocuments([], 10)).toEqual([])
  })
})
