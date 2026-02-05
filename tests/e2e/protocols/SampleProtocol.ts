import { TEIEditorApp } from '../TEIEditorApp';
import { AppState } from '../StateMonitor';

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
    const button = this.app
      .page()
      .locator(`[data-test-action="load-sample"][data-test-sample-id="${sampleId}"]`);

    const count = await button.count();

    if (count === 0) {
      throw new Error(`Sample not found: ${sampleId}`);
    }

    await button.first().click();

    // Wait for state transition to editor
    const newState = await this.app.waitForState({
      location: 'editor',
      document: { loaded: true },
    });

    return newState;
  }

  async exists(sampleId: string): Promise<boolean> {
    const samples = await this.list();
    return samples.some((s) => s.id === sampleId);
  }
}
