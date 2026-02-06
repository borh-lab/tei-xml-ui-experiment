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
  ValidationServiceLive,
  BrowserValidationService,
  TestValidationService,
} from '../services/ValidationService';

// V2 Protocols (new state protocol architecture)
export { DocumentProtocolLive, DocumentProtocolV2 } from '../protocols/DocumentV2';
export { ValidationProtocolLive } from '../protocols/ValidationV2';

// V2 State Types
export {
  initialState,
  isSuccess,
  isValidationStale,
  type DocumentState,
  type DocumentStatus,
  type ValidationSnapshot,
} from '../../values/DocumentState';

// EntityRepository is server-only - not included in MainLayer
// import {
//   EntityRepositoryLive,
// } from '../services/EntityRepository';
// TODO: Fix AIService provider implementation
// import { AIService, AIServiceLive, OpenAIService, TestAIService } from '../services/AIService';

/**
 * Main Layer
 *
 * Provides all Effect services to the application.
 * Use this to provide the Effect runtime to your application.
 *
 * NOTE: EntityRepositoryLive is NOT included here because it uses
 * Node.js-only FileSystem APIs. It must be provided separately on
 * the server side.
 */
export const MainLayer = Layer.mergeAll(
  DocumentServiceLive,
  StorageServiceLive,
  ValidationServiceLive
  // EntityRepositoryLive - server only, uses Node.js FileSystem
);

// Re-export service implementations
export { DocumentServiceLive, TestDocumentService } from '../services/DocumentService';
export { BrowserStorageService, TestStorageService } from '../services/StorageService';
export { BrowserValidationService, TestValidationService } from '../services/ValidationService';
export { EntityRepositoryLive, TestEntityRepository, createTestRepository } from '../services/EntityRepository';
// TODO: Fix AIService provider implementation
// export { OpenAIService, TestAIService } from '../services/AIService';

// Re-export protocols
export { DocumentService } from '../protocols/Document';
export { StorageService } from '../protocols/Storage';
export { ValidationService } from '../protocols/Validation';
export { EntityRepository } from '../protocols/EntityRepository';
// TODO: Fix AIService provider implementation
// export { AIService } from '../protocols/AI';
