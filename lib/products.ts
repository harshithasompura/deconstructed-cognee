import type { ProductDataset } from '@/types/graph'

// The only per-product data in the codebase. Same engine everywhere else.
export interface Product extends ProductDataset {
  tagline: string
  questions: string[] // hero queries — static strings, no CMS
}

export const PRODUCTS: Product[] = [
  {
    id: 'vercel-ai-sdk',
    name: 'Vercel AI SDK',
    repo: 'vercel/ai',
    // _v2 = typed graph_model ingest; v1 dataset kept as rollback
    datasetName: 'deconstructed_vercel_ai_sdk_v2',
    tagline: 'TypeScript toolkit for building AI apps',
    questions: [
      'Why does streamText exist, and what problem did it replace?',
      'Which issues shaped the tool-calling API?',
      'How did provider abstraction evolve across releases?',
    ],
  },
  {
    id: 'cal-com',
    name: 'Cal.com',
    repo: 'calcom/cal.com',
    datasetName: 'deconstructed_cal_com',
    tagline: 'Open scheduling infrastructure',
    questions: [
      'Why were routing forms introduced?',
      'Which discussions led to the current booking-flow design?',
      'How did team scheduling change over the last releases?',
    ],
  },
  {
    id: 'plane',
    name: 'Plane',
    repo: 'makeplane/plane',
    datasetName: 'deconstructed_plane_v2',
    tagline: 'Open-source project management',
    questions: [
      'Why were cycles introduced, and what problem did they solve?',
      'Which issues shaped the current kanban board?',
      'How did self-hosting support evolve across releases?',
    ],
  },
]

export const CROSS_PRODUCT_QUESTION =
  'How do these products approach breaking changes differently?'

export function getProduct(id: string): Product | undefined {
  return PRODUCTS.find((p) => p.id === id)
}
