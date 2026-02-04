import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';
import { TEICorpus, TEIFile, ValidationError, ValidationWarning, TagFrequency, AnalysisResult } from './types';

const readFile = promisify(fs.readFile);
const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);

export async function findTEIFiles(directory: string): Promise<string[]> {
  const teiFiles: string[] = [];

  try {
    const entries = await readdir(directory, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(directory, entry.name);

      if (entry.isDirectory()) {
        const subFiles = await findTEIFiles(fullPath);
        teiFiles.push(...subFiles);
      } else if (entry.isFile() && (entry.name.endsWith('.xml') || entry.name.endsWith('.tei'))) {
        teiFiles.push(fullPath);
      }
    }
  } catch (error) {
    console.warn(`Warning: Could not read directory ${directory}:`, error);
  }

  return teiFiles;
}

export async function detectEncoding(filePath: string): Promise<string> {
  try {
    const buffer = await readFile(filePath, { encoding: null });

    // Check for BOM (Byte Order Mark)
    if (buffer.length >= 3 && buffer[0] === 0xEF && buffer[1] === 0xBB && buffer[2] === 0xBF) {
      return 'UTF-8 with BOM';
    }
    if (buffer.length >= 2 && buffer[0] === 0xFE && buffer[1] === 0xFF) {
      return 'UTF-16 BE';
    }
    if (buffer.length >= 2 && buffer[0] === 0xFF && buffer[1] === 0xFE) {
      return 'UTF-16 LE';
    }
    if (buffer.length >= 4 && buffer[0] === 0x00 && buffer[1] === 0x00 &&
        buffer[2] === 0xFE && buffer[3] === 0xFF) {
      return 'UTF-32 BE';
    }
    if (buffer.length >= 4 && buffer[0] === 0xFF && buffer[1] === 0xFE &&
        buffer[2] === 0x00 && buffer[3] === 0x00) {
      return 'UTF-32 LE';
    }

    // Try to detect from content
    const content = buffer.toString('utf-8', 0, Math.min(buffer.length, 1000));

    // Check for XML declaration
    const xmlDeclMatch = content.match(/<\?xml[^>]*encoding\s*=\s*["']([^"']+)["']/);
    if (xmlDeclMatch) {
      return xmlDeclMatch[1];
    }

    // Default to UTF-8
    return 'UTF-8';
  } catch (error) {
    console.warn(`Warning: Could not detect encoding for ${filePath}:`, error);
    return 'unknown';
  }
}

export async function extractTEIVersion(content: string): Promise<string | undefined> {
  try {
    // Look for TEI version in XML declaration
    const xmlDeclMatch = content.match(/<\?xml[^>]*standalone\s*=\s*["']([^"']+)["']/);
    if (xmlDeclMatch) {
      return xmlDeclMatch[1];
    }

    // Look for TEI version in root element
    const rootMatch = content.match(/<tei[^>]*xmlns:tei[^>]*>/);
    if (rootMatch) {
      const xmlnsMatch = content.match(/xmlns:tei\s*=\s*["']([^"']+)["']/);
      if (xmlnsMatch) {
        const versionMatch = xmlnsMatch[1].match(/\/tei[0-9]+$/);
        if (versionMatch) {
          return versionMatch[0].substring(4); // Remove "tei" prefix
        }
      }
    }

    // Look for TEI version in specific header
    const headerMatch = content.match(/<teiHeader[^>]*>/);
    if (headerMatch) {
      const headerEnd = content.indexOf('</teiHeader>', headerMatch.index!);
      if (headerEnd > -1) {
        const headerContent = content.substring(headerMatch.index!, headerEnd + 12);
        const versionMatch = headerContent.match(/<version[^>]*number\s*=\s*["']([^"']+)["']/);
        if (versionMatch) {
          return versionMatch[1];
        }
      }
    }

    return undefined;
  } catch (error) {
    console.warn('Warning: Could not extract TEI version:', error);
    return undefined;
  }
}

