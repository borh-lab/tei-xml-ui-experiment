// lib/corpora/types.ts

export type SplitType = 'train' | 'validation' | 'test';
export type EncodingType = 'dialogue-focused' | 'dramatic-text' | 'minimal-markup' | 'mixed';

export interface CorpusMetadata {
  name: string;
  sourceUrl: string;
  documentCount: number;
  totalSizeBytes: number;
  teiVersion: string[];
  tagFrequency: Record<string, number>;
  structuralPatterns: {
    usesSaid: boolean;
    usesQ: boolean;
    usesSp: boolean;
    usesWhoAttributes: boolean;
    nestingLevels: number;
  };
  encodingType: EncodingType;
  sampleDocuments: string[];
  issues: string[];
}

export interface SplitDefinition {
  version: string;
  generatedAt: string;
  config: {
    train: number;
    validation: number;
    test: number;
    seed: number;
  };
  corpora: Record<string, CorpusSplit>;
  summary: SplitSummary;
}

export interface CorpusSplit {
  train: string[];
  validation: string[];
  test: string[];
  excluded: string[];
}

export interface SplitSummary {
  totalDocuments: number;
  trainCount: number;
  valCount: number;
  testCount: number;
  excludedCount: number;
}

export interface CorpusDocument {
  corpusId: string;
  filePath: string;
  content: string;
  metadata: CorpusMetadata;
}