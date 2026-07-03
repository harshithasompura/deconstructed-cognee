# Deconstructed: design & build log

How the project was reasoned out and built, in the order the decisions were
made.

## Goal

Reconstruct *why* a software product evolved the way it did, from its public
GitHub artifacts, and present that reasoning as connected evidence rather than
a generated paragraph.

## Core idea: decision chains, not RAG

The differentiator is not retrieving documents; it is reconstructing the
chain behind a change:

```
problem (issue) → concept (feature) → implementation (pull request) → shipped (release)
```

That chain is a **typed path through a graph**. So the graph has to be typed:
generic text chunks can't be walked as a decision chain. This makes a typed
knowledge graph the foundation, and it makes the rendered chain (not an LLM
answer) the primary output. Each node in the chain is a real artifact with
its GitHub URL, so the chain is also its own provenance.

## Why Cognee Cloud

- `remember()` accepts a `graph_model` (JSON Schema) plus a custom prompt, so
  it extracts a typed ontology in a single hosted call, with no local
  extraction pipeline.
- Managed multi-dataset isolation lets each product be its own dataset under
  one shared ontology, queried alone or together.
- `GRAPH_COMPLETION` answers over the graph for the free-text "ask" surface.

## Ontology

One `Product`-rooted schema, shared across every product
(`types/graph.ts`, `lib/graph-schema.ts`):

```
Product
Feature      concerns_feature / implements_feature / introduced_in / superseded_by
Issue        raised_by, resolves_issues
PullRequest  author, resolves_issues, implements_feature
Release      includes_pull_requests, supersedes
Discussion   started_by, discusses_issues
Contributor
```

## Data flow

```
GitHub artifacts
  → normalize to prose that states relationships (lib/normalize.ts)
  → remember(graph_model, custom_prompt)         [Cognee Cloud extraction]
  → getDatasetGraph()                            [typed nodes + typed edges]
  → parse: drop housekeeping, merge duplicates, lay out (lib/recall-parse.ts)
  → graph · timeline · chain · ask               [client renders]
```

Cognee owns extraction and storage; the app owns traversal and rendering. All
Cognee calls are server-side so the API key never reaches the client.

## Steps followed

1. **Client and ontology.** Server-only Cognee client (`lib/cognee.ts`),
   typed node/edge vocabulary (`types/graph.ts`), one dataset entry per
   product (`lib/products.ts`).
2. **Ingest.** Pure GitHub-artifact-to-prose functions (`lib/normalize.ts`,
   unit-tested without network) and a batched ingest script that passes the
   `graph_model` so Cognee builds a typed graph
   (`scripts/ingest.ts`, `lib/graph-schema.ts`).
3. **Parse and chain.** `parseGraph` filters Cognee's housekeeping nodes,
   dedups edges, and merges cross-batch duplicate entities; `buildChain`
   walks the typed evolution spine from a selected node (`lib/recall-parse.ts`,
   `lib/chain.ts`).
4. **API + UI.** Two server routes (dataset graph, ask) and a one-page
   workspace with three views over one dataset (force-directed graph,
   time-sorted timeline, decision chain) plus a graph-grounded ask panel.
5. **Verify on Cloud** (below).
6. **Polish.** WCAG AA contrast, keyboard/accessibility names, markdown
   rendering in answers, and a readable graph layout.
7. **Third product and prompt tuning** (below).

## Verifying the approach on Cloud

Before building the typed pipeline out, the assumption was tested against the
live API:

- `POST /api/v1/llm/infer-schema` proposes a `graph_model` JSON Schema from
  sample text, so schema authoring is assisted, not hand-written from scratch.
- `POST /api/v1/remember` with that `graph_model` + custom prompt returns
  typed nodes and typed chain edges. A sample decision chain
  (Release → PR → RFC → Issue → author) came back intact.

Two gotchas surfaced and are handled:

- **`format: "date"` crashes `remember()`** ("Object of type date is not JSON
  serializable"). Date fields are kept as plain strings in the schema.
- **No cross-batch entity resolution.** Ingesting in batches produces
  duplicate `Product` (and other) nodes; `parseGraph` merges them by
  `(type, label)` and remaps edges.

SDK-only features (Python DataPoints, custom pipelines, global context index)
are out of scope; the whole pipeline runs on the Cloud HTTP API.

## Answer design

`GRAPH_COMPLETION` returns a synthesized string with no node-level citations.
Rather than approximate which nodes an answer used, the product makes the
**decision chain itself the grounded answer** (a path of real artifacts, each
linking to GitHub) and treats the generated prose as a caption. This
sidesteps the missing attribution entirely.

## Third product and prompt tuning

Adding [Plane](https://github.com/makeplane/plane) was one dataset entry plus
one ingest run; the UI is data-driven, so no structural change.

The first ingests produced very few `Feature` nodes, leaving the chain's
"concept" stage thin. Tuning the extraction prompt to infer a feature per
artifact and reuse it across related ones raised features from ~2 to 140–400
per product, and all three products were re-ingested onto the tuned prompt for
consistency (older datasets kept as rollback).

## Known limits

- **Supersession is sparse** (~1 edge per product). GitHub prose rarely states
  that one thing replaces another, so it can't be extracted reliably, and
  edges are never fabricated to fill the gap.
- **Graph scale.** The largest product is ~1k nodes; Sigma/WebGL handles it,
  but the per-frame hover-dimming is `O(degree)` and would want optimizing
  past a few thousand nodes.
- **Freshness.** Ingest is a batch snapshot. Incremental re-sync via
  `PATCH /update` is a natural next step, not yet built.
