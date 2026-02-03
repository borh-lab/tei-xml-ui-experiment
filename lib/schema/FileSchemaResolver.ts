import { SchemaResolver, SchemaInfo } from './SchemaResolver';

/**
 * Explicit constraint: Only these schema IDs are allowed
 */
const ALLOWED_SCHEMA_IDS = new Set([
  'tei-minimal',
  'tei-all',
  'tei-novel'
]) as ReadonlySet<string>;

/**
 * Schema registry: Metadata for known schemas
 */
const SCHEMA_REGISTRY: Readonly<Record<string, SchemaInfo>> = {
  'tei-minimal': {
    id: 'tei-minimal',
    name: 'TEI Minimal (Dialogue)',
    description: 'Core TEI elements for dialogue annotation: sp, speaker, stage',
    path: '/schemas/tei-minimal.rng',
    tags: ['dialogue', 'lightweight', 'fast']
  },
  'tei-all': {
    id: 'tei-all',
    name: 'TEI P5 Complete',
    description: 'Full TEI P5 schema with all standard elements',
    path: '/schemas/tei-all.rng',
    tags: ['complete', 'comprehensive', 'slow']
  },
  'tei-novel': {
    id: 'tei-novel',
    name: 'TEI for Novels',
    description: 'TEI schema optimized for prose fiction',
    path: '/schemas/tei-novel.rng',
    tags: ['novel', 'prose', 'fiction']
  }
} as const;

/**
 * Default resolver instance with standard schemas
 */
export function createDefaultResolver(): FileSchemaResolver {
  return new FileSchemaResolver(SCHEMA_REGISTRY, ALLOWED_SCHEMA_IDS);
}

/**
 * Filesystem-based schema resolver with security constraints
 */
export class FileSchemaResolver implements SchemaResolver {
  private readonly schemas: Readonly<Record<string, SchemaInfo>>;
  private readonly allowedIds: ReadonlySet<string>;

  constructor(
    schemas: Record<string, SchemaInfo> = SCHEMA_REGISTRY,
    allowedIds: Set<string> = ALLOWED_SCHEMA_IDS
  ) {
    this.schemas = Object.freeze({...schemas});
    this.allowedIds = Object.freeze(new Set(allowedIds)) as ReadonlySet<string>;
  }

  resolve(schemaId: string): string | null {
    if (!this.allowedIds.has(schemaId)) {
      return null;
    }
    const schema = this.schemas[schemaId];
    return schema?.path ?? null;
  }

  list(): ReadonlyArray<SchemaInfo> {
    return Object.values(this.schemas);
  }

  has(schemaId: string): boolean {
    return this.allowedIds.has(schemaId) && schemaId in this.schemas;
  }

  getSchemaInfo(schemaId: string): SchemaInfo | null {
    if (!this.has(schemaId)) {
      return null;
    }
    return this.schemas[schemaId] ?? null;
  }
}
