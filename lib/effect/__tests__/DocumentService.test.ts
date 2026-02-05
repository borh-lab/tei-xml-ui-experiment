// @ts-nocheck
/**
 * DocumentService Tests
 *
 * Comprehensive unit tests for DocumentService protocol.
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { Effect } from 'effect';
import { DocumentService } from '@/lib/effect/protocols/Document';
import { TestDocumentService, runEffectTest } from '@/lib/effect/utils/test-helpers';

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
  let testService: TestDocumentService;

  beforeEach(() => {
    testService = new TestDocumentService();
  });

  it('should load document', async () => {
    const program = Effect.gen(function* (_) {
      const doc = yield* _(testService.load(testXML));

      expect(doc.state.metadata.title).toBe('Test Document');
      expect(doc.state.revision).toBe(0);
    });

    await Effect.runPromise(program);
  });

  it('should add said tag', async () => {
    const program = Effect.gen(function* (_) {
      // Load document
      const doc = yield* _(testService.load(testXML));
      expect(doc.state.revision).toBe(0);

      // Add tag
      const updated = yield* _(
        testService.addTag('p1', { start: 0, end: 10 }, 'said', { who: 'speaker-1' })
      );

      expect(updated.state.revision).toBe(1);
      expect(updated.events.length).toBe(2); // loaded + tag-added
    });

    await Effect.runPromise(program);
  });

  it('should get history state', async () => {
    const program = Effect.gen(function* (_) {
      // Load document
      const doc = yield* _(testService.load(testXML));

      // Check initial state
      expect(doc.events.length).toBe(1); // Just the loaded event
      expect(doc.state.revision).toBe(0);
    });

    await Effect.runPromise(program);
  });

  it('should throw error when getting document before loading', async () => {
    const program = Effect.gen(function* (_) {
      return yield* _(testService.getDocument());
    });

    const result = await Effect.runPromiseExit(program);

    expect(result._tag).toBe('Failure');
  });
});
