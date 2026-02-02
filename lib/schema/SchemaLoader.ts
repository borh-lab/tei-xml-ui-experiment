/**
 * SchemaLoader - Load and parse TEI RelaxNG schemas
 *
 * Uses salve-annos library for RelaxNG validation and parsing
 */

import * as salve from 'salve-annos';
import * as fs from 'fs/promises';
import * as path from 'path';
import { SaxesParser } from 'saxes';

export interface ParsedSchema {
  pattern: salve.Grammar;
  warnings: string[];
  simplified?: any;
}

/**
 * Custom resource loader for loading schemas from the file system
 */
class FileSystemResourceLoader implements salve.ResourceLoader {
  async load(url: URL): Promise<salve.Resource> {
    // Convert file:// URL to file path
    let filePath: string;
    if (url.protocol === 'file:') {
      filePath = decodeURIComponent(url.pathname);
      // On Windows, file URLs start with file:///C:/...
      // On Unix, they start with file:///path
      if (process.platform === 'win32' && filePath.startsWith('/')) {
        filePath = filePath.substring(1);
      }
    } else {
      throw new Error(`Unsupported protocol: ${url.protocol}`);
    }

    return {
      url,
      getText: async () => {
        try {
          return await fs.readFile(filePath, 'utf-8');
        } catch (error) {
          throw new Error(`Failed to read file ${filePath}: ${error instanceof Error ? error.message : String(error)}`);
        }
      },
    };
  }
}

export interface TagDefinition {
  name: string;
  namespace?: string;
  required: boolean;
  repeatable: boolean;
}

export interface AttributeDefinition {
  name: string;
  namespace?: string;
  required: boolean;
  type?: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

export interface ValidationError {
  message: string;
  line?: number;
  column?: number;
  context?: string;
}

export type XmlPath = Array<{ name: string; namespace?: string }>;

/**
 * SchemaLoader class for loading and parsing TEI RelaxNG schemas
 */
export class SchemaLoader {
  private schemaCache: Map<string, ParsedSchema>;
  private resourceLoader: salve.ResourceLoader;

  constructor() {
    this.schemaCache = new Map();
    // Use custom file system resource loader
    this.resourceLoader = new FileSystemResourceLoader();
  }

