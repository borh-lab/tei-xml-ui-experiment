// @ts-nocheck
import { useEffect } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';

export interface ShortcutAction {
  key: string;
  description: string;
  action: () => void;
}

export function useKeyboardShortcuts(shortcuts: ShortcutAction[]) {
  useEffect(() => {
    shortcuts.forEach(({ key, action }) => {
      useHotkeys(key, action);
    });
  }, [shortcuts]);
}
