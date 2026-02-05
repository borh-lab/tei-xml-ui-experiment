/**
 * EntityForm Component (Task 6.3)
 *
 * Form for creating and editing entities (characters, places, organizations).
 * Validates input and auto-generates IDs.
 */

'use client';

import { useState, useEffect } from 'react';
import type { Entity, Character, Place, Organization, EntityType } from '@/lib/tei/types';
import { generateXmlId } from '@/lib/protocols/entities';

export interface EntityFormProps {
  /** Entity type being edited */
  entityType: EntityType;
  /** Entity being edited (null for create mode) */
  entity?: Entity | null;
  /** Called when form is submitted */
  onSave: (entity: Omit<Entity, 'id' | 'xmlId'>) => void;
  /** Called when form is cancelled */
  onCancel: () => void;
  /** Whether form is in loading state */
  loading?: boolean;
  /** Error message to display */
  error?: string | null;
}

/**
 * Entity form data for different entity types
 */
interface CharacterFormData {
  name: string;
  sex: 'M' | 'F' | 'Other' | '';
  age: string;
  occupation: string;
  traits: string;
  socialStatus: string;
  maritalStatus: string;
}

interface PlaceFormData {
  name: string;
  type: string;
  description: string;
}

interface OrganizationFormData {
  name: string;
  type: string;
  description: string;
}

type FormData = CharacterFormData | PlaceFormData | OrganizationFormData;

/**
 * EntityForm Component
 *
 * Provides form fields for creating/editing entities.
 * Auto-generates xmlId from name.
 * Validates required fields.
 *
 * @example
 * ```tsx
 * <EntityForm
 *   entityType="character"
 *   onSave={handleSave}
 *   onCancel={handleCancel}
 * />
 * ```
 */
