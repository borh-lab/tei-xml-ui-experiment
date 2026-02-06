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
      <p xml:id="p2">This is another test paragraph.</p>
    </body>
  </text>
</TEI>`;

  console.log('Uploading document...');
  await page.locator('input[type="file"]').setInputFiles({
    name: 'test.tei.xml',
    mimeType: 'text/xml',
    buffer: Buffer.from(validXml, 'utf-8'),
  });

  // Wait for state update
  await page.waitForTimeout(2000);

  console.log('\n=== Checking for Validation button ===');

  // Check for Validation button by role
  const validationButtonCount = await page.getByRole('button', { name: 'Validation' }).count();
  console.log('Validation buttons (by role):', validationButtonCount);

  // Get all buttons
  const allButtons = await page.locator('button').allTextContents();
  console.log('All buttons:', allButtons.filter(b => b.trim()));

  // Look specifically for "Validation" text in buttons
  const validationTextButtons = await page.locator('button', { hasText: 'Validation' }).count();
  console.log('Buttons with "Validation" text:', validationTextButtons);

  // Check toolbar specifically
  const toolbarButtons = await page.locator('.flex.items-center.gap-2.p-2.border-b button').allTextContents();
  console.log('Toolbar buttons:', toolbarButtons.filter(b => b.trim()));

  await browser.close();
})();
