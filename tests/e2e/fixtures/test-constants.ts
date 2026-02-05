// @ts-nocheck
/** Test URLs */
export const URLS = {
  HOME: '/',
  EDITOR: '/editor',
  SAMPLES: '/samples',
} as const;

/** Common selectors */
export const SELECTORS = {
  PASSAGE: '[id^="passage-"]',
  SAMPLE_GALLERY: '[data-testid="sample-gallery"]',
  COMMAND_PALETTE: '[data-testid="command-palette"]',
  BULK_PANEL: '[data-testid="bulk-operations"]',
  VIZ_PANEL: '[data-testid="visualizations"]',
} as const;

/** Test timeouts (ms) */
export const TIMEOUTS = {
  PAGE_LOAD: 30000,
  NETWORK_IDLE: 10000,
  ELEMENT_VISIBLE: 5000,
  AI_SUGGESTION: 10000,
} as const;

/** Mobile viewport sizes */
export const VIEWPORTS = {
  IPHONE_SE: { width: 375, height: 667, name: 'iPhone SE' },
  IPHONE_12: { width: 390, height: 844, name: 'iPhone 12 Pro' },
  ANDROID: { width: 360, height: 640, name: 'Android' },
  IPAD: { width: 768, height: 1024, name: 'iPad' },
  IPAD_PRO: { width: 1024, height: 1366, name: 'iPad Pro' },
  DESKTOP: { width: 1280, height: 720, name: 'Desktop' },
} as const;

/** Test sample names */
export const SAMPLES = {
  YELLOW_WALLPAPER: 'yellow-wallpaper',
  GIFT_OF_THE_MAGI: 'gift-of-the-magi',
  PRIDE_AND_PREJUDICE: 'pride-prejudice-ch1',
} as const;

/** Speaker names for testing */
export const SPEAKERS = {
  NARRATOR: 'narrator',
  DELLA: 'della',
  JIM: 'jim',
  PROTAGONIST: 'protagonist',
} as const;
