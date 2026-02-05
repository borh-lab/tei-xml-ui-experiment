import type { TEIDocument } from '@/lib/tei/types'

export function detectSchemaPath(document: TEIDocument): string {
  const profiles = document.state.teiHeader?.profileDesc?.langUsage || []

  // Check for specific profiles
  for (const lang of profiles) {
    if (lang.ident === 'tei-novel') {
      return '/public/schemas/tei-novel.rng'
    }
    if (lang.ident === 'tei-minimal') {
      return '/public/schemas/tei-minimal.rng'
    }
  }

  // Default to full TEI schema
  return '/public/schemas/tei-all.rng'
}
