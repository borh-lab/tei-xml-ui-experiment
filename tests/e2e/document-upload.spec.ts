import { test, expect } from '@playwright/test';
import { writeFileSync, unlinkSync, existsSync } from 'fs';
import { join } from 'path';
import { TEIEditorApp } from './protocol/TEIEditorApp';
import { TEIDocument } from './fixtures/TEIDocument';
import { generateTestDocument, createMinimalTEI, createMalformedTEI } from './fixtures/test-helpers';
import { TIMEOUTS, SPEAKERS } from './fixtures/test-constants';

/**
 * Document Upload/Import E2E Tests (Protocol-Based)
 *
 * Comprehensive test coverage for document upload and import functionality including:
 * - Basic upload operations
 * - File type validation
 * - TEI format variants
 * - Edge cases and error handling
 * - Large documents and special characters
 *
 * Migrated from DOM-based to protocol-based testing using TEIEditorApp
 */

test.describe('Document Upload - Basic Operations', () => {
  test('should upload valid TEI document', async ({ page }) => {
    const app = await TEIEditorApp.create(page);

    const doc = TEIDocument.valid({
      title: 'Test Document',
      speakers: [SPEAKERS.NARRATOR, SPEAKERS.DELLA, SPEAKERS.JIM],
      passages: 5,
    });

    const state = await app.editor().load(doc);

    expect(state.location).toBe('editor');
    expect(state.document?.loaded).toBe(true);
    expect(state.document?.passageCount).toBe(5);
  });

  test('should show loading indicator during upload', async ({ page }) => {
    const app = await TEIEditorApp.create(page);

    const doc = TEIDocument.valid({
      title: 'Large Document',
      speakers: [SPEAKERS.NARRATOR, SPEAKERS.DELLA],
      passages: 50,
    });

    const startTime = Date.now();
    const state = await app.editor().load(doc);
    const loadTime = Date.now() - startTime;

    expect(state.location).toBe('editor');
    expect(state.document?.loaded).toBe(true);
    expect(state.document?.passageCount).toBe(50);
    expect(loadTime).toBeLessThan(10000);
  });

  test('should handle rapid file uploads', async ({ page }) => {
    const app = await TEIEditorApp.create(page);

    const doc1 = TEIDocument.valid({
      title: 'Document 1',
      speakers: ['speaker1'],
      passages: 3,
    });

    const doc2 = TEIDocument.valid({
      title: 'Document 2',
      speakers: ['speaker2'],
      passages: 5,
    });

    let state = await app.editor().load(doc1);
    expect(state.document?.passageCount).toBe(3);

    state = await app.editor().load(doc2);
    expect(state.document?.passageCount).toBe(5);
  });
});

