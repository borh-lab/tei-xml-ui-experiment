// @ts-nocheck
/**
 * Demo Recording
 *
 * Pure functions for recording browser interactions as WebM videos.
 * No global state - inputs in, value out.
 */

import { chromium, type Browser, type Page, type BrowserContext } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { existsSync } from 'node:fs';

import { demos, pathFor, layout, type DemoConfig, type Step } from './demo-config.js';
import {
  waitForStable,
  clickWithDelay,
  pause,
  smoothTransition,
  clearLocalStorage
} from './recording-helpers.js';
import { optimizeVideo } from './video-optimizer.js';

/**
 * Step primitives - map step names to functions.
 * Each step does one thing explicitly.
 */
const primitives = {
  goto: (page: Page, url: string) => page.goto(url),
  click: (page: Page, selector: string) => clickWithDelay(page, selector),
  press: (page: Page, key: string) => page.keyboard.press(key),
  waitForSelector: (page: Page, selector: string) => page.waitForSelector(selector),
  waitForStable: (page: Page) => waitForStable(page),
  pause: (page: Page, ms: number) => pause(page, ms),
  clearLocalStorage: (page: Page) => clearLocalStorage(page)
} as const;

/**
 * Execute a sequence of steps on a page.
 * Interprets step arrays and calls appropriate primitives.
 *
 * @param page - Playwright page instance
 * @param steps - Array of step tuples to execute
 */
async function executeSteps(page: Page, steps: readonly Step[]): Promise<void> {
  for (const step of steps) {
    const [name, ...args] = step;

    const fn = primitives[name as keyof typeof primitives];
    if (!fn) {
      throw new Error(`Unknown step: ${name}`);
    }

    await fn(page, ...(args as [Page, ...unknown[]]));
  }
}

/**
 * Record a single demo video.
 *
 * Pure function: input (name, config) → output (video path).
 * No mutation, no global state.
 *
 * @param name - Demo name (key in demos object)
 * @param config - Demo configuration with steps
 * @returns Path to generated video file
 * @throws Error if recording fails
 */
export async function recordDemo(
  name: string,
  config: DemoConfig
): Promise<string> {
  // Create temp directory for raw recording
  const outputDir = join(tmpdir(), `demo-${Date.now()}`);
  await mkdir(outputDir, { recursive: true });

  let browser: Browser | null = null;
  let context: BrowserContext | null = null;

  try {
    // Launch browser and setup video recording
    browser = await chromium.launch({
      headless: true,
      args: ['--disable-dev-shm-usage']
    });

    context = await browser.newContext({
      recordVideo: {
        dir: outputDir,
        size: { width: 1280, height: 720 }
      },
      viewport: { width: 1280, height: 720 }
    });

    const page = await context.newPage();

    console.error(`[DEBUG] Recording demo: ${name}`);
    console.error(`[DEBUG] Video dir: ${outputDir}`);

    // Execute recording steps
    await executeSteps(page, config.steps);

    // Take a screenshot to verify rendering
    const screenshotPath = join(outputDir, `${name}-screenshot.png`);
    await page.screenshot({ path: screenshotPath, fullPage: false });
    console.error(`[DEBUG] Screenshot saved to: ${screenshotPath}`);

    // Give video recording a moment to finalize
    await page.waitForTimeout(1000);

    // Get video path from recording
    const video = page.video();
    if (!video) {
      throw new Error(`No video recorded for: ${name}`);
    }

    const rawPath = await video.path();
    console.error(`[DEBUG] Video path: ${rawPath}`);

    const finalPath = pathFor(name, config);

    // Verify video file exists and has content
    const { stat } = await import('node:fs/promises');
    try {
      const stats = await stat(rawPath);
      console.error(`[DEBUG] Video size: ${stats.size} bytes`);
      if (stats.size === 0) {
        throw new Error(`Video file is empty: ${rawPath}`);
      }
    } catch (error) {
      console.error(`[DEBUG] Error checking video: ${error}`);
      throw new Error(`Video file not found: ${rawPath}`);
    }

    // Ensure output directory exists
    const dir = finalPath.substring(0, finalPath.lastIndexOf('/'));
    if (!existsSync(dir)) {
      await mkdir(dir, { recursive: true });
    }

    // For now, just copy the raw video without optimization
    const { copyFile } = await import('node:fs/promises');
    await copyFile(rawPath, finalPath);
    console.error(`[DEBUG] Copied video to: ${finalPath}`);

    // TODO: Re-enable optimization once recording is stable
    // await optimizeVideo(rawPath, finalPath, config.type);

    return finalPath;
  } finally {
    // Cleanup: close browser and context
    if (context) await context.close();
    if (browser) await browser.close();
  }
}

/**
 * Record all defined demos.
 *
 * Pure function: returns array of generated paths.
 * No mutation, no side effects beyond video generation.
 *
 * @returns Array of paths to generated video files
 */
export async function recordAll(): Promise<string[]> {
  const entries = Object.entries(demos);

  // Map: pure transformation, no mutation
  const recordings = await Promise.all(
    entries.map(([name, config]) => recordDemo(name, config))
  );

  return recordings;
}

/**
 * Record demos matching a filter string.
 *
 * @param filter - Substring to match demo names
 * @returns Array of paths to generated video files
 */
export async function recordMatching(filter: string): Promise<string[]> {
  const matches = Object.entries(demos).filter(([name]) =>
    name.includes(filter)
  );

  if (matches.length === 0) {
    console.warn(`No demos found matching: ${filter}`);
    return [];
  }

  const recordings = await Promise.all(
    matches.map(([name, config]) => recordDemo(name, config))
  );

  return recordings;
}

/**
 * List all available demo names.
 *
 * @returns Array of demo names
 */
export function listDemos(): string[] {
  return Object.keys(demos);
}

/**
 * Get demo configuration by name.
 *
 * @param name - Demo name
 * @returns Demo configuration or undefined
 */
export function getDemoConfig(name: string): DemoConfig | undefined {
  return demos[name as keyof typeof demos];
}
