// @ts-nocheck
/**
 * Unit Tests for XML Parser Utilities
 *
 * Tests the TEI document parsing and dialogue extraction utilities
 */

import { parseTEIDocument, calculateIoU, spansMatch } from '@/tests/utils/xml-parser';

describe('XML Parser Utilities', () => {
  describe('parseTEIDocument', () => {
    test('should parse simple TEI document with dialogue', () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<TEI xmlns="http://www.tei-c.org/ns/1.0">
  <text>
    <body>
      <p>
        <said who="#speaker1">Hello</said>
        World
      </p>
    </body>
  </text>
</TEI>`;

      const result = parseTEIDocument(xml);

      expect(result.plainText).toContain('Hello');
      expect(result.annotations).toHaveLength(1);
      expect(result.annotations[0].who).toBe('#speaker1');
      expect(result.annotations[0].text).toContain('Hello');
    });

    test('should parse multiple dialogue elements', () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<TEI xmlns="http://www.tei-c.org/ns/1.0">
  <text>
    <body>
      <p>
        <said who="#speaker1">Hello</said>
        <said who="#speaker2">Hi there</said>
      </p>
    </body>
  </text>
</TEI>`;

      const result = parseTEIDocument(xml);

      expect(result.annotations).toHaveLength(2);
      expect(result.annotations[0].who).toBe('#speaker1');
      expect(result.annotations[1].who).toBe('#speaker2');
    });

    test('should handle nested elements', () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<TEI xmlns="http://www.tei-c.org/ns/1.0">
  <text>
    <body>
      <div>
        <p>
          <said who="#speaker1">Hello</said>
        </p>
      </div>
    </body>
  </text>
</TEI>`;

      const result = parseTEIDocument(xml);

      expect(result.plainText).toBeTruthy();
      expect(result.annotations.length).toBeGreaterThan(0);
    });

    test('should handle documents with no dialogue', () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<TEI xmlns="http://www.tei-c.org/ns/1.0">
  <text>
    <body>
      <p>This is just regular text with no dialogue.</p>
    </body>
  </text>
</TEI>`;

      const result = parseTEIDocument(xml);

      expect(result.annotations).toHaveLength(0);
      expect(result.plainText).toContain('regular text');
    });

    test('should preserve speaker attribution', () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<TEI xmlns="http://www.tei-c.org/ns/1.0">
  <text>
    <body>
      <p>
        <said who="#narrator" rend="plain">Text</said>
      </p>
    </body>
  </text>
</TEI>`;

      const result = parseTEIDocument(xml);

      expect(result.annotations[0].who).toBe('#narrator');
      expect(result.annotations[0].rend).toBe('plain');
    });
  });

  describe('calculateIoU', () => {
    test('should calculate perfect IoU for identical spans', () => {
      const span1 = { start: 0, end: 10 };
      const span2 = { start: 0, end: 10 };

      const iou = calculateIoU(span1, span2);

      expect(iou).toBe(1);
    });

    test('should calculate IoU for overlapping spans', () => {
      const span1 = { start: 0, end: 10 };
      const span2 = { start: 5, end: 15 };

      // Overlap: 5 (5-10)
      // Union: 15 (0-15)
      // IoU: 5/15 = 0.333
      const iou = calculateIoU(span1, span2);

      expect(iou).toBeCloseTo(0.333, 2);
    });

    test('should return 0 for non-overlapping spans', () => {
      const span1 = { start: 0, end: 10 };
      const span2 = { start: 20, end: 30 };

      const iou = calculateIoU(span1, span2);

      expect(iou).toBe(0);
    });

    test('should handle partial overlap', () => {
      const span1 = { start: 0, end: 20 };
      const span2 = { start: 10, end: 30 };

      // Overlap: 10 (10-20)
      // Union: 30 (0-30)
      // IoU: 10/30 = 0.333
      const iou = calculateIoU(span1, span2);

      expect(iou).toBeCloseTo(0.333, 2);
    });

    test('should handle one span contained within another', () => {
      const span1 = { start: 0, end: 30 };
      const span2 = { start: 10, end: 20 };

      // Overlap: 10 (10-20)
      // Union: 30 (0-30)
      // IoU: 10/30 = 0.333
      const iou = calculateIoU(span1, span2);

      expect(iou).toBeCloseTo(0.333, 2);
    });
  });

  describe('spansMatch', () => {
    test('should match identical spans', () => {
      const span1 = { start: 0, end: 10 };
      const span2 = { start: 0, end: 10 };

      expect(spansMatch(span1, span2)).toBe(true);
    });

    test('should match spans with high IoU', () => {
      const span1 = { start: 0, end: 10 };
      const span2 = { start: 1, end: 9 };

      // IoU = 8/10 = 0.8 > 0.5
      expect(spansMatch(span1, span2)).toBe(true);
    });

    test('should not match spans with low IoU', () => {
      const span1 = { start: 0, end: 10 };
      const span2 = { start: 0, end: 3 };

      // IoU = 3/10 = 0.3 < 0.5
      expect(spansMatch(span1, span2)).toBe(false);
    });

    test('should not match non-overlapping spans', () => {
      const span1 = { start: 0, end: 10 };
      const span2 = { start: 20, end: 30 };

      expect(spansMatch(span1, span2)).toBe(false);
    });

    test('should use custom threshold', () => {
      const span1 = { start: 0, end: 10 };
      const span2 = { start: 0, end: 4 };

      // IoU = 4/10 = 0.4
      expect(spansMatch(span1, span2, 0.5)).toBe(false);
      expect(spansMatch(span1, span2, 0.3)).toBe(true);
    });
  });
});
