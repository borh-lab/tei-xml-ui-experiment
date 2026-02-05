// @ts-nocheck
/**
 * Demo Configuration
 *
 * Defines all video demos for documentation generation.
 * Each demo has a type (highlight or workflow) and a sequence of steps to execute.
 */

export type DemoType = 'highlight' | 'workflow';

export type Step =
  | ['goto', string]
  | ['click', string]
  | ['press', string]
  | ['waitForSelector', string]
  | ['waitForStable']
  | ['pause', number]
  | ['clearLocalStorage'];

export interface DemoConfig {
  type: DemoType;
  steps: readonly Step[];
}

/**
 * Demo definitions - pure data describing what to record.
 *
 * Highlights (5-10s): Short, replace inline screenshots, autoplay
 * Workflows (15-60s): Full feature demonstrations, with controls
 */
export const demos = {
  // Test demo - basic functionality
  'test-basic': {
    type: 'highlight' as const,
    steps: [
      ['goto', 'http://localhost:3000/'],
      ['clearLocalStorage'],
      ['goto', 'http://localhost:3000/'],
      ['pause', 3000], // Wait for app to hydrate
      ['press', 'j'], // Trigger navigation (visual change)
      ['pause', 500], // Small pause
      ['press', 'k'], // Navigate back (visual change)
      ['pause', 500],
      ['press', 'j'], // Navigate again
      ['pause', 2000], // Hold final state
    ]
  } as const,
  // === HIGHLIGHTS ===
  // Short videos that replace static screenshots in documentation
  // Characteristics: autoplay, loop, no controls, lower bitrate

  'ai-suggestions': {
    type: 'highlight' as const,
    steps: [
      ['goto', 'http://localhost:3000/'],
      ['clearLocalStorage'],
      ['goto', 'http://localhost:3000/'],
      ['waitForStable'],
      ['pause', 2000], // Wait for auto-load to complete
      ['press', 'Alt+s'], // Use keyboard shortcut instead of click
      ['pause', 8000], // Wait for AI analysis (heuristic fallback)
      ['waitForSelector', ':has-text("AI Suggestions")'],
      ['waitForStable'],
      ['pause', 2000] // Show suggestions panel
    ]
  } as const,

  'command-palette': {
    type: 'highlight' as const,
    steps: [
      ['goto', 'http://localhost:3000/'],
      ['waitForStable'],
      ['press', 'Meta+k'],
      ['waitForSelector', 'input[placeholder*="search" i]'],
      ['pause', 1500] // Show command palette
    ]
  } as const,

  'bulk-operations': {
    type: 'highlight' as const,
    steps: [
      ['goto', 'http://localhost:3000/'],
      ['waitForStable'],
      ['press', 'Meta+b'],
      ['waitForSelector', ':has-text("Bulk Operations")'],
      ['pause', 1500] // Show bulk operations panel
    ]
  } as const,

  'keyboard-shortcuts': {
    type: 'highlight' as const,
    steps: [
      ['goto', 'http://localhost:3000/'],
      ['waitForStable'],
      ['press', '?'],
      ['waitForSelector', ':has-text("Keyboard Shortcuts")'],
      ['pause', 2000] // Show shortcuts help
    ]
  } as const,

  'character-network': {
    type: 'highlight' as const,
    steps: [
      ['goto', 'http://localhost:3000/'],
      ['waitForStable'],
      ['click', 'button:has-text("Visualizations")'],
      ['waitForSelector', ':has-text("Character Network")'],
      ['waitForStable'],
      ['pause', 2000] // Show character network visualization
    ]
  } as const,

  // === WORKFLOWS ===
  // Full feature demonstrations showing complete user journeys
  // Characteristics: with controls, no autoplay, higher bitrate

  'annotation-workflow': {
    type: 'workflow' as const,
    steps: [
      ['goto', 'http://localhost:3000/'],
      ['waitForSelector', '.passage'],
      ['click', '.passage:first-child'],
      ['pause', 500],
      ['press', '1'],
      ['waitForStable'],
      ['pause', 1000],
      ['press', 'j'],
      ['pause', 500],
      ['press', 'k'],
      ['pause', 500]
    ]
  } as const,

  'ai-assisted-session': {
    type: 'workflow' as const,
    steps: [
      ['goto', 'http://localhost:3000/'],
      ['waitForStable'],
      ['click', 'button:has-text("AI Suggest")'],
      ['waitForSelector', ':has-text("AI Suggestions")'],
      ['waitForStable'],
      ['pause', 2000],
      // Accept first suggestion
      ['click', 'button:has-text("accept") >> nth=0'],
      ['waitForStable'],
      ['pause', 1500]
    ]
  } as const,

  'bulk-operations-workflow': {
    type: 'workflow' as const,
    steps: [
      ['goto', 'http://localhost:3000/'],
      ['waitForStable'],
      ['press', 'Meta+b'],
      ['waitForSelector', ':has-text("Bulk Operations")'],
      ['pause', 1000],
      ['press', 'Shift+Meta+u'],
      ['pause', 2000],
      ['press', 'Escape']
    ]
  } as const
};

/**
 * Single source of truth for file system layout.
 * Change paths here, affects all demos.
 */
export const layout = {
  highlightDir: 'docs/videos/highlights',
  workflowDir: 'docs/videos/workflows',
  docsDir: 'docs'
} as const;

/**
 * Compute output path for a demo.
 * Paths are derived, not stored - separation of concerns.
 */
export function pathFor(name: string, config: DemoConfig): string {
  const base =
    config.type === 'highlight' ? layout.highlightDir : layout.workflowDir;
  return `${base}/${name}.webm`;
}

/**
 * Get all demo names by type.
 */
export function getDemosByType(type: DemoType): string[] {
  return Object.entries(demos)
    .filter(([, config]) => config.type === type)
    .map(([name]) => name);
}

/**
 * Get demo config by name.
 */
export function getDemo(name: string): DemoConfig | undefined {
  return demos[name as keyof typeof demos];
}
