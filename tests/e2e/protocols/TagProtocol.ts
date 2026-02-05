import { TEIEditorApp } from '../protocol/TEIEditorApp';

export class TagProtocol {
  constructor(private app: TEIEditorApp) {}

  async apply(tagName: string, attributes?: Record<string, string>): Promise<void> {
    const button = this.app.page().locator(
      `[data-test-action="apply-tag"][data-test-tag="${tagName}"]`
    );

    const count = await button.count();

    if (count === 0) {
      throw new Error(`Tag not found: ${tagName}`);
    }

    await button.first().click();

    // Wait for any loading/state changes
    await this.app.page().waitForTimeout(200);
  }

  async getAvailableTags(): Promise<string[]> {
    return await this.app.page().evaluate(() => {
      const buttons = document.querySelectorAll('[data-test-action="apply-tag"]');
      return Array.from(buttons)
        .map((b) => b.getAttribute('data-test-tag'))
        .filter((t): t is string => t !== null);
    });
  }

  async isToolbarVisible(): Promise<boolean> {
    const toolbar = this.app.page().locator('[data-test-panel="tag-toolbar"]');
    const count = await toolbar.count();

    if (count === 0) {
      return false;
    }

    const state = await toolbar.first().getAttribute('data-test-state');
    return state === 'visible';
  }

  async getToolbarState(): Promise<'visible' | 'hidden' | null> {
    const toolbar = this.app.page().locator('[data-test-panel="tag-toolbar"]');
    const count = await toolbar.count();

    if (count === 0) {
      return null;
    }

    const state = await toolbar.first().getAttribute('data-test-state');
    return state as 'visible' | 'hidden' | null;
  }
}
