// @ts-nocheck
'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { useHotkeys } from 'react-hotkeys-hook';

export type AIMode = 'manual' | 'suggest' | 'auto';

interface AIModeSwitcherProps {
  mode: AIMode;
  onModeChange: (mode: AIMode) => void;
}

export function AIModeSwitcher({ mode, onModeChange }: AIModeSwitcherProps) {
  const modes: AIMode[] = ['manual', 'suggest', 'auto'];

  // Keyboard shortcuts for mode switching
  useHotkeys('alt+m', (e) => {
    e.preventDefault();
    onModeChange('manual');
  });

  useHotkeys('alt+s', (e) => {
    e.preventDefault();
    onModeChange('suggest');
  });

  useHotkeys('alt+a', (e) => {
    e.preventDefault();
    onModeChange('auto');
  });

  return (
    <div className="flex gap-2 bg-muted p-2 rounded-lg">
      {modes.map((m) => (
        <Button
          key={m}
          variant={mode === m ? 'default' : 'outline'}
          size="sm"
          onClick={() => onModeChange(m)}
          title={`Switch to ${m === 'manual' ? 'Manual' : m === 'suggest' ? 'AI Suggest' : 'AI Auto'} mode (${m === 'manual' ? 'Alt+M' : m === 'suggest' ? 'Alt+S' : 'Alt+A'})`}
        >
          {m === 'manual' ? 'Manual' : m === 'suggest' ? 'AI Suggest' : 'AI Auto'}
        </Button>
      ))}
    </div>
  );
}
