import type { TEIDocument } from '@/lib/tei/types'

export type EntityType = 'character' | 'place' | 'organization'

export interface EntityMapping {
  tagName?: string
  attrName: string
  entityType: EntityType
}

const ENTITY_MAPPINGS: EntityMapping[] = [
  { attrName: 'who', entityType: 'character' },
  { tagName: 'persName', attrName: 'ref', entityType: 'character' },
  { tagName: 'speaker', attrName: 'ref', entityType: 'character' },
  { tagName: 'placeName', attrName: 'ref', entityType: 'place' },
  { tagName: 'orgName', attrName: 'ref', entityType: 'organization' },
]

export function detectEntityTypeFromAttribute(
  tagName: string,
  attrName: string
): EntityType {
  const mapping = ENTITY_MAPPINGS.find(
    (m) => m.attrName === attrName && (!m.tagName || m.tagName === tagName)
  )

  return mapping?.entityType || 'character'
}

export function getEntities(document: TEIDocument, entityType: EntityType) {
  switch (entityType) {
    case 'character':
      return document.state.characters || []
    case 'place':
      return document.state.places || []
    case 'organization':
      return document.state.organizations || []
    default:
      return []
  }
}
