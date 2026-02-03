/**
 * Schema metadata returned to clients
 */
export interface SchemaInfo {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly path: string;
  readonly tags: ReadonlyArray<string>;
}

/**
 * Protocol for resolving schema IDs to file paths
 * Enables different implementations (filesystem, database, remote)
 */
export interface SchemaResolver {
  /**
   * Resolve a schema ID to its file path
   * @param schemaId - Schema identifier (e.g., 'tei-minimal')
   * @returns Absolute file path, or null if not found
   */
  resolve(schemaId: string): string | null;

  /**
   * List all available schemas
   * @returns Readonly array of schema metadata
   */
  list(): ReadonlyArray<SchemaInfo>;

  /**
   * Check if a schema ID exists
   * @param schemaId - Schema identifier
   * @returns true if schema is available
   */
  has(schemaId: string): boolean;
}
