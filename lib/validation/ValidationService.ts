/**
 * ValidationService - High-level validation service for TEI documents
 *
 * Provides a convenient API for validating XML documents against RelaxNG schemas
 * with detailed error reporting and fix suggestions.
 */

/**
 * Dynamic import for SchemaLoader (server-only)
 * Returns null in browser environment
 */
function getSchemaLoaderClass(): typeof import('../schema/SchemaLoader').SchemaLoader | null {
  if (typeof window !== 'undefined') {
    return null; // Browser environment
  }

  try {
    const { SchemaLoader } = require('../schema/SchemaLoader');
    return SchemaLoader;
  } catch {
    return null;
  }
}

/**
 * Validation error with location and context information
 */
export interface ValidationError {
  message: string;
  line?: number;
  column?: number;
  context?: string;
  severity?: 'error' | 'warning';
}

/**
 * Validation warning for non-critical issues
 */
export interface ValidationWarning {
  message: string;
  line?: number;
  column?: number;
  code?: string;
}

/**
 * Fix suggestion for validation errors
 */
export interface FixSuggestion {
  type: 'add-element' | 'remove-element' | 'modify-attribute' | 'rename-element' | 'other';
  message: string;
  line?: number;
  column?: number;
  suggestion?: string;
}

/**
 * Complete validation result
 */
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  suggestions?: FixSuggestion[];
}

/**
 * Configuration options for ValidationService
 */
export interface ValidationServiceOptions {
  defaultSchemaPath?: string;
  enableSuggestions?: boolean;
  maxErrors?: number;
}

/**
 * ValidationService provides high-level XML validation with detailed error reporting
 */
export class ValidationService {
  private schemaLoader: InstanceType<ReturnType<typeof getSchemaLoaderClass>> | null;
  private options: ValidationServiceOptions;

  constructor(options: ValidationServiceOptions = {}) {
    const SchemaLoaderClass = getSchemaLoaderClass();
    this.schemaLoader = SchemaLoaderClass ? new SchemaLoaderClass() : null;
    this.options = {
      enableSuggestions: true,
      maxErrors: 100,
      ...options,
    };
  }

  /**
   * Validate an XML document against a schema
   * @param xmlContent - XML content to validate
   * @param schemaPath - Optional path to schema file (uses default if not provided)
   * @returns Validation result with errors, warnings, and suggestions
   */
  async validateDocument(xmlContent: string, schemaPath?: string): Promise<ValidationResult> {
    const effectiveSchemaPath = schemaPath || this.options.defaultSchemaPath;

    if (!effectiveSchemaPath) {
      return {
        valid: false,
        errors: [
          {
            message: 'No schema path provided and no default schema configured',
            severity: 'error',
          },
        ],
        warnings: [],
      };
    }

    if (!this.schemaLoader) {
      return {
        valid: false,
        errors: [
          {
            message: 'SchemaLoader is not available in this environment',
            severity: 'error',
          },
        ],
        warnings: [],
      };
    }

    try {
      // Use SchemaLoader to validate
      const schemaResult = await this.schemaLoader.validate(xmlContent, effectiveSchemaPath);

      // Convert SchemaLoader errors to ValidationError format
      const errors: ValidationError[] = schemaResult.errors.map((err) => ({
        message: err.message || 'Unknown validation error',
        line: err.line,
        column: err.column,
        context: err.context || this.extractContext(xmlContent, err.line, err.column),
        severity: 'error' as const,
      }));

      // Apply max errors limit
      const limitedErrors = this.options.maxErrors
        ? errors.slice(0, this.options.maxErrors)
        : errors;

      // Generate fix suggestions if enabled
      const suggestions = this.options.enableSuggestions
        ? this.generateSuggestions(limitedErrors)
        : [];

      return {
        valid: schemaResult.valid,
        errors: limitedErrors,
        warnings: [], // SchemaLoader doesn't currently provide warnings
        suggestions,
      };
    } catch (error) {
      return {
        valid: false,
        errors: [
          {
            message: `Validation failed: ${error instanceof Error ? error.message : String(error)}`,
            severity: 'error',
          },
        ],
        warnings: [],
      };
    }
  }

  /**
   * Set a default schema path for validations
   * @param schemaPath - Path to the default schema file
   */
  setDefaultSchema(schemaPath: string): void {
    this.options.defaultSchemaPath = schemaPath;
  }

