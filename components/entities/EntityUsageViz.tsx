/**
 * EntityUsageViz Component (Task 6.5)
 *
 * Shows passages where an entity is used with tag references.
 */

'use client';

import { useState } from 'react';
import type { Entity } from '@/lib/tei/types';

export interface EntityUsageVizProps {
  /** Entity to show usage for */
  entity: Entity;
  /** Passages where entity is referenced */
  usages: EntityUsage[];
  /** Loading state */
  loading?: boolean;
}

export interface EntityUsage {
  readonly passageId: string;
  readonly passageIndex: number;
  readonly tagCount: number;
  readonly tagIds: readonly string[];
}

/**
 * EntityUsageViz Component
 *
 * Displays all passages where an entity is referenced.
 * Shows tag count and allows navigation to passages.
 */
export function EntityUsageViz({ entity, usages, loading = false }: EntityUsageVizProps) {
  const [expandedPassages, setExpandedPassages] = useState<Set<string>>(new Set());

  /**
   * Toggle passage expansion
   */
  const togglePassage = (passageId: string) => {
    setExpandedPassages(prev => {
      const next = new Set(prev);
      if (next.has(passageId)) {
        next.delete(passageId);
      } else {
        next.add(passageId);
      }
      return next;
    });
  };

  /**
   * Handle passage click
   */
  const handlePassageClick = (passageId: string) => {
    // TODO: Navigate to passage
    console.log('Navigate to passage:', passageId);
  };

  if (usages.length === 0) {
    return (
      <div className="entity-usage-viz">
        <div className="empty-state">
          <p>No usage found for "{entity.name}"</p>
          <small>This entity is not referenced in any passages</small>
        </div>
      </div>
    );
  }

  return (
    <div className="entity-usage-viz">
      <div className="usage-header">
        <h3>Usage for "{entity.name}"</h3>
        <span className="usage-count">{usages.length} passage{usages.length !== 1 ? 's' : ''}</span>
      </div>

      <div className="usage-list">
        {usages.map((usage) => (
          <div
            key={usage.passageId}
            className={`usage-passage ${expandedPassages.has(usage.passageId) ? 'expanded' : ''}`}
          >
            <div className="passage-header" onClick={() => togglePassage(usage.passageId)}>
              <span className="passage-index">Passage {usage.passageIndex + 1}</span>
              <span className="tag-count">{usage.tagCount} tag{usage.tagCount !== 1 ? 's' : ''}</span>
              <button
                className="btn-navigate"
                onClick={(e) => {
                  e.stopPropagation();
                  handlePassageClick(usage.passageId);
                }}
                disabled={loading}
              >
                Navigate
              </button>
            </div>

            {expandedPassages.has(usage.passageId) && (
              <div className="passage-details">
                <small>Tags: {usage.tagIds.join(', ')}</small>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
