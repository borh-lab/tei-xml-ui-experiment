// @ts-nocheck
// @ts-nocheck
/**
 * DocumentService Tests
 *
 * Comprehensive unit tests for DocumentService protocol.
 */

import { describe, it, expect } from '@jest/globals';
import { Effect, pipe } from 'effect';
import { DocumentService } from '@/lib/effect/protocols/Document';
import { MainLayer } from '@/lib/effect/layers/Main';

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
      expect(doc.state.revision).toBe(0);
    });

    await Effect.runPromise(pipe(program, Effect.provide(MainLayer)));
  });

  it('should add said tag', async () => {
    const program = Effect.gen(function* (_) {
      const service = yield* _(DocumentService);

      // Load document
      const doc = yield* _(service.loadDocument(testXML));
      expect(doc.state.revision).toBe(0);

      // Get the first passage ID
      const firstPassageId = doc.state.passages[0].id;

      // Add said tag
      const updated = yield* _(
        service.addSaidTag(firstPassageId, { start: 0, end: 10 }, 'speaker-1')
      );

      expect(updated.state.revision).toBe(1);
      expect(updated.events.length).toBe(2); // loaded + saidTagAdded
    });

    await Effect.runPromise(pipe(program, Effect.provide(MainLayer)));
  });

  it('should get history state', async () => {
    const program = Effect.gen(function* (_) {
      const service = yield* _(DocumentService);

      // Load document
      const doc = yield* _(service.loadDocument(testXML));

      // Get history state
      const history = yield* _(service.getHistoryState());

      expect(history.canUndo).toBe(false);
      expect(history.canRedo).toBe(false);
      expect(history.currentRevision).toBe(0);
      expect(history.totalRevisions).toBe(1);
    });

    await Effect.runPromise(pipe(program, Effect.provide(MainLayer)));
  });

  it('should throw error when getting document before loading', async () => {
    const program = Effect.gen(function* (_) {
      const service = yield* _(DocumentService);
      return yield* _(service.getDocument());
    });

    const result = await Effect.runPromiseExit(pipe(program, Effect.provide(MainLayer)));

    expect(result._tag).toBe('Failure');
  });
});