export function extractTags(content: string): Tag[] {
  const tags: Record<string, Tag> = {};

  // Find all opening tags (excluding comments, CDATA, etc.)
  const tagRegex = /<([a-zA-Z][a-zA-Z0-9]*)(?:\s[^>]*)?>/g;
  let match;

  while ((match = tagRegex.exec(content)) !== null) {
    const tagName = match[1];

    if (!tags[tagName]) {
      tags[tagName] = {
        name: tagName,
        count: 0,
        attributes: {}
      };
    }

    tags[tagName].count++;

    // Extract attributes
    const attributesRegex = /\s+([a-zA-Z][a-zA-Z0-9]*)\s*=\s*["'][^"']*["']/g;
    let attrMatch;

    while ((attrMatch = attributesRegex.exec(match[0])) !== null) {
      const attrName = attrMatch[1];

      if (!tags[tagName].attributes[attrName]) {
        tags[tagName].attributes[attrName] = 0;
      }

      tags[tagName].attributes[attrName]++;
    }
  }

  return Object.values(tags);
}

export function validateTEI(content: string): { errors: ValidationError[], warnings: ValidationWarning[] } {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  // Basic XML structure validation
  if (!content.includes('<')) {
    errors.push({
      line: 1,
      column: 1,
      message: 'File does not appear to contain XML content',
      severity: 'error'
    });
  }

  // Check for proper root element
  const rootMatch = content.match(/^<([a-zA-Z][a-zA-Z0-9]*)/);
  if (!rootMatch) {
    errors.push({
      line: 1,
      column: 1,
      message: 'No valid XML root element found',
      severity: 'error'
    });
  } else {
    const rootElement = rootMatch[1];

    // Check if root element is closed
    const closingTag = `</${rootElement}>`;
    if (!content.includes(closingTag)) {
      errors.push({
        line: 1,
        column: 1,
        message: `Root element <${rootElement}> is not properly closed`,
        severity: 'error'
      });
    }
  }

  // Check for well-formed XML
  const unclosedTags: string[] = [];
  const tagRegex = /<([^>!]+)>/g;
  let match;

  while ((match = tagRegex.exec(content)) !== null) {
    const tag = match[1];

    // Skip comments, CDATA, etc.
    if (tag.startsWith('!--') || tag.startsWith('![CDATA[') || tag.startsWith('?xml')) {
      continue;
    }

    // Check if it's a closing tag
    if (tag.startsWith('/')) {
      const tagName = tag.substring(1);
      if (unclosedTags.length > 0 && unclosedTags[unclosedTags.length - 1] === tagName) {
        unclosedTags.pop();
      } else {
        errors.push({
          line: content.substring(0, match.index).split('\n').length,
          column: match.index - content.lastIndexOf('\n', match.index),
          message: `Unexpected closing tag </${tagName}>`,
          severity: 'error'
        });
      }
    } else {
      // It's an opening tag
      const tagName = tag.split(/\s+/)[0];
      unclosedTags.push(tagName);
    }
  }

  // Report unclosed tags
  for (const unclosedTag of unclosedTags) {
    errors.push({
      line: content.split('\n').length,
      column: 1,
      message: `Unclosed tag <${unclosedTag}>`,
      severity: 'error'
    });
  }

  // Check for proper TEI structure (basic check)
  if (!content.toLowerCase().includes('teiheader')) {
    warnings.push({
      line: 1,
      column: 1,
      message: 'File may not contain proper TEI header',
      severity: 'warning',
      rule: 'tei-structure'
    });
  }

  return { errors, warnings };
}

