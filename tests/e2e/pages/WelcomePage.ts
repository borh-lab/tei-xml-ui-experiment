import { Page, expect } from '@playwright/test';
import { URLS } from '../fixtures/test-constants';
import { waitForEditorReady } from '../fixtures/test-helpers';

export class WelcomePage {
  constructor(private page: Page) {}

  async goto() {
    // Set a flag to skip auto-load and clear any previous visit state
    await this.page.goto('/');
    await this.page.evaluate(() => {
      // Set the visited flag to prevent auto-load, but clear skipAutoLoad to allow manual loading
      localStorage.setItem('tei-editor-visited', 'true');
      localStorage.removeItem('skipAutoLoad');
    });
    // Reload to apply the changes
    await this.page.reload();
    await this.page.waitForLoadState('networkidle');

    // Wait for sample gallery to be visible
    await expect(this.page.getByText(/Sample Gallery/i)).toBeVisible({ timeout: 10000 });
  }

  /**
   * Loads a sample from the card-based gallery
   * @param sampleId - The sample ID (e.g., 'yellow-wallpaper', 'gift-of-the-magi')
   *
   * Note: This is a simplified version that loads the first available sample.
   * For tests that need specific samples, we rely on matching content instead.
   */
  async loadSample(sampleId: string) {
    // Wait for the sample gallery to be visible
    await expect(this.page.getByText(/Sample Gallery/i)).toBeVisible();

    // For now, just click the first "Load Sample" button
    // The tests should be written to work with any sample
    const firstButton = this.page.getByRole('button', { name: 'Load Sample' }).first();
    await firstButton.click();

    // Wait for editor to be ready
    await waitForEditorReady(this.page);
  }

  /**
   * Gets all "Load Sample" buttons from the gallery cards
   */
  async getLoadSampleButtons() {
    return this.page.getByRole('button', { name: 'Load Sample' });
  }

  /**
   * Gets the sample gallery section
   */
  async getSampleGallery() {
    return this.page.getByText(/Sample Gallery/i);
  }

  /**
   * Checks if we're on the welcome screen (no document loaded)
   */
  async isWelcomeScreen() {
    const hasPassages = await this.page.locator('[id^="passage-"]').count();
    const hasGallery = await this.page.getByText(/Sample Gallery/i).count();
    return hasGallery > 0 && hasPassages === 0;
  }
}
