// @ts-nocheck
// lib/ai/ax-provider.ts
import { ax, ai } from '@ax-llm/ax';
import { AIProvider, DialogueSpan, Character, Issue } from './providers';
import { nlpDetectDialogue } from './nlp-provider';
import { logger } from '@/lib/utils/logger';

interface DetectedPassage {
  passageStartIndex: number;
  passageEndIndex: number;
  extractedText: string;
  isDialoguePassage: boolean;
  detectionConfidence: number;
}

export class AxProvider implements AIProvider {
  public providerName: string;
  private apiKey: string;
  private llm: unknown;
  private log;

  constructor(providerName: string, apiKey?: string) {
    this.providerName = providerName;
    this.log = logger.withContext({ module: 'AxProvider', provider: providerName });

    // Validate and get API key
    const key = apiKey || this.getEnvApiKey(providerName);

    if (!key || key.trim() === '') {
      throw new Error(
        `API key not provided for ${providerName}. Set ${this.getEnvVarName(providerName)} environment variable or pass apiKey parameter.`
      );
    }

    this.apiKey = key;

    // Initialize LLM based on provider name
    if (providerName === 'openai') {
      this.llm = ai({ name: 'openai', apiKey: this.apiKey });
      this.log.debug('OpenAI provider initialized');
    } else if (providerName === 'anthropic') {
      this.llm = ai({ name: 'anthropic', apiKey: this.apiKey });
      this.log.debug('Anthropic provider initialized');
    } else {
      throw new Error(`Unsupported provider: ${providerName}`);
    }
  }

  private getEnvApiKey(providerName: string): string | undefined {
    return process.env[this.getEnvVarName(providerName)];
  }

  private getEnvVarName(providerName: string): string {
    const envVars: Record<string, string> = {
      openai: 'OPENAI_API_KEY',
      anthropic: 'ANTHROPIC_API_KEY',
    };
    return envVars[providerName] || `${providerName.toUpperCase()}_API_KEY`;
  }

  async detectDialogue(textToAnalyze: string): Promise<DialogueSpan[]> {
    // Handle empty text
    if (!textToAnalyze || textToAnalyze.trim().length === 0) {
      return [];
    }

    try {
      // Improved signature with descriptive parameter names
      const dialogueDetectionSignature = ax(`
        novelText:string ->
        detectedPassages:array({
          passageStartIndex:number,
          passageEndIndex:number,
          extractedText:string,
          isDialoguePassage:boolean,
          detectionConfidence:number
        })
      `);

      const analysisResult = await dialogueDetectionSignature.forward(this.llm as never, {
        novelText: textToAnalyze,
      });

      // Map result to DialogueSpan format with clear variable names
      const dialogueSpans: DialogueSpan[] = analysisResult.detectedPassages
        .filter((passage: DetectedPassage) => passage.isDialoguePassage)
        .map((passage: DetectedPassage) => ({
          start: passage.passageStartIndex,
          end: passage.passageEndIndex,
          text: passage.extractedText,
          confidence: passage.detectionConfidence || 0.8,
        }));

      return dialogueSpans;
    } catch (error) {
      // Fallback to NLP-based detection on error
      this.log.warn('Ax detection failed, using NLP fallback', {
        error: error instanceof Error ? error.message : String(error),
      });
      return nlpDetectDialogue(textToAnalyze);
    }
  }

