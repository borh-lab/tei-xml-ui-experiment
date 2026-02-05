// @ts-nocheck
/**
 * Main Effect Layer
 *
 * Combines all service layers into a single application layer.
 * This provides all Effect services to the application.
 */

import { Layer } from 'effect';
import {
  DocumentServiceLive,
} from '../services/DocumentService';
import {
  StorageServiceLive,
} from '../services/StorageService';
import {
  ValidationService,
  ValidationServiceLive,
  BrowserValidationService,
  TestValidationService,
} from '../services/ValidationService';
// TODO: Fix AIService provider implementation
// import { AIService, AIServiceLive, OpenAIService, TestAIService } from '../services/AIService';

/**
 * Main Layer
 *
 * Provides all Effect services to the application.
 * Use this to provide the Effect runtime to your application.
 */
export const MainLayer = Layer.mergeAll(
  DocumentServiceLive,
  StorageServiceLive,
  ValidationServiceLive
);

// Re-export service implementations
export { DocumentServiceLive, TestDocumentService } from '../services/DocumentService';
export { BrowserStorageService, TestStorageService } from '../services/StorageService';
export { BrowserValidationService, TestValidationService } from '../services/ValidationService';
// TODO: Fix AIService provider implementation
// export { OpenAIService, TestAIService } from '../services/AIService';

// Re-export protocols
export { DocumentService } from '../protocols/Document';
export { StorageService } from '../protocols/Storage';
export { ValidationService } from '../protocols/Validation';
// TODO: Fix AIService provider implementation
// export { AIService } from '../protocols/AI';
