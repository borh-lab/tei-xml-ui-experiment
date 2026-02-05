// @ts-nocheck
import { XMLParser } from 'fast-xml-parser';
import { readFileSync, readdirSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import type { TEIFileInfo, TagAnalysis, CorpusMetadata, SchemaValidationResult, SchemaError } from './types';
import { SchemaLoader } from '../lib/schema/SchemaLoader';

// Get the directory of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Use absolute paths from the scripts directory
const SCHEMA_PATHS = {
  teiAll: join(__dirname, '..', 'public', 'schemas', 'tei-all.rng'),
  teiNovel: join(__dirname, '..', 'public', 'schemas', 'tei-novel.rng'),
  teiMinimal: join(__dirname, '..', 'public', 'schemas', 'tei-minimal.rng'),
} as const;

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '',
  allowBooleanAttributes: true,
  parseTagValue: false,
  parseAttributeValue: false,
  trimValues: true,
});

export function findXMLFiles(dir: string): string[] {
  const files: string[] = [];
  const entries = readdirSync(dir, { withFileTypes: true });

  // Directories to exclude from corpus analysis
  const excludedDirs = new Set(['toolbox', '.git', 'node_modules']);

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);

    if (entry.isDirectory()) {
      // Skip excluded directories
      if (excludedDirs.has(entry.name)) {
        continue;
      }
      files.push(...findXMLFiles(fullPath));
    } else if (entry.name.endsWith('.xml')) {
      files.push(fullPath);
    }
  }
  return files;
}

export function validateTEIFile(filePath: string): TEIFileInfo {
  try {
    const content = readFileSync(filePath, 'utf-8');
    const stats = statSync(filePath);

    if (content.length < 500) {
      return {
        path: filePath,
        size: stats.size,
        isTEI: false,
        isValid: false,
        error: 'File too small (< 500 chars)',
      };
    }

    const hasTEIRoot = /<TEI[^>]*>|<TEI\.2[^>]*>/.test(content);
    if (!hasTEIRoot) {
      return {
        path: filePath,
        size: stats.size,
        isTEI: false,
        isValid: false,
        error: 'No TEI root element found',
      };
    }

    try {
      parser.parse(content);
      return { path: filePath, size: stats.size, isTEI: true, isValid: true };
    } catch (parseError: any) {
      // If external entity error, strip DOCTYPE and retry
      if (parseError?.message?.includes('External entities')) {
        try {
          // Remove DOCTYPE declaration and entity declarations
          const cleanedContent = content.replace(/<!DOCTYPE[^>]*\[[^\]]*\]>/gi, '');
          parser.parse(cleanedContent);
          return { path: filePath, size: stats.size, isTEI: true, isValid: true };
        } catch (retryError) {
          return {
            path: filePath,
            size: stats.size,
            isTEI: true,
            isValid: false,
            error: `Parse error (after DOCTYPE strip): ${retryError}`,
          };
        }
      }
      return {
        path: filePath,
        size: stats.size,
        isTEI: true,
        isValid: false,
        error: `Parse error: ${parseError}`,
      };
    }
  } catch (error) {
    return { path: filePath, size: 0, isTEI: false, isValid: false, error: `Read error: ${error}` };
  }
}

export function getTEIVersion(content: string): string {
  if (/<TEI\.2[^>]*>/.test(content)) return 'P4';
  if (/<TEI[^>]+version="[^"]*"/.test(content)) {
    const match = content.match(/version="([^"]*)"/);
    return match ? match[1] : 'P5';
  }
  return 'P5';
}

export function analyzeTags(content: string): TagAnalysis[] {
  const tagRegex = /<([a-zA-Z][a-zA-Z0-9:-]*)[^>]*>/g;
  const tags = new Map<string, TagAnalysis>();

  let match;
  while ((match = tagRegex.exec(content)) !== null) {
    const tagName = match[1];
    if (tagName.startsWith('/') || tagName === '?xml') continue;

    if (!tags.has(tagName)) {
      tags.set(tagName, { tagName, count: 0, attributes: {} });
    }

    const analysis = tags.get(tagName)!;
    analysis.count++;

    const attrRegex = /([a-zA-Z-]+)="[^"]*"/g;
    let attrMatch;
    while ((attrMatch = attrRegex.exec(match[0])) !== null) {
      const attrName = attrMatch[1];
      analysis.attributes[attrName] = (analysis.attributes[attrName] || 0) + 1;
    }
  }
  return Array.from(tags.values()).sort((a, b) => b.count - a.count);
}

export function determineEncodingType(tags: TagAnalysis[]): CorpusMetadata['encodingType'] {
  const tagNames = new Set(tags.map((t) => t.tagName));
  const hasSaid = tagNames.has('said');
  const hasQ = tagNames.has('q');
  const hasSp = tagNames.has('sp');
  const hasSpeaker = tagNames.has('speaker');

  if (hasSp && hasSpeaker) return 'dramatic-text';
  if (hasSaid || hasQ) return 'dialogue-focused';
  if (tagNames.size < 10) return 'minimal-markup';
  return 'mixed';
}

/**
 * Validate TEI content against RelaxNG schemas with progressive fallback
 *
 * Tries schemas in order: tei-all → tei-novel → tei-minimal
 * Stops at first successful validation
 *
 * @param content - TEI XML content
 * @param filePath - File path (for error reporting)
 * @param schemaLoader - SchemaLoader instance
 * @returns Validation result with pass/fail for each schema
 */
export async function validateWithSchemas(
  content: string,
  filePath: string,
  schemaLoader: SchemaLoader
): Promise<SchemaValidationResult> {
  const result: SchemaValidationResult = {
    teiAllPass: false,
    teiNovelPass: false,
    teiMinimalPass: false,
    errors: [] as SchemaError[],
  };

  // Try tei-all.rng first
  try {
    const teiAllResult = await schemaLoader.validate(content, SCHEMA_PATHS.teiAll);
    if (teiAllResult.valid) {
      result.teiAllPass = true;
      return result;
    }
    // Collect errors
    result.errors.push(...teiAllResult.errors.map((e) => ({
      schema: 'tei-all',
      line: e.line,
      column: e.column,
      message: e.message,
    })));
  } catch (error) {
    console.warn(`  tei-all validation failed for ${filePath}: ${error}`);
  }

  // Try tei-novel.rng as fallback
  try {
    const teiNovelResult = await schemaLoader.validate(content, SCHEMA_PATHS.teiNovel);
    if (teiNovelResult.valid) {
      result.teiNovelPass = true;
      return result;
    }
    result.errors.push(...teiNovelResult.errors.map((e) => ({
      schema: 'tei-novel',
      line: e.line,
      column: e.column,
      message: e.message,
    })));
  } catch (error) {
    console.warn(`  tei-novel validation failed for ${filePath}: ${error}`);
  }

  // Try tei-minimal.rng as final fallback
  try {
    const teiMinimalResult = await schemaLoader.validate(content, SCHEMA_PATHS.teiMinimal);
    if (teiMinimalResult.valid) {
      result.teiMinimalPass = true;
      return result;
    }
    result.errors.push(...teiMinimalResult.errors.map((e) => ({
      schema: 'tei-minimal',
      line: e.line,
      column: e.column,
      message: e.message,
    })));
  } catch (error) {
    console.warn(`  tei-minimal validation failed for ${filePath}: ${error}`);
  }

  return result;
}
