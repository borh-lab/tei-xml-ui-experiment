import { AIProvider, DialogueSpan } from '@/lib/ai/providers';

describe('AI Provider Interface', () => {
  test('should define provider interface', () => {
    const provider: AIProvider = {
      detectDialogue: async (text: string) => [],
      attributeSpeaker: async (context: string, characters) => '',
      validateConsistency: async (document) => [],
    };

    expect(provider.detectDialogue).toBeDefined();
    expect(provider.attributeSpeaker).toBeDefined();
    expect(provider.validateConsistency).toBeDefined();
  });
});
