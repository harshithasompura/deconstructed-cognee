// Validates live Cognee Cloud behavior BEFORE trusting the ingest pipeline.
// Run: npx tsx scripts/validate-cognee.ts
// Prints raw response shapes for remember() and each recall search type, so
// the triplet→graph mapping in app/api/graph/route.ts can be corrected
// against reality.
try {
  process.loadEnvFile()
} catch {
  // no .env — cognee.ts will throw a clear CogneeConfigError below
}

import { getDatasetGraph, recall, remember, type SearchType } from '../lib/cognee'

const DATASET = 'deconstructed_validation'

const SAMPLE = `Product: Sampleware.
Sampleware has a feature called Dark Mode.
Issue #1 "App is blinding at night" was raised by alice on 2024-01-01.
Dark Mode was implemented by pull request #2, authored by bob.
Pull request #2 shipped in release v1.1.0 on 2024-02-01.`

async function main() {
  console.log('remember() →')
  console.dir(
    await remember({ text: SAMPLE, datasetName: DATASET, filename: 'sample.md' }),
    { depth: null },
  )

  const searchTypes: SearchType[] = ['GRAPH_COMPLETION', 'CHUNKS']
  for (const searchType of searchTypes) {
    console.log(`\nrecall(${searchType}) →`)
    console.dir(
      await recall({
        query: 'Why does Dark Mode exist?',
        datasets: [DATASET],
        searchType,
        topK: 10,
      }),
      { depth: null },
    )
  }

  // The graph view depends on this shape — confirm nodes/edges arrive.
  console.log('\ngetDatasetGraph() →')
  console.dir(await getDatasetGraph(DATASET), { depth: null })
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
