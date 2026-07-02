# Deconstructed

*Understand how products evolve.*

Deconstructed reconstructs a product's evolution from its public artifacts —
issues, discussions, PRs, releases, docs, blog posts — as a knowledge graph.
Instead of "here's the README," it answers *why* a feature exists: which
problem prompted it, which design decision shaped it, which discussion or
bug reshaped it later.

## Why

Understanding how a product got the way it is means reading a dozen
disconnected sources by hand — docs, then GitHub, then the PR, then the
discussion that argued over it, then the release notes. Nobody connects
them. Deconstructed does, by treating them as one memory instead of many
documents.

## How it works

1. Pull public artifacts for a product (GitHub issues, PRs, discussions,
   releases, docs, blog) and normalize them into a shared schema.
2. `remember()` them into Cognee Cloud.
3. Ask a question — `recall()` traverses the graph across sources instead
   of returning a single matching document.
4. Two independent products (Vercel AI SDK, Cal.com) share the exact same
   schema, so the same engine works on a dev-tooling SDK and a user-facing
   SaaS product without per-product logic.

## Architecture

```
Product
├── Feature
├── Issue
├── Discussion
├── PullRequest
├── Release
├── Contributor
├── Documentation
└── Blog
```

Root node is `Product`, not `Repository` — the schema is shared across both
datasets, not bespoke per product.

All Cognee Cloud calls (`remember`/`recall`/`improve`/`search`) happen
server-side only, via Next.js Route Handlers — the API key never reaches the
client. No static `graph.json`, no MDX, no hand-authored content; the graph
is built live from real ingested data, queried at request time.

## Attribution

Public artifacts are analyzed and connected, not republished. Data sources
are credited explicitly in the app; full docs/blog content is never mirrored.

## Stack

Next.js (App Router), TypeScript, Tailwind, shadcn/ui, Zustand, React Query,
Framer Motion, Sigma.js + Graphology (graph UI), Octokit (GitHub ingest),
Cognee Cloud (memory), Vitest.

## Status: done

- [x] Repo scaffolded (Next.js, TS, Tailwind v4, App Router, `@/*` alias)
- [x] Deps installed: sigma, graphology, graphology-layout-forceatlas2,
      zustand, @tanstack/react-query, framer-motion, octokit, server-only
- [x] Test tooling: vitest, jsdom, @testing-library/react
- [x] shadcn/ui initialized, badge/button/sheet added
- [x] Brand tokens applied (bg `#F8F8F8`, surface `#EFEFEF`, brand `#FF01FF`,
      hover `#E600E6`, soft `#FFE5FF`, text `#111111`, muted `#777777`),
      Open Sans
- [x] `types/graph.ts`: shared `Product`-rooted schema
- [x] `.env.example` (`COGNEE_API_KEY`, `COGNEE_SERVICE_URL`, `GITHUB_TOKEN`)

## Status: not started

- [ ] `lib/cognee.ts` — server-only Cognee Cloud client
- [ ] Validate live `remember()`/`recall()`/`improve()` behavior against
      Cognee Cloud before building the ingest pipeline on top of assumptions
- [ ] `scripts/ingest.ts` — Octokit pull for both repos, normalized,
      `remember()`'d in batches (not per-item — call count matters)
- [ ] Next.js API routes proxying `recall`/`search`
- [ ] Product-first UI: selector → feature view (Timeline / Knowledge Graph /
      Feature Evolution / Related Features / Questions) — repository never
      surfaces
- [ ] Sigma.js `GraphCanvas` wired to live `recall()`/`search()` results
- [ ] Hero queries per product + one cross-product comparison query
- [ ] README with data-source attribution
- [ ] Deploy to Vercel — env vars server-only, never `NEXT_PUBLIC_`
