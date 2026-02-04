export interface TEICorpus {
  id: string;
  name: string;
  path: string;
  description?: string;
  encoding?: string;
  version?: string;
  files: TEIFile[];
  metadata?: {
    totalFiles: number;
    totalSize: number;
    tags: TagFrequency[];
    encodingTypes: Record<string, number>;
    versions: Record<string, number>;
    dateProcessed: string;
  };
}

export interface TEIFile {
  id: string;
  path: string;
  fileName: string;
  size: number;
  isValid: boolean;
  errors?: ValidationError[];
  warnings?: ValidationWarning[];
  encoding?: string;
  version?: string;
  tags?: Tag[];
  metadata?: {
    title?: string;
    author?: string;
    date?: string;
    language?: string;
  };
}

export interface ValidationError {
  line: number;
  column: number;
  message: string;
  severity: 'error' | 'warning';
  rule?: string;
}

export interface ValidationWarning {
  line: number;
  column: number;
  message: string;
  severity: 'warning';
  rule?: string;
}

export interface Tag {
  name: string;
  count: number;
  attributes: Record<string, number>;
  context?: string[];
}

export interface TagFrequency {
  tag: string;
  count: number;
  percentage: number;
  files: string[];
}

export interface EncodingType {
  name: string;
  confidence: number;
  signature?: string;
  examples: string[];
}

export interface AnalysisResult {
  corpus: TEICorpus;
  summary: {
    totalFiles: number;
    totalSize: number;
    validFiles: number;
    invalidFiles: number;
    uniqueTags: number;
    encodingTypes: Record<string, number>;
    versions: Record<string, number>;
  };
  insights: {
    mostFrequentTags: TagFrequency[];
    encodingDistribution: Record<string, number>;
    versionDistribution: Record<string, number>;
    qualityMetrics: {
      averageErrorsPerFile: number;
      averageWarningsPerFile: number;
      errorRate: number;
    };
  };
}