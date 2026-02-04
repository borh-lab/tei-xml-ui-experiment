import { XMLParser } from 'fast-xml-parser';
import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import type { TEIFileInfo, TagAnalysis, CorpusMetadata } from './types';

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
    let content = readFileSync(filePath, 'utf-8');
    const stats = statSync(filePath);

    if (content.length < 500) {
      return { path: filePath, size: stats.size, isTEI: false, isValid: false, error: 'File too small (< 500 chars)' };
    }

    const hasTEIRoot = /<TEI[^>]*>|<TEI\.2[^>]*>/.test(content);
    if (!hasTEIRoot) {
      return { path: filePath, size: stats.size, isTEI: false, isValid: false, error: 'No TEI root element found' };
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
          return { path: filePath, size: stats.size, isTEI: true, isValid: false, error: `Parse error (after DOCTYPE strip): ${retryError}` };
        }
      }
      return { path: filePath, size: stats.size, isTEI: true, isValid: false, error: `Parse error: ${parseError}` };
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