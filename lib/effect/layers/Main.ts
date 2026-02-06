/**
 * Main Effect Layer
 *
 * Exports all V2 protocols and utilities for use across the codebase.
 */

import { Layer } from 'effect';
import { DocumentProtocolLive, DocumentProtocolV2 } from '../protocols/DocumentV2';
import { ValidationProtocolLive, ValidationProtocolV2 } from '../protocols/ValidationV2';

// Re-export protocols
export { DocumentProtocolLive, DocumentProtocolV2, ValidationProtocolLive, ValidationProtocolV2 };

// V2 State Types
export {
  initialState,
  isSuccess,
  isValidationStale,
  type DocumentState,
  type DocumentStatus,
  type ValidationSnapshot,
} from '../../values/DocumentState';

/**
 * Main Application Layer
 *
 * Provides all V2 protocol implementations to Effect programs.
 * Use this to run Effect programs with all services available.
 */
export const MainLayer = Layer.merge(
  Layer.succeed(DocumentProtocolV2, DocumentProtocolLive),
  Layer.succeed(ValidationProtocolV2, ValidationProtocolLive)
);