export function EntityForm({
  entityType,
  entity,
  onSave,
  onCancel,
  loading = false,
  error = null,
}: EntityFormProps) {
  const isEditMode = entity !== null && entity !== undefined;
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Initialize form data based on entity type
  const initializeFormData = (): FormData => {
    if (!entity) {
      // Create mode - empty form
      switch (entityType) {
        case 'character':
          return {
            name: '',
            sex: '',
            age: '',
            occupation: '',
            traits: '',
            socialStatus: '',
            maritalStatus: '',
          };
        case 'place':
          return {
            name: '',
            type: '',
            description: '',
          };
        case 'organization':
          return {
            name: '',
            type: '',
            description: '',
          };
      }
    }

    // Edit mode - populate from entity
    switch (entityType) {
      case 'character':
        const char = entity as Character;
        return {
          name: char.name || '',
          sex: char.sex || '',
          age: char.age?.toString() || '',
          occupation: char.occupation || '',
          traits: char.traits?.join(', ') || '',
          socialStatus: char.socialStatus || '',
          maritalStatus: char.maritalStatus || '',
        };
      case 'place':
        const place = entity as Place;
        return {
          name: place.name || '',
          type: place.type || '',
          description: place.description || '',
        };
      case 'organization':
        const org = entity as Organization;
        return {
          name: org.name || '',
          type: org.type || '',
          description: org.description || '',
        };
    }
  };

  const [formData, setFormData] = useState<FormData>(initializeFormData);

  // Update form data when entity changes
  useEffect(() => {
    setFormData(initializeFormData());
    setValidationErrors({});
  }, [entity, entityType]);

  /**
   * Validate form data
   */
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    // Name is required for all entity types
    if (!formData.name.trim()) {
      errors.name = 'Name is required';
    }

    // Character-specific validation
    if (entityType === 'character') {
      const charData = formData as CharacterFormData;
      if (!charData.sex) {
        errors.sex = 'Gender is required';
      }
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  /**
   * Handle form submission
   */
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    // Transform form data to entity data
    let entityData: Omit<Entity, 'id' | 'xmlId'>;

    switch (entityType) {
      case 'character':
        const charFormData = formData as CharacterFormData;
        entityData = {
          ...charFormData,
          sex: charFormData.sex as 'M' | 'F' | 'Other',
          age: charFormData.age ? parseInt(charFormData.age) : undefined,
          traits: charFormData.traits ? charFormData.traits.split(',').map(t => t.trim()).filter(t => t) : undefined,
        } as Omit<Character, 'id' | 'xmlId'>;
        break;

      case 'place':
        const placeFormData = formData as PlaceFormData;
        entityData = {
          ...placeFormData,
          type: placeFormData.type || undefined,
          description: placeFormData.description || undefined,
        } as Omit<Place, 'id' | 'xmlId'>;
        break;

      case 'organization':
        const orgFormData = formData as OrganizationFormData;
        entityData = {
          ...orgFormData,
          type: orgFormData.type || undefined,
          description: orgFormData.description || undefined,
        } as Omit<Organization, 'id' | 'xmlId'>;
        break;
    }

    onSave(entityData);
  };

  /**
   * Handle field change
   */
  const handleFieldChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));

    // Clear validation error for this field
    if (validationErrors[field]) {
      setValidationErrors(prev => {
        const updated = { ...prev };
        delete updated[field];
        return updated;
      });
    }
  };

  /**
   * Render character form fields
   */
  const renderCharacterFields = () => {
    const data = formData as CharacterFormData;

    return (
      <>
        <div className="form-field">
          <label htmlFor="sex">Gender *</label>
          <select
            id="sex"
            value={data.sex}
            onChange={(e) => handleFieldChange('sex', e.target.value)}
            className={validationErrors.sex ? 'error' : ''}
            disabled={loading}
          >
            <option value="">Select gender</option>
            <option value="M">Male</option>
            <option value="F">Female</option>
            <option value="Other">Other</option>
          </select>
          {validationErrors.sex && (
            <span className="error-message">{validationErrors.sex}</span>
          )}
        </div>

        <div className="form-field">
          <label htmlFor="age">Age</label>
          <input
            id="age"
            type="number"
            value={data.age}
            onChange={(e) => handleFieldChange('age', e.target.value)}
            min="0"
            max="150"
            disabled={loading}
          />
        </div>

        <div className="form-field">
          <label htmlFor="occupation">Occupation</label>
          <input
            id="occupation"
            type="text"
            value={data.occupation}
            onChange={(e) => handleFieldChange('occupation', e.target.value)}
            disabled={loading}
          />
        </div>

        <div className="form-field">
          <label htmlFor="traits">Traits (comma-separated)</label>
          <input
            id="traits"
            type="text"
            value={data.traits}
            onChange={(e) => handleFieldChange('traits', e.target.value)}
            placeholder="brave, intelligent, kind"
            disabled={loading}
          />
        </div>

        <div className="form-field">
          <label htmlFor="socialStatus">Social Status</label>
          <input
            id="socialStatus"
            type="text"
            value={data.socialStatus}
            onChange={(e) => handleFieldChange('socialStatus', e.target.value)}
            disabled={loading}
          />
        </div>

        <div className="form-field">
          <label htmlFor="maritalStatus">Marital Status</label>
          <input
            id="maritalStatus"
            type="text"
            value={data.maritalStatus}
            onChange={(e) => handleFieldChange('maritalStatus', e.target.value)}
            disabled={loading}
          />
        </div>
      </>
    );
  };

  /**
   * Render place form fields
   */
  const renderPlaceFields = () => {
    const data = formData as PlaceFormData;

    return (
      <>
        <div className="form-field">
          <label htmlFor="placeType">Type</label>
          <select
            id="placeType"
            value={data.type}
            onChange={(e) => handleFieldChange('type', e.target.value)}
            disabled={loading}
          >
            <option value="">Select type</option>
            <option value="city">City</option>
            <option value="country">Country</option>
            <option value="building">Building</option>
            <option value="room">Room</option>
            <option value="outdoor">Outdoor</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div className="form-field">
          <label htmlFor="placeDescription">Description</label>
          <textarea
            id="placeDescription"
            value={data.description}
            onChange={(e) => handleFieldChange('description', e.target.value)}
            rows={4}
            disabled={loading}
          />
        </div>
      </>
    );
  };

  /**
   * Render organization form fields
   */
  const renderOrganizationFields = () => {
    const data = formData as OrganizationFormData;

    return (
      <>
        <div className="form-field">
          <label htmlFor="orgType">Type</label>
          <select
            id="orgType"
            value={data.type}
            onChange={(e) => handleFieldChange('type', e.target.value)}
            disabled={loading}
          >
            <option value="">Select type</option>
            <option value="company">Company</option>
            <option value="government">Government</option>
            <option value="nonprofit">Non-profit</option>
            <option value="educational">Educational</option>
            <option value="military">Military</option>
            <option value="religious">Religious</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div className="form-field">
          <label htmlFor="orgDescription">Description</label>
          <textarea
            id="orgDescription"
            value={data.description}
            onChange={(e) => handleFieldChange('description', e.target.value)}
            rows={4}
            disabled={loading}
          />
        </div>
      </>
    );
  };

  /**
   * Render generated xmlId preview
   */
  const renderXmlIdPreview = () => {
    if (!formData.name.trim()) return null;

    const xmlId = generateXmlId(formData.name);
    return (
      <div className="xml-id-preview">
        <small>Generated ID: {xmlId}</small>
      </div>
    );
  };

  return (
    <div className="entity-form">
      <div className="form-header">
        <h3>{isEditMode ? `Edit ${entityType}` : `Create ${entityType}`}</h3>
      </div>

      <form onSubmit={handleSubmit} className="form-content">
        {/* Error display */}
        {error && (
          <div className="form-error">
            {error}
          </div>
        )}

        {/* Common name field */}
        <div className="form-field">
          <label htmlFor="name">Name *</label>
          <input
            id="name"
            type="text"
            value={formData.name}
            onChange={(e) => handleFieldChange('name', e.target.value)}
            className={validationErrors.name ? 'error' : ''}
            placeholder={`Enter ${entityType} name`}
            disabled={loading}
            autoFocus
          />
          {validationErrors.name && (
            <span className="error-message">{validationErrors.name}</span>
          )}
          {renderXmlIdPreview()}
        </div>

        {/* Type-specific fields */}
        {entityType === 'character' && renderCharacterFields()}
        {entityType === 'place' && renderPlaceFields()}
        {entityType === 'organization' && renderOrganizationFields()}

        {/* Form actions */}
        <div className="form-actions">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="btn-secondary"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="btn-primary"
          >
            {loading ? 'Saving...' : isEditMode ? 'Save Changes' : 'Create'}
          </button>
        </div>
      </form>
    </div>
  );
}
