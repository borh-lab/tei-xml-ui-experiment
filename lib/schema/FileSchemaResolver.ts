import { SchemaResolver, SchemaInfo } from './SchemaResolver';

/**
 * Filesystem-based schema resolver with security constraints
 */
export class FileSchemaResolver implements SchemaResolver {
  private readonly schemas: Readonly<Record<string, SchemaInfo>>;
  private readonly allowedIds: ReadonlySet<string>;

  constructor(
    schemas: Record<string, SchemaInfo> = {},
    allowedIds: Set<string> = new Set()
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
