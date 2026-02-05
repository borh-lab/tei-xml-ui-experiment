// @ts-nocheck
import { EntitySpan, DialogueSpan } from './types';

export class EntityDetector {
  private titles = ['Mr', 'Mrs', 'Miss', 'Dr', 'Lady', 'Sir', 'Lord', 'Madam'];

  detectPersonalNames(text: string): EntitySpan[] {
    const entities: EntitySpan[] = [];

    // Pattern: Title (with optional period) + Capitalized Name
    const titlePattern = new RegExp(
      `\\b(${this.titles.join('|')})\\.?\\s+([A-Z][a-z]+(?:\\s+[A-Z][a-z]+)?)`,
      'g'
    );

    let match: RegExpExecArray | null;
    while ((match = titlePattern.exec(text)) !== null) {
      entities.push({
        start: match.index,
        end: match.index + match[0].length,
        text: match[0],
        type: 'persName',
        confidence: 0.95,
      });
    }

    // Pattern: Capitalized words not at sentence start (heuristic)
    // Look for standalone capitalized words
    const standaloneNamePattern = /(?:^|[.\s!?])\s*([A-Z][a-z]+)\b/g;

    while ((match = standaloneNamePattern.exec(text)) !== null) {
      const nameText = match[1];

      // Skip common words that are capitalized but not names
      const commonWords = [
        'The',
        'A',
        'An',
        'It',
        'He',
        'She',
        'They',
        'This',
        'That',
        'In',
        'On',
        'At',
        'But',
        'And',
        'Or',
      ];
      if (commonWords.includes(nameText)) {
        continue;
      }

      // Skip if already captured by title pattern
      const alreadyCaptured = entities.some((e) => match!.index >= e.start && match!.index < e.end);
      if (alreadyCaptured) {
        continue;
      }

      // Skip if part of a title (Mr, Mrs, Miss, etc.)
      if (this.titles.some((title) => nameText.startsWith(title))) {
        continue;
      }

      const nameStart = text.indexOf(nameText, match.index);
      entities.push({
        start: nameStart,
        end: nameStart + nameText.length,
        text: nameText,
        type: 'persName',
        confidence: 0.7,
      });
    }

    return this.removeOverlaps(entities);
  }

  detectPlaces(text: string): EntitySpan[] {
    const entities: EntitySpan[] = [];

    // Pattern: in/at/from/to/near + Capitalized Place
    const placePattern = /\b(in|at|from|to|near)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\b/g;

    let match: RegExpExecArray | null;
    while ((match = placePattern.exec(text)) !== null) {
      const placeStart = text.indexOf(match[2], match.index);
      entities.push({
        start: placeStart,
        end: placeStart + match[2].length,
        text: match[2],
        type: 'placeName',
        confidence: 0.8,
      });
    }

    return entities;
  }

  detectDialogueSpeakers(text: string, _currentSpeakers: string[]): DialogueSpan[] {
    const dialogues: DialogueSpan[] = [];

    // Pattern: "Quote" + said + Name
    const saidPattern = /"([^"]+)"\s+(said|replied|asked|answered|called)\s+([A-Z][a-z]+)/g;

    let match: RegExpExecArray | null;
    while ((match = saidPattern.exec(text)) !== null) {
      const quoteStart = text.indexOf('"', match.index);
      const quoteEnd = text.indexOf('"', quoteStart + 1) + 1;

      dialogues.push({
        start: quoteStart,
        end: quoteEnd,
        text: match[1],
        type: 'dialogue',
        speaker: match[3].toLowerCase(),
        confidence: 0.85,
      });
    }

    // Pattern: Name + said, "Quote"
    const nameSaidPattern = /([A-Z][a-z]+)\s+(said|replied),\s+"([^"]+)"/g;

    while ((match = nameSaidPattern.exec(text)) !== null) {
      const quoteStart = text.indexOf('"', match.index);
      const quoteEnd = text.indexOf('"', quoteStart + 1) + 1;

      dialogues.push({
        start: quoteStart,
        end: quoteEnd,
        text: match[3],
        type: 'dialogue',
        speaker: match[1].toLowerCase(),
        confidence: 0.9,
      });
    }

    return dialogues;
  }

  private removeOverlaps(spans: EntitySpan[]): EntitySpan[] {
    // Sort by start position
    const sorted = [...spans].sort((a, b) => a.start - b.start);

    const result: EntitySpan[] = [];
    for (const span of sorted) {
      const overlaps = result.some(
        (r) =>
          (span.start >= r.start && span.start < r.end) || (span.end > r.start && span.end <= r.end)
      );

      if (!overlaps) {
        result.push(span);
      }
    }

    return result;
  }
}
