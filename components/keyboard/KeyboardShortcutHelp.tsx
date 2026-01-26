'use client';

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface ShortcutHelpProps {
  open: boolean;
  onClose: () => void;
}

export function KeyboardShortcutHelp({ open, onClose }: ShortcutHelpProps) {
  const shortcuts = [
    { keys: 'Cmd+K', description: 'Open command palette' },
    { keys: 'J / K', description: 'Next / previous passage' },
    { keys: '1-9', description: 'Tag as speaker 1-9' },
    { keys: 'A', description: 'Accept AI suggestion' },
    { keys: 'X', description: 'Reject AI suggestion' },
    { keys: '?', description: 'Show keyboard shortcuts' },
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
