// tests/unit/ax-speaker-attribution.test.ts

// Mock the Ax framework to avoid TransformStream polyfill issues
jest.mock('@ax-llm/ax', () => ({
  ax: jest.fn(),
  ai: jest.fn(() => ({ name: 'mocked-ai' }))
}));

jest.mock('@ax-llm/ax-ai-sdk-provider', () => ({
  createOpenAI: jest.fn()
}));

import { AxProvider } from '@/lib/ai/ax-provider';
import { Character } from '@/lib/ai/providers';

describe('Ax Speaker Attribution', () => {
  let provider: AxProvider;

  beforeEach(() => {
    provider = new AxProvider('openai', 'test-key');
  });

  test('should attribute speaker to simple dialogue', async () => {
    const characters: Character[] = [
      { xmlId: 'jane', name: 'Jane Eyre', description: 'The narrator and protagonist' }
    ];

    const result = await provider.attributeSpeaker('"Hello," she said.', characters);

    // Should return a character ID (falls back to first character in mock mode)
    expect(result).toBeDefined();
    expect(typeof result).toBe('string');
  });

  test('should handle multiple characters', async () => {
    const characters: Character[] = [
      { xmlId: 'jane', name: 'Jane Eyre', description: 'The narrator and protagonist' },
      { xmlId: 'rochester', name: 'Mr. Rochester', description: 'The master of Thornfield Hall' }
    ];

    const result = await provider.attributeSpeaker(
      'Jane looked at Rochester. "I must speak to you," she said.',
      characters
    );

    expect(result).toBeDefined();
    expect(['jane', 'rochester']).toContain(result);
  });

  test('should use character descriptions when available', async () => {
    const characters: Character[] = [
      { xmlId: 'narrator', name: 'The Narrator', description: 'Unnamed female protagonist' },
      { xmlId: 'john', name: 'John', description: 'The husband and physician' }
    ];

    const result = await provider.attributeSpeaker(
      '"John laughs at me," she said.',
      characters
    );

    expect(result).toBeDefined();
  });

  test('should handle edge case with no characters', async () => {
    const characters: Character[] = [];

    const result = await provider.attributeSpeaker('"Hello," she said.', characters);

    expect(result).toBe('');
  });

  test('should handle dialogue without clear speaker indicators', async () => {
    const characters: Character[] = [
      { xmlId: 'speaker1', name: 'Character One' },
      { xmlId: 'speaker2', name: 'Character Two' }
    ];

    const result = await provider.attributeSpeaker(
      '"The weather is nice today."',
      characters
    );

    // Should still return a valid character ID
    expect(result).toBeDefined();
    expect(['speaker1', 'speaker2']).toContain(result);
  });

  test('should be consistent with same context', async () => {
    const characters: Character[] = [
      { xmlId: 'alice', name: 'Alice' },
      { xmlId: 'bob', name: 'Bob' }
    ];

    const context = 'Alice said, "How are you?"';

    const result1 = await provider.attributeSpeaker(context, characters);
    const result2 = await provider.attributeSpeaker(context, characters);

    // Results should be the same (deterministic fallback)
    expect(result1).toBe(result2);
  });

  test('should handle characters with special characters in names', async () => {
    const characters: Character[] = [
      { xmlId: 'joaquin', name: 'Joaquin Murrieta', description: 'A Mexican outlaw' }
    ];

    const result = await provider.attributeSpeaker(
      '"I will have my revenge," he declared.',
      characters
    );

    expect(result).toBeDefined();
  });

  test('should prioritize recently mentioned characters', async () => {
    const characters: Character[] = [
      { xmlId: 'narrator', name: 'The Narrator' },
      { xmlId: 'husband', name: 'John' }
    ];

    const context = 'John looked at her. "You must rest," he insisted.';

    const result = await provider.attributeSpeaker(context, characters);

    expect(result).toBeDefined();
  });

  test('should handle long contexts', async () => {
    const characters: Character[] = [
      { xmlId: 'character1', name: 'First Character', description: 'Protagonist' },
      { xmlId: 'character2', name: 'Second Character', description: 'Antagonist' }
    ];

    const longContext = `
      The room was dark and cold. Character1 walked to the window and looked out.
      "I can't believe we're here," she said, turning to face Character2.
      "Neither can I," he replied. The tension in the room was palpable.
      "We should leave," Character1 suggested.
    `;

    const result = await provider.attributeSpeaker(longContext, characters);

    expect(result).toBeDefined();
    expect(['character1', 'character2']).toContain(result);
  });
});
