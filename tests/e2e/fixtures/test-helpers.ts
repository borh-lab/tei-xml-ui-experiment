import { Page, expect } from '@playwright/test';
import { writeFileSync, unlinkSync } from 'fs';
import { join } from 'path';

/**
 * Uploads a test document to the editor
 */
export async function uploadTestDocument(page: Page, doc: { name: string; content: string }): Promise<void> {
  // Check if a document is already loaded
  const hasDocument = await page.locator('[id^="passage-"]').count() > 0;

  if (!hasDocument) {
    // No document loaded, we need to get to the editor first
    // Navigate to home page if not already there
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Try to load a sample to get into editor mode
    // The SampleGallery has cards with "Load Sample" buttons
    // Find any "Load Sample" button and click it
    const loadButton = page.getByRole('button', { name: 'Load Sample' }).first();

    const buttonCount = await loadButton.count();
    if (buttonCount > 0) {
      await loadButton.click();
      await page.waitForLoadState('networkidle');
      await page.waitForSelector('[id^="passage-"]', { state: 'attached', timeout: 10000 });
    } else {
      // No Load Sample button found, try direct file upload
      const fileInput = page.locator('input[type="file"]');
      const hasFileInput = await fileInput.count();

      if (hasFileInput === 0) {
        throw new Error('Cannot load document - no Load Sample button and no file input visible');
      }
    }
  }

  // Now upload the test document
  const tempPath = join(process.cwd(), 'tests/fixtures', 'temp-test.tei.xml');
  writeFileSync(tempPath, doc.content);

  // Wait for file input to be present in DOM (it's hidden but should exist after document loads)
  await page.waitForSelector('input[type="file"]', { state: 'attached', timeout: 5000 });
  const fileInput = page.locator('input[type="file"]');
  await fileInput.setInputFiles(tempPath);

  // Wait for document to be processed
  await page.waitForTimeout(500);
  await page.waitForSelector('[id^="passage-"]', { state: 'attached', timeout: 10000 });

  // Clean up
  unlinkSync(tempPath);
}

/**
 * Downloads and verifies TEI export
 */
export async function verifyTEIExport(page: Page, expectedContent: string[]): Promise<void> {
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: /export/i }).click();
  const download = await downloadPromise;

  expect(download.suggestedFilename()).toMatch(/\.tei?xml$/);

  // Read the downloaded file - createReadStream returns a Promise
  const stream = await download.createReadStream();
  const buffer = await new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream.on('data', (chunk: Buffer) => chunks.push(chunk));
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', reject);
  });
  const xml = buffer.toString();

  // Verify XML structure
  expect(xml).toContain('<?xml');
  expect(xml).toContain('<TEI');

  // Verify expected content
  for (const expected of expectedContent) {
    expect(xml).toContain(expected);
  }
}

/**
 * Waits for editor to be ready
 */
export async function waitForEditorReady(page: Page): Promise<void> {
  await page.waitForLoadState('networkidle');
  await page.waitForSelector('[id^="passage-"]', { timeout: 10000 });
}

/**
 * Captures and asserts on console errors
 */
export async function mockConsoleErrors(page: Page): Promise<string[]> {
  const errors: string[] = [];

  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });

  return errors;
}

/**
 * Generates a test TEI document
 */
export function generateTestDocument(options: {
  speakers: string[];
  passages: number;
  namespaces?: boolean;
  declarations?: boolean;
}): string {
  const { speakers, passages, namespaces = true, declarations = true } = options;

  let xml = '';

  if (declarations) {
    xml += '<?xml version="1.0" encoding="UTF-8"?>\n';
  }

  const ns = namespaces ? ' xmlns="http://www.tei-c.org/ns/1.0"' : '';

  xml += `<TEI${ns}>\n`;
  xml += '  <teiHeader>\n';
  xml += '    <fileDesc>\n';
  xml += '      <titleStmt>\n';
  xml += '        <title>Test Document</title>\n';
  xml += '      </titleStmt>\n';
  xml += '    </fileDesc>\n';
  xml += '  </teiHeader>\n';
  xml += '  <text>\n';
  xml += '    <body>\n';

  // Generate cast list
  xml += '      <castList>\n';
  speakers.forEach((speaker, i) => {
    xml += `        <castItem>\n`;
    xml += `          <role xml:id="${speaker}">${speaker}</role>\n`;
    xml += `        </castItem>\n`;
  });
  xml += '      </castList>\n';

  // Generate passages
  for (let i = 0; i < passages; i++) {
    const speaker = speakers[i % speakers.length];
    xml += '      <p>\n';
    xml += `        <s who="#${speaker}">Test passage ${i + 1}</s>\n`;
    xml += '      </p>\n';
  }

  xml += '    </body>\n';
  xml += '  </text>\n';
  xml += '</TEI>\n';

  return xml;
}