  /**
   * Load a RelaxNG schema from file path
   * @param schemaPath - Path to the .rng schema file
   * @returns Parsed schema with pattern and warnings
   */
  async loadSchema(schemaPath: string): Promise<ParsedSchema> {
    // Check cache first
    if (this.schemaCache.has(schemaPath)) {
      return this.schemaCache.get(schemaPath)!;
    }

    try {
      // Convert file path to file:// URL
      const schemaUrl = new URL(this.filePathToUrl(schemaPath));

      // Load and convert the schema
      const result = await salve.convertRNGToPattern(schemaUrl, {
        resourceLoader: this.resourceLoader,
        createManifest: false,
        idCheck: false,
        manifestHashAlgorithm: 'none',
      });

      const parsedSchema: ParsedSchema = {
        pattern: result.pattern,
        warnings: result.warnings || [],
        simplified: result.simplified,
      };

      // Cache the parsed schema
      this.schemaCache.set(schemaPath, parsedSchema);

      return parsedSchema;
    } catch (error) {
      throw new Error(
        `Failed to load schema from ${schemaPath}: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Validate XML document against loaded schema
   * @param xmlContent - XML content to validate
   * @param schemaPath - Path to the schema file
   * @returns Validation result with errors if any
   */
  async validate(xmlContent: string, schemaPath: string): Promise<ValidationResult> {
    const errors: ValidationError[] = [];

    // Handle empty input
    if (!xmlContent || xmlContent.trim().length === 0) {
      return {
        valid: false,
        errors: [{ message: 'Empty XML document' }],
      };
    }

    try {
      // Load schema if not already loaded
      const parsedSchema = await this.loadSchema(schemaPath);

      if (!parsedSchema.pattern) {
        return {
          valid: false,
          errors: [{ message: 'Failed to load schema pattern' }],
        };
      }

      // Create a name resolver and walker for validation
      const nameResolver = new salve.DefaultNameResolver();
      const walker = parsedSchema.pattern.newWalker(nameResolver);

      // Parse the XML and validate against schema
      const parser = new SaxesParser({
        xmlns: true,
        position: true,
        fileName: 'document.xml',
      });

      // Track parsing errors
      parser.on('error', (err) => {
        errors.push({
          message: `Parsing error: ${err.message}`,
          line: parser.line,
          column: parser.column,
        });
      });

      // Fire events to salve walker
      parser.on('opentag', (tag) => {
        try {
          // Enter new namespace context
          nameResolver.enterContext();

          // Define namespace mappings from this tag's attributes
          if (tag.attributes) {
            for (const [attrName, attrValue] of Object.entries(tag.attributes)) {
              const { name, prefix } = this.parseAttributeName(attrName);

              // Handle xmlns attributes
              if (prefix === 'xmlns') {
                // xmlns:prefix="uri" binding
                nameResolver.definePrefix(name, String(attrValue));
              } else if (attrName === 'xmlns') {
                // Default namespace xmlns="uri"
                nameResolver.definePrefix('', String(attrValue));
              }
            }
          }

          // Get the namespace URI for this element
          let elementUri = tag.uri || '';

          // Prepare attribute data array for compact event
          const attribs: string[] = [];
          if (tag.attributes) {
            for (const [attrName, attrValue] of Object.entries(tag.attributes)) {
              const { name, prefix } = this.parseAttributeName(attrName);

              // Get namespace for attribute
              let attrNs = '';
              if (prefix === 'xmlns') {
                attrNs = 'http://www.w3.org/2000/xmlns/';
              }

              // Skip xmlns attributes from validation
              if (prefix !== 'xmlns' && attrName !== 'xmlns') {
                attribs.push(attrNs, name, String(attrValue));
              }
            }
          }

          // Fire compact startTagAndAttributes event
          const eventParams = [elementUri, tag.name, ...attribs];
          const result = walker.fireEvent('startTagAndAttributes', eventParams);
          if (result) {
            errors.push({
              message: `Element error at <${tag.name}>: ${this.formatFireEventResult(result)}`,
              line: parser.line,
              column: parser.column,
            });
          }
        } catch (err) {
          if (err instanceof Error) {
            errors.push({
              message: `Error in <${tag.name}>: ${err.message}`,
              line: parser.line,
              column: parser.column,
            });
          }
        }
      });

      parser.on('text', (text) => {
        try {
          if (text.trim().length > 0) {
            const result = walker.fireEvent('text', [text]);
            if (result) {
              errors.push({
                message: `Text validation error: ${this.formatFireEventResult(result)}`,
                line: parser.line,
                column: parser.column,
              });
            }
          }
        } catch (err) {
          if (err instanceof Error) {
            errors.push({
              message: `Text error: ${err.message}`,
              line: parser.line,
              column: parser.column,
            });
          }
        }
      });

      parser.on('closetag', (tag) => {
        try {
          const { name, uri } = tag;
          const result = walker.fireEvent('endTag', [uri || '', name]);
          if (result) {
            errors.push({
              message: `Error closing </${tag.name}>: ${this.formatFireEventResult(result)}`,
              line: parser.line,
              column: parser.column,
            });
          }
          nameResolver.leaveContext();
        } catch (err) {
          if (err instanceof Error) {
            errors.push({
              message: `Error closing </${tag.name}>: ${err.message}`,
              line: parser.line,
              column: parser.column,
            });
          }
        }
      });

      // Parse the XML
      parser.write(xmlContent);
      parser.close();

      // Finalize validation - returns array of errors
      const endErrors = walker.end();

      // Add any finalization errors
      if (endErrors && endErrors.length > 0) {
        endErrors.forEach((err: any) => {
          errors.push({
            message: err.message || 'Unknown validation error',
            line: err.line,
            column: err.column,
          });
        });
      }

      return {
        valid: errors.length === 0,
        errors,
      };
    } catch (error) {
      // Handle unexpected errors
      return {
        valid: false,
        errors: [
          {
            message: `Validation error: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
      };
    }
  }

  /**
   * Get allowed tags for a given context
   * @param schemaPath - Path to the schema file
   * @param context - XML path representing current context
   * @returns Array of allowed tag definitions
   */
  getAllowedTags(schemaPath: string, context: XmlPath): TagDefinition[] {
    const parsedSchema = this.schemaCache.get(schemaPath);
    if (!parsedSchema) {
      throw new Error(`Schema not loaded: ${schemaPath}`);
    }

    try {
      const nameResolver = new salve.DefaultNameResolver();
      const walker = parsedSchema.pattern.newWalker(nameResolver);
      const tags: TagDefinition[] = [];

      // Walk through context to get to current position
      this.walkToContext(walker, nameResolver, context);

      // Get possible events
      const possible = walker.possible();

      // Extract element tags from possible events
      for (const event of possible) {
        if ((event as any)[0] === 'enterStartTag') {
          const namePattern = (event as any)[1]?.[0];
          if (namePattern && typeof namePattern === 'object') {
            const tagInfo = this.extractTagInfo(namePattern);
            if (tagInfo) {
              tags.push(tagInfo);
            }
          }
        }
      }

      return tags;
    } catch (error) {
      console.error('Error getting allowed tags:', error);
      return [];
    }
  }

