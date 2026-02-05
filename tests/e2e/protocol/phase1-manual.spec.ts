// @ts-nocheck
import { test, expect } from '@playwright/test';
import { TEIEditorApp } from './TEIEditorApp';
import { SampleProtocol } from '../protocols/SampleProtocol';
import { DocumentProtocol } from '../protocols/DocumentProtocol';

/**
 * Phase 1 Manual Verification Test
 *
 * This test manually verifies that all protocol components work correctly:
 * 1. State exposure via window.__TEI_EDITOR_STATE__
 * 2. TEIEditorApp protocol
 * 3. SampleProtocol for loading samples
 * 4. DocumentProtocol for querying document state
 *
 * Run with: npm run test:e2e -- tests/e2e/protocol/phase1-manual.spec.ts
 */

test.describe('Phase 1: Protocol Verification', () => {
  test('should expose app state on window object', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Verify state is exposed
    const state = await page.evaluate(() => {
      return (window as any).__TEI_EDITOR_STATE__;
    });

    console.log('Initial state:', JSON.stringify(state, null, 2));

    expect(state).toBeDefined();
    expect(state.location).toBe('gallery');
  });

  test('should create TEIEditorApp and query initial state', async ({ page }) => {
    const app = await TEIEditorApp.create(page);

    // Verify initial state
    const state = await app.getState();
    console.log('App initial state:', JSON.stringify(state, null, 2));

    expect(state.location).toBe('gallery');
    expect(state.document).toBeNull();
  });

  test('should list available samples', async ({ page }) => {
    const app = await TEIEditorApp.create(page);

    const samples = await app.samples().list();
    console.log('Available samples:', samples);

    expect(samples.length).toBeGreaterThan(0);
    expect(samples[0].id).toBeDefined();
    expect(samples[0].title).toBeDefined();
  });

  test('should load first sample and transition to editor', async ({ page }) => {
    const app = await TEIEditorApp.create(page);

    // List samples
    const samples = await app.samples().list();
    const firstSample = samples[0];

    console.log('Loading sample:', firstSample);

    // Load first sample
    const newState = await app.samples().load(firstSample.id);
    console.log('State after load:', JSON.stringify(newState, null, 2));

    // Verify state transition
    expect(newState.location).toBe('editor');
    expect(newState.document?.loaded).toBe(true);
    expect(newState.document?.title).toBeDefined();
  });

  test('should query document state after loading sample', async ({ page }) => {
    const app = await TEIEditorApp.create(page);

    // Load first sample
    const samples = await app.samples().list();
    await app.samples().load(samples[0].id);

    // Query document
    const doc = await app.editor().getCurrent();
    console.log('Document info:', doc);

    expect(doc.title).toBeDefined();
    expect(doc.passageCount).toBeGreaterThan(0);

    // Alternative: get passage count directly
    const passageCount = await app.editor().getPassageCount();
    console.log('Passage count:', passageCount);
    expect(passageCount).toBeGreaterThan(0);
  });

  test('should detect sample exists', async ({ page }) => {
    const app = await TEIEditorApp.create(page);

    const samples = await app.samples().list();
    const firstSample = samples[0];

    const exists = await app.samples().exists(firstSample.id);
    expect(exists).toBe(true);

    const notExists = await app.samples().exists('nonexistent-sample');
    expect(notExists).toBe(false);
  });

  test('should wait for state transition', async ({ page }) => {
    const app = await TEIEditorApp.create(page);

    const samples = await app.samples().list();

    // Wait for editor state after loading sample
    const editorState = await app.samples().load(samples[0].id);
    console.log('Waited for state:', JSON.stringify(editorState, null, 2));

    expect(editorState.location).toBe('editor');
    expect(editorState.document?.loaded).toBe(true);
  });
});
