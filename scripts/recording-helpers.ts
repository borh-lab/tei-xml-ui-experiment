// @ts-nocheck
/**
 * Recording Helpers
 *
 * Explicit timing primitives for video recording.
 * No hidden "smartness" - all behavior is visible and composable.
 */

import type { Page } from 'playwright';

/**
 * Clear localStorage to ensure fresh state.
 * Useful for ensuring auto-load triggers on page load.
 */
export async function clearLocalStorage(page: Page): Promise<void> {
  await page.evaluate(() => {
    localStorage.clear();
  });
}

/**
 * Wait for page to be stable:
 * - Network is idle (no pending requests)
 * - No CSS animations running
 *
 * Explicit behavior - no heuristics or adaptation.
 */
export async function waitForStable(page: Page): Promise<void> {
  await page.waitForLoadState('networkidle');
  await page.waitForFunction(() => {
    return document.getAnimations().length === 0;
  });
}

/**
 * Click an element with a small human-like delay.
 * Delay is explicit - no "smart" adaptation based on content.
 *
 * @param page - Playwright page instance
 * @param selector - CSS selector for element to click
 * @param delay - Milliseconds to wait after click (default: 100ms)
 */
export async function clickWithDelay(
  page: Page,
  selector: string,
  delay = 100
): Promise<void> {
  await page.waitForSelector(selector);
  await page.locator(selector).click();
  await page.waitForTimeout(delay);
}

/**
 * Fixed pause - duration is always explicit.
 * Never guesses timing based on "content analysis."
 *
 * @param page - Playwright page instance
 * @param ms - Milliseconds to pause
 */
export async function pause(page: Page, ms: number): Promise<void> {
  await page.waitForTimeout(ms);
}

/**
 * Smooth transition wrapper - wraps an action with timing.
 * Explicit about what it does:
 * 1. Execute the action
 * 2. Wait for page to stabilize
 * 3. Add standard post-action pause
 *
 * @param page - Playwright page instance
 * @param action - Async function to execute
 * @param postPause - Milliseconds to pause after action (default: 500ms)
 */
export async function smoothTransition(
  page: Page,
  action: () => Promise<void>,
  postPause = 500
): Promise<void> {
  await action();
  await waitForStable(page);
  await pause(page, postPause);
}

/**
 * Type a sequence of keys with human-like delays between keystrokes.
 *
 * @param page - Playwright page instance
 * @param text - Text to type
 * @param delay - Milliseconds between keystrokes (default: 50ms)
 */
export async function typeWithDelay(
  page: Page,
  text: string,
  delay = 50
): Promise<void> {
  for (const char of text) {
    await page.keyboard.type(char);
    await page.waitForTimeout(delay);
  }
}
