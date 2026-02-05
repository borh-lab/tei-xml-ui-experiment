// @ts-nocheck
'use client';

import { useEffect, useState } from 'react';
import { SampleGallery as SampleGalleryOriginal } from './SampleGallery';

const FEATURE_FLAG = 'feature-useEffectCorpus';

interface SampleGalleryProps {
  onSelect: (sampleId: string) => void;
  onLoadSample?: (sampleId: string) => Promise<void>;
}

export function SampleGallery({ onSelect, onLoadSample }: SampleGalleryProps) {
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

  return <SampleGalleryOriginal onSelect={onSelect} onLoadSample={onLoadSample} />;
}

export default SampleGallery;