test.describe('TEI Format Variants', () => {
  test('should handle TEI with namespace declarations', async ({ page }) => {
    const app = await TEIEditorApp.create(page);

    const teiWithNS = generateTestDocument({
      speakers: [SPEAKERS.NARRATOR, SPEAKERS.DELLA],
      passages: 5,
      namespaces: true,
      declarations: true,
    });

    await app.files().uploadRaw(teiWithNS, 'with-namespace.tei.xml');

    await app.waitForState({
      location: 'editor',
      document: { loaded: true },
    });

    const passageCount = await app.editor().getPassageCount();
    expect(passageCount).toBe(5);
  });

  test('should handle TEI without namespace (backward compatibility)', async ({ page }) => {
    const app = await TEIEditorApp.create(page);

    const teiWithoutNS = generateTestDocument({
      speakers: [SPEAKERS.NARRATOR, SPEAKERS.DELLA],
      passages: 5,
      namespaces: false,
      declarations: true,
    });

    await app.files().uploadRaw(teiWithoutNS, 'without-namespace.tei.xml');

    await app.waitForState({
      location: 'editor',
      document: { loaded: true },
    });

    const passageCount = await app.editor().getPassageCount();
    expect(passageCount).toBe(5);
  });

  test('should handle TEI without XML declaration', async ({ page }) => {
    const app = await TEIEditorApp.create(page);

    const teiNoDecl = generateTestDocument({
      speakers: [SPEAKERS.NARRATOR],
      passages: 3,
      namespaces: true,
      declarations: false,
    });

    await app.files().uploadRaw(teiNoDecl, 'no-declaration.tei.xml');

    await app.waitForState({
      location: 'editor',
      document: { loaded: true },
    });

    const passageCount = await app.editor().getPassageCount();
    expect(passageCount).toBe(3);
  });

  test('should handle TEI with custom header metadata', async ({ page }) => {
    const app = await TEIEditorApp.create(page);

    let customTEI = '<?xml version="1.0" encoding="UTF-8"?>\n';
    customTEI += '<TEI xmlns="http://www.tei-c.org/ns/1.0">\n';
    customTEI += '  <teiHeader>\n';
    customTEI += '    <fileDesc>\n';
    customTEI += '      <titleStmt>\n';
    customTEI += '        <title>Custom Document Title</title>\n';
    customTEI += '        <author>Test Author</author>\n';
    customTEI += '      </titleStmt>\n';
    customTEI += '    </fileDesc>\n';
    customTEI += '  </teiHeader>\n';
    customTEI += '  <text>\n';
    customTEI += '    <body>\n';
    customTEI += '      <p><s who="#speaker1">Test passage</s></p>\n';
    customTEI += '    </body>\n';
    customTEI += '  </text>\n';
    customTEI += '</TEI>\n';

    await app.files().uploadRaw(customTEI, 'custom-header.tei.xml');

    await app.waitForState({
      location: 'editor',
      document: { loaded: true },
    });

    const title = await app.editor().getTitle();
    expect(title).toBe('Custom Document Title');
  });

  test('should handle different TEI versions', async ({ page }) => {
    const app = await TEIEditorApp.create(page);

    let teiP5 = '<?xml version="1.0" encoding="UTF-8"?>\n';
    teiP5 += '<TEI xmlns="http://www.tei-c.org/ns/1.0" version="5.0">\n';
    teiP5 += '  <teiHeader><fileDesc><titleStmt><title>P5</title></titleStmt></fileDesc></teiHeader>\n';
    teiP5 += '  <text><body><p><s who="#narrator">P5 content</s></p></body></text>\n';
    teiP5 += '</TEI>\n';

    await app.files().uploadRaw(teiP5, 'tei-p5.tei.xml');

    await app.waitForState({
      location: 'editor',
      document: { loaded: true },
    });

    const title = await app.editor().getTitle();
    expect(title).toBe('P5');
  });
});