  /**
   * Get the current default schema path
   * @returns Default schema path or undefined
   */
  getDefaultSchema(): string | undefined {
    return this.options.defaultSchemaPath;
  }

  /**
   * Clear the schema cache
   */
  clearCache(): void {
    if (!this.schemaLoader) {
      throw new Error('SchemaLoader is not available in this environment');
    }
    this.schemaLoader.clearCache();
  }

  /**
   * Check if a schema is loaded
   * @param schemaPath - Path to check
   * @returns True if schema is in cache
   */
  hasSchema(schemaPath: string): boolean {
    if (!this.schemaLoader) {
      return false;
    }
    return this.schemaLoader.hasSchema(schemaPath);
  }

  /**
   * Preload a schema for faster subsequent validations
   * @param schemaPath - Path to the schema file
   */
  async preloadSchema(schemaPath: string): Promise<void> {
    if (!this.schemaLoader) {
      throw new Error('SchemaLoader is not available in this environment');
    }
    await this.schemaLoader.loadSchema(schemaPath);
  }

  /**
   * Generate fix suggestions based on validation errors
   * @param errors - Validation errors
   * @param xmlContent - Original XML content
   * @param schemaPath - Path to schema file
   * @returns Array of fix suggestions
   */
  private generateSuggestions(errors: ValidationError[]): FixSuggestion[] {
    const suggestions: FixSuggestion[] = [];

    for (const error of errors) {
      const suggestion = this.createSuggestionForError(error);
      if (suggestion) {
        suggestions.push(suggestion);
      }
    }

    return suggestions;
  }

  /**
   * Extract context snippet from XML content for a given error location
   * @param xmlContent - Original XML content
   * @param line - Line number (1-based)
   * @param column - Column number (1-based)
   * @returns Context snippet string
   */
  private extractContext(xmlContent: string, line?: number, column?: number): string {
    if (!line || !xmlContent) {
      return '';
    }

    try {
      const lines = xmlContent.split('\n');
      const targetLine = lines[line - 1];

      if (!targetLine) {
        return '';
      }

      // Get a window of lines around the error for context
      const contextWindow = 2;
      const startLine = Math.max(0, line - 1 - contextWindow);
      const endLine = Math.min(lines.length, line + contextWindow);

      const contextLines = lines.slice(startLine, endLine);

      // Add a marker pointing to the error location
      if (column && column <= targetLine.length) {
        const marker = ' '.repeat(column - 1) + '^';
        contextLines.splice(line - startLine, 0, marker);
      }

      return contextLines.join('\n');
    } catch {
      return '';
    }
  }

  /**
   * Create a fix suggestion for a specific error
   * @param error - Validation error
   * @param xmlContent - Original XML content
   * @param schemaPath - Path to schema file
   * @returns Fix suggestion or null
   */
  private createSuggestionForError(error: ValidationError): FixSuggestion | null {
    const message = error.message.toLowerCase();

    // Unknown element error
    if (
      message.includes('unknown') ||
      message.includes('unexpected') ||
      message.includes('element error')
    ) {
      return {
        type: 'rename-element',
        message: 'Check if this element name is correct or remove it',
        line: error.line,
        column: error.column,
        suggestion: 'Verify the element name matches the schema',
      };
    }

    // Missing required elements
    if (
      message.includes('required') ||
      message.includes('missing') ||
      message.includes('incomplete')
    ) {
      return {
        type: 'add-element',
        message: 'Add the required missing elements',
        line: error.line,
        column: error.column,
        suggestion: 'Review the schema to see which elements are required',
      };
    }

    // Text validation errors
    if (message.includes('text') && message.includes('error')) {
      return {
        type: 'other',
        message: 'Check text content at this location',
        line: error.line,
        column: error.column,
        suggestion: 'Verify that text content is allowed at this position',
      };
    }

    // Tag closing errors
    if (message.includes('closing') || message.includes('end tag')) {
      return {
        type: 'add-element',
        message: 'Check for missing or mismatched closing tags',
        line: error.line,
        column: error.column,
        suggestion: 'Ensure all opening tags have corresponding closing tags',
      };
    }

    // Generic suggestion for other errors
    return {
      type: 'other',
      message: 'Review this location for validation issues',
      line: error.line,
      column: error.column,
      suggestion: error.message,
    };
  }
}
