import { CogneeConfigError, recall } from '@/lib/cognee'
import { getProduct, PRODUCTS } from '@/lib/products'
import { extractAnswer } from '@/lib/recall-parse'

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  const question = typeof body?.question === 'string' ? body.question.trim() : ''
  const productId = typeof body?.productId === 'string' ? body.productId : ''
  if (!question) {
    return Response.json({ error: 'question is required' }, { status: 400 })
  }

  // 'all' = cross-product question spanning both datasets
  const datasets =
    productId === 'all'
      ? PRODUCTS.map((p) => p.datasetName)
      : getProduct(productId)
        ? [getProduct(productId)!.datasetName]
        : null
  if (!datasets) {
    return Response.json({ error: `unknown product "${productId}"` }, { status: 400 })
  }

  try {
    const raw = await recall({
      query: question,
      datasets,
      searchType: 'GRAPH_COMPLETION',
      topK: 10,
    })
    const answer = extractAnswer(raw)
    if (!answer) {
      return Response.json(
        { error: 'Memory returned an empty answer. Has this product been ingested?' },
        { status: 502 },
      )
    }
    return Response.json({ answer })
  } catch (err) {
    if (err instanceof CogneeConfigError) {
      return Response.json({ error: err.message, unconfigured: true }, { status: 503 })
    }
    return Response.json({ error: (err as Error).message }, { status: 502 })
  }
}
