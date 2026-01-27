import { Page, expect } from '@playwright/test';
import { URLS } from '../fixtures/test-constants';

export class WelcomePage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto(URLS.HOME);
    await this.page.waitForLoadState('networkidle');
  }

  async loadSample(sampleName: string) {
    await this.page.getByText(new RegExp(sampleName, 'i')).click();
    await this.page.getByText('Load Sample').first().click();
    await this.page.waitForURL(/\/editor/);
  }

  async getSampleGallery() {
    return this.page.getByText(/Sample Gallery/i);
  }

  async getLoadSampleButtons() {
    return this.page.getByText('Load Sample');
  }
}
