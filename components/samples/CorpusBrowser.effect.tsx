// @ts-nocheck
'use client';

import { useEffect, useState } from 'react';
import { CorpusBrowser as CorpusBrowserOriginal } from './CorpusBrowser';

const FEATURE_FLAG = 'feature-useEffectCorpus';

interface CorpusBrowserProps {
  onLoadNovel?: (title: string) => void;
}

export function CorpusBrowser({ onLoadNovel }: CorpusBrowserProps) {
  const [isEnabled, setIsEnabled] = useState(false);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    const flagValue = localStorage.getItem(FEATURE_FLAG);
    setIsEnabled(flagValue === 'true');
  }, []);

  if (!isClient || !isEnabled) {
    return null;
  }

  return <CorpusBrowserOriginal onLoadNovel={onLoadNovel} />;
}

export default CorpusBrowser;
