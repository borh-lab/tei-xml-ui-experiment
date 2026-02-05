'use client';

import { useState, useCallback } from 'react';

export interface PanelStates {
  commandPaletteOpen: boolean;
  bulkPanelOpen: boolean;
  vizPanelOpen: boolean;
  validationPanelOpen: boolean;
  entityPanelOpen: boolean;
  shortcutHelpOpen: boolean;
  editDialogOpen: boolean;
}

export interface ToastState {
  message: string;
  type: 'success' | 'error' | 'info';
}

export interface UseEditorUIResult {
  // Panel states
  panelStates: PanelStates;
  // Panel actions
  openCommandPalette: () => void;
  closeCommandPalette: () => void;
  toggleCommandPalette: () => void;
  openBulkPanel: () => void;
  closeBulkPanel: () => void;
  toggleBulkPanel: () => void;
  openVizPanel: () => void;
  closeVizPanel: () => void;
  toggleVizPanel: () => void;
  openValidationPanel: () => void;
  closeValidationPanel: () => void;
  toggleValidationPanel: () => void;
  openEntityPanel: () => void;
  closeEntityPanel: () => void;
  toggleEntityPanel: () => void;
  openShortcutHelp: () => void;
  closeShortcutHelp: () => void;
  toggleShortcutHelp: () => void;
  openEditDialog: () => void;
  closeEditDialog: () => void;
  // Toast
  toast: ToastState | null;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  clearToast: () => void;
}

/**
 * Manages UI state for editor panels, modals, and toast notifications.
 *
 * This hook centralizes all UI-related state that isn't tied to document
 * content or editing operations.
 */
export function useEditorUI(): UseEditorUIResult {
  // Panel states
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [bulkPanelOpen, setBulkPanelOpen] = useState(false);
  const [vizPanelOpen, setVizPanelOpen] = useState(false);
  const [validationPanelOpen, setValidationPanelOpen] = useState(false);
  const [entityPanelOpen, setEntityPanelOpen] = useState(false);
  const [shortcutHelpOpen, setShortcutHelpOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  // Toast notifications
  const [toast, setToast] = useState<ToastState | null>(null);

  // Panel actions
  const openCommandPalette = useCallback(() => setCommandPaletteOpen(true), []);
  const closeCommandPalette = useCallback(() => setCommandPaletteOpen(false), []);
  const toggleCommandPalette = useCallback(() => setCommandPaletteOpen(prev => !prev), []);

  const openBulkPanel = useCallback(() => setBulkPanelOpen(true), []);
  const closeBulkPanel = useCallback(() => setBulkPanelOpen(false), []);
  const toggleBulkPanel = useCallback(() => setBulkPanelOpen(prev => !prev), []);

  const openVizPanel = useCallback(() => setVizPanelOpen(true), []);
  const closeVizPanel = useCallback(() => setVizPanelOpen(false), []);
  const toggleVizPanel = useCallback(() => setVizPanelOpen(prev => !prev), []);

  const openValidationPanel = useCallback(() => setValidationPanelOpen(true), []);
  const closeValidationPanel = useCallback(() => setValidationPanelOpen(false), []);
  const toggleValidationPanel = useCallback(() => setValidationPanelOpen(prev => !prev), []);

  const openEntityPanel = useCallback(() => setEntityPanelOpen(true), []);
  const closeEntityPanel = useCallback(() => setEntityPanelOpen(false), []);
  const toggleEntityPanel = useCallback(() => setEntityPanelOpen(prev => !prev), []);

  const openShortcutHelp = useCallback(() => setShortcutHelpOpen(true), []);
  const closeShortcutHelp = useCallback(() => setShortcutHelpOpen(false), []);
  const toggleShortcutHelp = useCallback(() => setShortcutHelpOpen(prev => !prev), []);

  const openEditDialog = useCallback(() => setEditDialogOpen(true), []);
  const closeEditDialog = useCallback(() => setEditDialogOpen(false), []);

  // Toast actions
  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const clearToast = useCallback(() => setToast(null), []);

  return {
    panelStates: {
      commandPaletteOpen,
      bulkPanelOpen,
      vizPanelOpen,
      validationPanelOpen,
      entityPanelOpen,
      shortcutHelpOpen,
      editDialogOpen,
    },
    openCommandPalette,
    closeCommandPalette,
    toggleCommandPalette,
    openBulkPanel,
    closeBulkPanel,
    toggleBulkPanel,
    openVizPanel,
    closeVizPanel,
    toggleVizPanel,
    openValidationPanel,
    closeValidationPanel,
    toggleValidationPanel,
    openEntityPanel,
    closeEntityPanel,
    toggleEntityPanel,
    openShortcutHelp,
    closeShortcutHelp,
    toggleShortcutHelp,
    openEditDialog,
    closeEditDialog,
    toast,
    showToast,
    clearToast,
  };
}
