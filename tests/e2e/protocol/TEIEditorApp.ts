import { Page } from '@playwright/test';
import { StateMonitor, AppState } from './StateMonitor';
import { SampleProtocol } from '../protocols/SampleProtocol';
import { DocumentProtocol } from '../protocols/DocumentProtocol';
import { TagProtocol } from '../protocols/TagProtocol';
import { FileProtocol } from '../protocols/FileProtocol';
import { ValidationProtocol } from '../protocols/ValidationProtocol';

export class TEIEditorApp {
  private monitor: StateMonitor;
  private _samples?: SampleProtocol;
  private _editor?: DocumentProtocol;
  private _tags?: TagProtocol;
  private _files?: FileProtocol;
  private _validation?: ValidationProtocol;

  private constructor(private _page: Page, monitor: StateMonitor) {
    this.monitor = monitor;
  }

  static async create(page: Page): Promise<TEIEditorApp> {
    const monitor = new StateMonitor(page);
    const app = new TEIEditorApp(page, monitor);

    // Navigate to home and wait for initial state
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Wait for state to be initialized
    await app.waitForState({ location: 'gallery' });

    return app;
  }

  async getState(): Promise<AppState> {
    return await this.monitor.current();
  }

  async waitForState(expected: Partial<AppState>): Promise<AppState> {
    return await this.monitor.waitFor(expected);
  }

  samples(): SampleProtocol {
    if (!this._samples) {
      this._samples = new SampleProtocol(this);
    }
    return this._samples;
  }

  editor(): DocumentProtocol {
    if (!this._editor) {
      this._editor = new DocumentProtocol(this);
    }
    return this._editor;
  }

  tags(): TagProtocol {
    if (!this._tags) {
      this._tags = new TagProtocol(this);
    }
    return this._tags;
  }

  files(): FileProtocol {
    if (!this._files) {
      this._files = new FileProtocol(this);
    }
    return this._files;
  }

  validation(): ValidationProtocol {
    if (!this._validation) {
      this._validation = new ValidationProtocol(this);
    }
    return this._validation;
  }

  page(): Page {
    return this._page;
  }
}
