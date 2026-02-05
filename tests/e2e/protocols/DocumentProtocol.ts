import { TEIEditorApp } from '../TEIEditorApp';
import { AppState } from '../StateMonitor';
import { TEIDocumentValue } from '../fixtures/TEIDocument';
import { TEISerializer } from '../fixtures/TEISerializer';

export class DocumentProtocol {
  constructor(private app: TEIEditorApp) {}

  async load(doc: TEIDocumentValue): Promise<AppState> {
    const xml = TEISerializer.serialize(doc);
    const buffer = Buffer.from(xml, 'utf-8');

    await this.app.page().locator('input[type="file"]').setInputFiles({
      name: 'test.tei.xml',
      mimeType: 'text/xml',
      buffer,
    });

    // Wait for state transition
    return await this.app.waitForState({
      location: 'editor',
      document: { loaded: true },
    });
  }

  async getCurrent(): Promise<{ title: string; passageCount: number }> {
    const state = await this.app.getState();

    return {
      title: state.document?.title || 'Untitled',
      passageCount: state.document?.passageCount || 0,
    };
  }

  async getPassageCount(): Promise<number> {
    const state = await this.app.getState();
    return state.document?.passageCount || 0;
  }

  async getTitle(): Promise<string> {
    const state = await this.app.getState();
    return state.document?.title || 'Untitled';
  }
}
