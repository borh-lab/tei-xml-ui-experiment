import { Page } from '@playwright/test';

export interface AppState {
  location: 'gallery' | 'editor' | 'welcome';
  document: { loaded: boolean; title?: string; passageCount?: number } | null;
  viewMode: 'wysiwyg' | 'xml' | 'split';
  panels: {
    validation: boolean;
    bulk: boolean;
    entities: boolean;
    viz: boolean;
  };
}

function matchState(actual: AppState, expected: Partial<AppState>): boolean {
  if (expected.location && actual.location !== expected.location) {
    return false;
  }

  if (expected.document) {
    if (expected.document.loaded !== undefined) {
      if (!actual.document || actual.document.loaded !== expected.document.loaded) {
        return false;
      }
    }
    if (expected.document.title && actual.document?.title !== expected.document.title) {
      return false;
    }
    if (expected.document.passageCount !== undefined) {
      if (actual.document?.passageCount !== expected.document.passageCount) {
        return false;
      }
    }
  }

  if (expected.viewMode && actual.viewMode !== expected.viewMode) {
    return false;
  }

  if (expected.panels) {
    if (expected.panels.validation !== undefined && actual.panels.validation !== expected.panels.validation) {
      return false;
    }
    if (expected.panels.bulk !== undefined && actual.panels.bulk !== expected.panels.bulk) {
      return false;
    }
    if (expected.panels.entities !== undefined && actual.panels.entities !== expected.panels.entities) {
      return false;
    }
    if (expected.panels.viz !== undefined && actual.panels.viz !== expected.panels.viz) {
      return false;
    }
  }

  return true;
}

export class StateMonitor {
  constructor(private page: Page) {}

  async current(): Promise<AppState> {
    const state = await this.page.evaluate(() => {
      return (window as any).__TEI_EDITOR_STATE__;
    });
    return state;
  }

  async waitFor(matcher: Partial<AppState>, timeout = 5000): Promise<AppState> {
    const state = await this.page.waitForFunction(
      (expected) => {
        const actual = (window as any).__TEI_EDITOR_STATE__;
        return matchState(actual, expected);
      },
      matcher,
      { timeout }
    );

    const result = await state.jsonValue();
    return result as unknown as AppState;
  }

  async onChange(callback: (state: AppState) => void): Promise<void> {
    await this.page.exposeFunction('onStateChange', callback);
    await this.page.evaluate(() => {
      let previousState = (window as any).__TEI_EDITOR_STATE__;
      const checkState = () => {
        const currentState = (window as any).__TEI_EDITOR_STATE__;
        if (JSON.stringify(previousState) !== JSON.stringify(currentState)) {
          previousState = currentState;
          (window as any).onStateChange(currentState);
        }
      };

      // Use MutationObserver to detect state changes
      const observer = new MutationObserver(checkState);
      observer.observe(document.body, { subtree: true, childList: true, attributes: true });

      // Also check periodically as a fallback
      setInterval(checkState, 100);
    });
  }
}
