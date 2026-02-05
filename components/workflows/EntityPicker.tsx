/**
 * EntityPicker Component
 *
 * Dropdown component for selecting characters, places, or organizations.
 * Features:
 * - Search/filter entities
 * - Show entity usage count
 * - Filter out archived entities
 * - Keyboard navigation
 */

'use client';

import React, { useState, useCallback, useMemo, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { AvailableEntity } from '@/lib/protocols/workflows';
import { cn } from '@/lib/utils';

/**
 * Props for EntityPicker component
 */
export interface EntityPickerProps {
  /** Available entities to select from */
  readonly entities: readonly AvailableEntity[];
  /** Callback when entity is selected */
  readonly onSelect: (entity: AvailableEntity) => void;
  /** Currently selected entity */
  readonly value?: AvailableEntity;
  /** Placeholder text */
  readonly placeholder?: string;
  /** Whether to show usage count */
  readonly showUsageCount?: boolean;
  /** Whether picker is disabled */
  readonly disabled?: boolean;
  /** Additional CSS classes */
  readonly className?: string;
}

/**
 * EntityPicker Component
 *
 * Provides a searchable dropdown for selecting entities.
 * Filters out archived entities by default.
 *
 * @example
 * ```tsx
 * <EntityPicker
 *   entities={availableCharacters}
 *   onSelect={(entity) => console.log(entity.id)}
 *   placeholder="Select a character"
 *   showUsageCount={true}
 * />
 * ```
 */
export function EntityPicker({
  entities,
  onSelect,
  value,
  placeholder = 'Select an entity',
  showUsageCount = false,
  disabled = false,
  className,
}: EntityPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchText, setSearchText] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Filter out archived entities and filter by search text
  const filteredEntities = useMemo(() => {
    return entities.filter((entity) => {
      // Filter out archived entities
      if (entity.archived) return false;

      // Filter by search text
      if (searchText.trim() === '') return true;

      const searchLower = searchText.toLowerCase();
      return (
        entity.name.toLowerCase().includes(searchLower) ||
        entity.id.toLowerCase().includes(searchLower)
      );
    });
  }, [entities, searchText]);

  // Handle entity selection
  const handleSelect = useCallback(
    (entity: AvailableEntity) => {
      onSelect(entity);
      setIsOpen(false);
      setSearchText('');
    },
    [onSelect]
  );

  // Handle toggle dropdown
  const handleToggle = useCallback(() => {
    if (disabled) return;

    setIsOpen((prev) => {
      const newState = !prev;
      if (newState && searchInputRef.current) {
        // Focus search input when opening
        setTimeout(() => {
          searchInputRef.current?.focus();
        }, 100);
      }
      return newState;
    });
  }, [disabled]);

  // Handle click outside
  const handleClickOutside = useCallback(
    (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    },
    []
  );

  // Set up click outside listener
  React.useEffect(() => {
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
    // Explicit return for type safety
    return undefined;
  }, [isOpen, handleClickOutside]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (disabled) return;

      if (event.key === 'Escape') {
        setIsOpen(false);
        return;
      }

      if (event.key === 'Enter' && !isOpen) {
        event.preventDefault();
        handleToggle();
        return;
      }

      if (event.key === 'ArrowDown' && !isOpen) {
        event.preventDefault();
        handleToggle();
        return;
      }
    },
    [disabled, isOpen, handleToggle]
  );

  return (
    <div
      ref={containerRef}
      className={cn('relative', className)}
      onKeyDown={handleKeyDown}
    >
      {/* Trigger button */}
      <Button
        type="button"
        onClick={handleToggle}
        disabled={disabled}
        variant="outline"
        className="w-full justify-between text-left font-normal"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        role="combobox"
      >
        <span className="truncate">
          {value ? value.name : placeholder}
        </span>
        <svg
          className={cn(
            'ml-2 h-4 w-4 shrink-0 transition-transform',
            isOpen && 'rotate-180'
          )}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </Button>

      {/* Dropdown menu */}
      {isOpen && (
        <div className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border bg-popover p-1 shadow-md animate-in fade-in-0 zoom-in-95">
          {/* Search input */}
          <div className="sticky top-0 z-10 bg-popover p-1">
            <Input
              ref={searchInputRef}
              type="text"
              placeholder="Search..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="h-8"
              role="searchbox"
              autoComplete="off"
            />
          </div>

          {/* Entity list */}
          <div
            className="max-h-[calc(60vh-60px)] overflow-auto py-1"
            role="listbox"
          >
            {filteredEntities.length === 0 ? (
              <div className="px-3 py-2 text-sm text-muted-foreground">
                {searchText ? 'No results found' : 'No entities available'}
              </div>
            ) : (
              filteredEntities.map((entity) => (
                <button
                  key={entity.id}
                  type="button"
                  onClick={() => handleSelect(entity)}
                  className={cn(
                    'flex w-full items-center justify-between rounded-sm px-3 py-2 text-sm transition-colors hover:bg-accent hover:text-accent-foreground',
                    value?.id === entity.id && 'bg-accent'
                  )}
                  role="option"
                  aria-selected={value?.id === entity.id}
                >
                  <span className="truncate">{entity.name}</span>
                  {showUsageCount && (
                    <span className="ml-2 shrink-0 text-xs text-muted-foreground">
                      {entity.usageCount} {entity.usageCount === 1 ? 'use' : 'uses'}
                    </span>
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
