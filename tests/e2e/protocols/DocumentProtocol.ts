import { TEIEditorApp } from '../protocol/TEIEditorApp';
import { AppState } from '../protocol/StateMonitor';
import { TEIDocumentValue } from '../fixtures/TEIDocument';
import { TEISerializer } from '../fixtures/TEISerializer';

export class DocumentProtocol {
  constructor(private app: TEIEditorApp) {}

  async load(doc: TEIDocumentValue): Promise<AppState> {
    const xml = TEISerializer.serialize(doc);
    const buffer = Buffer.from(xml, 'utf-8');

    // Check if we're in gallery state (no document loaded yet)
    const currentState = await this.app.getState();

    if (currentState.location === 'gallery') {
      // Need to load a sample first to get to editor state
      const samples = await this.app.samples().list();
      if (samples.length === 0) {
        throw new Error('No samples available to load for initial editor state');
      }
      await this.app.samples().load(samples[0].id);
    }

    // Now we're in editor state, file input should be available
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

  /**
   * Load a document directly from XML string (bypasses file input)
   * This is useful for testing where we want to load documents without going through FileUpload component
   */
  async loadFromXml(xml: string, filename = 'test.tei.xml'): Promise<AppState> {
    // Check if we're in gallery state
    const currentState = await this.app.getState();

    if (currentState.location === 'gallery') {
      // Load a sample first to get to editor state
      const samples = await this.app.samples().list();
      if (samples.length === 0) {
        throw new Error('No samples available to load for initial editor state');
      }
      await this.app.samples().load(samples[0].id);
    }

    // Use the loadSample functionality but with our custom XML
    // This will upload via the file input which triggers FileUpload component
    const fileInput = this.app.page().locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: filename,
      mimeType: 'text/xml',
      buffer: Buffer.from(xml, 'utf-8'),
    });

    // Wait for document to load and UI to render
    await this.app.waitForState({
      location: 'editor',
      document: { loaded: true },
    }, 15000);

    // Additional wait for UI to render
    await this.app.page().waitForTimeout(1000);

    return await this.app.getState();
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
