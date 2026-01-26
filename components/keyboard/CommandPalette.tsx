'use client';

import React from 'react';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from 'cmdk';
import { useDocumentContext } from '@/lib/context/DocumentContext';

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
}

export function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const { document, loadDocument } = useDocumentContext();

  const handleSave = () => {
    // TODO: Implement save
    onClose();
  };

  const handleLoadSample = () => {
    // TODO: Load sample
    onClose();
  };

  return (
    <CommandDialog open={open} onOpenChange={onClose}>
      <CommandInput placeholder="Type a command or search..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        <CommandGroup heading="Document">
          <CommandItem onSelect={handleSave}>
            Save document
          </CommandItem>
          <CommandItem onSelect={onClose}>
            Export TEI
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
