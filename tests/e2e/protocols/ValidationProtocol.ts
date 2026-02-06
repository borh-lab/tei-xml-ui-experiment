import { TEIEditorApp } from '../protocol/TEIEditorApp';
import { AppState } from '../protocol/StateMonitor';

export interface ValidationError {
  line?: number;
  column?: number;
  message: string;
  severity: 'error' | 'warning';
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  schema?: string;
}

export class ValidationProtocol {
  constructor(private app: TEIEditorApp) {}

  /**
   * Opens the validation panel
   */
  async openPanel(): Promise<void> {
    const page = this.app.page();

    // Wait for Validation button to be available
    await page.getByRole('button', { name: 'Validation' }).waitFor({ state: 'visible' });
    await page.getByRole('button', { name: 'Validation' }).click();
    await page.waitForTimeout(300);

    // Wait for validation panel to appear in DOM
    // Note: We can't use state monitoring for panel states since they're not exposed
    await page.waitForTimeout(500);
  }

  /**
   * Closes the validation panel
   */
  async closePanel(): Promise<void> {
    const page = this.app.page();

    // Wait for Validation button to be available
    await page.getByRole('button', { name: 'Validation' }).waitFor({ state: 'visible' });
    await page.getByRole('button', { name: 'Validation' }).click();
    await page.waitForTimeout(300);

    // Wait for panel to disappear
    await page.waitForTimeout(500);
  }

  /**
   * Checks if validation panel is open
   */
  async isPanelOpen(): Promise<boolean> {
    const state = await this.app.getState();
    return state.panels.validation;
  }

  /**
   * Gets validation results from the UI
   */
  async getResults(): Promise<ValidationResult> {
    const page = this.app.page();

    // Check if document is valid
    const validTextExists = await page.getByText(/document is valid/i).count();
    const isValid = validTextExists > 0;

    // Get error alerts
    const errorAlerts = page.locator('[role="alert"]').filter({ hasText: /error|warning/i });
    const errorCount = await errorAlerts.count();

    const errors: ValidationError[] = [];
    for (let i = 0; i < errorCount; i++) {
      const alert = errorAlerts.nth(i);
      const text = await alert.textContent();
      if (text) {
        errors.push({
          message: text,
          severity: text.toLowerCase().includes('warning') ? 'warning' : 'error',
        });
      }
    }

    // Get current schema
    const schemaSelect = page.locator('#schema-select');
    const schema = await schemaSelect.inputValue().catch(() => 'unknown');

    return {
      isValid,
      errors,
      schema,
    };
  }

  /**
   * Gets the current validation schema
   */
  async getSchema(): Promise<string> {
    const page = this.app.page();
    const schemaSelect = page.locator('#schema-select');
    return await schemaSelect.inputValue();
  }

  /**
   * Sets the validation schema
   */
  async setSchema(schemaValue: string): Promise<void> {
    const page = this.app.page();
    const schemaSelect = page.locator('#schema-select');
    await schemaSelect.selectOption(schemaValue);
    await page.waitForTimeout(300);
  }

  /**
   * Gets available schema options
   */
  async getAvailableSchemas(): Promise<string[]> {
    const page = this.app.page();
    const schemaSelect = page.locator('#schema-select');
    const options = await schemaSelect.locator('option').allTextContents();
    return options;
  }

  /**
   * Waits for validation to complete
   */
  async waitForValidation(): Promise<ValidationResult> {
    await this.app.page().waitForTimeout(1000);
    return await this.getResults();
  }

  /**
   * Checks if there are validation errors displayed
   */
  async hasErrors(): Promise<boolean> {
    const page = this.app.page();
    const errorCount = await page.getByText(/validation failed|error/i).count();
    return errorCount > 0;
  }

  /**
   * Gets the number of validation errors
   */
  async getErrorCount(): Promise<number> {
    const page = this.app.page();
    return await page.getByText(/validation failed|error/i).count();
  }
}
