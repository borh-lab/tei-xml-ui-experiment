import { Page, expect } from '@playwright/test';
import { waitForEditorReady, annotatePassage, exportDocument, hasDocumentLoaded } from '../fixtures/test-helpers';

export class EditorPage {
  constructor(private page: Page) {}

  /**
   * Goes to the home page and waits for editor to be ready.
   * In the single-page app, the editor appears after loading any document.
   */
  async goto() {
    await this.page.goto('/');
    await this.page.waitForLoadState('networkidle');

    // Check if a document is already loaded (auto-load on first visit)
    const hasLoaded = await hasDocumentLoaded(this.page);

    if (!hasLoaded) {
      // No document loaded, we're on welcome screen
      // Load a sample to get into editor mode
      const loadButton = this.page.getByRole('button', { name: 'Load Sample' }).first();
      const buttonCount = await loadButton.count();

      if (buttonCount > 0) {
        await loadButton.click();
        await this.page.waitForLoadState('networkidle');
        await waitForEditorReady(this.page);
      } else {
        // No sample available, this is a test setup issue
        throw new Error('No Load Sample button available - cannot initialize tests');
      }
    } else {
      // Document is auto-loaded, ensure editor is ready
      await waitForEditorReady(this.page);
    }
  }

  /**
   * Checks if the editor is currently visible (document is loaded)
   */
  async isEditorVisible() {
    const passageCount = await this.page.locator('[id^="passage-"]').count();
    return passageCount > 0;
  }

  async annotatePassage(index: number, speaker: string) {
    await annotatePassage(this.page, index, speaker);
  }

  async exportTEI() {
    return await exportDocument(this.page);
  }

  async openCommandPalette() {
    await this.page.keyboard.press('Meta+k');
    await expect(this.page.getByPlaceholder(/search/i)).toBeVisible();
  }

  async openBulkOperations() {
    await this.page.keyboard.press('Meta+b');
    await expect(this.page.getByText(/Bulk Operations/i)).toBeVisible();
  }

  async openVisualizations() {
    await this.page.getByRole('button', { name: /Visualizations/i }).click();
  }

  getPassage(index: number) {
    return this.page.locator('[id^="passage-"]').nth(index);
  }

  getPassages() {
    return this.page.locator('[id^="passage-"]');
  }

  /**
   * Loads a sample document from the sample gallery
   */
  async loadSample(sampleId: string) {
    // Click on the sample card with the matching title
    await this.page.getByRole('button', { name: new RegExp(sampleId, 'i') }).click();
    // Wait for the "Load Sample" button to appear
    await expect(this.page.getByRole('button', { name: /load sample/i })).toBeVisible();
    // Click the Load Sample button
    await this.page.getByRole('button', { name: /load sample/i }).click();
  }

  /**
   * Waits for a document to be loaded in the editor
   */
  async waitForDocumentLoaded() {
    await this.page.waitForSelector('[id^="passage-"]', { state: 'attached', timeout: 10000 });
    await this.page.waitForLoadState('networkidle');
  }
}