  /**
   * Get attributes for a specific tag
   * @param schemaPath - Path to the schema file
   * @param tagName - Name of the tag
   * @returns Array of attribute definitions
   */
  getTagAttributes(schemaPath: string, tagName: string): AttributeDefinition[] {
    const parsedSchema = this.schemaCache.get(schemaPath);
    if (!parsedSchema) {
      throw new Error(`Schema not loaded: ${schemaPath}`);
    }

    try {
      const nameResolver = new salve.DefaultNameResolver();
      const walker = parsedSchema.pattern.newWalker(nameResolver);
      const attributes: AttributeDefinition[] = [];

      // Enter the tag context
      walker.fireEvent('enterStartTag', ['', tagName]);
      walker.fireEvent('leaveStartTag', []);

      // Get possible events (should include attributes)
      const possible = walker.possible();

      // Extract attribute definitions
      for (const event of possible) {
        if ((event as any)[0] === 'attributeName') {
          const namePattern = (event as any)[1]?.[0];
          if (namePattern && typeof namePattern === 'object') {
            const attrInfo = this.extractAttributeInfo(namePattern);
            if (attrInfo) {
              attributes.push(attrInfo);
            }
          }
        }
      }

      return attributes;
    } catch (error) {
      console.error('Error getting tag attributes:', error);
      return [];
    }
  }

  /**
   * Clear the schema cache
   */
  clearCache(): void {
    this.schemaCache.clear();
  }

  /**
   * Check if a schema is loaded
   * @param schemaPath - Path to check
   * @returns True if schema is in cache
   */
  hasSchema(schemaPath: string): boolean {
    return this.schemaCache.has(schemaPath);
  }

  /**
   * Get the number of cached schemas
   * @returns Number of schemas in cache
   */
  getCacheSize(): number {
    return this.schemaCache.size;
  }

  // Private helper methods

  private filePathToUrl(filePath: string): string {
    const absolutePath = path.resolve(filePath);
    return `file://${absolutePath}`;
  }

  private parseAttributeName(attrName: string): { name: string; prefix: string } {
    const parts = attrName.split(':');
    if (parts.length === 2) {
      return { name: parts[1], prefix: parts[0] };
    }
    return { name: attrName, prefix: '' };
  }

  private formatErrorMessage(error: any): string {
    if (typeof error === 'string') {
      return error;
    }
    if (error && error.message) {
      return error.message;
    }
    return 'Unknown validation error';
  }

  private formatFireEventResult(result: salve.FireEventResult): string {
    if (typeof result === 'string') {
      return result;
    }
    if (Array.isArray(result)) {
      return result.map(r => typeof r === 'string' ? r : JSON.stringify(r)).join('; ');
    }
    return String(result);
  }

  private extractTagInfo(namePattern: any): TagDefinition | null {
    try {
      // Handle different name pattern types
      if (namePattern.pattern === 'AnyName') {
        return {
          name: '*',
          required: false,
          repeatable: false,
        };
      }

      if (namePattern.ns !== undefined && namePattern.name !== undefined) {
        return {
          name: namePattern.name,
          namespace: namePattern.ns,
          required: false,
          repeatable: false,
        };
      }

      // Handle NameChoice patterns
      if (namePattern.a && namePattern.b) {
        const tagA = this.extractTagInfo(namePattern.a);
        const tagB = this.extractTagInfo(namePattern.b);
        if (tagA) return tagA;
        if (tagB) return tagB;
      }

      return null;
    } catch {
      return null;
    }
  }

  private extractAttributeInfo(namePattern: any): AttributeDefinition | null {
    try {
      if (namePattern.ns !== undefined && namePattern.name !== undefined) {
        return {
          name: namePattern.name,
          namespace: namePattern.ns,
          required: false, // TODO: Determine if required
        };
      }

      if (namePattern.pattern === 'AnyName') {
        return {
          name: '*',
          required: false,
        };
      }

      return null;
    } catch {
      return null;
    }
  }

  private walkToContext(walker: salve.GrammarWalker<any>, nameResolver: salve.DefaultNameResolver, context: XmlPath): void {
    for (const ctx of context) {
      nameResolver.enterContext();
      if (ctx.namespace) {
        nameResolver.definePrefix('', ctx.namespace);
      }
      walker.fireEvent('startTagAndAttributes', [ctx.namespace || '', ctx.name]);
    }
  }
}
