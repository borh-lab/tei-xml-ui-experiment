import { Page, expect } from '@playwright/test';

export class VisualizationPage {
  constructor(private page: Page) {}

  async open() {
    await this.page.getByRole('button', { name: /Visualizations/i }).click();
  }

  async getCharacterNetwork() {
    return this.page.getByText(/Character Network/i);
  }

  async getStatistics() {
    return this.page.getByText(/Statistics/i);
  }

  async getReactFlow() {
    return this.page.locator('.react-flow').first();
  }
}
