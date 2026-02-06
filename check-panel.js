const { chromium } = require('./node_modules/playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  await page.goto('http://localhost:3000');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(500);

  // Upload a document
  const validXml = `<?xml version="1.0" encoding="UTF-8"?>
<TEI xmlns="http://www.tei-c.org/ns/1.0">
  <teiHeader>
    <fileDesc>
      <titleStmt>
        <title>Test Document</title>
      </titleStmt>
      <publicationStmt>
        <publisher>Test</publisher>
      </publicationStmt>
      <sourceDesc>
        <p>Test</p>
      </sourceDesc>
    </fileDesc>
  </teiHeader>
  <text>
    <body>
      <p xml:id="p1">This is a test paragraph.</p>
    </body>
  </text>
</TEI>`;

  await page.locator('input[type="file"]').setInputFiles({
    name: 'test.tei.xml',
    mimeType: 'text/xml',
    buffer: Buffer.from(validXml, 'utf-8'),
  });

  await page.waitForTimeout(2000);

  console.log('Before click - Panel elements:', await page.locator('[role="region"][aria-label="Validation Results"]').count());

  // Click Validation button
  await page.getByRole('button', { name: 'Validation' }).click();
  await page.waitForTimeout(500);

  console.log('After click - Panel elements:', await page.locator('[role="region"][aria-label="Validation Results"]').count());

  // Look for ANY card that might be the panel
  const allCards = await page.locator('Card, .card, [class*="card"]').count();
  console.log('Card elements:', allCards);

  // Look for ValidationPanel by checking for text content
  const hasValidationText = await page.getByText(/Validation/i).count();
  console.log('Elements with "Validation" text:', hasValidationText);

  // Get all visible cards
  const visibleCards = await page.locator('div[class*="Card"], div[class*="card"]').all();
  console.log('Card-like divs:', visibleCards.length);

  await browser.close();
})();