export async function analyzeTEIFile(filePath: string): Promise<TEIFile> {
  try {
    const content = await readFile(filePath, 'utf-8');
    const encoding = await detectEncoding(filePath);
    const version = await extractTEIVersion(content);
    const { errors, warnings } = validateTEI(content);
    const tags = extractTags(content);

    const stats = await stat(filePath);

    return {
      id: path.basename(filePath, path.extname(filePath)),
      path: filePath,
      fileName: path.basename(filePath),
      size: stats.size,
      isValid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
      warnings: warnings.length > 0 ? warnings : undefined,
      encoding,
      version,
      tags
    };
  } catch (error) {
    return {
      id: path.basename(filePath, path.extname(filePath)),
      path: filePath,
      fileName: path.basename(filePath),
      size: 0,
      isValid: false,
      errors: [{
        line: 1,
        column: 1,
        message: `Failed to read file: ${error}`,
        severity: 'error'
      }]
    };
  }
}

export async function buildCorpusStats(corpus: TEICorpus): Promise<TEICorpus['metadata']> {
  if (!corpus.files.length) return undefined;

  const totalFiles = corpus.files.length;
  const totalSize = corpus.files.reduce((sum, file) => sum + file.size, 0);

  // Calculate tag frequencies
  const tagCounts: Record<string, number> = {};
  const tagFiles: Record<string, Set<string>> = {};

  for (const file of corpus.files) {
    for (const tag of file.tags || []) {
      tagCounts[tag.name] = (tagCounts[tag.name] || 0) + tag.count;
      if (!tagFiles[tag.name]) tagFiles[tag.name] = new Set();
      tagFiles[tag.name].add(file.id);
    }
  }

  const tags = Object.entries(tagCounts)
    .map(([tag, count]) => ({
      tag,
      count,
      percentage: (count / totalFiles) * 100,
      files: Array.from(tagFiles[tag])
    }))
    .sort((a, b) => b.count - a.count);

  // Calculate encoding types
  const encodingTypes: Record<string, number> = {};
  for (const file of corpus.files) {
    if (file.encoding) {
      encodingTypes[file.encoding] = (encodingTypes[file.encoding] || 0) + 1;
    }
  }

  // Calculate versions
  const versions: Record<string, number> = {};
  for (const file of corpus.files) {
    if (file.version) {
      versions[file.version] = (versions[file.version] || 0) + 1;
    }
  }

  return {
    totalFiles,
    totalSize,
    tags,
    encodingTypes,
    versions,
    dateProcessed: new Date().toISOString()
  };
}

export async function analyzeCorpus(corpusPath: string): Promise<AnalysisResult> {
  const files = await findTEIFiles(corpusPath);

  if (files.length === 0) {
    throw new Error(`No TEI files found in ${corpusPath}`);
  }

  const analyzedFiles = await Promise.all(files.map(file => analyzeTEIFile(file)));

  const corpus: TEICorpus = {
    id: path.basename(corpusPath),
    name: path.basename(corpusPath),
    path: corpusPath,
    files: analyzedFiles,
    encoding: 'UTF-8',
    version: 'unknown'
  };

  const metadata = await buildCorpusStats(corpus);
  corpus.metadata = metadata;

  const summary = {
    totalFiles: files.length,
    totalSize: corpus.metadata?.totalSize || 0,
    validFiles: analyzedFiles.filter(f => f.isValid).length,
    invalidFiles: analyzedFiles.filter(f => !f.isValid).length,
    uniqueTags: corpus.metadata?.tags.length || 0,
    encodingTypes: corpus.metadata?.encodingTypes || {},
    versions: corpus.metadata?.versions || {}
  };

  const insights = {
    mostFrequentTags: corpus.metadata?.tags.slice(0, 10) || [],
    encodingDistribution: corpus.metadata?.encodingTypes || {},
    versionDistribution: corpus.metadata?.versions || {},
    qualityMetrics: {
      averageErrorsPerFile: analyzedFiles.reduce((sum, file) => sum + (file.errors?.length || 0), 0) / files.length,
      averageWarningsPerFile: analyzedFiles.reduce((sum, file) => sum + (file.warnings?.length || 0), 0) / files.length,
      errorRate: analyzedFiles.filter(f => !f.isValid).length / files.length
    }
  };

  return {
    corpus,
    summary,
    insights
  };
}