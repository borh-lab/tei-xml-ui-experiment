import type { TEIDocument } from '@/lib/tei/types'

export function detectSchemaPath(_document: TEIDocument): string {
  // teiHeader property doesn't exist in DocumentState yet, default to tei-novel
  // const profiles = document.state.teiHeader?.profileDesc?.langUsage || []

  // For now, default to tei-novel schema
  // TODO: Implement proper schema detection when teiHeader is added to DocumentState
  return '/public/schemas/tei-novel.rng'

  // Check for specific profiles
  // for (const lang of profiles) {
  //   if (lang.ident === 'tei-novel') {
  //     return '/public/schemas/tei-novel.rng'
  //   }
  //   if (lang.ident === 'tei-minimal') {
  //     return '/public/schemas/tei-minimal.rng'
  //   }
  // }

  // // Default to full TEI schema
  // return '/public/schemas/tei-all.rng'
}
