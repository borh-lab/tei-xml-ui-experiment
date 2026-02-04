// tests/unit/ax-provider.test.ts

// Mock the Ax framework to avoid TransformStream polyfill issues
jest.mock('@ax-llm/ax', () => ({
  ax: jest.fn(),
  ai: jest.fn(() => ({ name: 'mocked-ai' })),
}));

jest.mock('@ax-llm/ax-ai-sdk-provider', () => ({
  createOpenAI: jest.fn(),
}));

import { AxProvider } from '@/lib/ai/ax-provider';

describe('AxProvider', () => {
  test('should initialize with provider name', () => {
    const provider = new AxProvider('openai', 'test-key');
    expect(provider.providerName).toBe('openai');
  });

  test('should have detectDialogue method', async () => {
    const provider = new AxProvider('openai', 'test-key');
    expect(provider.detectDialogue).toBeDefined();
  });

  test('should detect dialogue using regex fallback', async () => {
    const provider = new AxProvider('openai', 'test-key');
    const text = 'He said "Hello world" and then left.';
    const spans = await provider.detectDialogue(text);

    expect(spans).toHaveLength(1);
    expect(spans[0].text).toBe('Hello world');
    expect(spans[0].confidence).toBeGreaterThan(0);
  });
});

describe('AxProvider API Key Management', () => {
  test('should throw error when no API key provided', () => {
    expect(() => {
      new AxProvider('openai', '');
    }).toThrow('API key not provided');
  });

  test('should accept API key from environment variable', () => {
    const originalKey = process.env.OPENAI_API_KEY;
    process.env.OPENAI_API_KEY = 'test-key';
    const provider = new AxProvider('openai');
    expect(provider).toBeDefined();
    process.env.OPENAI_API_KEY = originalKey;
  });

  test('should prioritize parameter over environment variable', () => {
    const originalKey = process.env.OPENAI_API_KEY;
    process.env.OPENAI_API_KEY = 'env-key';
    const provider = new AxProvider('openai', 'param-key');
    expect(provider).toBeDefined();
    process.env.OPENAI_API_KEY = originalKey;
  });
});
