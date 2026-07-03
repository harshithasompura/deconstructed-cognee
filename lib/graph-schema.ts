// The graph_model handed to Cognee Cloud remember(). This IS the ontology:
// remember() extracts into exactly these node types and relationship fields —
// nothing regex-inferred client-side anymore.
//
// Shape mirrors what /api/v1/llm/infer-schema proposes (verified live
// 2026-07-02): root object of entity arrays, $defs per type, relationships
// as $ref fields. Field names become edge labels in the dataset graph.
//
// Gotcha (reproduced live): `format: "date"` crashes Cloud remember()
// ("Object of type date is not JSON serializable") — dates stay plain strings.

const contributorRef = { $ref: '#/$defs/Contributor' }
const str = { type: 'string' } as const

export const GRAPH_MODEL = {
  title: 'ProductEvolutionGraph',
  type: 'object',
  properties: {
    products: { type: 'array', items: { $ref: '#/$defs/Product' } },
    features: { type: 'array', items: { $ref: '#/$defs/Feature' } },
    issues: { type: 'array', items: { $ref: '#/$defs/Issue' } },
    pull_requests: { type: 'array', items: { $ref: '#/$defs/PullRequest' } },
    releases: { type: 'array', items: { $ref: '#/$defs/Release' } },
    discussions: { type: 'array', items: { $ref: '#/$defs/Discussion' } },
    contributors: { type: 'array', items: { $ref: '#/$defs/Contributor' } },
  },
  required: ['products', 'issues', 'pull_requests', 'releases'],
  $defs: {
    Product: {
      title: 'Product',
      type: 'object',
      description: 'The software product whose evolution is being reconstructed.',
      properties: { name: str },
      required: ['name'],
    },
    Contributor: {
      title: 'Contributor',
      type: 'object',
      description: 'A person who raised issues, authored pull requests, or started discussions.',
      properties: { name: str },
      required: ['name'],
    },
    Feature: {
      title: 'Feature',
      type: 'object',
      description: 'A capability of the product that artifacts concern.',
      properties: {
        name: str,
        description: str,
        part_of: { $ref: '#/$defs/Product' },
        introduced_in: {
          $ref: '#/$defs/Release',
          description: 'Release that first shipped this feature.',
        },
        superseded_by: {
          $ref: '#/$defs/Feature',
          description: 'Feature that replaced or deprecated this one.',
        },
      },
      required: ['name'],
    },
    Issue: {
      title: 'Issue',
      type: 'object',
      description: 'A reported problem or feature request, e.g. "Issue #15481".',
      properties: {
        name: { ...str, description: 'Identifier like "Issue #15481".' },
        title: str,
        url: str,
        status: { ...str, description: 'open or closed.' },
        labels: str,
        raised_on: { ...str, description: 'YYYY-MM-DD.' },
        closed_on: str,
        raised_by: contributorRef,
        concerns_feature: { $ref: '#/$defs/Feature' },
        part_of: { $ref: '#/$defs/Product' },
      },
      required: ['name'],
    },
    PullRequest: {
      title: 'PullRequest',
      type: 'object',
      description: 'A code change, e.g. "PR #610".',
      properties: {
        name: { ...str, description: 'Identifier like "PR #610".' },
        title: str,
        url: str,
        status: str,
        created_on: str,
        merged_on: { ...str, description: 'YYYY-MM-DD, if merged.' },
        author: contributorRef,
        resolves_issues: {
          type: 'array',
          items: { $ref: '#/$defs/Issue' },
          description: 'Issues this PR fixes/closes, from explicit references.',
        },
        implements_feature: { $ref: '#/$defs/Feature' },
        part_of: { $ref: '#/$defs/Product' },
      },
      required: ['name'],
    },
    Release: {
      title: 'Release',
      type: 'object',
      description: 'A published version, e.g. "v5.0".',
      properties: {
        name: { ...str, description: 'Release tag, e.g. "v5.0".' },
        version: str,
        url: str,
        published_on: { ...str, description: 'YYYY-MM-DD.' },
        includes_pull_requests: {
          type: 'array',
          items: { $ref: '#/$defs/PullRequest' },
          description: 'Pull requests shipped in this release.',
        },
        supersedes: {
          $ref: '#/$defs/Release',
          description: 'Previous release this one replaces.',
        },
        part_of: { $ref: '#/$defs/Product' },
      },
      required: ['name'],
    },
    Discussion: {
      title: 'Discussion',
      type: 'object',
      description: 'A community discussion, e.g. "Discussion #42".',
      properties: {
        name: { ...str, description: 'Identifier like "Discussion #42".' },
        title: str,
        url: str,
        category: str,
        started_on: str,
        started_by: contributorRef,
        discusses_issues: { type: 'array', items: { $ref: '#/$defs/Issue' } },
        concerns_feature: { $ref: '#/$defs/Feature' },
        part_of: { $ref: '#/$defs/Product' },
      },
      required: ['name'],
    },
  },
} as const

export const CUSTOM_PROMPT = `You are extracting a product-evolution knowledge graph from GitHub artifact descriptions.
Extract every issue, pull request, release, discussion, contributor, product and feature mentioned.
Use exact identifiers as names: "Issue #15481", "PR #610", release tags like "v5.0", contributor usernames verbatim.

FEATURES: for every issue, pull request and discussion, infer the product capability it concerns and create a Feature node for it — a short noun phrase like "kanban board", "time tracking", "OAuth login", "streaming responses". Reuse the same Feature node across artifacts about the same capability, and connect them with concerns_feature / implements_feature. A thin feature layer is a failure; most artifacts concern some feature.

SUPERSESSION: when the text says an artifact deprecates, replaces, removes, migrates away from, or is a breaking change to earlier behaviour, a feature, or a release, extract the supersedes / superseded_by relationship explicitly.

Link artifacts only by relationships stated or clearly implied: who raised or authored what, which issues a pull request resolves (from "fixes #N" / "closes #N"), which pull requests a release includes.
Copy dates (YYYY-MM-DD) and URLs verbatim onto the artifact that owns them.
Do not invent issues, PRs, releases or contributors that are not present; features may be inferred as above.`

/** Node types the UI treats as domain entities (everything else in the
 *  dataset graph — DocumentChunk, TextSummary, … — is Cognee housekeeping). */
export const DOMAIN_TYPES = [
  'Product',
  'Feature',
  'Issue',
  'PullRequest',
  'Release',
  'Discussion',
  'Contributor',
] as const
