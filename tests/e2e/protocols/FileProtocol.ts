import { TEIEditorApp } from '../protocol/TEIEditorApp';
import { AppState } from '../protocol/StateMonitor';

export interface FileUploadOptions {
  name: string;
  mimeType: string;
  buffer: Buffer;
}

export class FileProtocol {
  constructor(private app: TEIEditorApp) {}

  async upload(options: FileUploadOptions): Promise<AppState> {
    // Ensure we're in editor state before trying to use file input
    await this.ensureEditorState();

    const fileInput = this.app.page().locator('input[type="file"]');
    await fileInput.setInputFiles(options);

    // Wait a moment for processing
    await this.app.page().waitForTimeout(500);

    // Check current state - may or may not have loaded successfully
    return await this.app.getState();
  }

  /**
   * Ensures the app is in editor state (with file input available).
   * Loads a sample if currently in gallery state.
   */
  private async ensureEditorState(): Promise<void> {
    const state = await this.app.getState();
    if (state.location === 'gallery') {
      const samples = await this.app.samples().list();
      if (samples.length === 0) {
        throw new Error('No samples available to load for initial editor state');
      }
      await this.app.samples().load(samples[0].id);
    }
  }

  async uploadRaw(content: string, filename: string = 'test.xml'): Promise<AppState> {
    return await this.upload({
      name: filename,
      mimeType: 'text/xml',
      buffer: Buffer.from(content, 'utf-8'),
    });
  }

  async uploadInvalid(content: string, filename: string = 'invalid.txt'): Promise<AppState> {
    return await this.upload({
      name: filename,
      mimeType: 'text/plain',
      buffer: Buffer.from(content, 'utf-8'),
    });
  }

  async uploadBinary(buffer: Buffer, filename: string = 'test.bin'): Promise<AppState> {
    return await this.upload({
      name: filename,
      mimeType: 'application/octet-stream',
      buffer,
    });
  }
}
