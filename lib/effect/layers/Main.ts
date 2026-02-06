/**
 * Main Effect Layer
 *
 * Exports all V2 protocols and utilities for use across the codebase.
 */

// V2 Protocols
export { DocumentProtocolLive, DocumentProtocolV2 } from '../protocols/DocumentV2';
export { ValidationProtocolLive, ValidationProtocolV2 } from '../protocols/ValidationV2';

// V2 State Types
export {
  initialState,
  isSuccess,
  isValidationStale,
  type DocumentState,
  type DocumentStatus,
  type ValidationSnapshot,
} from '../../values/DocumentState';
