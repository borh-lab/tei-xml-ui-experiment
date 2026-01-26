/**
 * XML Parser Utilities for Testing
 *
 * Helper functions to parse TEI XML and extract dialogue annotations
 * with accurate character positions for testing.
 */

import { XMLParser } from 'fast-xml-parser';

export interface DialogueAnnotation {
  start: number;
  end: number;
  text: string;
  who: string;
  rend?: string;
}

export interface ParsedDocument {
  plainText: string;
  annotations: DialogueAnnotation[];
}

/**
 * Parse TEI document and extract dialogue annotations with positions
 *
 * This function:
 * 1. Parses the XML
 * 2. Extracts <said> elements with their positions
 * 3. Reconstructs plain text by removing tags
 * 4. Maps character positions in plain text to original annotations
 */
export function parseTEIDocument(xmlContent: string): ParsedDocument {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    textNodeName: '#text'
  });

  const parsed = parser.parse(xmlContent);
  const annotations: DialogueAnnotation[] = [];

  // Extract text content while tracking dialogue positions
  let plainText = '';
  let position = 0;

  // Helper function to recursively extract text and dialogue
  function extractText(node: any, path: string[] = []): string {
    if (!node || typeof node !== 'object') {
      return String(node || '');
    }

    if (Array.isArray(node)) {
      return node.map(item => extractText(item, path)).join('');
    }

    let result = '';

    // Check if this is a <said> element
    if (node['@_who']) {
      const text = node['#text'] || extractTextContent(node);
      const start = position;
      const end = position + text.length;

      annotations.push({
        start,
        end,
        text,
        who: node['@_who'],
        rend: node['@_rend']
      });

      result += text;
      position += text.length;
    } else {
      // Regular element - extract text content
      for (const key in node) {
        if (!key.startsWith('@_')) {
          result += extractText(node[key], [...path, key]);
        }
      }
    }

    return result;
  }

  // Start extraction from the TEI root
  if (parsed.TEI) {
    plainText = extractText(parsed.TEI);
  }

  // Clean up whitespace
  plainText = plainText
    .replace(/\s+/g, ' ')
    .trim();

  return {
    plainText,
    annotations
  };
}

/**
 * Extract text content from a node recursively
 */
function extractTextContent(node: any): string {
  if (!node || typeof node !== 'object') {
    return String(node || '');
  }

  if (Array.isArray(node)) {
    return node.map(item => extractTextContent(item)).join('');
  }

  let result = '';

  for (const key in node) {
    if (key === '#text') {
      result += node[key];
    } else if (!key.startsWith('@_')) {
      result += extractTextContent(node[key]);
    }
  }

  return result;
}

/**
 * Calculate Intersection over Union (IoU) for two spans
 */
export function calculateIoU(
  span1: { start: number; end: number },
  span2: { start: number; end: number }
): number {
  const intersectionStart = Math.max(span1.start, span2.start);
  const intersectionEnd = Math.min(span1.end, span2.end);
  const intersection = Math.max(0, intersectionEnd - intersectionStart);

  const unionStart = Math.min(span1.start, span2.start);
  const unionEnd = Math.max(span1.end, span2.end);
  const union = unionEnd - unionStart;

  return union > 0 ? intersection / union : 0;
}

/**
 * Check if two spans match (IoU > threshold)
 */
export function spansMatch(
  span1: { start: number; end: number },
  span2: { start: number; end: number },
  threshold: number = 0.5
): boolean {
  return calculateIoU(span1, span2) > threshold;
}
