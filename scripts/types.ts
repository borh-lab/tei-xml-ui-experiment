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
  encodingType: 'dialogue-focused' | 'dramatic-text' | 'minimal-markup' | 'mixed';
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
  corpora: Record<
    string,
    {
      train: string[];
      validation: string[];
      test: string[];
      excluded: string[];
    }
  >;
  summary: {
    totalDocuments: number;
    trainCount: number;
    valCount: number;
    testCount: number;
    excludedCount: number;
  };
}

export interface TEIFileInfo {
  path: string;
  size: number;
  isTEI: boolean;
  isValid: boolean;
  error?: string;
}

export interface TagAnalysis {
  tagName: string;
  count: number;
  attributes: Record<string, number>;
}
