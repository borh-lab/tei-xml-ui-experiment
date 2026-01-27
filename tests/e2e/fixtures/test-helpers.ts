import { Page, expect } from '@playwright/test';
import { writeFileSync, unlinkSync } from 'fs';
import { join } from 'path';

/**
 * Uploads a test document to the editor
 */
export async function uploadTestDocument(page: Page, doc: { name: string; content: string }): Promise<void> {
  const tempPath = join(process.cwd(), 'temp-test.tei.xml');
  writeFileSync(tempPath, doc.content);

  const fileInput = page.locator('input[type="file"]');
  await fileInput.setInputFiles(tempPath);

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
  await page.waitForSelector('.passage', { timeout: 10000 });
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
 * Loads a sample document
 */
export async function loadSample(page: Page, sampleName: string): Promise<void> {
  await page.goto('/');
  await page.waitForLoadState('networkidle');

  const samplePattern = new RegExp(sampleName, 'i');
  await page.getByText(samplePattern).click();
  await page.getByText('Load Sample').first().click();
  await waitForEditorReady(page);
}

/**
 * Annotates a passage with a speaker
 */
export async function annotatePassage(page: Page, index: number, speaker: string): Promise<void> {
  const passage = page.locator('.passage').nth(index);
  await passage.click();

  // Press the number key corresponding to speaker index
  const speakerIndex = parseInt(speaker.replace(/\D/g, '')) || 1;
  await page.keyboard.press(speakerIndex.toString());

  // Wait for annotation to apply
  await page.waitForTimeout(100);
}

/**
 * Triggers export and waits for download
 */
export async function exportDocument(page: Page): Promise<any> {
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: /export/i }).click();
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
