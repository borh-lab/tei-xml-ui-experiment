'use client';

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface ShortcutHelpProps {
  open: boolean;
  onClose: () => void;
}

export function KeyboardShortcutHelp({ open, onClose }: ShortcutHelpProps) {
  const shortcuts = [
    { keys: 'Cmd+K', description: 'Open command palette' },
    { keys: 'Cmd+F', description: 'Open search dialog' },
    { keys: 'Cmd+B', description: 'Toggle bulk operations panel' },
    { keys: 'Cmd+O', description: 'Toggle dialogue outline' },
    { keys: 'J / K', description: 'Navigate to next / previous passage with highlight' },
    { keys: '1-9', description: 'Quick tag selected text as speaker 1-9' },
    { keys: 'A', description: 'Accept first AI suggestion (if available)' },
    { keys: 'X', description: 'Reject first AI suggestion (if available)' },
    { keys: '?', description: 'Show this keyboard shortcuts help' },
  ];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Keyboard Shortcuts</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {shortcuts.map((shortcut) => (
            <div key={shortcut.keys} className="flex justify-between">
              <kbd className="px-2 py-1 bg-muted rounded">{shortcut.keys}</kbd>
              <span>{shortcut.description}</span>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
