// Pull public artifacts for both products from GitHub, normalize to prose,
// remember() into Cognee Cloud in batches (call count matters).
// Run: npm run ingest            (all products)
//      npm run ingest -- cal-com (one product)
// Requires COGNEE_API_KEY; GITHUB_TOKEN optional but strongly recommended
// (unauthenticated GitHub API allows only 60 requests/hour).
try {
  process.loadEnvFile()
} catch {
  // no .env — fails later with a clear error
}

// @octokit/core (not the `octokit` meta-package, which pulls @octokit/app —
// broken under Node 23 ESM). Has both .request and .graphql built in.
import { Octokit } from '@octokit/core'
import { remember } from '../lib/cognee'
import { CUSTOM_PROMPT, GRAPH_MODEL } from '../lib/graph-schema'
import {
  batchDocuments,
  normalizeDiscussion,
  normalizeIssue,
  normalizePullRequest,
  normalizeRelease,
  type RawDiscussion,
} from '../lib/normalize'
import { PRODUCTS } from '../lib/products'

// ponytail: fixed caps keep a first run in minutes; raise when depth matters
const CAP = { issues: 100, pulls: 100, releases: 30, discussions: 50 }
const DOCS_PER_BATCH = 20

const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN })

async function fetchDiscussions(
  owner: string,
  repo: string,
): Promise<RawDiscussion[]> {
  // Discussions have no REST endpoint — GraphQL only.
  const query = `query ($owner: String!, $repo: String!, $first: Int!) {
    repository(owner: $owner, name: $repo) {
      discussions(first: $first, orderBy: { field: CREATED_AT, direction: DESC }) {
        nodes {
          number title body createdAt url
          author { login }
          category { name }
        }
      }
    }
  }`
  try {
    const res = await octokit.graphql<{
      repository: {
        discussions: {
          nodes: {
            number: number
            title: string
            body: string | null
            createdAt: string
            url: string
            author: { login: string } | null
            category: { name: string }
          }[]
        }
      }
    }>(query, { owner, repo, first: CAP.discussions })
    return res.repository.discussions.nodes.map((n) => ({
      number: n.number,
      title: n.title,
      body: n.body,
      author: n.author?.login ?? 'ghost',
      createdAt: n.createdAt,
      category: n.category.name,
      url: n.url,
    }))
  } catch (err) {
    // Repos without discussions enabled throw — skip, don't die.
    console.warn(`  discussions skipped (${(err as Error).message.slice(0, 80)})`)
    return []
  }
}

async function ingestProduct(productId?: string) {
  const products = productId
    ? PRODUCTS.filter((p) => p.id === productId)
    : PRODUCTS
  if (products.length === 0) {
    throw new Error(
      `Unknown product "${productId}". Known: ${PRODUCTS.map((p) => p.id).join(', ')}`,
    )
  }

  for (const product of products) {
    const [owner, repo] = product.repo.split('/')
    console.log(`\n${product.name} (${product.repo}) → ${product.datasetName}`)

    const [issuesRes, pullsRes, releasesRes, discussions] = await Promise.all([
      octokit.request('GET /repos/{owner}/{repo}/issues', {
        owner,
        repo,
        state: 'all',
        per_page: CAP.issues,
        sort: 'updated',
      }),
      octokit.request('GET /repos/{owner}/{repo}/pulls', {
        owner,
        repo,
        state: 'all',
        per_page: CAP.pulls,
        sort: 'updated',
        direction: 'desc',
      }),
      octokit.request('GET /repos/{owner}/{repo}/releases', {
        owner,
        repo,
        per_page: CAP.releases,
      }),
      fetchDiscussions(owner, repo),
    ])

    const docs = [
      // GitHub's issues endpoint returns PRs too — drop them
      ...issuesRes.data
        .filter((i) => !i.pull_request)
        .map((i) =>
          normalizeIssue(product.name, {
            number: i.number,
            title: i.title,
            body: i.body ?? null,
            state: i.state,
            labels: i.labels.map((l) =>
              typeof l === 'string' ? { name: l } : { name: l.name ?? '' },
            ),
            user: i.user?.login ?? 'ghost',
            created_at: i.created_at,
            closed_at: i.closed_at,
            html_url: i.html_url,
          }),
        ),
      ...pullsRes.data.map((pr) =>
        normalizePullRequest(product.name, {
          number: pr.number,
          title: pr.title,
          body: pr.body,
          state: pr.state,
          user: pr.user?.login ?? 'ghost',
          created_at: pr.created_at,
          merged_at: pr.merged_at,
          html_url: pr.html_url,
        }),
      ),
      ...releasesRes.data.map((r) =>
        normalizeRelease(product.name, {
          tag_name: r.tag_name,
          name: r.name,
          body: r.body ?? null,
          published_at: r.published_at,
          html_url: r.html_url,
        }),
      ),
      ...discussions.map((d) => normalizeDiscussion(product.name, d)),
    ]

    const batches = batchDocuments(docs, DOCS_PER_BATCH)
    console.log(`  ${docs.length} artifacts → ${batches.length} remember() calls`)

    for (const [i, batch] of batches.entries()) {
      process.stdout.write(`  remembering batch ${i + 1}/${batches.length}… `)
      await remember({
        text: batch,
        datasetName: product.datasetName,
        filename: `${product.id}-batch-${i + 1}.md`,
        graphModel: GRAPH_MODEL,
        customPrompt: CUSTOM_PROMPT,
      })
      console.log('done')
    }
  }
  console.log('\nIngest complete.')
}

ingestProduct(process.argv[2]).catch((err) => {
  console.error(err)
  process.exit(1)
})
