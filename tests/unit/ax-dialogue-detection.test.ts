// tests/unit/ax-dialogue-detection.test.ts

// Mock the Ax framework to avoid TransformStream polyfill issues
jest.mock('@ax-llm/ax', () => ({
  ax: jest.fn(),
  ai: jest.fn(() => ({ name: 'mocked-ai' })),
}));

jest.mock('@ax-llm/ax-ai-sdk-provider', () => ({
  createOpenAI: jest.fn(),
}));

import { AxProvider } from '@/lib/ai/ax-provider';
import { DialogueSpan } from '@/lib/ai/providers';

describe('Ax Dialogue Detection', () => {
  let provider: AxProvider;

  beforeEach(() => {
    provider = new AxProvider('openai', 'test-key');
  });

  test('should detect simple quoted dialogue', async () => {
    const text = '"Hello," she said.';
    const result = await provider.detectDialogue(text);

    expect(result).toHaveLength(1);
    expect(result[0].text).toContain('Hello');
    expect(result[0].start).toBe(0);
    expect(result[0].confidence).toBeGreaterThan(0);
  });

  test('should detect multiple dialogue passages', async () => {
    const text = '"Hello," she said. "How are you?" he replied.';
    const result = await provider.detectDialogue(text);

    expect(result.length).toBeGreaterThanOrEqual(1);
    expect(result.some((span: DialogueSpan) => span.text.includes('Hello'))).toBe(true);
  });

  test('should detect dialogue with speech verbs', async () => {
    const text = 'She whispered, "I can\'t believe it," and then left.';
    const result = await provider.detectDialogue(text);

    expect(result.length).toBeGreaterThanOrEqual(1);
    expect(result.some((span: DialogueSpan) => span.text.includes("can't believe it"))).toBe(true);
  });

  test('should detect dialogue with em dashes', async () => {
    const text = '—Hello, she said.—How are you? he asked.';
    const result = await provider.detectDialogue(text);

    expect(result.length).toBeGreaterThanOrEqual(1);
  });

  test('should handle text without dialogue', async () => {
    const text = 'She walked to the store and bought some groceries.';
    const result = await provider.detectDialogue(text);

    // Should return empty array or low confidence detections
    expect(result).toBeInstanceOf(Array);
  });

  test('should handle nested quotes', async () => {
    const text = "She said, \"He told me, 'I'll be there soon,' and then left.\"";
    const result = await provider.detectDialogue(text);

    expect(result.length).toBeGreaterThanOrEqual(1);
  });

  test('should provide confidence scores', async () => {
    const text = '"Hello," she said.';
    const result = await provider.detectDialogue(text);

    result.forEach((span: DialogueSpan) => {
      expect(span.confidence).toBeGreaterThanOrEqual(0);
      expect(span.confidence).toBeLessThanOrEqual(1);
    });
  });

  test('should return correct character positions', async () => {
    const text = 'She said "hello world" to him.';
    const result = await provider.detectDialogue(text);

    result.forEach((span: DialogueSpan) => {
      expect(span.start).toBeLessThanOrEqual(span.end);
      expect(span.start).toBeGreaterThanOrEqual(0);
      expect(span.end).toBeLessThanOrEqual(text.length);
    });
  });

  test('should handle empty text', async () => {
    const text = '';
    const result = await provider.detectDialogue(text);

    expect(result).toEqual([]);
  });

  test('should handle special characters in dialogue', async () => {
    const text = '"Hello! How are you? I\'m fine," she said.';
    const result = await provider.detectDialogue(text);

    expect(result.length).toBeGreaterThanOrEqual(1);
  });
});
