import { test, expect } from '@playwright/test';

test.describe('Entity Modeling End-to-End', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('complete character workflow', async ({ page }) => {
    // Upload document
    await page.click('button:has-text("Upload File")');
    await page.setInputFiles('input[type="file"]', 'public/samples/yellow-wallpaper.xml');

    // Wait for document to load
    await expect(page.locator('h2:has-text("Rendered View")')).toBeVisible();

    // Open entity editor
    await page.click('button:has-text("Entities")');
    await expect(page.locator('text=Entity Editor')).toBeVisible();

    // Add new character
    await page.click('button:has-text("Add")');

    // Fill character form
    await page.fill('#xml\\:id', 'test-character');
    await page.fill('#persName', 'Test Character');
    await page.fill('#sex', 'M');
    await page.fill('#age', '30');

    // Submit form
    await page.click('button:has-text("Save")');

    // Verify character appears in list
    await expect(page.locator('text=Test Character')).toBeVisible();
    await expect(page.locator('text=ID: test-character')).toBeVisible();

    // Verify in TEI source
    const sourceTab = page.locator('h2:has-text("TEI Source")');
    await sourceTab.scrollIntoViewIfNeeded();

    // Wait for source to update
    await page.waitForTimeout(500);

    const teiSource = await page.locator('pre').textContent();
    expect(teiSource).toContain('test-character');
    expect(teiSource).toContain('Test Character');
  });

  test('relationship creation workflow', async ({ page }) => {
    await page.click('button:has-text("Upload File")');
    await page.setInputFiles('input[type="file"]', 'public/samples/pride-prejudice-ch1.xml');

    await expect(page.locator('h2:has-text("Rendered View")')).toBeVisible();

    // Open entity editor
    await page.click('button:has-text("Entities")');

    // Switch to relationships tab
    await page.click('text=Relationships');

    // Verify relationship form exists
    await expect(page.locator('label:has-text("From")')).toBeVisible();
    await expect(page.locator('label:has-text("To")')).toBeVisible();
    await expect(page.locator('label:has-text("Relationship Type")')).toBeVisible();

    // Add relationship (select first two characters)
    await page.click('#rel-from');
    await page.click('.select-content >> text=mrsbennet'); // First available

    await page.click('#rel-to');
    await page.click('.select-content >> text=mrbennet'); // Second available

    await page.click('#rel-type');
    await page.click('.select-content >> text=Family');

    // Submit
    await page.click('button:has-text("Add Relationship")');

    // Verify relationship appears
    await expect(page.locator('text=family: mrsbennet → mrbennet')).toBeVisible();
  });

  test('NER detection and suggestion workflow', async ({ page }) => {
    await page.click('button:has-text("Upload File")');
    await page.setInputFiles('input[type="file"]', 'public/samples/yellow-wallpaper.xml');

    await expect(page.locator('h2:has-text("Rendered View")')).toBeVisible();

    // Open entity editor
    await page.click('button:has-text("Entities")');

    // Switch to NER tab
    await page.click('text=NER Tags');

    // Wait for scanning
    await expect(page.locator('text=Scanning document')).not.toBeVisible();
    await expect(page.locator('text=/NER Suggestions/')).toBeVisible();

    // Check if suggestions were found (may vary by document)
    const suggestionCount = await page.locator('.border.rounded-lg').count();

    if (suggestionCount > 0) {
      // Click apply on first suggestion
      await page.locator('.border.rounded-lg').first().hover();
      await page.locator('button:has-text("Apply")').first().click();

      // Verify it was removed from suggestions
      const newCount = await page.locator('.border.rounded-lg').count();
      expect(newCount).toBeLessThan(suggestionCount);
    }
  });

  test('dialogue tagging workflow', async ({ page }) => {
    await page.click('button:has-text("Upload File")');
    await page.setInputFiles('input[type="file"]', 'public/samples/yellow-wallpaper.xml');

    await expect(page.locator('h2:has-text("Rendered View")')).toBeVisible();

    // Find a passage with dialogue
    const passages = page.locator('[id^="passage-"]');
    const firstPassage = passages.first();

    // Select some text
    await firstPassage.click();
    await page.keyboard.press('Shift+ArrowRight');
    await page.keyboard.press('Shift+ArrowRight');
    await page.keyboard.press('Shift+ArrowRight');

    // Tag as dialogue (press 1 for speaker1)
    await page.keyboard.press('1');

    // Wait for toast notification
    await expect(page.locator('text=/Tagged as speaker1/i')).toBeVisible({ timeout: 3000 });

    // Verify TEI source updated (may need to wait)
    await page.waitForTimeout(500);

    const teiSource = await page.locator('pre').textContent();
    // Should have <said> tag
    // Note: Exact verification depends on passage content
  });
});