/**
 * Loads a sample document from the card-based gallery
 */
export async function loadSample(page: Page, sampleId: string): Promise<void> {
  await page.goto('/');
  await page.waitForLoadState('networkidle');

  // Check if a document is already loaded (app auto-loads a sample)
  const passageCount = await page.locator('[id^="passage-"]').count();

  if (passageCount > 0) {
    // A document is already loaded, we need to navigate back to the gallery
    // Click on the app title or reload to get back to gallery
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  }

  // Map sample IDs to their actual titles as displayed in the UI
  const titleMap: Record<string, string> = {
    'yellow-wallpaper': 'The Yellow Wallpaper',
    'gift-of-the-magi': 'The Gift of the Magi',
    'tell-tale-heart': 'The Tell-Tale Heart',
    'owl-creek-bridge': 'An Occurrence at Owl Creek Bridge',
    'pride-prejudice-ch1': 'Pride and Prejudice'
  };

  const title = titleMap[sampleId] || sampleId;

  // Wait for the gallery to be visible
  await page.waitForSelector('text=Sample Gallery', { timeout: 5000 });

  // Find all "Load Sample" buttons
  const loadButtons = page.getByRole('button', { name: 'Load Sample' });

  // Get the count of buttons
  const buttonCount = await loadButtons.count();

  // Find the button that's in the same card as our title
  for (let i = 0; i < buttonCount; i++) {
    const button = loadButtons.nth(i);
    // Check if this button's card contains the title we want
    const card = button.locator('xpath=ancestor::div[contains(@class, "hover:shadow")][1]');
    const cardText = await card.textContent();
    if (cardText && cardText.includes(title)) {
      await button.click();
      break;
    }
  }

  // Wait for the editor to be ready (document should be loaded)
  await waitForEditorReady(page);
}

/**
 * Checks if a document is already loaded (for handling auto-load on first visit)
 */
export async function hasDocumentLoaded(page: Page): Promise<boolean> {
  await page.waitForLoadState('networkidle');
  const passageCount = await page.locator('[id^="passage-"]').count();
  return passageCount > 0;
}

/**
 * Annotates a passage with a speaker
 */
export async function annotatePassage(page: Page, index: number, speaker: string): Promise<void> {
  const passage = page.locator('[id^="passage-"]').nth(index);
  await passage.click();

  // Press the number key corresponding to speaker index
  const speakerIndex = parseInt(speaker.replace(/\D/g, '')) || 1;
  await page.keyboard.press(speakerIndex.toString());

  // Wait for annotation to apply
  await page.waitForTimeout(100);
}

/**
 * Triggers TEI export and waits for download
 */
export async function exportDocument(page: Page): Promise<any> {
  const downloadPromise = page.waitForEvent('download');
  // Use more specific selector to avoid ambiguity between Export TEI and Export HTML
  await page.getByRole('button', { name: 'Export TEI' }).click();
  return await downloadPromise;
}

/**
 * Creates a minimal TEI document for edge case testing
 */
export function createMinimalTEI(options: { passages?: number[] }): string {
  const { passages = [] } = options;

  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<TEI xmlns="http://www.tei-c.org/ns/1.0">\n';
  xml += '  <teiHeader>\n';
  xml += '    <fileDesc>\n';
  xml += '      <titleStmt><title>Minimal</title></titleStmt>\n';
  xml += '    </fileDesc>\n';
  xml += '  </teiHeader>\n';
  xml += '  <text>\n';
  xml += '    <body>\n';

  if (passages.length === 0) {
    xml += '      <p></p>\n';
  } else {
    passages.forEach((text, i) => {
      xml += `      <p><s>Passage ${text}</s></p>\n`;
    });
  }

  xml += '    </body>\n';
  xml += '  </text>\n';
  xml += '</TEI>\n';

  return xml;
}

/**
 * Creates a malformed TEI document for error testing
 */
export function createMalformedTEI(options: { error: 'unclosed-tag' | 'invalid-xml' | 'missing-root' }): string {
  const { error } = options;

  switch (error) {
    case 'unclosed-tag':
      return '<?xml version="1.0"?><TEI><body><p>Unclosed';
    case 'invalid-xml':
      return '<?xml version="1.0"?><TEI><body><p>&invalid;</p></body></TEI>';
    case 'missing-root':
      return '<?xml version="1.0"?><body><p>No root</p></body>';
    default:
      return '<?xml version="1.0"?><TEI></TEI>';
  }
}
