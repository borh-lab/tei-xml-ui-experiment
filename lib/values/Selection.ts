// lib/values/Selection.ts
import type { PassageID } from '@/lib/tei/types';
import type { TextRange } from '@/lib/validation/types';

export interface Selection {
  readonly passageId: PassageID;
  readonly range: TextRange;
  readonly text: string;
  readonly context: string;
  readonly timestamp: number;
}

export function createSelection(
  passageId: PassageID,
  range: TextRange,
  text: string,
  context: string,
  timestamp: number = Date.now()
): Selection {
  return { passageId, range, text, context, timestamp };
}

export function extractContext(
  fullText: string,
  range: TextRange,
  contextLength: number = 200
): string {
  const start = Math.max(0, range.start - contextLength);
  const end = Math.min(fullText.length, range.end + contextLength);
  return fullText.substring(start, end);
}
