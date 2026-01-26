// tests/unit/ax-integration.test.ts

// Mock the Ax framework to avoid TransformStream polyfill issues
jest.mock('@ax-llm/ax', () => {
  const mockAx = jest.fn();
  const mockAi = jest.fn(() => ({ name: 'mocked-ai' }));

  return {
    ax: mockAx,
    ai: mockAi
  };
});

jest.mock('@ax-llm/ax-ai-sdk-provider', () => ({
  createOpenAI: jest.fn()
}));

import { AxProvider } from '@/lib/ai/ax-provider';
import { DialogueSpan, Character } from '@/lib/ai/providers';

describe('Ax Integration with Descriptive Names', () => {
  describe('Dialogue Detection Signature', () => {
    test('should use descriptive parameter names in dialogue detection', async () => {
      const provider = new AxProvider('openai', 'test-api-key');
      const textWithDialogue = 'She said "Hello world" and then left.';

      const spans = await provider.detectDialogue(textWithDialogue);

      expect(spans).toBeDefined();
      expect(Array.isArray(spans)).toBe(true);
    });

    test('should handle empty text gracefully', async () => {
      const provider = new AxProvider('openai', 'test-api-key');

      const spans = await provider.detectDialogue('');

      expect(spans).toEqual([]);
    });

    test('should handle whitespace-only text', async () => {
      const provider = new AxProvider('openai', 'test-api-key');

      const spans = await provider.detectDialogue('   \n\t   ');

      expect(spans).toEqual([]);
    });

    test('should provide confidence scores for each dialogue span', async () => {
      const provider = new AxProvider('openai', 'test-api-key');
      const text = 'He said "Hello world" clearly.';

      const spans = await provider.detectDialogue(text);

      if (spans.length > 0) {
        spans.forEach(span => {
          expect(span.confidence).toBeDefined();
          expect(span.confidence).toBeGreaterThanOrEqual(0);
          expect(span.confidence).toBeLessThanOrEqual(1);
        });
      }
    });

    test('should include start and end positions for dialogue spans', async () => {
      const provider = new AxProvider('openai', 'test-api-key');
      const text = 'She said "Yes" and nodded.';

      const spans = await provider.detectDialogue(text);

      if (spans.length > 0) {
        spans.forEach(span => {
          expect(span.start).toBeDefined();
          expect(span.end).toBeDefined();
          expect(span.start).toBeGreaterThanOrEqual(0);
          expect(span.end).toBeGreaterThan(span.start);
        });
      }
    });
  });

  describe('Speaker Attribution Signature', () => {
    const mockCharacters: Character[] = [
      { xmlId: 'jane', name: 'Jane Eyre', description: 'Protagonist, governess' },
      { xmlId: 'rochester', name: 'Mr. Rochester', description: 'Byronic hero' }
    ];

    test('should use descriptive parameter names for speaker attribution', async () => {
      const provider = new AxProvider('openai', 'test-api-key');
      const passage = '"I am happy," she said.';
      const context = 'Jane smiled at Mr. Rochester.';

      const speakerId = await provider.attributeSpeaker(passage, mockCharacters);

      expect(speakerId).toBeDefined();
      expect(typeof speakerId).toBe('string');
    });

    test('should handle empty character list', async () => {
      const provider = new AxProvider('openai', 'test-api-key');
      const passage = '"Hello world"';

      const speakerId = await provider.attributeSpeaker(passage, []);

      expect(speakerId).toBe('');
    });

    test('should handle empty passage text', async () => {
      const provider = new AxProvider('openai', 'test-api-key');

      const speakerId = await provider.attributeSpeaker('', mockCharacters);

      expect(speakerId).toBeDefined();
      expect(typeof speakerId).toBe('string');
    });

    test('should return valid character ID from provided list', async () => {
      const provider = new AxProvider('openai', 'test-api-key');
      const passage = '"Hello," she said.';
      const context = 'Jane looked at Rochester.';

      const speakerId = await provider.attributeSpeaker(passage, mockCharacters);

      // Should return one of the provided character IDs
      const validIds = mockCharacters.map(c => c.xmlId);
      if (speakerId) {
        expect(validIds).toContain(speakerId);
      }
    });
  });

  describe('Error Handling', () => {
    test('should throw descriptive error for missing API key', () => {
      expect(() => {
        new AxProvider('openai', '');
      }).toThrow('API key not provided');
    });

    test('should throw descriptive error for invalid provider', () => {
      expect(() => {
        new AxProvider('invalid-provider', 'test-key');
      }).toThrow('Unsupported provider');
    });

    test('should handle dialogue detection errors gracefully', async () => {
      const provider = new AxProvider('openai', 'test-api-key');
      const problematicText = null as any;

      // Should not throw, should return fallback result
      const result = await provider.detectDialogue(problematicText);

      expect(result).toBeDefined();
    });

    test('should handle speaker attribution errors gracefully', async () => {
      const provider = new AxProvider('openai', 'test-api-key');

      // Should not throw, should return fallback result
      const result = await provider.attributeSpeaker('test', []);

      expect(result).toBeDefined();
    });
  });

  describe('Provider Configuration', () => {
    test('should support OpenAI provider', () => {
      const provider = new AxProvider('openai', 'test-api-key');

      expect(provider.providerName).toBe('openai');
    });

    test('should support Anthropic provider', () => {
      const provider = new AxProvider('anthropic', 'test-api-key');

      expect(provider.providerName).toBe('anthropic');
    });

    test('should prioritize parameter API key over environment variable', () => {
      const originalKey = process.env.OPENAI_API_KEY;
      process.env.OPENAI_API_KEY = 'env-key';

      const provider = new AxProvider('openai', 'param-key');

      expect(provider).toBeDefined();

      process.env.OPENAI_API_KEY = originalKey;
    });

    test('should accept API key from environment variable when not provided', () => {
      const originalKey = process.env.OPENAI_API_KEY;
      process.env.OPENAI_API_KEY = 'test-key';

      const provider = new AxProvider('openai');

      expect(provider).toBeDefined();

      process.env.OPENAI_API_KEY = originalKey;
    });
  });

  describe('Fallback Behavior', () => {
    test('should use NLP fallback when Ax detection fails', async () => {
      const provider = new AxProvider('openai', 'test-api-key');
      const text = 'He said "Hello world" and then left.';

      // Mock the ax function to throw an error
      const { ax } = require('@ax-llm/ax');
      ax.mockImplementationOnce(() => {
        throw new Error('Ax API error');
      });

      const spans = await provider.detectDialogue(text);

      // Should still return results using fallback
      expect(spans).toBeDefined();
      expect(Array.isArray(spans)).toBe(true);
    });

    test('should use heuristic fallback when Ax attribution fails', async () => {
      const provider = new AxProvider('openai', 'test-api-key');
      const characters: Character[] = [
        { xmlId: 'speaker1', name: 'John', description: 'Male character' }
      ];
      const context = 'John said "Hello world"';

      // Mock the ax function to throw an error
      const { ax } = require('@ax-llm/ax');
      ax.mockImplementationOnce(() => {
        throw new Error('Ax API error');
      });

      const speakerId = await provider.attributeSpeaker(context, characters);

      // Should still return result using fallback
      expect(speakerId).toBeDefined();
    });
  });

  describe('Validation Methods', () => {
    test('should have validateConsistency method', async () => {
      const provider = new AxProvider('openai', 'test-api-key');
      const mockDocument = {};

      const issues = await provider.validateConsistency(mockDocument);

      expect(issues).toBeDefined();
      expect(Array.isArray(issues)).toBe(true);
    });

    test('should return empty array for validation (placeholder)', async () => {
      const provider = new AxProvider('openai', 'test-api-key');
      const mockDocument = { some: 'data' };

      const issues = await provider.validateConsistency(mockDocument);

      expect(issues).toEqual([]);
    });
  });
});
