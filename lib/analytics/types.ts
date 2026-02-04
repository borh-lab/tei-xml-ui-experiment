/**
 * Protocol types for corpus analytics feature.
 * All types use readonly interfaces for immutability.
 */

export interface Quote {
  readonly id: string;
  readonly speaker: string;
  readonly addressee?: string;
  readonly text: string;
}

export interface CharacterRanking {
  readonly characterId: string;
  readonly characterName: string;
  readonly quoteCount: number;
  readonly percent: number;
}

export interface ConversationMatrix {
  readonly matrix: ReadonlyMap<string, ReadonlyMap<string, number>>;
  readonly totalInteractions: number;
}

export type DocumentAnalysisResult =
  | { readonly _tag: 'success'; readonly rankings: readonly CharacterRanking[]; readonly matrix: ConversationMatrix }
  | { readonly _tag: 'error'; readonly error: string };

export interface CorpusMetadata {
  readonly format: 'corpus-metadata-v1';
  readonly generatedAt: string;
  readonly novels: readonly NovelMetadata[];
}

export interface NovelMetadata {
  readonly filename: string;
  readonly title: string;
  readonly totalQuotes: number;
  readonly uniqueSpeakers: number;
  readonly topSpeakers: readonly CharacterRanking[];
}

export type ComparisonResult =
  | { readonly _tag: 'available'; readonly percentiles: ReadonlyMap<string, number> }
  | { readonly _tag: 'unavailable'; readonly reason: string };