  // TODO: Consider using this regex-based fallback in the future
  // private _regexDetectDialogue(text: string): DialogueSpan[] {
  //   const spans: DialogueSpan[] = [];
  //
  //   // Pattern 1: Double-quoted dialogue
  //   const quoteRegex = /"([^"]+)"/g;
  //   let match;
  //   while ((match = quoteRegex.exec(text)) !== null) {
  //     spans.push({
  //       start: match.index,
  //       end: match.index + match[0].length,
  //       text: match[1],
  //       confidence: 0.7,
  //     });
  //   }
  //
  //   // Pattern 2: Em-dash dialogue (common in older literature)
  //   const dashRegex = /—([^—]+)—/g;
  //   while ((match = dashRegex.exec(text)) !== null) {
  //     spans.push({
  //       start: match.index,
  //       end: match.index + match[0].length,
  //       text: match[1].trim(),
  //       confidence: 0.6,
  //     });
  //   }
  //
  //   // Pattern 3: Single-quoted dialogue
  //   const singleQuoteRegex = /'([^']+)'/g;
  //   while ((match = singleQuoteRegex.exec(text)) !== null) {
  //     // Only if near speech verbs or dialogue indicators
  //     const contextStart = Math.max(0, match.index - 20);
  //     const contextEnd = Math.min(text.length, match.index + 50);
  //     const context = text.substring(contextStart, contextEnd).toLowerCase();
  //
  //     if (
  //       context.includes('said') ||
  //       context.includes('asked') ||
  //       context.includes('replied') ||
  //       context.includes('whispered') ||
  //       context.includes('shouted') ||
  //       context.includes('murmured')
  //     ) {
  //       spans.push({
  //         start: match.index,
  //         end: match.index + match[0].length,
  //         text: match[1],
  //         confidence: 0.5,
  //       });
  //     }
  //   }
  //
  //   return spans;
  // }

  async attributeSpeaker(
    dialoguePassage: string,
    availableCharacters: Character[]
  ): Promise<string> {
    // Handle edge cases
    if (!availableCharacters || availableCharacters.length === 0) {
      return '';
    }

    try {
      // Improved signature with descriptive parameter names
      const speakerAttributionSignature = ax(`
        dialogueContent:string,
        narrativeContext:string,
        candidateSpeakers:array({
          speakerIdentifier:string,
          speakerName:string,
          speakerDescription:string
        }) ->
        attributedSpeakerId:string,
        attributionConfidence:number,
        attributionReasoning:string
      `);

      const attributionResult = await speakerAttributionSignature.forward(this.llm as never, {
        dialogueContent: dialoguePassage,
        narrativeContext: dialoguePassage,
        candidateSpeakers: availableCharacters.map((character) => ({
          speakerIdentifier: character.xmlId,
          speakerName: character.name,
          speakerDescription: character.description || '',
        })),
      });

      return attributionResult.attributedSpeakerId;
    } catch (error) {
      // Fallback to heuristic-based attribution
      this.log.warn('Ax attribution failed, using heuristic fallback', {
        error: error instanceof Error ? error.message : String(error),
      });
      return this.heuristicAttributeSpeaker(dialoguePassage, availableCharacters);
    }
  }

  private heuristicAttributeSpeaker(context: string, characters: Character[]): string {
    if (!context || characters.length === 0) {
      return characters[0]?.xmlId || '';
    }

    const contextLower = context.toLowerCase();

    // Strategy 1: Look for character names mentioned near dialogue
    for (const character of characters) {
      const nameVariants = [character.name.toLowerCase(), character.xmlId.toLowerCase()];

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
    const speechVerbs = [
      'said',
      'replied',
      'asked',
      'answered',
      'whispered',
      'shouted',
      'murmured',
      'exclaimed',
    ];

    for (const character of characters) {
      const name = character.name.toLowerCase();

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
      const femaleChar = characters.find(
        (c) =>
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
      const maleChar = characters.find(
        (c) =>
          c.description?.toLowerCase().includes('man') ||
          c.description?.toLowerCase().includes('male') ||
          c.name.toLowerCase().includes('john') ||
          c.name.toLowerCase().includes('mr.') ||
          c.name.toLowerCase().includes('rochester')
      );
      if (maleChar) return maleChar.xmlId;
    }

    // Strategy 4: Return most recently mentioned character
    const lastMentioned = characters.find((character) => {
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

  async validateConsistency(_document: any): Promise<Issue[]> {
    // TODO: Implement with Ax signature
    return [];
  }
}
