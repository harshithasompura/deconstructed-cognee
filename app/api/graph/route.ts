import { CogneeConfigError, getDatasetGraph } from '@/lib/cognee'
import { getProduct } from '@/lib/products'
import { layoutGraph, parseGraph } from '@/lib/recall-parse'

export async function GET(request: Request) {
  const productId = new URL(request.url).searchParams.get('product') ?? ''
  const product = getProduct(productId)
  if (!product) {
    return Response.json({ error: `unknown product "${productId}"` }, { status: 400 })
  }

  try {
    const raw = await getDatasetGraph(product.datasetName)
    // null = dataset not created yet; empty graph = designed "run ingest" state
    return Response.json(layoutGraph(parseGraph(raw)))
  } catch (err) {
    if (err instanceof CogneeConfigError) {
      return Response.json({ error: err.message, unconfigured: true }, { status: 503 })
    }
    return Response.json({ error: (err as Error).message }, { status: 502 })
  }
}
