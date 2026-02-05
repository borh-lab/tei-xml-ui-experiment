// @ts-nocheck
import { test, expect } from '@playwright/test';

test('debug - what is on the page', async ({ page }) => {
  // Capture console errors
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });

  // Capture page errors
  page.on('pageerror', (error) => {
    console.log('PAGE ERROR:', error.toString());
  });

  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await page.waitForLoadState('networkidle');

  // Log all console errors
  console.log('=== CONSOLE ERRORS ===');
  errors.forEach((err) => console.log(err));

  // Get all text on the page
  const allText = await page.evaluate(() => document.body.innerText);
  console.log('=== ALL TEXT ON PAGE ===');
  console.log(allText.substring(0, 2000));

  // Check for any specific text
  const hasGift = allText.includes('Gift of the Magi');
  const hasYellow = allText.includes('Yellow Wallpaper');
  const hasMagi = allText.includes('Magi');

  console.log('Has "Gift of the Magi":', hasGift);
  console.log('Has "Yellow Wallpaper":', hasYellow);
  console.log('Has "Magi":', hasMagi);

  // Check for passages
  const passages = await page.locator('[id^="passage-"]').count();
  console.log('Number of passages:', passages);

  // Take screenshot
  await page.screenshot({ path: 'debug-screenshot.png', fullPage: true });
  console.log('Screenshot saved to debug-screenshot.png');
});
