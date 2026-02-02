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
      // If no document is auto-loaded, we're on the welcome screen
      // Wait for user to load a sample or document
      await expect(this.page.getByText(/Sample Gallery/i)).toBeVisible();
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
}
