/**
 * DocumentService Tests
 *
 * Comprehensive unit tests for DocumentService protocol.
 */

import { describe, it, expect } from 'vitest';
import { Effect } from 'effect';
import { DocumentService } from '@/lib/effect/protocols/Document';
import { TestDocumentService } from '@/lib/effect/services/DocumentService';
import { createTestLayer } from '@/lib/effect/utils/test-helpers';

const testXML = `<?xml version="1.0" encoding="UTF-8"?>
<TEI xmlns="http://www.tei-c.org/ns/1.0">
  <teiHeader>
    <fileDesc>
      <titleStmt>
        <title>Test Document</title>
      </titleStmt>
    </fileDesc>
  </teiHeader>
  <text>
    <body>
      <p xml:id="p1">This is a test passage.</p>
    </body>
  </text>
</TEI>`;

describe('DocumentService', () => {
  it('should load document', async () => {
    const program = Effect.gen(function* (_) {
      const service = yield* _(DocumentService);
      const doc = yield* _(service.loadDocument(testXML));

      expect(doc.state.metadata.title).toBe('Test Document');
      expect(doc.state.passages).toHaveLength(1);
    });

    await Effect.runPromise(program);
  });

  it('should add said tag', async () => {
    const program = Effect.gen(function* (_) {
      const service = yield* _(DocumentService);

      // Load document
      yield* _(service.loadDocument(testXML));

      // Add tag
      const updated = yield* _(
        service.addSaidTag('p1', { start: 0, end: 10 }, 'speaker-1')
      );

      expect(updated.state.revision).toBeGreaterThan(0);
    });

    await Effect.runPromise(program);
  });

  it('should get history state', async () => {
    const program = Effect.gen(function* (_) {
      const service = yield* _(DocumentService);

      // Load document
      yield* _(service.loadDocument(testXML));

      // Get history state
      const history = yield* _(service.getHistoryState());

      expect(history.canUndo).toBe(false);
      expect(history.canRedo).toBe(false);
      expect(history.currentRevision).toBe(0);
    });

    await Effect.runPromise(program);
  });

  it('should throw error when getting document before loading', async () => {
    const program = Effect.gen(function* (_) {
      const service = yield* _(DocumentService);
      return yield* _(service.getDocument());
    });

    const result = await Effect.runPromise(program);

    expect(result._tag).toBe('Left');
    if (result._tag === 'Left') {
      expect(result.left._tag).toBe('DocumentNotFoundError');
    }
  });
});
