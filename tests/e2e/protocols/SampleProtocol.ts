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

    console.log(`Clicking load button for sample: ${sampleId}`);
    await button.first().click();

    // Wait a bit for the document to start loading
    await this.app.page().waitForTimeout(2000);

    // Check current state after clicking
    const currentState = await this.app.getState();
    console.log('State after clicking load button:', JSON.stringify(currentState, null, 2));

    // Wait for state transition to editor (with longer timeout)
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
