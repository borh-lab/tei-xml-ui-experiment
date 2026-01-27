import { Page, expect } from '@playwright/test';
import { waitForEditorReady, annotatePassage, exportDocument } from '../fixtures/test-helpers';

export class EditorPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/editor');
    await waitForEditorReady(this.page);
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
    return this.page.locator('.passage').nth(index);
  }

  getPassages() {
    return this.page.locator('.passage');
  }
}