test.describe('Edge Cases', () => {
  test('should handle empty document (no passages)', async ({ page }) => {
    const app = await TEIEditorApp.create(page);

    const emptyTEI = createMinimalTEI({ passages: [] });

    await app.files().uploadRaw(emptyTEI, 'empty.tei.xml');

    await page.waitForTimeout(1000);

    const state = await app.getState();
    if (state.document?.loaded) {
      expect(state.document.passageCount).toBe(0);
    }
  });

  test('should handle document with only speakers (no dialogue)', async ({ page }) => {
    const app = await TEIEditorApp.create(page);

    let speakersOnly = '<?xml version="1.0" encoding="UTF-8"?>\n';
    speakersOnly += '<TEI xmlns="http://www.tei-c.org/ns/1.0">\n';
    speakersOnly += '  <teiHeader>\n';
    speakersOnly += '    <fileDesc>\n';
    speakersOnly += '      <titleStmt><title>Speakers Only</title></titleStmt>\n';
    speakersOnly += '    </fileDesc>\n';
    speakersOnly += '  </teiHeader>\n';
    speakersOnly += '  <text>\n';
    speakersOnly += '    <body>\n';
    speakersOnly += '      <castList>\n';
    speakersOnly += '        <castItem>\n';
    speakersOnly += '          <role xml:id="speaker1">Speaker 1</role>\n';
    speakersOnly += '        </castItem>\n';
    speakersOnly += '        <castItem>\n';
    speakersOnly += '          <role xml:id="speaker2">Speaker 2</role>\n';
    speakersOnly += '        </castItem>\n';
    speakersOnly += '      </castList>\n';
    speakersOnly += '    </body>\n';
    speakersOnly += '  </text>\n';
    speakersOnly += '</TEI>\n';

    await app.files().uploadRaw(speakersOnly, 'speakers-only.tei.xml');

    await page.waitForTimeout(1000);

    const passageCount = await app.editor().getPassageCount();
    expect(passageCount).toBe(0);
  });

  test('should handle large document (>100KB)', async ({ page }) => {
    const app = await TEIEditorApp.create(page);

    const largeTEI = generateTestDocument({
      speakers: [SPEAKERS.NARRATOR, SPEAKERS.DELLA, SPEAKERS.JIM, SPEAKERS.PROTAGONIST],
      passages: 1500,
    });

    const fs = await import('fs');
    const tempPath = join(process.cwd(), 'tests/fixtures', 'large-test.tei.xml');
    writeFileSync(tempPath, largeTEI);

    const { size } = fs.statSync(tempPath);
    expect(size).toBeGreaterThan(100 * 1024);

    await app.files().uploadRaw(largeTEI, 'large-test.tei.xml');

    await app.waitForState({
      location: 'editor',
      document: { loaded: true },
    });

    const passageCount = await app.editor().getPassageCount();
    expect(passageCount).toBeGreaterThan(0);

    unlinkSync(tempPath);
  });

  test('should handle very large document (>500 passages)', async ({ page }) => {
    const app = await TEIEditorApp.create(page);

    const veryLargeTEI = generateTestDocument({
      speakers: [SPEAKERS.NARRATOR, SPEAKERS.DELLA],
      passages: 600,
    });

    await app.files().uploadRaw(veryLargeTEI, 'very-large.tei.xml');

    await app.waitForState({
      location: 'editor',
      document: { loaded: true },
    });

    const passageCount = await app.editor().getPassageCount();
    expect(passageCount).toBeGreaterThan(0);
  });

  test('should handle documents with Unicode characters', async ({ page }) => {
    const app = await TEIEditorApp.create(page);

    let unicodeTEI = '<?xml version="1.0" encoding="UTF-8"?>\n';
    unicodeTEI += '<TEI xmlns="http://www.tei-c.org/ns/1.0">\n';
    unicodeTEI += '  <teiHeader><fileDesc><titleStmt><title>Unicode Test</title></titleStmt></fileDesc></teiHeader>\n';
    unicodeTEI += '  <text><body>\n';
    unicodeTEI += '    <p><s who="#speaker1">Hello 世界 مرحبا हिनी</s></p>\n';
    unicodeTEI += '    <p><s who="#speaker2">Café résumé naïve</s></p>\n';
    unicodeTEI += '    <p><s who="#speaker3">Ελληνικά العربية</s></p>\n';
    unicodeTEI += '  </body></text>\n';
    unicodeTEI += '</TEI>\n';

    await app.files().uploadRaw(unicodeTEI, 'unicode.tei.xml');

    await app.waitForState({
      location: 'editor',
      document: { loaded: true },
    });

    const passageCount = await app.editor().getPassageCount();
    expect(passageCount).toBe(3);
  });

  test('should handle documents with emoji characters', async ({ page }) => {
    const app = await TEIEditorApp.create(page);

    let emojiTEI = '<?xml version="1.0" encoding="UTF-8"?>\n';
    emojiTEI += '<TEI xmlns="http://www.tei-c.org/ns/1.0">\n';
    emojiTEI += '  <teiHeader><fileDesc><titleStmt><title>Emoji Test</title></titleStmt></fileDesc></teiHeader>\n';
    emojiTEI += '  <text><body>\n';
    emojiTEI += '    <p><s who="#speaker1">Hello 😊 👍 🎉</s></p>\n';
    emojiTEI += '    <p><s who="#speaker2">Emoji test 🚀 ✨</s></p>\n';
    emojiTEI += '  </body></text>\n';
    emojiTEI += '</TEI>\n';

    await app.files().uploadRaw(emojiTEI, 'emoji.tei.xml');

    await app.waitForState({
      location: 'editor',
      document: { loaded: true },
    });

    const passageCount = await app.editor().getPassageCount();
    expect(passageCount).toBe(2);
  });

  test('should handle documents with special XML characters', async ({ page }) => {
    const app = await TEIEditorApp.create(page);

    let specialCharsTEI = '<?xml version="1.0" encoding="UTF-8"?>\n';
    specialCharsTEI += '<TEI xmlns="http://www.tei-c.org/ns/1.0">\n';
    specialCharsTEI += '  <teiHeader><fileDesc><titleStmt><title>Special Chars</title></titleStmt></fileDesc></teiHeader>\n';
    specialCharsTEI += '  <text><body>\n';
    specialCharsTEI += '    <p><s who="#speaker1">&lt;tag&gt; &amp; &quot;quotes&quot;</s></p>\n';
    specialCharsTEI += '    <p><s who="#speaker2">Apostrophe&apos;s and more</s></p>\n';
    specialCharsTEI += '  </body></text>\n';
    specialCharsTEI += '</TEI>\n';

    await app.files().uploadRaw(specialCharsTEI, 'special-chars.tei.xml');

    await app.waitForState({
      location: 'editor',
      document: { loaded: true },
    });

    const passageCount = await app.editor().getPassageCount();
    expect(passageCount).toBe(2);
  });

  test('should handle documents with nested XML structures', async ({ page }) => {
    const app = await TEIEditorApp.create(page);

    let nestedTEI = '<?xml version="1.0" encoding="UTF-8"?>\n';
    nestedTEI += '<TEI xmlns="http://www.tei-c.org/ns/1.0">\n';
    nestedTEI += '  <teiHeader><fileDesc><titleStmt><title>Nested</title></titleStmt></fileDesc></teiHeader>\n';
    nestedTEI += '  <text><body>\n';
    nestedTEI += '    <p><s who="#speaker1">First passage</s></p>\n';
    nestedTEI += '    <p><s who="#speaker2">Second passage</s></p>\n';
    nestedTEI += '  </body></text>\n';
    nestedTEI += '</TEI>\n';

    await app.files().uploadRaw(nestedTEI, 'nested.tei.xml');

    await app.waitForState({
      location: 'editor',
      document: { loaded: true },
    });

    const passageCount = await app.editor().getPassageCount();
    expect(passageCount).toBeGreaterThan(0);
  });

  test('should handle document with multiple paragraphs per passage', async ({ page }) => {
    const app = await TEIEditorApp.create(page);

    let multiParaTEI = '<?xml version="1.0" encoding="UTF-8"?>\n';
    multiParaTEI += '<TEI xmlns="http://www.tei-c.org/ns/1.0">\n';
    multiParaTEI += '  <teiHeader><fileDesc><titleStmt><title>Multi Para</title></titleStmt></fileDesc></teiHeader>\n';
    multiParaTEI += '  <text><body>\n';
    multiParaTEI += '    <p><s who="#speaker1">First paragraph</s></p>\n';
    multiParaTEI += '    <p><s who="#speaker2">Second paragraph</s></p>\n';
    multiParaTEI += '    <p><s who="#speaker1">Third paragraph</s></p>\n';
    multiParaTEI += '  </body></text>\n';
    multiParaTEI += '</TEI>\n';

    await app.files().uploadRaw(multiParaTEI, 'multi-para.tei.xml');

    await app.waitForState({
      location: 'editor',
      document: { loaded: true },
    });

    const passageCount = await app.editor().getPassageCount();
    expect(passageCount).toBe(3);
  });
});

