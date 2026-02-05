/**
 * Debug test for file upload
 */
import { test, expect } from '@playwright/test';
import { writeFileSync, unlinkSync, existsSync } from 'fs';
import { join } from 'path';
import { TEIEditorApp } from './TEIEditorApp';

test('debug file upload', async ({ page }) => {
  const app = await TEIEditorApp.create(page);

  // First, load a sample to get into editor mode
  await app.samples().load('yellow-wallpaper');
  const beforeState = await app.getState();
  console.log('Before upload:', JSON.stringify(beforeState, null, 2));

  // Create test file
  const testTEI = `<?xml version="1.0" encoding="UTF-8"?>
<TEI xmlns="http://www.tei-c.org/ns/1.0">
  <teiHeader><fileDesc><titleStmt><title>Test</title></titleStmt></fileDesc></teiHeader>
  <text><body><p><s who="#speaker1">Single passage</s></p></body></text>
</TEI>`;

  const tempPath = join(process.cwd(), 'tests/fixtures', 'debug-upload.tei.xml');
  writeFileSync(tempPath, testTEI);
  console.log('Created test file at:', tempPath);
  console.log('File exists:', existsSync(tempPath));

  // Find the file input
  const fileInput = page.locator('input[type="file"]');
  const count = await fileInput.count();
  console.log('File input count:', count);

  if (count > 0) {
    // Upload the file
    await fileInput.setInputFiles(tempPath);
    console.log('File input set');

    // Wait a bit
    await page.waitForTimeout(2000);

    // Check state after upload
    const afterState = await app.getState();
    console.log('After upload:', JSON.stringify(afterState, null, 2));

    // Check for any toasts or errors
    const toasts = page.locator('[role="alert"]').all();
    console.log('Toast count:', (await page.locator('[role="alert"]').count()));
  }

  // Cleanup
  if (existsSync(tempPath)) {
    unlinkSync(tempPath);
  }
});
