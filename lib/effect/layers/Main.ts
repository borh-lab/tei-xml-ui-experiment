/**
 * Main Effect Layer
 *
 * Combines all service layers into a single application layer.
 * This provides all Effect services to the application.
 */

import { Layer, Runtime } from 'effect';
import { DocumentService } from './services/DocumentService';
import { StorageService } from './services/StorageService';
import { ValidationService } from './services/ValidationService';
import { AIService } from './services/AIService';

/**
 * Main Layer
 *
 * Provides all Effect services to the application.
 * Use this to provide the Effect runtime to your application.
 */
export const MainLayer = Layer.mergeAll(
  DocumentServiceLive,
  StorageServiceLive,
  ValidationServiceLive,
  AIServiceLive
);

/**
 * Effect Runtime
 *
 * Default runtime configured with all services.
 * Use this to run Effect programs in React components.
 */
export const effectRuntime = Runtime.defaultRuntime.pipe(
  Runtime.provideLayers(MainLayer)
);

/**
 * Run Effect Program
 *
 * Convenience function to run Effect programs with all services provided.
 *
 * @example
 * ```tsx
 * import { runEffect } from '@/lib/effect/layers/Main';
 *
 * const result = await runEffect(
 *   DocumentService.getDocument()
 * );
 * ```
 */
export async function runEffect<A>(program: Effect.Effect<A>): Promise<A> {
  return Effect.runPromise(program, {
    runtime: effectRuntime,
  });
}

// Re-export service implementations
export { DocumentServiceLive, TestDocumentService } from './services/DocumentService';
export { BrowserStorageService, TestStorageService } from './services/StorageService';
export { BrowserValidationService, TestValidationService } from './services/ValidationService';
export { OpenAIService, TestAIService } from './services/AIService';

// Re-export protocols
export { DocumentService } from './protocols/Document';
export { StorageService } from './protocols/Storage';
export { ValidationService } from './protocols/Validation';
export { AIService } from './protocols/AI';
