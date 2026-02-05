/**
 * EntityList Component (Task 6.4)
 *
 * Table view of entities with filtering, sorting, and actions.
 */

'use client';

import { useState, useMemo } from 'react';
import type { Entity, Character, Place, Organization } from '@/lib/tei/types';

// EntityType is a union of all entity types
type EntityType = 'character' | 'place' | 'organization';

export interface EntityListProps {
  /** Entities to display */
  entities: readonly Entity[];
  /** Type of entities to display */
  entityType: EntityType;
  /** Called when edit is requested */
  onEdit: (entity: Entity) => void;
  /** Called when delete is requested */
  onDelete: (entity: Entity) => void;
  /** Called when new entity creation is requested */
  onNewEntity: () => void;
  /** Loading state */
  loading?: boolean;
}

type SortField = 'name' | 'usage';
type SortOrder = 'asc' | 'desc';

/**
 * EntityList Component
 *
 * Displays entities in a table with filtering and sorting.
 * Provides edit and delete actions for each entity.
 */
export function EntityList({
  entities,
  entityType,
  onEdit,
  onDelete,
  onNewEntity,
  loading = false,
}: EntityListProps) {
  const [filter, setFilter] = useState('');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

  /**
   * Filter and sort entities
   */
  const filteredAndSortedEntities = useMemo(() => {
    // Filter by entity type and name search
    let filtered = entities.filter(entity => {
      // Type filter is implicit - we only show entities of the current type
      const matchesType = (
        (entityType === 'character' && 'sex' in entity) ||
        (entityType === 'place' && 'coordinates' in entity) ||
        (entityType === 'organization' && !('sex' in entity) && !('coordinates' in entity))
      );

      // Name filter
      const matchesName = !filter || entity.name.toLowerCase().includes(filter.toLowerCase());

      return matchesType && matchesName;
    });

    // Sort entities
    filtered = [...filtered].sort((a, b) => {
      let comparison = 0;

      if (sortField === 'name') {
        comparison = a.name.localeCompare(b.name);
      } else if (sortField === 'usage') {
        // TODO: Implement usage count once document integration is added
        comparison = 0;
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [entities, entityType, filter, sortField, sortOrder]);

  /**
   * Handle sort field change
   */
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      // Toggle order
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      // New field
      setSortField(field);
      setSortOrder('asc');
    }
  };

  /**
   * Get entity usage count
   * TODO: Implement once document integration is added
   */
  const getUsageCount = (entity: Entity): number => {
    return 0;
  };

  /**
   * Render table headers
   */
  const renderTableHeaders = () => {
    return (
      <thead>
        <tr>
          <th onClick={() => handleSort('name')} className="sortable">
            Name {sortField === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}
          </th>
          <th>Type</th>
          <th onClick={() => handleSort('usage')} className="sortable">
            Usage {sortField === 'usage' && (sortOrder === 'asc' ? '↑' : '↓')}
          </th>
          <th>Actions</th>
        </tr>
      </thead>
    );
  };

  /**
   * Render table rows
   */
  const renderTableRows = () => {
    if (filteredAndSortedEntities.length === 0) {
      return (
        <tr>
          <td colSpan={4} className="empty-message">
            {filter ? `No ${entityType}s found matching "${filter}"` : `No ${entityType}s found. Click "New ${entityType}" to create one.`}
          </td>
        </tr>
      );
    }

    return filteredAndSortedEntities.map((entity) => (
      <tr key={entity.id}>
        <td className="entity-name">{entity.name}</td>
        <td className="entity-type">
          {entityType === 'character' && (entity as Character).sex}
          {entityType === 'place' && (entity as Place).type || '-'}
          {entityType === 'organization' && (entity as Organization).type || '-'}
        </td>
        <td className="entity-usage">{getUsageCount(entity)}</td>
        <td className="entity-actions">
          <button
            onClick={() => onEdit(entity)}
            disabled={loading}
            className="btn-edit"
            title={`Edit ${entity.name}`}
          >
            Edit
          </button>
          <button
            onClick={() => onDelete(entity)}
            disabled={loading}
            className="btn-delete"
            title={`Delete ${entity.name}`}
          >
            Delete
          </button>
        </td>
      </tr>
    ));
  };

  return (
    <div className="entity-list">
      {/* Header with filter and new button */}
      <div className="entity-list-header">
        <input
          type="text"
          placeholder={`Filter ${entityType}s by name...`}
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="filter-input"
          disabled={loading}
        />
        <button
          onClick={onNewEntity}
          disabled={loading}
          className="btn-new-entity"
        >
          New {entityType}
        </button>
      </div>

      {/* Entity table */}
      <table className="entity-table">
        {renderTableHeaders()}
        <tbody>
          {renderTableRows()}
        </tbody>
      </table>

      {/* Entity count */}
      <div className="entity-count">
        Showing {filteredAndSortedEntities.length} of {entities.length} {entityType}s
      </div>
    </div>
  );
}