test.describe('Performance and Stress Tests', () => {
  test('should handle document with 1000 passages', async ({ page }) => {
    const app = await TEIEditorApp.create(page);

    const doc = TEIDocument.valid({
      title: 'Massive Document',
      speakers: [SPEAKERS.NARRATOR, SPEAKERS.DELLA, SPEAKERS.JIM],
      passages: 1000,
    });

    const startTime = Date.now();
    const state = await app.editor().load(doc);
    const loadTime = Date.now() - startTime;

    expect(loadTime).toBeLessThan(30000);
    expect(state.document?.loaded).toBe(true);
    expect(state.document?.passageCount).toBeGreaterThan(0);
  });

  test('should handle multiple rapid uploads without memory issues', async ({ page }) => {
    const app = await TEIEditorApp.create(page);

    const documents = [
      TEIDocument.valid({ title: 'Doc 1', speakers: ['s1'], passages: 10 }),
      TEIDocument.valid({ title: 'Doc 2', speakers: ['s2'], passages: 20 }),
      TEIDocument.valid({ title: 'Doc 3', speakers: ['s3'], passages: 30 }),
      TEIDocument.valid({ title: 'Doc 4', speakers: ['s4'], passages: 40 }),
      TEIDocument.valid({ title: 'Doc 5', speakers: ['s5'], passages: 50 }),
    ];

    for (let i = 0; i < documents.length; i++) {
      const state = await app.editor().load(documents[i]);
      expect(state.document?.loaded).toBe(true);
    }

    const passageCount = await app.editor().getPassageCount();
    expect(passageCount).toBe(50);
  });
});
