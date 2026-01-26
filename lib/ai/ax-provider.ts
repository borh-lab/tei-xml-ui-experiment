// lib/ai/ax-provider.ts
import { ax, ai } from "@ax-llm/ax";
import { createOpenAI } from "@ax-llm/ax-ai-sdk-provider";
import { AIProvider, DialogueSpan, Character, Issue } from './providers';

export class AxProvider implements AIProvider {
  public providerName: string;
  private apiKey: string;
  private llm: any;

  constructor(providerName: string, apiKey: string) {
    this.providerName = providerName;
    this.apiKey = apiKey;

    // Initialize LLM based on provider name
    if (providerName === 'openai') {
      this.llm = ai({ name: 'openai', apiKey });
    } else if (providerName === 'anthropic') {
      this.llm = ai({ name: 'anthropic', apiKey });
    } else {
      throw new Error(`Unsupported provider: ${providerName}`);
    }
  }

  async detectDialogue(text: string): Promise<DialogueSpan[]> {
    // Handle empty text
    if (!text || text.trim().length === 0) {
      return [];
    }

    try {
      const signature = ax(`
        text:string ->
        passages:array({
          start:number,
          end:number,
          text:string,
          isDialogue:boolean,
          confidence:number
        })
      `);

      const result = await signature.forward(this.llm, { text });

      // Filter to only dialogue passages and map to DialogueSpan format
      const dialogueSpans: DialogueSpan[] = result.passages
        .filter((p: any) => p.isDialogue)
        .map((p: any) => ({
          start: p.start,
          end: p.end,
          text: p.text,
          confidence: p.confidence || 0.8
        }));

      return dialogueSpans;
    } catch (error) {
      // Fallback to regex on error
      console.warn('Ax detection failed, using regex fallback:', error);
      return this.regexDetectDialogue(text);
    }
  }

  private regexDetectDialogue(text: string): DialogueSpan[] {
    const spans: DialogueSpan[] = [];

    // Pattern 1: Double-quoted dialogue
    const quoteRegex = /"([^"]+)"/g;
    let match;
    while ((match = quoteRegex.exec(text)) !== null) {
      spans.push({
        start: match.index,
        end: match.index + match[0].length,
        text: match[1],
        confidence: 0.7
      });
    }

    // Pattern 2: Em-dash dialogue (common in older literature)
    const dashRegex = /—([^—]+)—/g;
    while ((match = dashRegex.exec(text)) !== null) {
      spans.push({
        start: match.index,
        end: match.index + match[0].length,
        text: match[1].trim(),
        confidence: 0.6
      });
    }

    // Pattern 3: Single-quoted dialogue
    const singleQuoteRegex = /'([^']+)'/g;
    while ((match = singleQuoteRegex.exec(text)) !== null) {
      // Only if near speech verbs or dialogue indicators
      const contextStart = Math.max(0, match.index - 20);
      const contextEnd = Math.min(text.length, match.index + 50);
      const context = text.substring(contextStart, contextEnd).toLowerCase();

      if (context.includes('said') || context.includes('asked') ||
          context.includes('replied') || context.includes('whispered') ||
          context.includes('shouted') || context.includes('murmured')) {
        spans.push({
          start: match.index,
          end: match.index + match[0].length,
          text: match[1],
          confidence: 0.5
        });
      }
    }

    return spans;
  }

  async attributeSpeaker(context: string, characters: Character[]): Promise<string> {
    // Handle edge cases
    if (!characters || characters.length === 0) {
      return '';
    }

    try {
      const signature = ax(`
        passage:string,
        context:string,
        knownSpeakers:array({
          id:string,
          name:string,
          description:string
        }) ->
        speakerId:string,
        confidence:number,
        reasoning:string
      `);

      const result = await signature.forward(this.llm, {
        passage: context,
        context,
        knownSpeakers: characters.map(c => ({
          id: c.xmlId,
          name: c.name,
          description: c.description || ''
        }))
      });

      return result.speakerId;
    } catch (error) {
      // Fallback to heuristic-based attribution
      console.warn('Ax attribution failed, using heuristic fallback:', error);
      return this.heuristicAttributeSpeaker(context, characters);
    }
  }

  private heuristicAttributeSpeaker(context: string, characters: Character[]): string {
    if (!context || characters.length === 0) {
      return characters[0]?.xmlId || '';
    }

    const contextLower = context.toLowerCase();

    // Strategy 1: Look for character names mentioned near dialogue
    for (const character of characters) {
      const nameVariants = [
        character.name.toLowerCase(),
        character.xmlId.toLowerCase()
      ];

      for (const name of nameVariants) {
        // Check if name appears within 100 characters before dialogue quotes
        const quoteIndex = contextLower.indexOf('"');
        if (quoteIndex !== -1) {
          const contextBefore = contextLower.substring(Math.max(0, quoteIndex - 100), quoteIndex);
          if (contextBefore.includes(name)) {
            return character.xmlId;
          }
        }
      }
    }

    // Strategy 2: Check for pronouns and speech verbs
    const speechVerbs = ['said', 'replied', 'asked', 'answered', 'whispered', 'shouted', 'murmured', 'exclaimed'];

    for (const character of characters) {
      const name = character.name.toLowerCase();
      const xmlId = character.xmlId.toLowerCase();

      // Look for patterns like "Jane said" or "he said" after character mention
      for (const verb of speechVerbs) {
        // Check for "Name said" pattern
        const nameSaidPattern = new RegExp(`${name}\\s+${verb}`, 'i');
        if (nameSaidPattern.test(context)) {
          return character.xmlId;
        }
      }
    }

    // Strategy 3: Pronoun-based attribution
    // If context has "she said", look for nearest female character
    if (contextLower.includes(' she said') || contextLower.includes(' she replied')) {
      const femaleChar = characters.find(c =>
        c.description?.toLowerCase().includes('woman') ||
        c.description?.toLowerCase().includes('female') ||
        c.name.toLowerCase().includes('jane') ||
        c.name.toLowerCase().includes('mary') ||
        c.name.toLowerCase().includes('elizabeth')
      );
      if (femaleChar) return femaleChar.xmlId;
    }

    // If context has "he said", look for nearest male character
    if (contextLower.includes(' he said') || contextLower.includes(' he replied')) {
      const maleChar = characters.find(c =>
        c.description?.toLowerCase().includes('man') ||
        c.description?.toLowerCase().includes('male') ||
        c.name.toLowerCase().includes('john') ||
        c.name.toLowerCase().includes('mr.') ||
        c.name.toLowerCase().includes('rochester')
      );
      if (maleChar) return maleChar.xmlId;
    }

    // Strategy 4: Return most recently mentioned character
    const lastMentioned = characters.find(character => {
      const name = character.name.toLowerCase();
      const lastIndex = contextLower.lastIndexOf(name);
      return lastIndex > contextLower.length / 2; // In second half of context
    });

    if (lastMentioned) {
      return lastMentioned.xmlId;
    }

    // Final fallback: First character
    return characters[0].xmlId;
  }

  async validateConsistency(document: any): Promise<Issue[]> {
    // TODO: Implement with Ax signature
    return [];
  }
}
