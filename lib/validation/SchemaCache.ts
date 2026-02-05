import { LRUCache } from 'lru-cache'
import { RelaxNGParser } from './RelaxNGParser'
import type { ParsedConstraints, SchemaCacheOptions } from './types'

type FileReader = (path: string, encoding: string) => string

/**
 * LRU cache for parsed RelaxNG schemas to avoid re-parsing on every validation.
 * Caches ParsedConstraints objects by schema file path.
 *
 * NOTE: When using in Node.js environment, you must pass a fileReader function
 * that uses fs.readFileSync. This class cannot import fs directly as it's
 * used in client-side code.
 */
export class SchemaCache {
  private cache: LRUCache<string, ParsedConstraints>
  private parser: RelaxNGParser
  private readFile: FileReader | null

  constructor(options: SchemaCacheOptions, fileReader?: FileReader) {
    this.cache = new LRUCache<string, ParsedConstraints>({
      max: options.maxSize,
      ttl: options.ttl,
    })
    this.parser = new RelaxNGParser()
    this.readFile = fileReader || null
  }

  /**
   * Get parsed constraints for a schema file.
   * Returns cached result if available, otherwise parses and caches.
   *
   * @param schemaPath - Absolute path to the RelaxNG schema file
   * @returns Parsed constraints object
   */
  get(schemaPath: string): ParsedConstraints {
    // Check cache first
    const cached = this.cache.get(schemaPath)
    if (cached) {
      return cached
    }

    if (!this.readFile) {
      throw new Error('SchemaCache: fileReader not provided. Cannot read schema file.')
    }

    // Read and parse schema file
    const schemaContent = this.readFile(schemaPath, 'utf-8')
    const parsed = this.parser.parse(schemaContent)

    // Cache the result
    this.cache.set(schemaPath, parsed)

    return parsed
  }

  /**
   * Get cache statistics for debugging.
   *
   * @returns Cache stats including size and other metrics
   */
  getStats(): { size: number } {
    return {
      size: this.cache.size,
    }
  }

  /**
   * Clear all cached schemas.
   * Useful for testing or forcing re-parsing.
   */
  clear(): void {
    this.cache.clear()
  }
}
