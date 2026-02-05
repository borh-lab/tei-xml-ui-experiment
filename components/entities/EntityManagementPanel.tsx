/**
 * EntityManagementPanel Component (Task 6.6)
 *
 * Container with tabs for Browse, Create, and Usage views.
 * Manages entity type switching and integrates sub-components.
 */

'use client';

import { useState } from 'react';
import { EntityForm } from './EntityForm';
import { EntityList } from './EntityList';
import { EntityUsageViz } from './EntityUsageViz';
import type { Entity } from '@/lib/tei/types';
import type { EntityUsage } from './EntityUsageViz';

// EntityType is a union of all entity types
type EntityType = 'character' | 'place' | 'organization';

export interface EntityManagementPanelProps {
  /** All entities */
  entities: readonly Entity[];
  /** Called when entity is created/updated */
  onSaveEntity: (entityData: Omit<Entity, 'id' | 'xmlId'>, entityType: EntityType) => Promise<void>;
  /** Called when entity is deleted */
  onDeleteEntity: (entity: Entity) => Promise<void>;
  /** Get entity usage information */
  getEntityUsage: (entityId: string) => EntityUsage[];
  /** Loading state */
  loading?: boolean;
  /** Error message */
  error?: string | null;
}

type Tab = 'browse' | 'create' | 'usage';

/**
 * EntityManagementPanel Component
 *
 * Main container for entity management with tabs.
 * Handles entity type switching and coordinates sub-components.
 */
export function EntityManagementPanel({
  entities,
  onSaveEntity,
  onDeleteEntity,
  getEntityUsage,
  loading = false,
  error = null,
}: EntityManagementPanelProps) {
  const [activeTab, setActiveTab] = useState<Tab>('browse');
  const [entityType, setEntityType] = useState<EntityType>('character');
  const [editingEntity, setEditingEntity] = useState<Entity | null>(null);
  const [selectedEntityForUsage, setSelectedEntityForUsage] = useState<Entity | null>(null);

  /**
   * Handle entity save
   */
  const handleSaveEntity = async (entityData: Omit<Entity, 'id' | 'xmlId'>) => {
    await onSaveEntity(entityData, entityType);

    // Reset form after save
    setEditingEntity(null);
    setActiveTab('browse');
  };

  /**
   * Handle entity edit
   */
  const handleEditEntity = (entity: Entity) => {
    setEditingEntity(entity);
    setActiveTab('create');
  };

  /**
   * Handle entity delete
   */
  const handleDeleteEntity = async (entity: Entity) => {
    if (window.confirm(`Are you sure you want to delete "${entity.name}"?`)) {
      await onDeleteEntity(entity);
    }
  };

  /**
   * Handle new entity creation
   */
  const handleNewEntity = () => {
    setEditingEntity(null);
    setActiveTab('create');
  };

  /**
   * Handle tab change
   */
  const handleTabChange = (tab: Tab) => {
    if (tab === 'usage' && !selectedEntityForUsage) {
      // Auto-select first entity for usage view
      const filteredEntities = entities.filter(entity => {
        if (entityType === 'character') return 'sex' in entity;
        if (entityType === 'place') return 'coordinates' in entity;
        return !('sex' in entity) && !('coordinates' in entity);
      });
      if (filteredEntities.length > 0) {
        setSelectedEntityForUsage(filteredEntities[0]);
      }
    }
    setActiveTab(tab);
  };

  /**
   * Handle entity type change
   */
  const handleEntityTypeChange = (type: EntityType) => {
    setEntityType(type);
    setEditingEntity(null);
    setSelectedEntityForUsage(null);
    setActiveTab('browse');
  };

  return (
    <div className="entity-management-panel">
      {/* Entity Type Switcher */}
      <div className="entity-type-switcher">
        <button
          className={entityType === 'character' ? 'active' : ''}
          onClick={() => handleEntityTypeChange('character')}
          disabled={loading}
        >
          Characters
        </button>
        <button
          className={entityType === 'place' ? 'active' : ''}
          onClick={() => handleEntityTypeChange('place')}
          disabled={loading}
        >
          Places
        </button>
        <button
          className={entityType === 'organization' ? 'active' : ''}
          onClick={() => handleEntityTypeChange('organization')}
          disabled={loading}
        >
          Organizations
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="panel-error">
          {error}
        </div>
      )}

      {/* Tab Navigation */}
      <div className="tab-navigation">
        <button
          className={activeTab === 'browse' ? 'active' : ''}
          onClick={() => handleTabChange('browse')}
          disabled={loading}
        >
          Browse
        </button>
        <button
          className={activeTab === 'create' ? 'active' : ''}
          onClick={() => handleTabChange('create')}
          disabled={loading}
        >
          {editingEntity ? 'Edit' : 'Create'}
        </button>
        <button
          className={activeTab === 'usage' ? 'active' : ''}
          onClick={() => handleTabChange('usage')}
          disabled={loading}
        >
          Usage
        </button>
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {activeTab === 'browse' && (
          <EntityList
            entities={entities}
            entityType={entityType}
            onEdit={handleEditEntity}
            onDelete={handleDeleteEntity}
            onNewEntity={handleNewEntity}
            loading={loading}
          />
        )}

        {activeTab === 'create' && (
          <EntityForm
            entityType={entityType}
            entity={editingEntity}
            onSave={handleSaveEntity}
            onCancel={() => {
              setEditingEntity(null);
              setActiveTab('browse');
            }}
            loading={loading}
            error={error}
          />
        )}

        {activeTab === 'usage' && selectedEntityForUsage && (
          <>
            <div className="entity-selector">
              <label>View usage for: </label>
              <select
                value={selectedEntityForUsage.id}
                onChange={(e) => {
                  const entity = entities.find(ent => ent.id === e.target.value);
                  if (entity) setSelectedEntityForUsage(entity);
                }}
                disabled={loading}
              >
                {entities
                  .filter(entity => {
                    if (entityType === 'character') return 'sex' in entity;
                    if (entityType === 'place') return 'coordinates' in entity;
                    return !('sex' in entity) && !('coordinates' in entity);
                  })
                  .map(entity => (
                    <option key={entity.id} value={entity.id}>
                      {entity.name}
                    </option>
                  ))}
              </select>
            </div>
            <EntityUsageViz
              entity={selectedEntityForUsage}
              usages={getEntityUsage(selectedEntityForUsage.id)}
              loading={loading}
            />
          </>
        )}

        {activeTab === 'usage' && !selectedEntityForUsage && (
          <div className="empty-state">
            <p>No {entityType}s to display</p>
          </div>
        )}
      </div>
    </div>
  );
}
