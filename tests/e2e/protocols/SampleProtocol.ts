import { TEIEditorApp } from '../protocol/TEIEditorApp';
import { AppState } from '../protocol/StateMonitor';

export interface Sample {
  id: string;
  title: string;
  state?: string;
}

export class SampleProtocol {
  constructor(private app: TEIEditorApp) {}

  async list(): Promise<Sample[]> {
    const state = await this.app.getState();

    if (state.location !== 'gallery') {
      throw new Error('Not on gallery page. Current location: ' + state.location);
    }

    // Wait for sample cards to be present
    await this.app.page().waitForSelector('[data-test-sample-card]', { state: 'attached', timeout: 10000 });

    return await this.app.page().evaluate(() => {
      const cards = document.querySelectorAll('[data-test-sample-card]');
      return Array.from(cards).map((card) => {
        const id = card.getAttribute('data-test-sample-id') || '';
        const titleEl = card.querySelector('[data-test-sample-title]');
        const title = titleEl?.textContent || '';
        const stateAttr = card.getAttribute('data-test-state') || undefined;

        return {
          id,
          title: title.trim(),
          state: stateAttr,
        };
      });
    });
  }

  async load(sampleId: string): Promise<AppState> {
    const page = this.app.page();

    // Wait for the button to be available
    const button = page.locator(`[data-test-action="load-sample"][data-test-sample-id="${sampleId}"]`);
    await button.waitFor({ state: 'visible', timeout: 10000 });

    const count = await button.count();

    if (count === 0) {
      throw new Error(`Sample not found: ${sampleId}`);
    }

    await button.first().click();

    // Wait for state transition to editor
    return await this.app.waitForState({
      location: 'editor',
      document: { loaded: true },
    });
  }

  async exists(sampleId: string): Promise<boolean> {
    const samples = await this.list();
    return samples.some((s) => s.id === sampleId);
  }
}
