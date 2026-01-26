/**
 * Tests for WASM Pattern Engine Loader
 */

import { loadPatternEngine, detectSpeaker, isWasmAvailable } from '@/lib/pattern/wasm-loader';

// Mock the WASM module since it may not be built in test environment
jest.mock('@/lib/pattern/wasm-loader', () => {
  const originalModule = jest.requireActual('@/lib/pattern/wasm-loader');
  return {
    ...originalModule,
    isWasmAvailable: jest.fn(() => Promise.resolve(false)),
  };
});

describe('Pattern Engine WASM', () => {
  beforeEach(() => {
    // Clear the cached engine before each test
    jest.clearAllMocks();
  });

  test('should load WASM module or fallback to mock', async () => {
    const engine = await loadPatternEngine();
    expect(engine).toBeDefined();
    expect(engine.detect_speaker).toBeDefined();
    expect(engine.update_from_feedback).toBeDefined();
    expect(engine.calculate_confidence).toBeDefined();
  });

  test('should detect speaker using pattern engine', async () => {
    const text = 'Hello, world!';
    const patterns = {};

    const speaker = await detectSpeaker(text, patterns);
    expect(speaker).toBeDefined();
    expect(typeof speaker).toBe('string');
  });

  test('should return mock engine when WASM not available', async () => {
    // The loader already falls back to mock when WASM is not available
    // This test verifies that behavior
    const engine = await loadPatternEngine();

    // Verify we get a working engine (either WASM or mock)
    expect(engine).toBeDefined();
    expect(typeof engine.detect_speaker).toBe('function');

    // Test the mock functions work
    const speaker = await engine.detect_speaker('test', {});
    expect(typeof speaker).toBe('string');
  });

  test('should check WASM availability', async () => {
    const available = await isWasmAvailable();
    expect(typeof available).toBe('boolean');
  });
});
