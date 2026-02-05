/**
 * WorkflowTriggerButton Component
 *
 * Button to start workflow with workflow selection.
 */

'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { getAllWorkflows } from '@/lib/workflows/definitions';
import type { Workflow } from '@/lib/workflows/definitions';
import { cn } from '@/lib/utils';

/**
 * Props for WorkflowTriggerButton component
 */
export interface WorkflowTriggerButtonProps {
  /** Callback when workflow is selected */
  readonly onWorkflowSelect: (workflow: Workflow) => void;
  /** Button text */
  readonly label?: string;
  /** Whether button is disabled */
  readonly disabled?: boolean;
  /** Additional CSS classes */
  readonly className?: string;
  /** Button variant */
  readonly variant?: 'default' | 'outline' | 'ghost' | 'secondary';
}

/**
 * WorkflowTriggerButton Component
 *
 * Button with dropdown to select and start a workflow.
 * Shows all available workflows from definitions.
 */
export function WorkflowTriggerButton({
  onWorkflowSelect,
  label = 'Start Workflow',
  disabled = false,
  className,
  variant = 'default',
}: WorkflowTriggerButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Handle workflow selection
  const handleSelect = useCallback(
    (workflow: Workflow) => {
      onWorkflowSelect(workflow);
      setIsOpen(false);
    },
    [onWorkflowSelect]
  );

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
  useEffect(() => {
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isOpen, handleClickOutside]);

  const workflows = getAllWorkflows();

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <Button
        variant={variant}
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
      >
        {label}
        <svg
          className={cn(
            'ml-2 h-4 w-4 transition-transform',
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

      {isOpen && (
        <div className="absolute z-50 mt-1 w-56 rounded-md border bg-popover p-1 shadow-md animate-in fade-in-0 zoom-in-95">
          {workflows.map((workflow) => (
            <button
              key={workflow.id}
              type="button"
              onClick={() => handleSelect(workflow)}
              className="flex w-full flex-col gap-1 rounded-sm px-3 py-2 text-sm transition-colors hover:bg-accent hover:text-accent-foreground text-left"
            >
              <span className="font-medium">{workflow.name}</span>
              <span className="text-xs text-muted-foreground">
                {workflow.description}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
