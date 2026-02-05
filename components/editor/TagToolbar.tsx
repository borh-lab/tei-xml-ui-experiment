// @ts-nocheck
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { useDocumentContext } from '@/lib/context/DocumentContext';
import { SelectionManager } from '@/lib/selection';
import type { SelectionSnapshot } from '@/lib/selection';
import { WorkflowTriggerButton } from '@/components/workflows/WorkflowTriggerButton';
import { WorkflowDialog } from '@/components/workflows/WorkflowDialog';
import type { Workflow } from '@/lib/workflows/definitions';

interface TagToolbarProps {
  onClose?: () => void;
}

export function TagToolbar({ onClose }: TagToolbarProps) {
  const { document, addSaidTag, addTag } = useDocumentContext();
  const [position, setPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [visible, setVisible] = useState(false);
  const [currentSelection, setCurrentSelection] = useState<SelectionSnapshot | null>(null);
  const [selectionManager] = useState(() => new SelectionManager());

  // Workflow state
  const [workflowDialogOpen, setWorkflowDialogOpen] = useState(false);
  const [selectedWorkflow, setSelectedWorkflow] = useState<Workflow | null>(null);

  // Handle workflow selection
  const handleWorkflowSelect = useCallback((workflow: Workflow) => {
    setSelectedWorkflow(workflow);
    setWorkflowDialogOpen(true);
  }, []);

  // Handle workflow dialog close
  const handleWorkflowDialogClose = useCallback(() => {
    setWorkflowDialogOpen(false);
    setSelectedWorkflow(null);
    // Also hide the toolbar
    setVisible(false);
    setCurrentSelection(null);
    window.getSelection()?.removeAllRanges();
    onClose?.();
  }, [onClose]);

  const handleSelection = useCallback(() => {
    const selection = selectionManager.captureSelection();

    if (selection && selection.text.trim().length > 0) {
      // Get selection rect for positioning
      const nativeSelection = window.getSelection();
      if (nativeSelection && nativeSelection.rangeCount > 0) {
        const range = nativeSelection.getRangeAt(0);
        const rect = range.getBoundingClientRect();

        // Position toolbar above the selection
        setPosition({
          x: rect.left + rect.width / 2,
          y: rect.top - 50,
        });
        setCurrentSelection(selection);
        setVisible(true);
      }
    } else {
      setVisible(false);
      setCurrentSelection(null);
    }
  }, [selectionManager]);

  const handleApplyTag = useCallback(
    (type: string, attributes?: Record<string, string>) => {
      if (!document || !currentSelection) return;

      switch (type) {
        case 'said':
          // For said tag, use the first character as default speaker
          const speaker = document.state.characters[0];
          if (speaker) {
            addSaidTag(currentSelection.passageId, currentSelection.range, speaker.id);
          }
          break;

        case 'q':
        case 'persName':
        case 'placeName':
        case 'orgName':
          addTag(currentSelection.passageId, currentSelection.range, type, attributes);
          break;

        default:
          console.warn('Unknown tag type:', type);
      }

      // Clear selection and hide toolbar
      window.getSelection()?.removeAllRanges();
      setVisible(false);
      setCurrentSelection(null);
      onClose?.();
    },
    [document, currentSelection, addSaidTag, addTag, onClose]
  );

  useEffect(() => {
    // Listen for mouseup and keyup events to detect text selection
    window.document.addEventListener('mouseup', handleSelection);
    window.document.addEventListener('keyup', handleSelection);

    // Cleanup event listeners
    return () => {
      window.document.removeEventListener('mouseup', handleSelection);
      window.document.removeEventListener('keyup', handleSelection);
    };
  }, [handleSelection]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!visible || !currentSelection || !document) return;

      // Number keys 1-9 for quick speaker assignment
      if (e.key >= '1' && e.key <= '9') {
        e.preventDefault();
        const speakerIndex = parseInt(e.key, 10);
        const character = document.state.characters[speakerIndex - 1];

        if (character) {
          handleApplyTag('said', { who: `#${character.xmlId}` });
        }
      }

      // Ctrl+Q for q tag
      if (e.key === 'q' && e.ctrlKey) {
        e.preventDefault();
        handleApplyTag('q');
      }

      // Ctrl+P for persName tag
      if (e.key === 'p' && e.ctrlKey) {
        e.preventDefault();
        handleApplyTag('persName');
      }

      // Escape to close toolbar
      if (e.key === 'Escape') {
        setVisible(false);
        setCurrentSelection(null);
        onClose?.();
      }
    };

    window.document.addEventListener('keydown', handleKeyDown);
    return () => window.document.removeEventListener('keydown', handleKeyDown);
  }, [visible, currentSelection, document, handleApplyTag, onClose, addSaidTag, addTag]);

  if (!visible || !currentSelection || !document) {
    return null;
  }

  // Generate speaker buttons (up to 9 available)
  const speakerButtons = document.state.characters.slice(0, 9).map((char, index) => (
    <Button
      key={char.id}
      data-test-action="apply-tag"
      data-test-tag="said"
      data-test-attributes={JSON.stringify(['who'])}
      data-test-speaker={char.xmlId}
      size="sm"
      variant="outline"
      onClick={() => handleApplyTag('said', { who: `#${char.xmlId}` })}
      className="text-xs"
      title={`Apply said tag (${char.name}) - Shortcut: ${index + 1}`}
    >
      {index + 1}. {char.name}
    </Button>
  ));

  return (
    <>
    <div
      data-test-panel="tag-toolbar"
      data-test-state="visible"
      className="fixed z-50 bg-background border border-border rounded-lg shadow-lg p-2 flex gap-2 flex-wrap max-w-md"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        transform: 'translateX(-50%)',
      }}
    >
      {speakerButtons}

      <div className="w-px bg-border mx-1" />

      <Button
        data-test-action="apply-tag"
        data-test-tag="q"
        data-test-attributes="[]"
        size="sm"
        variant="outline"
        onClick={() => handleApplyTag('q')}
        className="text-xs"
        title="Wrap in q tag - Shortcut: Ctrl+Q"
      >
        &lt;q&gt;
      </Button>

      <Button
        data-test-action="apply-tag"
        data-test-tag="persName"
        data-test-attributes="[]"
        size="sm"
        variant="outline"
        onClick={() => handleApplyTag('persName')}
        className="text-xs"
        title="Wrap in persName tag - Shortcut: Ctrl+P"
      >
        &lt;persName&gt;
      </Button>

      <Button
        size="sm"
        variant="ghost"
        onClick={() => {
          setVisible(false);
          setCurrentSelection(null);
          window.getSelection()?.removeAllRanges();
          onClose?.();
        }}
        className="text-xs"
        title="Close (Escape)"
      >
        ✕
      </Button>

      {/* Workflow trigger button */}
      <div className="w-px bg-border mx-1" />
      <WorkflowTriggerButton
        onWorkflowSelect={handleWorkflowSelect}
        label="Workflow"
        variant="ghost"
        className="text-xs"
      />
    </div>

    {/* Workflow dialog */}
    {selectedWorkflow && currentSelection && (
      <WorkflowDialog
        open={workflowDialogOpen}
        onClose={handleWorkflowDialogClose}
        workflow={selectedWorkflow}
        passageId={currentSelection.passageId}
        range={currentSelection.range}
      />
    )}
    </>
  );
}
