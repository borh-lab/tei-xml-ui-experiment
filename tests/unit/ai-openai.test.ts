// @ts-nocheck
/**
 * Tests for OpenAIProvider
 */

import { OpenAIProvider } from '@/lib/ai/openai';

describe('OpenAI Provider', () => {
  test('should accept API key in constructor', () => {
    const provider = new OpenAIProvider('test-api-key');
    expect(provider).toBeDefined();
  });

  test('should detect dialogue with regex pattern', async () => {
    const provider = new OpenAIProvider('test-key');
    const result = await provider.detectDialogue('"Hello," she said.');

    expect(result).toHaveLength(1);
    expect(result[0].text).toContain('Hello');
    expect(result[0].start).toBe(0);
    expect(result[0].end).toBe(8);
    expect(result[0].confidence).toBe(0.8);
  });

  test('should detect multiple dialogue passages', async () => {
    const provider = new OpenAIProvider('test-key');
    const result = await provider.detectDialogue('"Hello," she said. "How are you?" he asked.');

    expect(result).toHaveLength(2);
    expect(result[0].text).toBe('Hello,');
    expect(result[1].text).toBe('How are you?');
  });

  test('should return empty array when no dialogue found', async () => {
    const provider = new OpenAIProvider('test-key');
    const result = await provider.detectDialogue('This is just regular text.');

    expect(result).toHaveLength(0);
  });

  test('should attribute speaker with placeholder implementation', async () => {
    const provider = new OpenAIProvider('test-key');
    const characters = [
      { xmlId: 'char1', name: 'Alice' },
      { xmlId: 'char2', name: 'Bob' },
    ];

    const result = await provider.attributeSpeaker('Some dialogue', characters);

    // Should return first character's xmlId as placeholder
    expect(result).toBe('char1');
  });

  test('should return empty string when no characters available', async () => {
    const provider = new OpenAIProvider('test-key');
    const result = await provider.attributeSpeaker('Some dialogue', []);

    expect(result).toBe('');
  });

  test('should validate consistency with placeholder implementation', async () => {
    const provider = new OpenAIProvider('test-key');
    const result = await provider.validateConsistency({});

    // Should return empty array as placeholder
    expect(result).toEqual([]);
  });
});
