/**
 * DocumentView V2 - Using useDocumentV2
 *
 * Same functionality as V1, but uses new state protocol architecture.
 * Demonstrates migration pattern for other components.
 */

'use client';

import { useState } from 'react';
import { useDocumentV2 } from '@/hooks/useDocumentV2';
import type { DocumentState } from '@/lib/values/DocumentState';
import type { DocumentProtocol } from '@/lib/effect/protocols/DocumentV2';

type Tab = 'document' | 'entities' | 'validation';

/**
 * DocumentView V2 Component
 *
 * Uses useDocumentV2 instead of V1 hooks.
 * All functionality identical to V1.
 */
export function DocumentViewV2({
  initialState,
  protocol,
}: {
  initialState?: DocumentState;
  protocol?: DocumentProtocol;
} = {}) {
  const { state: docState, operations } = useDocumentV2(initialState, protocol, undefined as any);

  // Re-use existing entity management logic
  const [activeTab, setActiveTab] = useState<Tab>('document');

  /**
   * Handle tab change
   */
  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
  };

  // Loading state from document state
  const loading = docState.status === 'loading';
  const error = docState.error?.message ?? null;

  return (
    <div className="document-view">
      {/* Error Display */}
      {error && (
        <div className="document-error">
          {error}
        </div>
      )}

      {/* Tab Navigation */}
      <div className="tab-navigation">
        <button
          className={activeTab === 'document' ? 'active' : ''}
          onClick={() => handleTabChange('document')}
          disabled={loading}
        >
          Document
        </button>
        <button
          className={activeTab === 'entities' ? 'active' : ''}
          onClick={() => handleTabChange('entities')}
          disabled={loading}
        >
          Entities
        </button>
        <button
          className={activeTab === 'validation' ? 'active' : ''}
          onClick={() => handleTabChange('validation')}
          disabled={loading}
        >
          Validation
        </button>
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {activeTab === 'document' && (
          <div className="document-content">
            {docState.document ? (
              <div>
                <h2>{docState.document.state.metadata.title}</h2>
                <p>Revision: {docState.document.state.revision}</p>
                <p>Passages: {docState.document.state.passages.length}</p>
              </div>
            ) : (
              <p>No document loaded</p>
            )}
          </div>
        )}

        {activeTab === 'entities' && (
          <div className="entities-content">
            <p>Characters: {docState.document?.state.characters.length ?? 0}</p>
            <p>Relationships: {docState.document?.state.relationships.length ?? 0}</p>
          </div>
        )}

        {activeTab === 'validation' && (
          <div className="validation-content">
            {docState.validation ? (
              <div>
                <p>Validated at: {docState.validation.validatedAt.toLocaleString()}</p>
                <p>Errors: {docState.validation.results.errors.length}</p>
                <p>Warnings: {docState.validation.results.warnings.length}</p>
              </div>
            ) : (
              <p>No validation results</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
